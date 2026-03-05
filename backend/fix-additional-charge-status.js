const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function fixAdditionalChargeStatus(bookingId) {
  try {
    console.log(`\n=== Fixing Additional Charge Status for ${bookingId} ===\n`);

    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      console.log('❌ Booking not found');
      return;
    }

    const data = bookingDoc.data();
    
    if (!data.additionalCharges || data.additionalCharges.length === 0) {
      console.log('No additional charges found');
      return;
    }

    // Update charges: change 'approved' to 'pending_payment'
    const updatedCharges = data.additionalCharges.map(charge => {
      if (charge.status === 'approved') {
        console.log(`Fixing charge ${charge.id}: approved → pending_payment`);
        return { ...charge, status: 'pending_payment' };
      }
      return charge;
    });

    await bookingRef.update({
      additionalCharges: updatedCharges,
      updatedAt: new Date(),
    });

    console.log('\n✅ Additional charges fixed!');
    console.log('Charges now show as "pending_payment" and will display "Pay Now" button');

  } catch (error) {
    console.error('Error:', error);
  }
}

const bookingId = process.argv[2] || 'DEirvoSN0ZLsBWBAwAcp';
fixAdditionalChargeStatus(bookingId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
