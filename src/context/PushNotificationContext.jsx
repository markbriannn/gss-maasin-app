import React, {createContext, useContext, useEffect, useState, useRef} from 'react';
import {Alert, Platform} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import pushNotificationService from '../services/pushNotificationService';
import {useAuth} from './AuthContext';

const PushNotificationContext = createContext({});

export const usePushNotifications = () => useContext(PushNotificationContext);

export const PushNotificationProvider = ({children}) => {
  const {user, isAuthenticated} = useAuth();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);
  const navigationRef = useRef(null);

  // Initialize push notifications when user logs in
  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      initializePushNotifications();
    }
  }, [isAuthenticated, user?.uid]);

  const initializePushNotifications = async () => {
    try {
      // Request permission
      const granted = await pushNotificationService.requestPermission();
      setPermissionGranted(granted);

      if (granted) {
        // Get and save token
        const token = await pushNotificationService.getToken();
        setFcmToken(token);
        
        // Save to user's Firestore document
        await pushNotificationService.saveTokenToUser(user.uid);

        // Listen for token refresh
        const unsubscribeTokenRefresh = pushNotificationService.onTokenRefresh(user.uid);

        // Handle foreground messages
        const unsubscribeForeground = pushNotificationService.onForegroundMessage(handleForegroundMessage);

        // Handle notification tap from background
        pushNotificationService.onNotificationOpenedApp(handleNotificationTap);

        // Check if app was opened from notification
        const initialNotification = await pushNotificationService.getInitialNotification();
        if (initialNotification) {
          // Small delay to ensure navigation is ready
          setTimeout(() => handleNotificationTap(initialNotification), 1000);
        }

        return () => {
          unsubscribeTokenRefresh();
          unsubscribeForeground();
        };
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  // Handle foreground message - show in-app alert
  const handleForegroundMessage = (remoteMessage) => {
    const {notification, data} = remoteMessage;
    
    Alert.alert(
      notification?.title || 'New Notification',
      notification?.body || '',
      [
        {text: 'Dismiss', style: 'cancel'},
        {
          text: 'View',
          onPress: () => handleNotificationTap(remoteMessage),
        },
      ]
    );
  };

  // Handle notification tap - navigate to relevant screen
  const handleNotificationTap = (remoteMessage) => {
    const {data} = remoteMessage;
    
    if (!data) return;

    // Navigate based on notification type
    switch (data.type) {
      case 'new_job':
      case 'job_update':
        // Navigate to job details
        if (data.jobId) {
          // Provider view
          navigationRef.current?.navigate('ProviderJobDetails', {jobId: data.jobId});
        }
        break;
        
      case 'booking_accepted':
      case 'booking_update':
        // Navigate to booking/job details
        if (data.jobId) {
          navigationRef.current?.navigate('JobDetails', {jobId: data.jobId});
        }
        break;
        
      case 'new_message':
        // Navigate to chat
        if (data.conversationId) {
          navigationRef.current?.navigate('Chat', {
            conversationId: data.conversationId,
            recipient: {id: data.senderId, name: data.senderName},
          });
        }
        break;
        
      case 'provider_approved':
        // Navigate to provider dashboard
        navigationRef.current?.navigate('ProviderMain');
        break;
        
      case 'payment_received':
        // Navigate to earnings
        navigationRef.current?.navigate('Earnings');
        break;
        
      default:
        // Navigate to notifications screen
        navigationRef.current?.navigate('Notifications');
    }
  };

  // Set navigation ref (called from App.jsx)
  const setNavigationRef = (ref) => {
    navigationRef.current = ref;
  };

  // Remove token on logout
  const clearPushToken = async () => {
    if (user?.uid) {
      await pushNotificationService.removeToken(user.uid);
    }
    setFcmToken(null);
  };

  return (
    <PushNotificationContext.Provider
      value={{
        permissionGranted,
        fcmToken,
        setNavigationRef,
        clearPushToken,
        requestPermission: pushNotificationService.requestPermission,
      }}>
      {children}
    </PushNotificationContext.Provider>
  );
};

export default PushNotificationContext;
