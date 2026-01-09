// Script to check booking details including location
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'gss-maasincity',
  });
}

const db = admin.firestore();

async function checkBookingDetails() {
  const bookingId = 'PU4M79RZzFDY1NY26PSX';
  
  try {
    const doc = await db.collection('bookings').doc(bookingId).get();
    
    if (!doc.exists) {
      console.log('Booking not found');
      return;
    }
    
    const data = doc.data();
    console.log('\n=== Booking Details ===\n');
    console.log('ID:', doc.id);
    console.log('Status:', data.status);
    console.log('Admin Approved:', data.adminApproved);
    console.log('\n--- Location Data ---');
    console.log('latitude:', data.latitude);
    console.log('longitude:', data.longitude);
    console.log('location:', JSON.stringify(data.location, null, 2));
    console.log('address:', data.address);
    console.log('providerLocation:', JSON.stringify(data.providerLocation, null, 2));
    console.log('\n--- Client Info ---');
    console.log('clientId:', data.clientId);
    console.log('clientName:', data.clientName);
    console.log('\n--- Provider Info ---');
    console.log('providerId:', data.providerId);
    console.log('providerName:', data.providerName);
    console.log('\n--- Timestamps ---');
    console.log('acceptedAt:', data.acceptedAt?.toDate?.() || 'N/A');
    console.log('travelingAt:', data.travelingAt?.toDate?.() || 'N/A');
    console.log('arrivedAt:', data.arrivedAt?.toDate?.() || 'N/A');
    console.log('startedAt:', data.startedAt?.toDate?.() || 'N/A');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkBookingDetails();
