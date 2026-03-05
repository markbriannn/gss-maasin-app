const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findAwaitingBookings() {
  try {
    console.log('\n=== Finding bookings with awaiting_payment status ===\n');

    const bookingsSnapshot = await db.collection('bookings')
      .where('status', '==', 'awaiting_payment')
      .limit(10)
      .get();

    console.log(`Found ${bookingsSnapshot.size} booking(s):\n`);

    for (const bookingDoc of bookingsSnapshot.docs) {
      const booking = bookingDoc.data();
      console.log(`Booking ID: ${bookingDoc.id}`);
      console.log('  Client:', booking.clientName);
      console.log('  Service:', booking.serviceName);
      console.log('  Amount: ₱' + (booking.totalPrice || booking.offeredPrice));
      console.log('  Created:', booking.createdAt?.toDate().toLocaleString());
      console.log('  Payment preference:', booking.paymentPreference);
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

findAwaitingBookings().then(() => process.exit(0));
