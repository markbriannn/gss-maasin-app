// Check if booking is admin approved for voice calling
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkBookingApproval(bookingId) {
  try {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      console.log('❌ Booking not found:', bookingId);
      return;
    }
    
    const booking = bookingDoc.data();
    
    console.log('\n📋 Booking Details:');
    console.log('ID:', bookingId);
    console.log('Status:', booking.status);
    console.log('Admin Approved:', booking.adminApproved);
    console.log('Client ID:', booking.clientId);
    console.log('Provider ID:', booking.providerId);
    console.log('Service:', booking.serviceCategory);
    
    if (booking.adminApproved) {
      console.log('\n✅ Voice calling is ENABLED for this booking');
    } else {
      console.log('\n⚠️ Voice calling is DISABLED - Admin approval required');
      console.log('\nTo enable voice calling, run:');
      console.log(`node backend/approve-booking.js ${bookingId}`);
    }
    
  } catch (error) {
    console.error('Error checking booking:', error);
  }
}

// Get booking ID from command line or use the one from screenshot
const bookingId = process.argv[2] || 'OE9wrLk1M4adRaQuad2';

checkBookingApproval(bookingId);
