const admin = require('firebase-admin');

let db = null;

const initializeFirebase = () => {
  if (admin.apps.length === 0) {
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
