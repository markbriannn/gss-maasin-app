const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkAwaitingPayment() {
  try {
    console.log('🔍 Searching for bookings in awaiting_payment status...\n');

    const bookingsSnapshot = await db.collection('bookings')
      .where('status', '==', 'awaiting_payment')
      .get();

    if (bookingsSnapshot.empty) {
      console.log('✅ No bookings found in awaiting_payment status');
      process.exit(0);
    }

    console.log(`Found ${bookingsSnapshot.size} booking(s) in awaiting_payment status\n`);

    for (const doc of bookingsSnapshot.docs) {
      const booking = doc.data();
      const bookingId = doc.id;

      console.log(`\n📋 Booking ID: ${bookingId}`);
      console.log(`   Service: ${booking.serviceCategory || 'N/A'}`);
      console.log(`   Client: ${booking.clientName || 'N/A'}`);
      console.log(`   Provider: ${booking.providerName || 'N/A'}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   isPaidUpfront: ${booking.isPaidUpfront || false}`);
      console.log(`   upfrontPaidAmount: ₱${booking.upfrontPaidAmount || 0}`);
      console.log(`   Total Amount: ₱${booking.totalAmount || 0}`);
      console.log(`   Created: ${booking.createdAt?.toDate?.() || 'N/A'}`);

      // Check payment records
      const paymentsSnapshot = await db.collection('payments')
        .where('bookingId', '==', bookingId)
        .get();

      if (!paymentsSnapshot.empty) {
        console.log(`   💳 Payment Records:`);
        paymentsSnapshot.forEach(payDoc => {
          const payment = payDoc.data();
          console.log(`      - Status: ${payment.status}, Amount: ₱${payment.amount || 0}, Type: ${payment.type || 'N/A'}`);
        });
      } else {
        console.log(`   💳 No payment records found`);
      }

      // Determine if fix is needed
      if (booking.isPaidUpfront && booking.upfrontPaidAmount > 0) {
        console.log(`   ⚠️  NEEDS FIX: Has upfront payment but still awaiting_payment`);
      } else {
        console.log(`   ✅ Correct: No payment yet, should remain awaiting_payment`);
      }
    }

    console.log('\n✅ Check completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAwaitingPayment();
