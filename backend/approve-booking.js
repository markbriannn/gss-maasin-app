// Approve booking for voice calling
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function approveBooking(bookingId) {
  try {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      console.log('❌ Booking not found:', bookingId);
      return;
    }
    
    // Update booking to be admin approved
    await bookingRef.update({
      adminApproved: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: 'admin'
    });
    
    console.log('✅ Booking approved successfully!');
    console.log('📞 Voice calling is now enabled for this booking');
    console.log('\nBooking ID:', bookingId);
    
  } catch (error) {
    console.error('Error approving booking:', error);
  }
}

// Get booking ID from command line
const bookingId = process.argv[2];

if (!bookingId) {
  console.log('Usage: node backend/approve-booking.js <bookingId>');
  console.log('Example: node backend/approve-booking.js OE9wrLk1M4adRaQuad2');
  process.exit(1);
}

approveBooking(bookingId);
