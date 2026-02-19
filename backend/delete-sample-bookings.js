const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function deleteSampleBookings() {
  console.log('Deleting old sample bookings...');

  try {
    const snapshot = await db.collection('bookings').get();
    
    if (snapshot.empty) {
      console.log('No bookings to delete');
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Deleted ${snapshot.size} bookings`);

  } catch (error) {
    console.error('Error deleting bookings:', error);
  }
}

deleteSampleBookings()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
