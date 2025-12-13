import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence, connectAuthEmulator } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  connectFirestoreEmulator, 
  enableNetwork,
  CACHE_SIZE_UNLIMITED,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, LogBox, Platform } from 'react-native';
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

// Initialize Auth - use getAuth if already initialized, otherwise initializeAuth
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

// Initialize Firestore with settings to help prevent the internal assertion error
// The bug in Firebase JS SDK 12.6.0 is related to watch stream state management
let db;
try {
  db = initializeFirestore(app, {
    // Use memory cache to avoid IndexedDB issues in React Native
    experimentalForceLongPolling: true, // Use long polling instead of WebChannel
    useFetchStreams: false, // Disable fetch streams which can cause issues
  });
} catch (error) {
  // If already initialized, just get the instance
  db = getFirestore(app);
}

const storage = getStorage(app);

// Handle app state changes to manage Firestore connection
let appState = AppState.currentState;
let appStateSubscription = null;

const setupAppStateListener = () => {
  if (appStateSubscription) return;
  
  appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - re-enable network
      try {
        await enableNetwork(db);
      } catch (e) {
        // Silently handle - Firestore will auto-reconnect
        console.log('Firestore network re-enable handled');
      }
    }
    appState = nextAppState;
  });
};

// Setup listener
setupAppStateListener();

// Flip this flag to true when using local emulators during development.
const useEmulator = false;
if (useEmulator) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}

export { app, auth, db, storage };
