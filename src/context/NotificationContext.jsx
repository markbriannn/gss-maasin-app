import React, {createContext, useContext, useState, useEffect, useCallback, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from '../services/notificationService';
import {useAuth} from './AuthContext';
import {db} from '../config/firebase';
import {collection, query, where, onSnapshot} from 'firebase/firestore';

const NotificationContext = createContext();
const READ_NOTIFICATIONS_KEY = '@read_notifications';

// Track shown notification popups to prevent duplicates
const shownPopupIds = new Set();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  // Return default values if context is not available (during initial render)
  if (!context) {
    return {
      notifications: [],
      unreadCount: 0,
      markAsRead: () => {},
      markAllAsRead: () => {},
      clearNotifications: () => {},
      refreshReadState: () => {},
    };
  }
  return context;
};

export const NotificationProvider = ({children}) => {
  const {user, userRole, isAuthenticated} = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readNotificationIds, setReadNotificationIds] = useState(new Set());
  
  // Use refs to track listener state and avoid recreating listeners
  const readIdsRef = useRef(new Set());
  const unsubscribersRef = useRef([]);
  const isListenerActiveRef = useRef(false);

  // Store latest notification docs for recounting
  const notificationDocsRef = useRef({ providers: [], jobs: [], bookings: [] });

  // Keep ref in sync with state
  useEffect(() => {
    readIdsRef.current = readNotificationIds;
  }, [readNotificationIds]);

  // Recalculate unread count when readNotificationIds changes (without recreating listeners)
  const recalculateUnreadCount = useCallback(() => {
    const normalizedRole = userRole?.toUpperCase() || 'CLIENT';
    const currentReadIds = readIdsRef.current;

    if (normalizedRole === 'CLIENT') {
      // Count each booking only once based on its status
      let count = 0;
      notificationDocsRef.current.bookings.forEach(doc => {
        const data = doc.data();
        // Generate unique notification ID based on status
        const notifId = `${data.status}_${doc.id}`;
        if (!currentReadIds.has(notifId)) {
          count++;
        }
      });
      setUnreadCount(count);
    } else if (normalizedRole === 'PROVIDER') {
      const availableJobs = notificationDocsRef.current.jobs.filter(doc => {
        const data = doc.data();
        const notifId = `available_${doc.id}`;
        return !data.providerId && !currentReadIds.has(notifId);
      });
      setUnreadCount(availableJobs.length);
    } else if (normalizedRole === 'ADMIN') {
      const unreadProviders = notificationDocsRef.current.providers.filter(doc => {
        const notifId = `provider_${doc.id}`;
        return !currentReadIds.has(notifId);
      });
      const unreadJobs = notificationDocsRef.current.jobs.filter(doc => {
        const notifId = `job_${doc.id}`;
        return !currentReadIds.has(notifId);
      });
      setUnreadCount(unreadProviders.length + unreadJobs.length);
    }
  }, [userRole]);

  // Trigger recount when readNotificationIds changes
  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      recalculateUnreadCount();
    }
  }, [readNotificationIds, isAuthenticated, user?.uid, recalculateUnreadCount]);

  // Load read notification IDs from AsyncStorage
  const loadReadNotifications = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(`${READ_NOTIFICATIONS_KEY}_${user?.uid}`);
      if (stored) {
        const ids = new Set(JSON.parse(stored));
        setReadNotificationIds(ids);
        readIdsRef.current = ids;
      }
    } catch (error) {
      console.log('Error loading read notifications:', error);
    }
  }, [user?.uid]);

  // Save read notification IDs to AsyncStorage
  const saveReadNotifications = async (ids) => {
    try {
      await AsyncStorage.setItem(`${READ_NOTIFICATIONS_KEY}_${user?.uid}`, JSON.stringify([...ids]));
    } catch (error) {
      console.log('Error saving read notifications:', error);
    }
  };

  // Load read state on mount
  useEffect(() => {
    if (user?.uid) {
      loadReadNotifications();
    }
  }, [user?.uid, loadReadNotifications]);

  // Cleanup function for listeners
  const cleanupListeners = useCallback(() => {
    unsubscribersRef.current.forEach(unsub => {
      try {
        if (typeof unsub === 'function') {
          unsub();
        }
      } catch (e) {
        // Silently handle cleanup errors
      }
    });
    unsubscribersRef.current = [];
    isListenerActiveRef.current = false;
  }, []);

  // Real-time Firestore listener for notification counts
  // IMPORTANT: Don't include readNotificationIds in deps to avoid listener recreation
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      cleanupListeners();
      return;
    }

    // Clean up existing listeners before creating new ones
    cleanupListeners();

    const normalizedRole = userRole?.toUpperCase() || 'CLIENT';
    isListenerActiveRef.current = true;
    
    console.log('Setting up notification listener for role:', normalizedRole, 'user:', user.uid);

    // Error handler for Firestore listeners
    const handleError = (error) => {
      console.log('Firestore listener error (handled):', error?.message || error);
      // Don't throw - just log and continue
    };

    try {
      if (normalizedRole === 'CLIENT') {
        // Client: count bookings with updates (all active statuses that need attention)
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('clientId', '==', user.uid),
          where('status', 'in', ['accepted', 'in_progress', 'traveling', 'arrived', 'pending_completion', 'pending_payment', 'counter_offer', 'payment_received', 'completed'])
        );
        
        const unsub = onSnapshot(
          bookingsQuery, 
          (snapshot) => {
            console.log('[Notifications] Client bookings snapshot received:', snapshot.docs.length, 'docs');
            // Store docs in ref for recalculation
            notificationDocsRef.current.bookings = snapshot.docs;
            // Use ref to get current read IDs without causing re-subscription
            const currentReadIds = readIdsRef.current;
            // Count each booking only once based on its status
            let count = 0;
            snapshot.docs.forEach(doc => {
              const data = doc.data();
              // Generate unique notification ID based on status
              const notifId = `${data.status}_${doc.id}`;
              if (!currentReadIds.has(notifId)) {
                count++;
                console.log(`[Notifications] Unread: ${notifId}`);
              }
            });
            console.log('[Notifications] Client unread count:', count);
            setUnreadCount(count);
          },
          handleError
        );
        unsubscribersRef.current.push(unsub);
      } else if (normalizedRole === 'PROVIDER') {
        // Provider: count available jobs (admin approved, pending)
        const jobsQuery = query(
          collection(db, 'bookings'),
          where('status', 'in', ['pending', 'pending_negotiation']),
          where('adminApproved', '==', true)
        );
        
        const unsub = onSnapshot(
          jobsQuery, 
          (snapshot) => {
            // Store docs in ref for recalculation
            notificationDocsRef.current.jobs = snapshot.docs;
            const currentReadIds = readIdsRef.current;
            const availableJobs = snapshot.docs.filter(doc => {
              const data = doc.data();
              const notifId = `available_${doc.id}`;
              return !data.providerId && !currentReadIds.has(notifId);
            });
            setUnreadCount(availableJobs.length);
          },
          handleError
        );
        unsubscribersRef.current.push(unsub);
      } else if (normalizedRole === 'ADMIN') {
        // Admin: count pending providers + pending jobs (excluding read ones)
        const updateAdminCount = () => {
          const currentReadIds = readIdsRef.current;
          const unreadProviders = notificationDocsRef.current.providers.filter(doc => {
            const notifId = `provider_${doc.id}`;
            return !currentReadIds.has(notifId);
          });
          const unreadJobs = notificationDocsRef.current.jobs.filter(doc => {
            const notifId = `job_${doc.id}`;
            return !currentReadIds.has(notifId);
          });
          setUnreadCount(unreadProviders.length + unreadJobs.length);
        };

        const providersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'PROVIDER'),
          where('providerStatus', '==', 'pending')
        );
        
        const jobsQuery = query(
          collection(db, 'bookings'),
          where('status', 'in', ['pending', 'pending_negotiation']),
          where('adminApproved', '==', false)
        );

        const unsubProviders = onSnapshot(
          providersQuery, 
          (snapshot) => {
            // Store docs in ref for recalculation
            notificationDocsRef.current.providers = snapshot.docs;
            updateAdminCount();
          },
          handleError
        );
        
        const unsubJobs = onSnapshot(
          jobsQuery, 
          (snapshot) => {
            // Store docs in ref for recalculation
            notificationDocsRef.current.jobs = snapshot.docs;
            updateAdminCount();
          },
          handleError
        );

        unsubscribersRef.current.push(unsubProviders, unsubJobs);
      }
    } catch (error) {
      console.log('Error setting up Firestore listeners:', error);
      isListenerActiveRef.current = false;
    }

    return () => {
      cleanupListeners();
    };
  }, [isAuthenticated, user?.uid, userRole, cleanupListeners]);

  useEffect(() => {
    if (isAuthenticated && user) {
      initializeNotifications();
    }
    
    return () => {
      notificationService.cleanup();
    };
  }, [isAuthenticated, user]);

  const initializeNotifications = async () => {
    try {
      const hasPermission = await notificationService.requestPermission();
      
      if (hasPermission) {
        // Register device token - this may fail on emulators without Google Play Services
        // but that's okay, the app will still work without push notifications
        await notificationService.registerDeviceToken(user.id || user.uid);
        
        try {
          notificationService.onNotificationReceived((remoteMessage) => {
            handleNotificationReceived(remoteMessage);
          });
          
          notificationService.onNotificationOpened((remoteMessage) => {
            handleNotificationOpened(remoteMessage);
          });
          
          notificationService.onTokenRefresh((token) => {
            console.log('[FCM] Token refreshed');
          });
          
          subscribeToUserTopics();
        } catch (fcmError) {
          // FCM listeners may fail on devices without Google Play Services
          console.log('[FCM] Push notification listeners unavailable:', fcmError.message);
        }
      }
    } catch (error) {
      // Non-critical - app works without push notifications
      console.log('[Notifications] Init skipped:', error.message);
    }
  };

  const handleNotificationReceived = (remoteMessage) => {
    const notificationData = remoteMessage.data || {};
    const normalizedRole = userRole?.toUpperCase() || 'CLIENT';
    const title = remoteMessage.notification?.title || '';
    const body = remoteMessage.notification?.body || '';
    
    // BLOCK all "New Job Request" notifications for non-admins
    // These are admin-only notifications
    const isNewJobNotification = 
      notificationData.type === 'new_job' || 
      title.includes('New Job Request') || 
      title.includes('Job Request') ||
      body.includes('requested');
    
    if (isNewJobNotification && normalizedRole !== 'ADMIN') {
      console.log('[Notifications] Blocking job request notification for non-admin');
      return; // Completely block - don't show popup, don't add to list
    }
    
    // Generate unique ID for this notification to prevent duplicates
    const notifUniqueId = `${notificationData.type || 'unknown'}_${notificationData.jobId || ''}_${remoteMessage.messageId || Date.now()}`;
    
    // Skip if we've already shown this notification popup
    if (shownPopupIds.has(notifUniqueId)) {
      console.log('[Notifications] Skipping duplicate notification:', notifUniqueId);
      return;
    }
    
    // Mark this notification as shown
    shownPopupIds.add(notifUniqueId);
    
    // Clean up old entries after 5 minutes to prevent memory leak
    setTimeout(() => {
      shownPopupIds.delete(notifUniqueId);
    }, 5 * 60 * 1000);
    
    // Show local notification popup for valid notifications
    notificationService.showLocalNotification(title, body, notificationData);
    
    const newNotification = {
      id: Date.now().toString(),
      title,
      body,
      data: notificationData,
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications((prev) => [newNotification, ...prev]);
    setUnreadCount((prev) => prev + 1);
    
    notificationService.setBadgeCount(unreadCount + 1);
  };

  const handleNotificationOpened = (remoteMessage) => {
    console.log('Notification opened:', remoteMessage);
    
    const {type, jobId, providerId, chatId} = remoteMessage.data || {};
    
    // Navigation logic based on notification type
    // navigation.navigate('JobDetails', { jobId });
  };

  const subscribeToUserTopics = async () => {
    if (user) {
      try {
        await notificationService.subscribeToTopic(`user_${user.id || user.uid}`);
        await notificationService.subscribeToTopic(`role_${user.role?.toLowerCase() || 'client'}`);
        
        if (user.role === 'PROVIDER') {
          await notificationService.subscribeToTopic('new_jobs');
        }
      } catch (error) {
        // Non-critical - topics may fail without FCM
        console.log('[FCM] Topic subscription skipped');
      }
    }
  };

  const markAsRead = async (notificationId) => {
    // Add to read set
    const newReadIds = new Set(readNotificationIds);
    newReadIds.add(notificationId);
    
    // Update ref immediately so recalculation uses latest values
    readIdsRef.current = newReadIds;
    setReadNotificationIds(newReadIds);
    await saveReadNotifications(newReadIds);
    
    // Update local notifications state
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? {...notification, read: true}
          : notification
      )
    );
    
    // Immediately recalculate unread count
    recalculateUnreadCount();
    
    notificationService.setBadgeCount(Math.max(0, unreadCount - 1));
  };

  const markAllAsRead = async () => {
    // Add all current notification IDs to read set
    const newReadIds = new Set(readNotificationIds);
    notifications.forEach(n => newReadIds.add(n.id));
    
    // Also add all notification doc IDs from the refs
    notificationDocsRef.current.providers.forEach(doc => newReadIds.add(`provider_${doc.id}`));
    notificationDocsRef.current.jobs.forEach(doc => {
      newReadIds.add(`job_${doc.id}`);
      newReadIds.add(`available_${doc.id}`);
    });
    notificationDocsRef.current.bookings.forEach(doc => {
      const data = doc.data();
      // Mark the current status as read
      newReadIds.add(`${data.status}_${doc.id}`);
    });
    
    // Update ref immediately so recalculation uses latest values
    readIdsRef.current = newReadIds;
    setReadNotificationIds(newReadIds);
    await saveReadNotifications(newReadIds);
    
    setNotifications((prev) =>
      prev.map((notification) => ({...notification, read: true}))
    );
    setUnreadCount(0);
    notificationService.clearBadge();
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    notificationService.clearBadge();
  };

  // Refresh read state (called from NotificationsScreen)
  const refreshReadState = () => {
    loadReadNotifications();
  };

  const value = {
    notifications,
    unreadCount,
    readNotificationIds,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refreshReadState,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
