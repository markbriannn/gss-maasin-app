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
// Track last notification timestamp to prevent rapid duplicates
let lastNotificationTime = 0;
const MIN_NOTIFICATION_INTERVAL = 2000; // 2 seconds minimum between same notifications

// Global navigation ref for notification handling
let globalNavigationRef = null;

export const setNotificationNavigationRef = (ref) => {
  globalNavigationRef = ref;
};

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
        // Client: count bookings with updates + unread notifications
        let bookingsCount = 0;
        let unreadNotificationsCount = 0;
        
        const updateClientCount = () => {
          setUnreadCount(bookingsCount + unreadNotificationsCount);
        };
        
        // Query 1: Bookings with updates (including cancelled)
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('clientId', '==', user.uid),
          where('status', 'in', ['accepted', 'in_progress', 'traveling', 'arrived', 'pending_completion', 'pending_payment', 'counter_offer', 'payment_received', 'completed', 'cancelled', 'rejected'])
        );
        
        const unsubBookings = onSnapshot(
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
            console.log('[Notifications] Client bookings unread count:', count);
            bookingsCount = count;
            updateClientCount();
          },
          handleError
        );
        unsubscribersRef.current.push(unsubBookings);
        
        // Query 2: Unread notifications for this client (targetUserId)
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('targetUserId', '==', user.uid),
          where('read', '==', false)
        );
        
        const unsubNotifications = onSnapshot(
          notificationsQuery,
          (snapshot) => {
            unreadNotificationsCount = snapshot.docs.length;
            console.log('[Notifications] Client unread notifications (targetUserId):', unreadNotificationsCount);
            updateClientCount();
          },
          handleError
        );
        unsubscribersRef.current.push(unsubNotifications);
        
        // Query 3: Unread notifications for this client (userId field)
        const notificationsQuery2 = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          where('read', '==', false)
        );
        
        const unsubNotifications2 = onSnapshot(
          notificationsQuery2,
          (snapshot) => {
            // Add to count (avoiding duplicates handled by Firestore)
            const additionalCount = snapshot.docs.length;
            console.log('[Notifications] Client unread notifications (userId):', additionalCount);
            // Note: This may double count if both fields exist, but that's rare
            unreadNotificationsCount += additionalCount;
            updateClientCount();
          },
          handleError
        );
        unsubscribersRef.current.push(unsubNotifications2);
      } else if (normalizedRole === 'PROVIDER') {
        // Provider: count available jobs + own job status updates
        let availableJobsCount = 0;
        let myJobsCount = 0;
        
        const updateProviderCount = () => {
          const total = availableJobsCount + myJobsCount;
          console.log('[Notifications] Provider total unread:', total, '(available:', availableJobsCount, ', myJobs:', myJobsCount, ')');
          setUnreadCount(total);
        };
        
        // Query 1: Available jobs (filter adminApproved in memory to avoid composite index)
        const availableJobsQuery = query(
          collection(db, 'bookings'),
          where('status', 'in', ['pending', 'pending_negotiation'])
        );
        
        const unsubAvailable = onSnapshot(
          availableJobsQuery, 
          (snapshot) => {
            notificationDocsRef.current.jobs = snapshot.docs;
            const currentReadIds = readIdsRef.current;
            const availableJobs = snapshot.docs.filter(doc => {
              const data = doc.data();
              const notifId = `available_${doc.id}`;
              // Filter: must be admin approved and not assigned to any provider
              return data.adminApproved && !data.providerId && !currentReadIds.has(notifId);
            });
            availableJobsCount = availableJobs.length;
            updateProviderCount();
          },
          handleError
        );
        unsubscribersRef.current.push(unsubAvailable);
        
        // Query 2: Provider's own jobs with status updates
        const myJobsQuery = query(
          collection(db, 'bookings'),
          where('providerId', '==', user.uid)
        );
        
        const unsubMyJobs = onSnapshot(
          myJobsQuery,
          (snapshot) => {
            const currentReadIds = readIdsRef.current;
            let count = 0;
            
            // Count unread job status notifications
            snapshot.docs.forEach(doc => {
              const data = doc.data();
              const status = data.status;
              // Only count statuses that generate notifications
              const notifiableStatuses = ['accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion', 'pending_payment', 'payment_received', 'completed'];
              if (notifiableStatuses.includes(status)) {
                const notifId = `myjob_${status}_${doc.id}`;
                if (!currentReadIds.has(notifId)) {
                  count++;
                }
              }
            });
            
            myJobsCount = count;
            console.log('[Notifications] Provider myJobs unread:', myJobsCount);
            updateProviderCount();
          },
          handleError
        );
        unsubscribersRef.current.push(unsubMyJobs);
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
      console.log('[NotificationContext] Initializing notifications for user:', user?.uid || user?.id);
      
      const hasPermission = await notificationService.requestPermission();
      console.log('[NotificationContext] Permission granted:', hasPermission);
      
      // Set up navigation callback for VIEW button in notifications
      notificationService.setNavigationCallback((data) => {
        handleNotificationNavigation(data);
      });
      
      if (hasPermission) {
        // Register device token - this may fail on emulators without Google Play Services
        // but that's okay, the app will still work without push notifications
        console.log('[NotificationContext] Registering device token...');
        const registrationResult = await notificationService.registerDeviceToken(user.id || user.uid);
        console.log('[NotificationContext] Token registration result:', registrationResult);
        
        try {
          notificationService.onNotificationReceived((remoteMessage) => {
            console.log('[NotificationContext] Notification received in foreground');
            handleNotificationReceived(remoteMessage);
          });
          
          notificationService.onNotificationOpened((remoteMessage) => {
            console.log('[NotificationContext] Notification opened');
            handleNotificationOpened(remoteMessage);
          });
          
          notificationService.onTokenRefresh((token) => {
            console.log('[FCM] Token refreshed, re-registering...');
            notificationService.registerDeviceToken(user.id || user.uid);
          });
          
          subscribeToUserTopics();
        } catch (fcmError) {
          // FCM listeners may fail on devices without Google Play Services
          console.log('[FCM] Push notification listeners unavailable:', fcmError.message);
        }
      }
    } catch (error) {
      // Non-critical - app works without push notifications
      console.log('[Notifications] Init error:', error.message);
    }
  };

  // Handle navigation when VIEW button is tapped on notification
  const handleNotificationNavigation = (data) => {
    if (!globalNavigationRef) {
      console.log('[Notifications] Navigation ref not set');
      return;
    }

    const {type, jobId, providerId, conversationId, senderId, senderName} = data || {};

    switch (type) {
      case 'new_job':
      case 'job_update':
      case 'job_approved':
        if (jobId) {
          globalNavigationRef.navigate('ProviderJobDetails', {jobId});
        }
        break;

      case 'booking_accepted':
      case 'booking_update':
      case 'counter_offer':
      case 'additional_charge':
      case 'job_started':
      case 'job_completed':
        if (jobId) {
          globalNavigationRef.navigate('JobDetails', {jobId});
        }
        break;

      case 'new_message':
        if (conversationId) {
          globalNavigationRef.navigate('Chat', {
            conversationId,
            recipient: {id: senderId, name: senderName},
          });
        }
        break;

      case 'provider_approved':
        globalNavigationRef.navigate('ProviderMain');
        break;

      case 'provider_suspended':
      case 'account_suspended':
        // Navigate to AdminProviders screen with the provider ID to open their details
        if (providerId) {
          globalNavigationRef.navigate('AdminMain', {
            screen: 'Providers',
            params: {openProviderId: providerId},
          });
        }
        break;

      case 'payment_received':
        globalNavigationRef.navigate('Earnings');
        break;

      case 'new_review':
        globalNavigationRef.navigate('ProviderProfile');
        break;

      default:
        // Navigate to notifications screen for unknown types
        globalNavigationRef.navigate('Notifications');
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
    const notifUniqueId = `${notificationData.type || 'unknown'}_${notificationData.jobId || notificationData.providerId || ''}_${remoteMessage.messageId || Date.now()}`;
    
    // Skip if we've already shown this notification popup
    if (shownPopupIds.has(notifUniqueId)) {
      console.log('[Notifications] Skipping duplicate notification:', notifUniqueId);
      return;
    }
    
    // Also check if this is a notification the admin just triggered (don't show to admin)
    // Admin shouldn't see the suspension notification they just sent
    if (notificationData.type === 'account_suspended' && normalizedRole === 'ADMIN') {
      console.log('[Notifications] Blocking suspension notification for admin who triggered it');
      return;
    }
    
    // Prevent rapid duplicate notifications (within 2 seconds)
    const now = Date.now();
    if (now - lastNotificationTime < MIN_NOTIFICATION_INTERVAL) {
      console.log('[Notifications] Blocking rapid duplicate notification');
      return;
    }
    lastNotificationTime = now;
    
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
