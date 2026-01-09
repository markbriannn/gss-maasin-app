// Push Notification Service using Firebase Cloud Messaging
import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid, Alert} from 'react-native';
import {doc, updateDoc, getDoc} from 'firebase/firestore';
import {db} from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FCM_TOKEN_KEY = '@fcm_token';

class PushNotificationService {
  // Request permission for notifications (required for iOS, optional for Android 13+)
  async requestPermission() {
    try {
      // For Android 13+ (API 33+), we need to request POST_NOTIFICATIONS permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'GSS Maasin needs notification permission to keep you updated on jobs and messages.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission denied');
          return false;
        }
      }

      // Request Firebase messaging permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Push notification permission granted');
        return true;
      }
      
      console.log('Push notification permission denied');
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Get FCM token for this device
  async getToken() {
    try {
      // Add timeout to prevent blocking - 3 seconds max
      const tokenPromise = messaging().getToken();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('FCM_TIMEOUT')), 3000)
      );
      
      const token = await Promise.race([tokenPromise, timeoutPromise]);
      console.log('FCM Token obtained successfully');
      
      // Store locally
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      
      return token;
    } catch (error) {
      // Handle all FCM errors gracefully - don't block login
      const errorMessage = error?.message || '';
      if (errorMessage.includes('SERVICE_NOT_AVAILABLE') || 
          errorMessage.includes('UNAVAILABLE') ||
          errorMessage.includes('FCM_TIMEOUT')) {
        console.log('FCM: Push notifications unavailable or timed out');
        return null;
      }
      
      console.log('FCM token error (non-blocking):', error?.code || error?.message || 'Unknown');
      return null;
    }
  }


  // Save FCM token to user's Firestore document
  async saveTokenToUser(userId) {
    if (!userId) return;
    
    try {
      const token = await this.getToken();
      if (!token) return;

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date(),
        platform: Platform.OS,
      });
      
      console.log('FCM token saved to user profile');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  // Remove FCM token when user logs out
  async removeToken(userId) {
    if (!userId) return;
    
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: null,
        fcmTokenUpdatedAt: new Date(),
      });
      
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
      console.log('FCM token removed');
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }

  // Listen for token refresh
  onTokenRefresh(userId) {
    return messaging().onTokenRefresh(async (newToken) => {
      console.log('FCM Token refreshed:', newToken);
      await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
      
      if (userId) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          fcmToken: newToken,
          fcmTokenUpdatedAt: new Date(),
        });
      }
    });
  }

  // Handle foreground messages (app is open)
  onForegroundMessage(callback) {
    return messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message received:', remoteMessage);
      
      // Pass to callback - let the callback decide whether to show notification
      // Don't show any default alert here to avoid duplicates
      if (callback) {
        callback(remoteMessage);
      }
      // Removed default Alert.alert to prevent duplicate notifications
    });
  }

  // Handle background/quit state message tap
  onNotificationOpenedApp(callback) {
    // When app is opened from background by tapping notification
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app from background:', remoteMessage);
      if (callback) callback(remoteMessage);
    });
  }

  // Check if app was opened from a notification (when app was quit)
  async getInitialNotification() {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      console.log('App opened from quit state by notification:', remoteMessage);
    }
    return remoteMessage;
  }

  // Set background message handler (must be called outside of component)
  static setBackgroundHandler() {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message received:', remoteMessage);
      // Handle background message - notification will be shown automatically
    });
  }
}

// Singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;

// Export static method for background handler
export const setBackgroundMessageHandler = PushNotificationService.setBackgroundHandler;
