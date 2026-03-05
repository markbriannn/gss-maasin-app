const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// PayMongo configuration
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || '';
const PAYMONGO_API = 'https://api.paymongo.com/v1';
const paymongoAuth = {
  headers: {
    Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY).toString('base64')}`,
    'Content-Type': 'application/json',
  },
};

async function fixAwaitingPaymentBooking(bookingId) {
  try {
    console.log(`\n=== Checking booking ${bookingId} ===`);

    // Get booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.log('❌ Booking not found');
      return;
    }

    const bookingData = bookingDoc.data();
    console.log('Current status:', bookingData.status);
    console.log('Payment status:', bookingData.paymentStatus);
    console.log('Is paid upfront:', bookingData.isPaidUpfront);
    console.log('Upfront paid amount:', bookingData.upfrontPaidAmount);

    // Get payment record
    const paymentsSnapshot = await db.collection('payments')
      .where('bookingId', '==', bookingId)
      .get();

    if (paymentsSnapshot.empty) {
      console.log('❌ No payment record found');
      return;
    }

    const paymentDoc = paymentsSnapshot.docs[0];
    const paymentData = paymentDoc.data();
    console.log('\nPayment record:');
    console.log('- Status:', paymentData.status);
    console.log('- Type:', paymentData.type);
    console.log('- Amount:', paymentData.amount);
    console.log('- Checkout Session ID:', paymentData.checkoutSessionId || paymentData.sourceId);

    // If payment is already marked as paid but booking is still awaiting_payment
    if (paymentData.status === 'paid' && bookingData.status === 'awaiting_payment') {
      console.log('\n✅ Payment is paid but booking stuck in awaiting_payment');
      console.log('Fixing booking status...');

      const upfrontAmount = paymentData.amount || bookingData.upfrontAmount || (bookingData.totalAmount / 2);

      await db.collection('bookings').doc(bookingId).update({
        status: 'pending', // Move to pending for admin approval
        isPaidUpfront: true,
        upfrontPaidAmount: upfrontAmount,
        upfrontPaidAt: new Date(),
        paymentStatus: 'held',
        paid: true,
        paymentId: paymentData.paymentId,
        paymentMethod: 'qrph',
        paidAt: paymentData.paidAt || new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ Booking status updated to pending');
      return;
    }

    // If payment is pending, check with PayMongo
    if (paymentData.status === 'pending') {
      const checkoutId = paymentData.checkoutSessionId || paymentData.sourceId;
      console.log('\n🔍 Checking PayMongo for checkout session:', checkoutId);

      try {
        const sessionResponse = await axios.get(
          `${PAYMONGO_API}/checkout_sessions/${checkoutId}`,
          paymongoAuth
        );
        const session = sessionResponse.data.data;
        const sessionStatus = session.attributes.status;
        const payments = session.attributes.payments || [];

        console.log('PayMongo session status:', sessionStatus);
        console.log('Payments count:', payments.length);

        if (sessionStatus === 'active' && payments.length > 0) {
          console.log('\n✅ Payment found in PayMongo!');
          const lastPayment = payments[payments.length - 1];
          const amountInCentavos = lastPayment.attributes?.amount || session.attributes.line_items?.[0]?.amount || 0;
          const amountInPesos = amountInCentavos / 100;

          console.log('Payment amount:', amountInPesos);

          // Update payment record
          await db.collection('payments').doc(paymentDoc.id).update({
            paymentId: lastPayment.id,
            status: 'paid',
            paidAt: new Date(),
            balanceUpdated: true,
          });

          // Update booking
          await db.collection('bookings').doc(bookingId).update({
            status: 'pending', // Move to pending for admin approval
            isPaidUpfront: true,
            upfrontPaidAmount: amountInPesos,
            upfrontPaidAt: new Date(),
            paymentStatus: 'held',
            paid: true,
            paymentId: lastPayment.id,
            paymentMethod: 'qrph',
            paidAt: new Date(),
            updatedAt: new Date(),
          });

          console.log('✅ Payment and booking updated successfully!');
          console.log('Booking status: awaiting_payment → pending');
        } else {
          console.log('❌ No payment found in PayMongo session');
          console.log('Session status:', sessionStatus);
        }
      } catch (error) {
        console.error('Error checking PayMongo:', error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Get booking ID from command line or use default
const bookingId = process.argv[2] || 'DEirvoSN0ZLsBWBAwAcp';

fixAwaitingPaymentBooking(bookingId)
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
