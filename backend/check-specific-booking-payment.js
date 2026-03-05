const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

async function checkBookingPayment(bookingId) {
  try {
    console.log(`\n=== Checking booking ${bookingId} ===\n`);

    // Get booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.log('✗ Booking not found!');
      return;
    }

    const bookingData = bookingDoc.data();
    console.log('Booking status:', bookingData.status);
    console.log('Payment preference:', bookingData.paymentPreference);
    console.log('Paid upfront:', bookingData.isPaidUpfront);
    console.log('');

    // Get payments
    const paymentsSnapshot = await db.collection('payments')
      .where('bookingId', '==', bookingId)
      .get();

    console.log(`Found ${paymentsSnapshot.size} payment(s):\n`);

    for (const paymentDoc of paymentsSnapshot.docs) {
      const payment = paymentDoc.data();
      console.log(`━━━ Payment ${paymentDoc.id} ━━━`);
      console.log('Type:', payment.type);
      console.log('Status:', payment.status);
      console.log('Amount: ₱' + payment.amount);
      console.log('Payment Type:', payment.paymentType);
      console.log('Created:', payment.createdAt?.toDate().toLocaleString());

      if (payment.type === 'qrph' && payment.status === 'pending') {
        const checkoutId = payment.checkoutSessionId || payment.sourceId;
        console.log('\nChecking PayMongo session', checkoutId, '...');

        try {
          const sessionResponse = await axios.get(
            `${PAYMONGO_API}/checkout_sessions/${checkoutId}`,
            paymongoAuth
          );
          const session = sessionResponse.data.data;
          const sessionStatus = session.attributes.status;
          const paymongoPayments = session.attributes.payments || [];

          console.log('PayMongo status:', sessionStatus);
          console.log('Payments count:', paymongoPayments.length);

          if (sessionStatus === 'active' && paymongoPayments.length > 0) {
            console.log('\n🎉 PAYMENT COMPLETED! Processing...\n');

            const lastPayment = paymongoPayments[paymongoPayments.length - 1];
            const amountInCentavos = lastPayment.attributes?.amount || session.attributes.line_items?.[0]?.amount || 0;
            const amountInPesos = amountInCentavos / 100;

            // Update payment
            await db.collection('payments').doc(paymentDoc.id).update({
              paymentId: lastPayment.id,
              status: 'paid',
              paidAt: new Date(),
              balanceUpdated: true,
            });
            console.log('✓ Payment record updated');

            const isUpfrontPayment = bookingData.status === 'awaiting_payment' || 
                                    payment.paymentType === 'upfront' ||
                                    (bookingData.paymentPreference === 'pay_first' && !bookingData.isPaidUpfront);

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
              bookingUpdate.status = 'pending';
              console.log('→ Upfront payment, moving to PENDING (awaiting admin approval)');
            } else {
              bookingUpdate.status = 'payment_received';
              bookingUpdate.remainingPaidAmount = amountInPesos;
              bookingUpdate.remainingPaidAt = new Date();
              console.log('→ Completion payment, moving to PAYMENT_RECEIVED');
            }

            await db.collection('bookings').doc(bookingId).update(bookingUpdate);
            console.log('✓ Booking updated');

            // Create transaction
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
              console.log('✓ Transaction created');

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
                console.log('✓ Provider balance updated');
              }
            } else {
              console.log('✓ Transaction already exists');
            }

            console.log('\n✅ PAYMENT PROCESSED SUCCESSFULLY!\n');
          } else {
            console.log('✗ Not paid yet (status:', sessionStatus, ')');
          }
        } catch (error) {
          console.error('✗ Error:', error.response?.data?.errors?.[0]?.detail || error.message);
        }
      } else if (payment.status === 'paid') {
        console.log('✓ Already processed');
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

const bookingId = process.argv[2] || 'CBcwV8rCUkyfrQfGH3qr';
checkBookingPayment(bookingId).then(() => process.exit(0));
