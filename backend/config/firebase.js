const admin = require('firebase-admin');
const path = require('path');

let db = null;

const initializeFirebase = () => {
  if (admin.apps.length === 0) {
    // Try to use service account JSON file first (for local development)
    try {
      const serviceAccount = require('../serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase initialized with service account JSON file');
    } catch (e) {
      // Fall back to environment variables (for production/Render)
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('Firebase initialized with environment variables');
    }
  }
  db = admin.firestore();
  return db;
};

const getDb = () => {
  if (!db) {
    initializeFirebase();
  }
  return db;
};

const getAuth = () => admin.auth();
const getMessaging = () => admin.messaging();

module.exports = {
  initializeFirebase,
  getDb,
  getAuth,
  getMessaging,
  admin,
};
