import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogBox } from 'react-native';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

// Ignore known Firebase warnings/errors in React Native
LogBox.ignoreLogs([
  'WebChannelConnection RPC',
  '@firebase/firestore: Firestore',
  'transport errored',
  'FIRESTORE (12.6.0) INTERNAL ASSERTION FAILED',
  'Unexpected state',
  'INTERNAL ASSERTION FAILED',
  'AsyncStorage has been extracted',
  'Setting a timer',
  'Require cycle:',
  'INTERNAL UNHANDLED ERROR',
]);

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// Initialize Firebase app only if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

// Initialize Firestore with long polling for React Native compatibility
// This helps avoid WebChannel issues while maintaining real-time updates
let db;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch (error) {
  db = getFirestore(app);
}

const storage = getStorage(app);

export { app, auth, db, storage };
