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
        
        // Only proceed with FCM setup if token was obtained
        if (token) {
          // Save to user's Firestore document
          await pushNotificationService.saveTokenToUser(user.uid);

          // Listen for token refresh
          const unsubscribeTokenRefresh = pushNotificationService.onTokenRefresh(user.uid);

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
          };
        } else {
          // FCM not available (emulator without Google Play Services)
          console.log('Push notifications unavailable - app will use in-app notifications only');
        }
      }
    } catch (error) {
      // Silently handle - push notifications are optional
      console.log('Push notifications setup skipped:', error?.message || 'Unknown error');
    }
  };

  // Handle foreground message - DO NOT show alert here
  // NotificationContext handles showing the popup to avoid duplicates
  const handleForegroundMessage = (remoteMessage) => {
    console.log('[PushNotifications] Foreground message received, handled by NotificationContext');
    // Don't show any Alert here - NotificationContext will handle it
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
