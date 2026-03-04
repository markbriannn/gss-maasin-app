const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixSpecificBooking() {
  try {
    // Get booking ID from command line argument
    const bookingId = process.argv[2];
    
    if (!bookingId) {
      console.log('Usage: node fix-specific-booking.js <bookingId>');
      console.log('Example: node fix-specific-booking.js avThon0uTsWi1702j3G');
      process.exit(1);
    }

    console.log(`🔍 Checking booking: ${bookingId}\n`);

    const bookingDoc = await db.collection('bookings').doc(bookingId).get();

    if (!bookingDoc.exists) {
      console.log('❌ Booking not found');
      process.exit(1);
    }

    const booking = bookingDoc.data();

    console.log('📋 Current Booking Data:');
    console.log(`   Service: ${booking.serviceCategory || 'N/A'}`);
    console.log(`   Client: ${booking.clientName || 'N/A'}`);
    console.log(`   Provider: ${booking.providerName || 'N/A'}`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   Payment Status: ${booking.paymentStatus || 'N/A'}`);
    console.log(`   isPaidUpfront: ${booking.isPaidUpfront || false}`);
    console.log(`   upfrontPaidAmount: ₱${booking.upfrontPaidAmount || 0}`);
    console.log(`   Total Amount: ₱${booking.totalAmount || 0}`);
    console.log(`   Payment Method: ${booking.paymentMethod || 'N/A'}`);

    // Check payment records
    console.log('\n🔍 Checking payment records...');
    const paymentsSnapshot = await db.collection('payments')
      .where('bookingId', '==', bookingId)
      .get();

    if (!paymentsSnapshot.empty) {
      console.log(`\n💳 Found ${paymentsSnapshot.size} payment record(s):`);
      paymentsSnapshot.forEach(doc => {
        const payment = doc.data();
        console.log(`   - Payment ID: ${doc.id}`);
        console.log(`     Status: ${payment.status}`);
        console.log(`     Amount: ₱${payment.amount || 0}`);
        console.log(`     Type: ${payment.type || 'N/A'}`);
        console.log(`     Created: ${payment.createdAt?.toDate?.() || 'N/A'}`);
        console.log(`     Paid At: ${payment.paidAt?.toDate?.() || 'N/A'}`);
      });
    } else {
      console.log('   No payment records found');
    }

    // Determine what fix is needed
    console.log('\n🔧 Determining fix...');

    if (booking.isPaidUpfront && booking.upfrontPaidAmount > 0) {
      if (booking.status === 'awaiting_payment') {
        console.log('   Fix: awaiting_payment -> pending (upfront payment received)');
        
        await db.collection('bookings').doc(bookingId).update({
          status: 'pending',
          paymentStatus: 'held',
          updatedAt: new Date(),
        });

        console.log('\n✅ Booking status updated successfully!');
        console.log('   New Status: pending');
        console.log('   Payment Status: held');
      } else if (booking.status === 'pending_payment') {
        console.log('   Fix: pending_payment -> accepted (upfront payment received)');
        
        await db.collection('bookings').doc(bookingId).update({
          status: 'accepted',
          paymentStatus: 'held',
          updatedAt: new Date(),
        });

        console.log('\n✅ Booking status updated successfully!');
        console.log('   New Status: accepted');
        console.log('   Payment Status: held');
      } else {
        console.log(`   ℹ️  Status is already correct (${booking.status})`);
        console.log('   No fix needed');
      }
    } else {
      console.log('   ⚠️  No upfront payment detected');
      console.log('   Booking should remain in awaiting_payment status');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSpecificBooking();
