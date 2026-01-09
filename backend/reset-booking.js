// Script to reset booking status for testing
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'gss-maasincity',
  });
}

const db = admin.firestore();

async function resetBooking() {
  const bookingId = 'PU4M79RZzFDY1NY26PSX';
  
  try {
    await db.collection('bookings').doc(bookingId).update({
      status: 'pending',
      adminApproved: true,
      acceptedAt: admin.firestore.FieldValue.delete(),
      travelingAt: admin.firestore.FieldValue.delete(),
      arrivedAt: admin.firestore.FieldValue.delete(),
      startedAt: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`✅ Booking ${bookingId} reset to pending status`);
    console.log('Now you can test the Accept → Start Traveling → I\'ve Arrived → Start Working flow');
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

resetBooking();
