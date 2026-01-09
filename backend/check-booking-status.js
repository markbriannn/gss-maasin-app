// Script to check booking status
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

async function checkBookingStatus() {
  try {
    // Get recent bookings
    const bookingsSnapshot = await db.collection('bookings')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    console.log('\n=== Recent Bookings ===\n');
    
    bookingsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Admin Approved: ${data.adminApproved}`);
      console.log(`  Service: ${data.serviceCategory}`);
      console.log(`  Client: ${data.clientName || data.clientId}`);
      console.log(`  Provider: ${data.providerName || data.providerId}`);
      console.log(`  Created: ${data.createdAt?.toDate?.() || 'N/A'}`);
      console.log(`  Updated: ${data.updatedAt?.toDate?.() || 'N/A'}`);
      console.log('---');
    });

    // Check for any stuck bookings
    console.log('\n=== Checking for stuck bookings ===\n');
    
    const pendingBookings = await db.collection('bookings')
      .where('status', 'in', ['pending', 'accepted', 'traveling', 'arrived', 'in_progress'])
      .get();

    pendingBookings.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Active Booking: ${doc.id}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Admin Approved: ${data.adminApproved}`);
      console.log(`  Provider: ${data.providerName}`);
      console.log(`  Client: ${data.clientName}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkBookingStatus();
