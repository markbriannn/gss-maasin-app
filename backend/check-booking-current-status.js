const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkBookingStatus(bookingId) {
  try {
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    
    if (!bookingDoc.exists) {
      console.log('❌ Booking not found');
      return;
    }

    const data = bookingDoc.data();
    
    console.log('\n=== BOOKING STATUS ===');
    console.log('Booking ID:', bookingId);
    console.log('Status:', data.status);
    console.log('Payment Status:', data.paymentStatus);
    console.log('Is Paid Upfront:', data.isPaidUpfront);
    console.log('Upfront Amount:', data.upfrontPaidAmount);
    console.log('Total Amount:', data.totalAmount);
    console.log('Created:', data.createdAt?.toDate?.());
    console.log('Updated:', data.updatedAt?.toDate?.());
    
    console.log('\n=== WHAT THIS MEANS ===');
    if (data.status === 'awaiting_payment') {
      console.log('❌ Booking is waiting for payment');
      console.log('   User needs to pay the upfront amount');
    } else if (data.status === 'pending') {
      console.log('✅ Payment received! Booking is pending admin approval');
      console.log('   Admin needs to approve this booking');
    } else if (data.status === 'approved') {
      console.log('✅ Admin approved! Waiting for provider to accept');
    } else if (data.status === 'accepted') {
      console.log('✅ Provider accepted! Job is ready to start');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

const bookingId = process.argv[2] || 'DEirvoSN0ZLsBWBAwAcp';
checkBookingStatus(bookingId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
