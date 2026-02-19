// Script to check what fields exist in completed bookings
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkCompletedBookings() {
  console.log('\n=== Checking Completed Booking Fields ===\n');
  
  try {
    const completedBookings = await db.collection('bookings')
      .where('status', '==', 'completed')
      .limit(5)
      .get();
    
    if (completedBookings.empty) {
      console.log('No completed bookings found');
      return;
    }
    
    completedBookings.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Booking ${index + 1} (${doc.id}) ---`);
      console.log('Provider ID:', data.providerId);
      console.log('Status:', data.status);
      console.log('Service Category:', data.serviceCategory);
      console.log('\nTimestamp Fields:');
      console.log('- createdAt:', data.createdAt?.toDate?.() || 'N/A');
      console.log('- acceptedAt:', data.acceptedAt?.toDate?.() || 'N/A');
      console.log('- travelingAt:', data.travelingAt?.toDate?.() || 'N/A');
      console.log('- arrivedAt:', data.arrivedAt?.toDate?.() || 'N/A');
      console.log('- workStartedAt:', data.workStartedAt?.toDate?.() || 'N/A');
      console.log('- workCompletedAt:', data.workCompletedAt?.toDate?.() || 'N/A');
      console.log('- startedAt:', data.startedAt?.toDate?.() || 'N/A');
      console.log('- completedAt:', data.completedAt?.toDate?.() || 'N/A');
      console.log('- updatedAt:', data.updatedAt?.toDate?.() || 'N/A');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkCompletedBookings();
