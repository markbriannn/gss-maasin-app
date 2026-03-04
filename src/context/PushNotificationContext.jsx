import { createContext, useContext, useEffect, useState, useRef } from 'react';
import pushNotificationService from '../services/pushNotificationService';
import { useAuth } from './AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const PushNotificationContext = createContext({});

export const usePushNotifications = () => useContext(PushNotificationContext);

export const PushNotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const navigationRef = useRef(null);

  // Initialize push notifications when user logs in (non-blocking)
  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      // Delay initialization to ensure Activity is mounted
      const timer = setTimeout(() => {
        initializePushNotifications().catch(err => {
          console.log('Push notification init skipped:', err?.message);
        });
      }, 2000); // 2 second delay to ensure Activity is ready

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user?.uid]);

  const initializePushNotifications = async () => {
    try {
      // Request permission (quick operation)
      const granted = await pushNotificationService.requestPermission();
      setPermissionGranted(granted);

      if (!granted) return;

      // Get token with timeout - don't block if slow
      const token = await pushNotificationService.getToken();
      setFcmToken(token);

      if (!token) {
        console.log('Push notifications unavailable - using in-app notifications only');
        return;
      }

      // Save token to Firestore in background (don't await)
      pushNotificationService.saveTokenToUser(user.uid).catch(() => { });

      // Set up listeners
      const unsubscribeTokenRefresh = pushNotificationService.onTokenRefresh(user.uid);
      pushNotificationService.onNotificationOpenedApp(handleNotificationTap);

      // Handle foreground messages — especially incoming calls
      const unsubscribeForeground = pushNotificationService.onForegroundMessage((remoteMessage) => {
        const { data } = remoteMessage;
        if (data?.type === 'incoming_call' && data?.callId) {
          console.log('[FCM] Foreground incoming call from:', data.callerName);
          // Trigger incoming call UI by fetching call data from Firestore
          handleForegroundIncomingCall(data);
        }
      });

      // Check initial notification
      const initialNotification = await pushNotificationService.getInitialNotification();
      if (initialNotification) {
        setTimeout(() => handleNotificationTap(initialNotification), 1000);
      }

      return () => {
        unsubscribeTokenRefresh();
        if (unsubscribeForeground) unsubscribeForeground();
      };
    } catch (error) {
      // Silent fail - push notifications are optional
      console.log('Push setup skipped:', error?.message);
    }
  };

  // Handle notification tap - navigate to relevant screen
  const handleNotificationTap = async (remoteMessage) => {
    const { data } = remoteMessage;

    if (!data) return;

    // Navigate based on notification type
    switch (data.type) {
      case 'new_job':
      case 'job_update':
        // Navigate to job details
        if (data.jobId) {
          // Provider view
          navigationRef.current?.navigate('ProviderJobDetails', { jobId: data.jobId });
        }
        break;

      case 'booking_accepted':
      case 'booking_update':
        // Navigate to booking/job details
        if (data.jobId) {
          navigationRef.current?.navigate('JobDetails', { jobId: data.jobId });
        }
        break;

      case 'new_message':
        // Navigate to chat
        if (data.conversationId) {
          navigationRef.current?.navigate('Chat', {
            conversationId: data.conversationId,
            // recipient info is optional - Chat screen will fetch it from the conversation
            recipient: data.senderId ? { id: data.senderId, name: data.senderName || 'User' } : null,
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

      case 'incoming_call':
        // Fetch the call document and trigger the global incoming call UI
        if (data.callId) {
          try {
            const callDoc = await getDoc(doc(db, 'calls', data.callId));
            if (callDoc.exists()) {
              const callData = { id: callDoc.id, ...callDoc.data() };
              
              // Check if call is still ringing (not already answered/declined/ended)
              if (callData.status === 'ringing') {
                // Set incoming call data so the global incoming call modal shows
                // This will be picked up by App.jsx's incoming call listener
                setIncomingCallData(callData);
                
                console.log('[Push] Incoming call notification tapped, showing call UI for:', callData.callerName);
              } else {
                console.log('[Push] Call already ended/answered, status:', callData.status);
              }
            }
          } catch (err) {
            console.error('Error handling incoming call notification:', err);
          }
        }
        break;

      default:
        // Navigate to notifications screen
        navigationRef.current?.navigate('Notifications');
    }
  };

  // Handle foreground incoming call — set state so global call UI can show
  const handleForegroundIncomingCall = async (data) => {
    try {
      const callDoc = await getDoc(doc(db, 'calls', data.callId));
      if (callDoc.exists()) {
        const callData = { id: callDoc.id, ...callDoc.data() };
        setIncomingCallData(callData);
      }
    } catch (err) {
      console.error('Error fetching incoming call:', err);
    }
  };

  // Clear incoming call data (called when call is answered/declined)
  const clearIncomingCall = () => {
    setIncomingCallData(null);
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
        incomingCallData,
        clearIncomingCall,
        setNavigationRef,
        clearPushToken,
        requestPermission: pushNotificationService.requestPermission,
      }}>
      {children}
    </PushNotificationContext.Provider>
  );
};

export default PushNotificationContext;
