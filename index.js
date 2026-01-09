/**
 * @format
 */

// Polyfill for TextEncoder/TextDecoder required by Firebase JS SDK 12.x on Hermes
import 'text-encoding-polyfill';

import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {name as appName} from './app.json';
import App from './App';

// Handle background/quit state notifications
// This MUST be outside of any component and called before AppRegistry
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Background message received:', JSON.stringify(remoteMessage));
  // FCM will automatically display the notification if it has a 'notification' payload
  // No additional handling needed - the notification will show in the system tray
});

AppRegistry.registerComponent(appName, () => App);
