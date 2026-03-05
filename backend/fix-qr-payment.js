const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_API = 'https://api.paymongo.com/v1';

const paymongoAuth = {
  headers: {
    Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json',
  },
};

async function fixQRPayment(bookingId) {
  try {
    console.log(`\n=== Checking booking ${bookingId} ===\n`);

    // Get booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.log('Booking not found!');
      return;
    }

    const bookingData = bookingDoc.data();
    console.log('Booking status:', bookingData.status);
    console.log('Payment preference:', bookingData.paymentPreference);
    console.log('Paid upfront:', bookingData.isPaidUpfront);

    // Get all payments for this booking
    const paymentsSnapshot = await db.collection('payments')
      .where('bookingId', '==', bookingId)
      .orderBy('createdAt', 'desc')
      .get();

    console.log(`\nFound ${paymentsSnapshot.size} payment(s):\n`);

    for (const paymentDoc of paymentsSnapshot.docs) {
      const payment = paymentDoc.data();
      console.log(`Payment ${paymentDoc.id}:`);
      console.log('  Type:', payment.type);
      console.log('  Status:', payment.status);
      console.log('  Amount:', payment.amount);
      console.log('  Payment Type:', payment.paymentType);
      console.log('  Created:', payment.createdAt?.toDate());

      // If QRPh and pending, check PayMongo
      if (payment.type === 'qrph' && payment.status === 'pending') {
        const checkoutId = payment.checkoutSessionId || payment.sourceId;
        console.log(`\n  Checking PayMongo checkout session ${checkoutId}...`);

        try {
          const sessionResponse = await axios.get(
            `${PAYMONGO_API}/checkout_sessions/${checkoutId}`,
            paymongoAuth
          );
          const session = sessionResponse.data.data;
          const sessionStatus = session.attributes.status;
          const payments = session.attributes.payments || [];

          console.log('  PayMongo status:', sessionStatus);
          console.log('  Payments count:', payments.length);

          if (sessionStatus === 'active' && payments.length > 0) {
            console.log('\n  ✓ PAYMENT FOUND! Processing...\n');

            const lastPayment = payments[payments.length - 1];
            const amountInCentavos = lastPayment.attributes?.amount || session.attributes.line_items?.[0]?.amount || 0;
            const amountInPesos = amountInCentavos / 100;

            // Update payment record
            await db.collection('payments').doc(paymentDoc.id).update({
              paymentId: lastPayment.id,
              status: 'paid',
              paidAt: new Date(),
              balanceUpdated: true,
            });

            console.log('  ✓ Payment record updated');

            // Determine payment type
            const isUpfrontPayment = bookingData.status === 'awaiting_payment' || 
                                    payment.paymentType === 'upfront' ||
                                    (bookingData.paymentPreference === 'pay_first' && !bookingData.isPaidUpfront);

            // Update booking
            const bookingUpdate = {
              paid: true,
              paymentId: lastPayment.id,
              paymentMethod: 'qrph',
              paidAt: new Date(),
              updatedAt: new Date(),
            };

            if (isUpfrontPayment) {
              bookingUpdate.isPaidUpfront = true;
              bookingUpdate.upfrontPaidAmount = amountInPesos;
              bookingUpdate.upfrontPaidAt = new Date();
              bookingUpdate.paymentStatus = 'held';
              bookingUpdate.status = 'pending'; // Waiting for admin approval
              console.log('  → Setting as UPFRONT payment, status: pending');
            } else {
              bookingUpdate.status = 'payment_received';
              bookingUpdate.remainingPaidAmount = amountInPesos;
              bookingUpdate.remainingPaidAt = new Date();
              console.log('  → Setting as COMPLETION payment, status: payment_received');
            }

            await db.collection('bookings').doc(bookingId).update(bookingUpdate);
            console.log('  ✓ Booking updated');

            // Create transaction if doesn't exist
            const existingTx = await db.collection('transactions')
              .where('bookingId', '==', bookingId)
              .where('type', '==', 'payment')
              .get();

            if (existingTx.empty) {
              const providerId = bookingData.providerId;
              const providerShare = bookingData.providerPrice || bookingData.providerFixedPrice || Math.round(amountInPesos / 1.05);
              const platformCommission = amountInPesos - providerShare;

              await db.collection('transactions').add({
                bookingId,
                clientId: payment.userId,
                providerId: providerId,
                type: 'payment',
                amount: amountInPesos,
                providerShare,
                platformCommission,
                paymentMethod: 'qrph',
                status: 'completed',
                createdAt: new Date(),
              });

              console.log('  ✓ Transaction created');

              // Update provider balance
              if (providerId) {
                const providerRef = db.collection('users').doc(providerId);
                const providerDoc = await providerRef.get();
                const currentBalance = providerDoc.data()?.availableBalance || 0;
                const currentEarnings = providerDoc.data()?.totalEarnings || 0;

                await providerRef.update({
                  availableBalance: currentBalance + providerShare,
                  totalEarnings: currentEarnings + providerShare,
                  updatedAt: new Date(),
                });

                console.log('  ✓ Provider balance updated');
              }
            } else {
              console.log('  ✓ Transaction already exists');
            }

            console.log('\n✅ PAYMENT PROCESSED SUCCESSFULLY!\n');
          } else {
            console.log('  ✗ Payment not completed yet');
          }
        } catch (error) {
          console.error('  Error checking PayMongo:', error.response?.data || error.message);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Get booking ID from command line or use default
const bookingId = process.argv[2] || 'CBcwV8rCUkyfrQfGH3qr';
fixQRPayment(bookingId).then(() => process.exit(0));
