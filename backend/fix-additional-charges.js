/**
 * Fix Additional Charges Script
 * 
 * This script fixes additional charges that were created before the fix
 * to the createAdditionalCharge function. Old charges have incorrect values:
 * - amount: 2.10 (wrong - should be 2.00)
 * - total: 2.10 (wrong - should be 2.10)
 * 
 * Should be:
 * - amount: 2.00 (provider receives)
 * - total: 2.10 (client pays, includes 5% system fee)
 * - systemFee: 0.10
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixAdditionalCharges() {
  try {
    console.log('🔍 Searching for bookings with additional charges...\n');

    const bookingsSnapshot = await db.collection('bookings').get();
    let fixedCount = 0;
    let totalBookings = 0;

    for (const bookingDoc of bookingsSnapshot.docs) {
      const booking = bookingDoc.data();
      
      if (!booking.additionalCharges || booking.additionalCharges.length === 0) {
        continue;
      }

      totalBookings++;
      console.log(`\n📋 Booking ID: ${bookingDoc.id}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Additional Charges: ${booking.additionalCharges.length}`);

      let needsUpdate = false;
      const fixedCharges = booking.additionalCharges.map((charge, index) => {
        console.log(`\n   Charge ${index + 1}:`);
        console.log(`     Description: ${charge.reason || charge.description}`);
        console.log(`     Current amount: ₱${charge.amount}`);
        console.log(`     Current total: ₱${charge.total || 'N/A'}`);
        console.log(`     Current systemFee: ₱${charge.systemFee || 'N/A'}`);
        console.log(`     Status: ${charge.status}`);

        // Check if this charge needs fixing
        // Old charges have: amount = total (no system fee calculated)
        // OR systemFee is missing/wrong
        const hasSystemFee = charge.systemFee && charge.systemFee > 0;
        const totalMatchesAmount = charge.total === charge.amount;
        
        if (!hasSystemFee || totalMatchesAmount) {
          // This charge needs fixing
          // The "amount" field in old charges is actually the total (includes system fee)
          // We need to reverse-calculate the provider amount
          const clientTotal = charge.total || charge.amount;
          const providerAmount = clientTotal / 1.05; // Remove 5% system fee
          const systemFee = clientTotal - providerAmount;

          console.log(`     ⚠️  NEEDS FIX!`);
          console.log(`     New amount (provider): ₱${providerAmount.toFixed(2)}`);
          console.log(`     New total (client): ₱${clientTotal.toFixed(2)}`);
          console.log(`     New systemFee: ₱${systemFee.toFixed(2)}`);

          needsUpdate = true;
          return {
            ...charge,
            amount: parseFloat(providerAmount.toFixed(2)),
            total: parseFloat(clientTotal.toFixed(2)),
            systemFee: parseFloat(systemFee.toFixed(2)),
          };
        } else {
          console.log(`     ✅ Already correct`);
          return charge;
        }
      });

      if (needsUpdate) {
        // Update the booking with fixed charges
        await bookingDoc.ref.update({
          additionalCharges: fixedCharges,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        fixedCount++;
        console.log(`\n   ✅ Updated booking ${bookingDoc.id}`);
      } else {
        console.log(`\n   ℹ️  No changes needed for booking ${bookingDoc.id}`);
      }
    }

    console.log(`\n\n✅ DONE!`);
    console.log(`   Total bookings with additional charges: ${totalBookings}`);
    console.log(`   Bookings fixed: ${fixedCount}`);
    console.log(`   Bookings already correct: ${totalBookings - fixedCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
fixAdditionalCharges();
