import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, Text, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Animated, Dimensions, TextInput} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Swipeable, GestureHandlerRootView} from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {useNotifications} from '../../context/NotificationContext';
import {db} from '../../config/firebase';
import {
  collection, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy, 
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const DELETED_NOTIFICATIONS_KEY = '@deleted_notifications';

const READ_NOTIFICATIONS_KEY = '@read_notifications';

const NotificationsScreen = ({navigation}) => {
  const {user, userRole} = useAuth();
  const {isDark, theme} = useTheme();
  const {markAsRead: contextMarkAsRead, markAllAsRead: contextMarkAllAsRead, readNotificationIds: contextReadIds} = useNotifications();
  const normalizedRole = userRole?.toUpperCase() || 'CLIENT';
  
  const [notifications, setNotifications] = useState([]);
  const [readNotificationIds, setReadNotificationIds] = useState(new Set());
  const [deletedNotificationIds, setDeletedNotificationIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use ref to avoid listener recreation when readNotificationIds changes
  const readIdsRef = useRef(new Set());
  const deletedIdsRef = useRef(new Set());
  const unsubscribeRef = useRef(null);
  const swipeableRefs = useRef({});
  
  // Sync with context read IDs when they change
  useEffect(() => {
    if (contextReadIds && contextReadIds.size > 0) {
      // Merge context read IDs with local using ref to avoid stale closure
      const currentLocalIds = readIdsRef.current;
      const mergedIds = new Set([...currentLocalIds, ...contextReadIds]);
      if (mergedIds.size !== currentLocalIds.size) {
        setReadNotificationIds(mergedIds);
        readIdsRef.current = mergedIds;
        // Update notifications read status
        setNotifications(prev => 
          prev.map(notif => ({
            ...notif,
            read: notif.read || mergedIds.has(notif.id)
          }))
        );
      }
    }
  }, [contextReadIds]);

  // Keep refs in sync with state
  useEffect(() => {
    readIdsRef.current = readNotificationIds;
  }, [readNotificationIds]);

  useEffect(() => {
    deletedIdsRef.current = deletedNotificationIds;
  }, [deletedNotificationIds]);

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

  // Load deleted notification IDs from AsyncStorage
  const loadDeletedNotifications = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(`${DELETED_NOTIFICATIONS_KEY}_${user?.uid}`);
      if (stored) {
        const ids = new Set(JSON.parse(stored));
        setDeletedNotificationIds(ids);
        deletedIdsRef.current = ids;
      }
    } catch (error) {
      console.log('Error loading deleted notifications:', error);
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

  // Save deleted notification IDs to AsyncStorage
  const saveDeletedNotifications = async (ids) => {
    try {
      await AsyncStorage.setItem(`${DELETED_NOTIFICATIONS_KEY}_${user?.uid}`, JSON.stringify([...ids]));
    } catch (error) {
      console.log('Error saving deleted notifications:', error);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    loadReadNotifications();
    loadDeletedNotifications();
  }, [user?.uid, loadReadNotifications, loadDeletedNotifications]);

  // Track if we're using generated notifications (fallback mode)
  const usingGeneratedRef = useRef(false);

  useEffect(() => {
    if (!user?.uid) return;

    // Cleanup previous listener
    if (unsubscribeRef.current) {
      try {
        unsubscribeRef.current();
      } catch (e) {
        // Silently handle
      }
      unsubscribeRef.current = null;
    }

    // Set up real-time listeners based on role
    console.log('[NotificationsScreen] Setting up listeners for role:', normalizedRole);
    const unsubscribers = [];

    const handleError = (error) => {
      console.log('[NotificationsScreen] Listener error:', error?.message || error);
      setIsLoading(false);
    };

    try {
      if (normalizedRole === 'ADMIN') {
        // Listen to pending providers
        const providersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'PROVIDER'),
          where('providerStatus', '==', 'pending')
        );
        const unsubProviders = onSnapshot(providersQuery, () => generateNotifications(), handleError);
        unsubscribers.push(unsubProviders);

        // Listen to pending jobs
        const jobsQuery = query(
          collection(db, 'bookings'),
          where('status', 'in', ['pending', 'pending_negotiation'])
        );
        const unsubJobs = onSnapshot(jobsQuery, () => generateNotifications(), handleError);
        unsubscribers.push(unsubJobs);
      } else if (normalizedRole === 'PROVIDER') {
        // Listen to available jobs (filter adminApproved in memory to avoid composite index)
        try {
          const availableJobsQuery = query(
            collection(db, 'bookings'),
            where('status', 'in', ['pending', 'pending_negotiation'])
          );
          const unsubAvailable = onSnapshot(availableJobsQuery, () => generateNotifications(), handleError);
          unsubscribers.push(unsubAvailable);
        } catch (e) {
          console.log('[NotificationsScreen] Available jobs query error:', e.message);
        }

        // Also listen to provider's own jobs
        try {
          const myJobsQuery = query(
            collection(db, 'bookings'),
            where('providerId', '==', user.uid)
          );
          const unsubMyJobs = onSnapshot(myJobsQuery, () => generateNotifications(), handleError);
          unsubscribers.push(unsubMyJobs);
        } catch (e) {
          console.log('[NotificationsScreen] My jobs query error:', e.message);
        }
      } else {
        // CLIENT - Listen to own bookings
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('clientId', '==', user.uid)
        );
        const unsubBookings = onSnapshot(bookingsQuery, () => generateNotifications(), handleError);
        unsubscribers.push(unsubBookings);
      }

      unsubscribeRef.current = () => {
        unsubscribers.forEach(unsub => {
          try { unsub(); } catch (e) {}
        });
      };
    } catch (error) {
      console.log('[NotificationsScreen] Setup error:', error);
      generateNotifications();
    }

    return () => {
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
        } catch (e) {
          // Silently handle cleanup errors
        }
        unsubscribeRef.current = null;
      }
    };
  }, [user?.uid, normalizedRole]); // Regenerate when user or role changes

  const generateNotifications = async () => {
    // Generate notifications from bookings data
    try {
      setIsLoading(true);
      const notificationsList = [];

      // Use ref for current read IDs
      const currentReadIds = readIdsRef.current;
      const currentDeletedIds = deletedIdsRef.current;
      
      if (normalizedRole === 'ADMIN') {
        // Admin: pending providers
        const pendingProvidersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'PROVIDER'),
          where('providerStatus', '==', 'pending')
        );
        const pendingProvidersSnapshot = await getDocs(pendingProvidersQuery);
        pendingProvidersSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const notifId = `provider_${docSnap.id}`;
          notificationsList.push({
            id: notifId,
            type: 'provider_approval',
            icon: 'person-add',
            iconColor: '#F59E0B',
            title: 'New Provider Registration',
            message: `${data.firstName || ''} ${data.lastName || ''} applied as ${data.serviceCategory || 'Service Provider'}`,
            time: formatTime(data.createdAt),
            read: currentReadIds.has(notifId),
            providerId: docSnap.id,
          });
        });

        // Admin: pending jobs
        const pendingJobsQuery = query(
          collection(db, 'bookings'),
          where('status', 'in', ['pending', 'pending_negotiation'])
        );
        const pendingJobsSnapshot = await getDocs(pendingJobsQuery);
        pendingJobsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.adminApproved) {
            const notifId = `job_${docSnap.id}`;
            notificationsList.push({
              id: notifId,
              type: 'job_pending',
              icon: 'document-text',
              iconColor: data.isNegotiable ? '#8B5CF6' : '#3B82F6',
              title: data.isNegotiable ? 'Job Request with Offer' : 'New Job Request',
              message: data.isNegotiable 
                ? `${data.serviceCategory || 'Service'} - Client offers ₱${(data.offeredPrice || 0).toLocaleString()}`
                : `${data.serviceCategory || 'Service'} - ${data.title || data.description || 'No description'}`,
              time: formatTime(data.createdAt),
              read: currentReadIds.has(notifId),
              jobId: docSnap.id,
            });
          }
        });
      } else if (normalizedRole === 'PROVIDER') {
        // Provider: available jobs (filter adminApproved in memory to avoid composite index)
        try {
          const availableJobsQuery = query(
            collection(db, 'bookings'),
            where('status', 'in', ['pending', 'pending_negotiation'])
          );
          const availableJobsSnapshot = await getDocs(availableJobsQuery);
          availableJobsSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // Filter: must be admin approved and not assigned to any provider
            if (data.adminApproved && !data.providerId) {
              const notifId = `available_${docSnap.id}`;
              notificationsList.push({
                id: notifId,
                type: 'job_request',
                icon: data.isNegotiable ? 'pricetag' : 'briefcase',
                iconColor: data.isNegotiable ? '#F59E0B' : '#3B82F6',
                title: data.isNegotiable ? 'New Job with Offer' : 'New Job Available',
                message: data.isNegotiable 
                  ? `Client offers ₱${(data.offeredPrice || 0).toLocaleString()} for ${data.serviceCategory || 'service'}`
                  : `${data.clientName || 'Client'} needs ${data.serviceCategory || 'service'}`,
                time: formatTime(data.createdAt),
                read: currentReadIds.has(notifId),
                jobId: docSnap.id,
              });
            }
          });
        } catch (e) {
          console.log('[NotificationsScreen] Available jobs query error:', e.message);
        }

        // Provider: my assigned jobs (show status updates)
        try {
          const myJobsQuery = query(
            collection(db, 'bookings'),
            where('providerId', '==', user.uid)
          );
          const myJobsSnapshot = await getDocs(myJobsQuery);
          myJobsSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const status = data.status;
            const notifId = `myjob_${status}_${docSnap.id}`;
            
            // Define notification content based on status for provider
            const statusConfig = {
              'accepted': { icon: 'checkmark-circle', iconColor: '#10B981', title: 'Job Accepted', message: `You accepted ${data.serviceCategory || 'service'} from ${data.clientName || 'Client'}` },
              'traveling': { icon: 'car', iconColor: '#3B82F6', title: 'On The Way', message: `Traveling to ${data.clientName || 'client'}'s location` },
              'arrived': { icon: 'location', iconColor: '#10B981', title: 'Arrived', message: `You arrived at ${data.clientName || 'client'}'s location` },
              'in_progress': { icon: 'construct', iconColor: '#8B5CF6', title: 'Work In Progress', message: `Working on ${data.serviceCategory || 'service'}` },
              'pending_completion': { icon: 'checkmark-done', iconColor: '#F59E0B', title: 'Awaiting Confirmation', message: `Waiting for ${data.clientName || 'client'} to confirm completion` },
              'pending_payment': { icon: 'card', iconColor: '#3B82F6', title: 'Awaiting Payment', message: `Waiting for payment from ${data.clientName || 'client'}` },
              'payment_received': { icon: 'cash', iconColor: '#10B981', title: 'Payment Received!', message: `₱${(data.providerPrice || data.totalAmount || 0).toLocaleString()} received for ${data.serviceCategory || 'service'}` },
              'completed': { icon: 'trophy', iconColor: '#10B981', title: 'Job Completed!', message: `${data.serviceCategory || 'Service'} completed successfully` },
            };
            
            const config = statusConfig[status];
            if (config) {
              notificationsList.push({
                id: notifId,
                type: 'my_job',
                icon: config.icon,
                iconColor: config.iconColor,
                title: config.title,
                message: config.message,
                time: formatTime(data.updatedAt || data.createdAt),
                read: currentReadIds.has(notifId),
                jobId: docSnap.id,
              });
            }
          });
        } catch (e) {
          console.log('[NotificationsScreen] My jobs query error:', e.message);
        }
      } else {
        // Client: booking updates
        const myBookingsQuery = query(
          collection(db, 'bookings'),
          where('clientId', '==', user.uid)
        );
        const myBookingsSnapshot = await getDocs(myBookingsQuery);
        myBookingsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const status = data.status;
          
          // Generate notification based on status - use status_id format for consistency
          const notifId = `${status}_${docSnap.id}`;
          
          // Define notification content based on status
          const statusConfig = {
            'accepted': { icon: 'checkmark-circle', iconColor: '#10B981', title: 'Job Accepted', message: `Your ${data.serviceCategory || 'service'} request has been accepted` },
            'traveling': { icon: 'car', iconColor: '#3B82F6', title: 'Provider On The Way', message: `Provider is traveling to your location` },
            'arrived': { icon: 'location', iconColor: '#10B981', title: 'Provider Arrived', message: `Provider has arrived at your location` },
            'in_progress': { icon: 'construct', iconColor: '#8B5CF6', title: 'Work In Progress', message: `Your ${data.serviceCategory || 'service'} is being worked on` },
            'pending_completion': { icon: 'checkmark-done', iconColor: '#F59E0B', title: 'Work Complete - Confirm', message: `Provider marked work as complete. Please confirm.` },
            'pending_payment': { icon: 'card', iconColor: '#3B82F6', title: 'Payment Required', message: `Please complete payment for your ${data.serviceCategory || 'service'}` },
            'payment_received': { icon: 'cash', iconColor: '#10B981', title: 'Payment Sent', message: `Your payment is being processed` },
            'counter_offer': { icon: 'pricetag', iconColor: '#EC4899', title: 'Counter Offer Received!', message: `Provider offers ₱${(data.counterOfferPrice || 0).toLocaleString()} - Tap to respond`, urgent: true },
            'completed': { icon: 'checkmark-circle', iconColor: '#10B981', title: 'Job Completed', message: `Your ${data.serviceCategory || 'service'} has been completed` },
          };
          
          const config = statusConfig[status];
          if (config) {
            notificationsList.push({
              id: notifId,
              type: status === 'counter_offer' ? 'counter_offer' : 'job',
              icon: config.icon,
              iconColor: config.iconColor,
              title: config.title,
              message: config.message,
              time: formatTime(data.updatedAt || data.createdAt),
              read: currentReadIds.has(notifId),
              jobId: docSnap.id,
              urgent: config.urgent || false,
            });
          }
        });
      }

      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error generating notifications:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Real-time listener will update automatically
    setTimeout(() => setRefreshing(false), 1000);
  };

  const markAsRead = async (notificationId) => {
    try {
      // Add to read set and persist FIRST
      const newReadIds = new Set(readNotificationIds);
      newReadIds.add(notificationId);
      readIdsRef.current = newReadIds; // Update ref immediately
      setReadNotificationIds(newReadIds);
      await saveReadNotifications(newReadIds);

      // Update local notifications state to show as read
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? {...notif, read: true} : notif
        )
      );

      // Also update the context to refresh badge count
      contextMarkAsRead(notificationId);

      // If it's a real Firestore notification, also update there
      if (!notificationId.includes('_')) {
        const notifRef = doc(db, 'notifications', notificationId);
        await updateDoc(notifRef, { read: true });
      }
    } catch (error) {
      console.log('Error marking as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      // Get all notification IDs
      const allIds = new Set(readNotificationIds);
      notifications.forEach(n => allIds.add(n.id));
      
      // Update Firestore for real notifications
      const batch = writeBatch(db);
      const firestoreNotifs = notifications.filter(n => !n.read && !n.id.includes('_'));
      
      firestoreNotifs.forEach(notif => {
        const notifRef = doc(db, 'notifications', notif.id);
        batch.update(notifRef, { read: true });
      });
      
      if (firestoreNotifs.length > 0) {
        await batch.commit();
      }
      
      // Update local state and persist
      setReadNotificationIds(allIds);
      await saveReadNotifications(allIds);
      setNotifications(prev => prev.map(notif => ({...notif, read: true})));
      
      // Also update the context to refresh badge count
      contextMarkAllAsRead();
      
      Alert.alert('Done', 'All notifications marked as read');
    } catch (error) {
      console.log('Error marking all as read:', error);
      // Still update local state
      const allIds = new Set(readNotificationIds);
      notifications.forEach(n => allIds.add(n.id));
      setReadNotificationIds(allIds);
      saveReadNotifications(allIds);
      setNotifications(prev => prev.map(notif => ({...notif, read: true})));
      contextMarkAllAsRead();
    }
  };

  // Delete a notification
  const handleDeleteNotification = async (notificationId) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Close the swipeable
              if (swipeableRefs.current[notificationId]) {
                swipeableRefs.current[notificationId].close();
              }

              // Remove from local state immediately
              setNotifications(prev => prev.filter(n => n.id !== notificationId));

              // Add to deleted set and persist
              const newDeletedIds = new Set(deletedNotificationIds);
              newDeletedIds.add(notificationId);
              deletedIdsRef.current = newDeletedIds;
              setDeletedNotificationIds(newDeletedIds);
              await saveDeletedNotifications(newDeletedIds);

              // Also mark as read in context to update badge
              contextMarkAsRead(notificationId);

              // If it's a real Firestore notification, delete from Firestore
              if (!notificationId.includes('_')) {
                try {
                  const notifRef = doc(db, 'notifications', notificationId);
                  await deleteDoc(notifRef);
                } catch (e) {
                  console.log('Error deleting from Firestore:', e);
                }
              }
            } catch (error) {
              console.log('Error deleting notification:', error);
            }
          },
        },
      ]
    );
  };

  // Render delete action for swipeable
  const renderRightActions = (progress, dragX, notificationId) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        onPress={() => handleDeleteNotification(notificationId)}
        style={{
          backgroundColor: '#EF4444',
          justifyContent: 'center',
          alignItems: 'center',
          width: 80,
        }}>
        <Animated.View style={{transform: [{scale}], opacity, alignItems: 'center'}}>
          <Icon name="trash-outline" size={24} color="#FFFFFF" />
          <Text style={{color: '#FFFFFF', fontSize: 12, marginTop: 4}}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read
    await markAsRead(notification.id);

    // Navigate based on notification type AND user role
    switch (notification.type) {
      case 'provider_approval':
      case 'provider_suspended':
        // Admin only - go to providers with openProviderId to open details
        if (normalizedRole === 'ADMIN') {
          navigation.navigate('Providers', { openProviderId: notification.providerId });
        }
        break;
      case 'dispute':
      case 'job_pending':
        // Admin: go to Jobs tab with jobId to open details modal
        if (normalizedRole === 'ADMIN' && notification.jobId) {
          navigation.navigate('Jobs', { openJobId: notification.jobId });
        } else if (normalizedRole === 'ADMIN') {
          navigation.navigate('Jobs');
        }
        break;
      case 'job_request':
      case 'my_job':
        // Provider: go to job details
        if (normalizedRole === 'PROVIDER' && notification.jobId) {
          navigation.navigate('ProviderJobDetails', { jobId: notification.jobId });
        }
        break;
      case 'job':
      case 'counter_offer':
      case 'additional_charge':
        // Client: go to job details
        if (normalizedRole === 'CLIENT' && notification.jobId) {
          navigation.navigate('JobDetails', { jobId: notification.jobId });
        } else if (normalizedRole === 'PROVIDER' && notification.jobId) {
          navigation.navigate('ProviderJobDetails', { jobId: notification.jobId });
        } else if (normalizedRole === 'ADMIN' && notification.jobId) {
          navigation.navigate('Jobs', { openJobId: notification.jobId });
        }
        break;
      case 'message':
        if (notification.conversationId) {
          navigation.navigate('Chat', { conversationId: notification.conversationId });
        }
        break;
      case 'payment':
        Alert.alert('Payment Details', `${notification.message}\n\nTransaction completed successfully.`);
        break;
      case 'review':
        if (normalizedRole === 'CLIENT' && notification.jobId) {
          navigation.navigate('JobDetails', { jobId: notification.jobId });
        } else if (normalizedRole === 'PROVIDER' && notification.jobId) {
          navigation.navigate('ProviderJobDetails', { jobId: notification.jobId });
        }
        break;
      default:
        // For any unhandled types, try to navigate based on role
        if (notification.jobId) {
          if (normalizedRole === 'CLIENT') {
            navigation.navigate('JobDetails', { jobId: notification.jobId });
          } else if (normalizedRole === 'PROVIDER') {
            navigation.navigate('ProviderJobDetails', { jobId: notification.jobId });
          } else if (normalizedRole === 'ADMIN') {
            navigation.navigate('Jobs', { openJobId: notification.jobId });
          }
        }
        break;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading) {
    return (
      <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB', backgroundColor: isDark ? theme.colors.card : '#FFFFFF'}}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
          </TouchableOpacity>
          <Text style={[globalStyles.heading3, {marginLeft: 16, flex: 1, color: isDark ? theme.colors.text : '#1F2937'}]}>
            Notifications
          </Text>
        </View>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color="#00B14F" />
          <Text style={{marginTop: 12, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Filter out deleted notifications and apply search
  const visibleNotifications = notifications.filter(n => {
    if (deletedNotificationIds.has(n.id)) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        n.title?.toLowerCase().includes(query) ||
        n.message?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB', backgroundColor: isDark ? theme.colors.card : '#FFFFFF'}}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
          </TouchableOpacity>
          <Text style={[globalStyles.heading3, {marginLeft: 16, flex: 1, color: isDark ? theme.colors.text : '#1F2937'}]}>
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={{fontSize: 14, color: '#00B14F', fontWeight: '600'}}>
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          margin: 16,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: isDark ? theme.colors.surface : '#F3F4F6',
          borderRadius: 10,
        }}>
          <Icon name="search" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 15,
              color: isDark ? theme.colors.text : '#1F2937',
            }}
            placeholder="Search notifications..."
            placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <Animated.ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />
          }>
          {visibleNotifications.length === 0 ? (
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60}}>
              <Icon name="notifications-off-outline" size={64} color={isDark ? theme.colors.border : '#D1D5DB'} />
              <Text style={{fontSize: 16, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 16}}>
                No notifications yet
              </Text>
              <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 40}}>
                {normalizedRole === 'ADMIN' 
                  ? 'You\'ll see provider registrations and job requests here'
                  : normalizedRole === 'PROVIDER'
                  ? 'You\'ll see new job requests and payments here'
                  : 'You\'ll see updates about your bookings here'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#9CA3AF', textAlign: 'center', paddingVertical: 8}}>
                Swipe left to delete
              </Text>
              {visibleNotifications.map((notification) => (
                <Swipeable
                  key={notification.id}
                  ref={ref => swipeableRefs.current[notification.id] = ref}
                  renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, notification.id)}
                  rightThreshold={40}
                  overshootRight={false}>
                  <TouchableOpacity
                    onPress={() => handleNotificationPress(notification)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? theme.colors.border : '#F3F4F6',
                      backgroundColor: notification.read 
                        ? (isDark ? theme.colors.card : '#FFFFFF') 
                        : (isDark ? '#064E3B' : '#F0FDF4'),
                    }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: `${notification.iconColor || '#00B14F'}15`,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                      <Icon name={notification.icon || 'notifications'} size={24} color={notification.iconColor || '#00B14F'} />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={{fontSize: 16, fontWeight: notification.read ? '500' : '600', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 4}}>
                        {notification.title}
                      </Text>
                      <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280', marginBottom: 4}} numberOfLines={2}>
                        {notification.message}
                      </Text>
                      <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#9CA3AF'}}>
                        {notification.time}
                      </Text>
                    </View>
                    {!notification.read && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#00B14F',
                          marginTop: 8,
                        }}
                      />
                    )}
                  </TouchableOpacity>
                </Swipeable>
              ))}
            </>
          )}
        </Animated.ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default NotificationsScreen;
