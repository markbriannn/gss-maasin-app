import React, {createContext, useContext, useState, useEffect, useCallback, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from '../services/notificationService';
import {useAuth} from './AuthContext';
import {db} from '../config/firebase';
import {collection, query, where, onSnapshot} from 'firebase/firestore';

const NotificationContext = createContext();
const READ_NOTIFICATIONS_KEY = '@read_notifications';

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
      // Count each booking only once - check if ANY of its notification IDs are read
      let unreadCount = 0;
      notificationDocsRef.current.bookings.forEach(doc => {
        const data = doc.data();
        // Generate the notification ID based on status
        let notifId;
        if (data.status === 'counter_offer') {
          notifId = `counter_${doc.id}`;
        } else {
          notifId = `accepted_${doc.id}`;
        }
        if (!currentReadIds.has(notifId)) {
          unreadCount++;
        }
      });
      setUnreadCount(unreadCount);
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
        // Client: count bookings with updates (all active statuses)
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('clientId', '==', user.uid),
          where('status', 'in', ['accepted', 'in_progress', 'traveling', 'arrived', 'pending_completion', 'counter_offer'])
        );
        
        const unsub = onSnapshot(
          bookingsQuery, 
          (snapshot) => {
            console.log('Client bookings snapshot received:', snapshot.docs.length, 'docs');
            // Store docs in ref for recalculation
            notificationDocsRef.current.bookings = snapshot.docs;
            // Use ref to get current read IDs without causing re-subscription
            const currentReadIds = readIdsRef.current;
            // Count each booking only once based on its status
            let unreadCount = 0;
            snapshot.docs.forEach(doc => {
              const data = doc.data();
              // Generate the notification ID based on status
              let notifId;
              if (data.status === 'counter_offer') {
                notifId = `counter_${doc.id}`;
              } else {
                notifId = `accepted_${doc.id}`;
              }
              if (!currentReadIds.has(notifId)) {
                unreadCount++;
              }
            });
            console.log('Client unread count:', unreadCount);
            setUnreadCount(unreadCount);
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
        await notificationService.registerDeviceToken(user.id);
        
        notificationService.onNotificationReceived((remoteMessage) => {
          handleNotificationReceived(remoteMessage);
        });
        
        notificationService.onNotificationOpened((remoteMessage) => {
          handleNotificationOpened(remoteMessage);
        });
        
        notificationService.onTokenRefresh((token) => {
          console.log('FCM token refreshed:', token);
        });
        
        subscribeToUserTopics();
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const handleNotificationReceived = (remoteMessage) => {
    const newNotification = {
      id: Date.now().toString(),
      title: remoteMessage.notification?.title || '',
      body: remoteMessage.notification?.body || '',
      data: remoteMessage.data || {},
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

  const subscribeToUserTopics = () => {
    if (user) {
      notificationService.subscribeToTopic(`user_${user.id}`);
      notificationService.subscribeToTopic(`role_${user.role.toLowerCase()}`);
      
      if (user.role === 'PROVIDER') {
        notificationService.subscribeToTopic('new_jobs');
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
    notificationDocsRef.current.jobs.forEach(doc => newReadIds.add(`job_${doc.id}`));
    notificationDocsRef.current.bookings.forEach(doc => {
      newReadIds.add(`accepted_${doc.id}`);
      newReadIds.add(`counter_${doc.id}`);
      newReadIds.add(`available_${doc.id}`);
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
