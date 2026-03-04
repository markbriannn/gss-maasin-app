const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixAwaitingPaymentBookings() {
  try {
    console.log('🔍 Searching for bookings stuck in awaiting_payment...\n');

    // Find all bookings with awaiting_payment status that have been paid
    const bookingsSnapshot = await db.collection('bookings')
      .where('status', '==', 'awaiting_payment')
      .get();

    if (bookingsSnapshot.empty) {
      console.log('✅ No bookings found with awaiting_payment status');
      return;
    }

    console.log(`Found ${bookingsSnapshot.size} booking(s) with awaiting_payment status\n`);

    for (const doc of bookingsSnapshot.docs) {
      const booking = doc.data();
      const bookingId = doc.id;

      console.log(`\n📋 Booking ID: ${bookingId}`);
      console.log(`   Service: ${booking.serviceCategory || 'N/A'}`);
      console.log(`   Client: ${booking.clientName || 'N/A'}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   isPaidUpfront: ${booking.isPaidUpfront || false}`);
      console.log(`   upfrontPaidAmount: ₱${booking.upfrontPaidAmount || 0}`);
      console.log(`   Total Amount: ₱${booking.totalAmount || 0}`);

      // Check if upfront payment was made
      if (booking.isPaidUpfront && booking.upfrontPaidAmount > 0) {
        console.log(`   ✅ Upfront payment detected: ₱${booking.upfrontPaidAmount}`);
        console.log(`   🔧 Updating status from 'awaiting_payment' to 'pending'...`);

        await db.collection('bookings').doc(bookingId).update({
          status: 'pending',
          paymentStatus: 'held',
          updatedAt: new Date(),
        });

        console.log(`   ✅ Status updated successfully!`);
      } else {
        console.log(`   ⚠️  No upfront payment found - keeping awaiting_payment status`);
      }
    }

    console.log('\n✅ Fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAwaitingPaymentBookings();
