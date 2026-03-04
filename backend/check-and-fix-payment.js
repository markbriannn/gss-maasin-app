const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkAndFixPayment() {
  const bookingId = 'bIOUJ8myoxEffgnx3A3n'; // From the screenshot
  
  try {
    console.log(`Checking booking ${bookingId}...`);
    
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      console.log('❌ Booking not found');
      return;
    }
    
    const booking = bookingDoc.data();
    console.log('\nCurrent booking status:');
    console.log('- Status:', booking.status);
    console.log('- Payment Status:', booking.paymentStatus);
    console.log('- Payment Method:', booking.paymentMethod);
    console.log('- Total Amount:', booking.totalAmount);
    console.log('- Upfront Paid Amount:', booking.upfrontPaidAmount);
    console.log('- Is Paid Upfront:', booking.isPaidUpfront);
    
    // Check if this is a completion payment (remaining 50%)
    if (booking.status === 'pending_payment') {
      console.log('\n✅ This is a COMPLETION PAYMENT (remaining 50%)');
      console.log('Payment was successful, updating status to payment_received...');
      
      await bookingRef.update({
        status: 'payment_received',
        paymentStatus: 'paid',
        remainingPaidAmount: 1.32,
        clientPaidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Updated to payment_received - Provider needs to confirm receipt');
      
    } else if (booking.status === 'awaiting_payment') {
      console.log('\n✅ This is an INITIAL PAYMENT (50% upfront)');
      console.log('Payment was successful, updating status to pending...');
      
      await bookingRef.update({
        status: 'pending',
        paymentStatus: 'held',
        isPaidUpfront: true,
        upfrontPaidAmount: 1.32,
        upfrontPaidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Updated to pending - Awaiting admin approval');
      
      // Send notification to admin
      const notifRef = db.collection('notifications').doc();
      await notifRef.set({
        id: notifRef.id,
        type: 'new_booking',
        title: '🔔 New Booking Request',
        message: `New ${booking.serviceCategory} booking from ${booking.clientName}`,
        userId: 'admin',
        targetUserId: 'admin',
        bookingId: bookingId,
        jobId: bookingId,
        createdAt: new Date(),
        read: false
      });
      
      console.log('✅ Sent notification to admin');
    }
    
    console.log('\n✅ Payment status fixed! Refresh the app to see changes.');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkAndFixPayment();
