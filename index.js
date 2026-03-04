/**
 * @format
 */

// Polyfill for TextEncoder/TextDecoder required by Firebase JS SDK 12.x on Hermes
import 'text-encoding-polyfill';

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { name as appName } from './app.json';
import App from './App';

// Handle background/quit state notifications
// This MUST be outside of any component and called before AppRegistry
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Background message received:', JSON.stringify(remoteMessage));

  // For incoming calls, the FCM notification payload (sent from callService)
  // will automatically show a notification with title and body.
  // No additional handling needed - tapping it will open the app
  // and PushNotificationContext will handle the navigation.

  const data = remoteMessage?.data;
  if (data?.type === 'incoming_call') {
    console.log('[FCM] Background incoming call from:', data.callerName);
    // The notification is shown automatically by FCM if it has a 'notification' payload
    // When user taps it, onNotificationOpenedApp / getInitialNotification will fire
  }
});

AppRegistry.registerComponent(appName, () => App);
