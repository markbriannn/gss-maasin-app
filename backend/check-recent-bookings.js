const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkRecentBookings(userId) {
  try {
    const bookingsSnapshot = await db.collection('bookings')
      .where('clientId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    console.log(`\n=== Recent Bookings for User ${userId} ===\n`);

    if (bookingsSnapshot.empty) {
      console.log('No bookings found');
      return;
    }

    bookingsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. Booking ID: ${doc.id}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Payment Status: ${data.paymentStatus}`);
      console.log(`   Is Paid Upfront: ${data.isPaidUpfront}`);
      console.log(`   Upfront Paid: ₱${data.upfrontPaidAmount || 0}`);
      console.log(`   Total: ₱${data.totalAmount}`);
      console.log(`   Created: ${data.createdAt?.toDate?.()}`);
      console.log(`   Updated: ${data.updatedAt?.toDate?.()}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Get user ID from command line
const userId = process.argv[2];
if (!userId) {
  console.log('Usage: node check-recent-bookings.js <userId>');
  process.exit(1);
}

checkRecentBookings(userId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
