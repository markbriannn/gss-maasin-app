const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// CHANGE THIS to your booking ID
const BOOKING_ID = '35wyQb6NdX0AwFWS7Yk5';

async function manuallyCompletePayment() {
  console.log(`🔧 Manually completing payment for booking: ${BOOKING_ID}\n`);

  try {
    const bookingRef = db.collection('bookings').doc(BOOKING_ID);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      console.log('❌ Booking not found!');
      return;
    }

    const booking = bookingDoc.data();
    
    console.log('📋 Current booking status:');
    console.log(`   Status: ${booking.status}`);
    console.log(`   isPaidUpfront: ${booking.isPaidUpfront}`);
    console.log(`   isPaidCompletion: ${booking.isPaidCompletion}`);
    console.log(`   upfrontPaidAmount: ₱${booking.upfrontPaidAmount || 0}`);
    console.log(`   completionPaidAmount: ₱${booking.completionPaidAmount || 0}`);
    console.log(`   totalAmount: ₱${booking.totalAmount || booking.finalAmount || 0}`);

    // Calculate completion amount (remaining 50%)
    const totalAmount = booking.totalAmount || booking.finalAmount || 0;
    const upfrontAmount = booking.upfrontPaidAmount || 0;
    const completionAmount = totalAmount - upfrontAmount;

    console.log(`\n💰 Calculated completion amount: ₱${completionAmount.toFixed(2)}`);
    console.log(`\n🔄 Updating booking...`);

    // Update the booking to mark completion payment as paid
    await bookingRef.update({
      isPaidCompletion: true,
      completionPaidAmount: completionAmount,
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`\n✅ Payment completed successfully!`);
    console.log(`   Status updated to: completed`);
    console.log(`   isPaidCompletion: true`);
    console.log(`   completionPaidAmount: ₱${completionAmount.toFixed(2)}`);
    console.log(`\n✨ The booking should now show as completed in the app!`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the fix
manuallyCompletePayment()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
