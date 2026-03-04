const admin = require('firebase-admin');
const { getDb } = require('./config/firebase');

async function checkPaymentAmounts() {
  try {
    const db = getDb();
    
    // Get all bookings with payment discrepancies
    const bookingsSnapshot = await db.collection('bookings')
      .where('status', 'in', ['awaiting_payment', 'pending_payment', 'payment_received'])
      .get();

    console.log(`\nFound ${bookingsSnapshot.size} bookings with payment status\n`);

    for (const doc of bookingsSnapshot.docs) {
      const booking = doc.data();
      const bookingId = doc.id;

      // Calculate amounts
      const totalAmount = booking.totalAmount || 0;
      const upfrontAmount = booking.upfrontPaidAmount || (totalAmount / 2);
      const remainingAmount = totalAmount - upfrontAmount;

      // Check for rounding issues
      const upfrontRounded = Math.round(upfrontAmount * 100) / 100;
      const remainingRounded = Math.round(remainingAmount * 100) / 100;
      const totalRounded = upfrontRounded + remainingRounded;

      if (Math.abs(totalRounded - totalAmount) > 0.01) {
        console.log(`⚠️  ROUNDING ISSUE FOUND:`);
        console.log(`Booking ID: ${bookingId}`);
        console.log(`Status: ${booking.status}`);
        console.log(`Total Amount: ₱${totalAmount.toFixed(2)}`);
        console.log(`50% Upfront (calculated): ₱${upfrontAmount.toFixed(2)}`);
        console.log(`50% Upfront (rounded): ₱${upfrontRounded.toFixed(2)}`);
        console.log(`50% Remaining (calculated): ₱${remainingAmount.toFixed(2)}`);
        console.log(`50% Remaining (rounded): ₱${remainingRounded.toFixed(2)}`);
        console.log(`Sum of rounded: ₱${totalRounded.toFixed(2)}`);
        console.log(`Difference: ₱${(totalRounded - totalAmount).toFixed(2)}`);
        console.log('---');
      }
    }

    // Check specific booking if it exists
    const specificBooking = await db.collection('bookings').doc('bIOUJ8myoxEffgnx3A3n').get();
    if (specificBooking.exists) {
      const data = specificBooking.data();
      console.log(`\n📋 Specific Booking: bIOUJ8myoxEffgnx3A3n`);
      console.log(`Status: ${data.status}`);
      console.log(`Total Amount: ₱${data.totalAmount?.toFixed(2) || 'N/A'}`);
      console.log(`Upfront Paid: ₱${data.upfrontPaidAmount?.toFixed(2) || 'N/A'}`);
      console.log(`Provider Price: ₱${data.providerPrice?.toFixed(2) || 'N/A'}`);
      console.log(`System Fee: ₱${data.systemFee?.toFixed(2) || 'N/A'}`);
      
      // Calculate what should be paid
      const total = data.totalAmount || 0;
      const upfront = data.upfrontPaidAmount || 0;
      const remaining = total - upfront;
      console.log(`\nCalculated Remaining: ₱${remaining.toFixed(2)}`);
      console.log(`Rounded for PayMongo: ₱${(Math.round(remaining * 100) / 100).toFixed(2)}`);
    }

    console.log('\n✅ Check complete');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPaymentAmounts();
