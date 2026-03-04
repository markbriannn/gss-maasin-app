const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixCompletedPaymentStatus() {
  console.log('🔍 Finding bookings with pending_payment status but payment completed...\n');

  try {
    // Find all bookings with pending_payment status
    const bookingsRef = db.collection('bookings');
    const snapshot = await bookingsRef
      .where('status', '==', 'pending_payment')
      .get();

    if (snapshot.empty) {
      console.log('✓ No bookings found with pending_payment status');
      return;
    }

    console.log(`Found ${snapshot.size} booking(s) with pending_payment status\n`);

    let fixed = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
      const booking = doc.data();
      const bookingId = doc.id;

      console.log(`\n📋 Booking ID: ${bookingId}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   isPaidUpfront: ${booking.isPaidUpfront}`);
      console.log(`   isPaidCompletion: ${booking.isPaidCompletion}`);
      console.log(`   upfrontPaidAmount: ₱${booking.upfrontPaidAmount || 0}`);
      console.log(`   completionPaidAmount: ₱${booking.completionPaidAmount || 0}`);

      // Check if completion payment is actually paid
      if (booking.isPaidCompletion === true || booking.completionPaidAmount > 0) {
        console.log(`   ⚠️  Payment completed but status still pending_payment!`);
        console.log(`   🔧 Updating status to 'completed'...`);

        await bookingsRef.doc(bookingId).update({
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`   ✅ Fixed! Status updated to 'completed'`);
        fixed++;
      } else {
        console.log(`   ℹ️  Payment not yet completed, skipping`);
        skipped++;
      }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${snapshot.size}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the fix
fixCompletedPaymentStatus()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
