const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkAdditionalCharges(bookingId) {
  try {
    console.log(`\n=== Checking Additional Charges for ${bookingId} ===\n`);

    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    
    if (!bookingDoc.exists) {
      console.log('❌ Booking not found');
      return;
    }

    const data = bookingDoc.data();
    
    console.log('Booking Status:', data.status);
    console.log('Additional Charges:', data.additionalCharges);
    console.log('Additional Charges Paid:', data.additionalChargesPaid);
    
    if (data.additionalCharges && data.additionalCharges.length > 0) {
      console.log('\n--- Charge Details ---');
      data.additionalCharges.forEach((charge, index) => {
        console.log(`\nCharge ${index + 1}:`);
        console.log('  ID:', charge.id);
        console.log('  Description:', charge.description);
        console.log('  Amount: ₱' + charge.amount);
        console.log('  Status:', charge.status);
        console.log('  Approved:', charge.approved);
        console.log('  Paid At:', charge.paidAt);
        console.log('  Payment ID:', charge.paymentId);
        
        // Check if there's a mismatch
        if (charge.approved && charge.status !== 'paid') {
          console.log('  ⚠️  WARNING: Charge is approved but not paid!');
        }
      });
    } else {
      console.log('\nNo additional charges found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

const bookingId = process.argv[2] || 'DEirvoSN0ZLsBWBAwAcp';
checkAdditionalCharges(bookingId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
