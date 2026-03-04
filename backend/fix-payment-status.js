const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixPaymentStatus() {
  try {
    console.log('🔍 Searching for bookings with payment issues...\n');

    // Find all bookings that are paid upfront but still in awaiting_payment status
    const bookingsSnapshot = await db.collection('bookings')
      .where('isPaidUpfront', '==', true)
      .get();

    if (bookingsSnapshot.empty) {
      console.log('✅ No bookings found with isPaidUpfront=true');
      return;
    }

    console.log(`Found ${bookingsSnapshot.size} booking(s) with upfront payment\n`);

    let fixed = 0;
    let skipped = 0;

    for (const doc of bookingsSnapshot.docs) {
      const booking = doc.data();
      const bookingId = doc.id;

      console.log(`\n📋 Booking ID: ${bookingId}`);
      console.log(`   Service: ${booking.serviceCategory || 'N/A'}`);
      console.log(`   Client: ${booking.clientName || 'N/A'}`);
      console.log(`   Current Status: ${booking.status}`);
      console.log(`   isPaidUpfront: ${booking.isPaidUpfront}`);
      console.log(`   upfrontPaidAmount: ₱${booking.upfrontPaidAmount || 0}`);
      console.log(`   paymentStatus: ${booking.paymentStatus || 'N/A'}`);

      // Fix bookings stuck in awaiting_payment despite being paid
      if (booking.status === 'awaiting_payment' && booking.isPaidUpfront) {
        console.log(`   🔧 Fixing: awaiting_payment -> pending`);
        
        await db.collection('bookings').doc(bookingId).update({
          status: 'pending',
          paymentStatus: 'held',
          updatedAt: new Date(),
        });

        console.log(`   ✅ Status updated successfully!`);
        fixed++;
      } 
      // Fix bookings stuck in pending_payment despite being paid
      else if (booking.status === 'pending_payment' && booking.isPaidUpfront) {
        console.log(`   🔧 Fixing: pending_payment -> accepted`);
        
        await db.collection('bookings').doc(bookingId).update({
          status: 'accepted',
          paymentStatus: 'held',
          updatedAt: new Date(),
        });

        console.log(`   ✅ Status updated successfully!`);
        fixed++;
      }
      else {
        console.log(`   ℹ️  Status is correct (${booking.status}), no fix needed`);
        skipped++;
      }
    }

    console.log(`\n✅ Fix completed!`);
    console.log(`   Fixed: ${fixed} booking(s)`);
    console.log(`   Skipped: ${skipped} booking(s)`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPaymentStatus();
