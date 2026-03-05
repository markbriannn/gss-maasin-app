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

async function checkRecentQRPayments() {
  try {
    console.log('\n=== Checking recent QR payments ===\n');

    // Get recent QR payments
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const paymentsSnapshot = await db.collection('payments')
      .where('type', '==', 'qrph')
      .where('createdAt', '>=', tenMinutesAgo)
      .orderBy('createdAt', 'desc')
      .get();

    console.log(`Found ${paymentsSnapshot.size} recent QR payment(s):\n`);

    for (const paymentDoc of paymentsSnapshot.docs) {
      const payment = paymentDoc.data();
      console.log(`\nPayment ${paymentDoc.id}:`);
      console.log('  Booking ID:', payment.bookingId);
      console.log('  Status:', payment.status);
      console.log('  Amount: ₱' + payment.amount);
      console.log('  Created:', payment.createdAt?.toDate().toLocaleString());

      if (payment.status === 'pending') {
        const checkoutId = payment.checkoutSessionId || payment.sourceId;
        console.log('  Checking PayMongo...');

        try {
          const sessionResponse = await axios.get(
            `${PAYMONGO_API}/checkout_sessions/${checkoutId}`,
            paymongoAuth
          );
          const session = sessionResponse.data.data;
          const sessionStatus = session.attributes.status;
          const payments = session.attributes.payments || [];

          console.log('  PayMongo status:', sessionStatus);
          console.log('  Payments:', payments.length);

          if (sessionStatus === 'active' && payments.length > 0) {
            console.log('  ✓ PAID! Needs processing');
            
            // Get booking info
            const bookingDoc = await db.collection('bookings').doc(payment.bookingId).get();
            if (bookingDoc.exists) {
              const booking = bookingDoc.data();
              console.log('  Booking status:', booking.status);
              console.log('  Payment preference:', booking.paymentPreference);
            }
          } else {
            console.log('  ✗ Not paid yet');
          }
        } catch (error) {
          console.error('  Error:', error.response?.data?.errors?.[0]?.detail || error.message);
        }
      } else {
        console.log('  Already processed');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRecentQRPayments().then(() => process.exit(0));
