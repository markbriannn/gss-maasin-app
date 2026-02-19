const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkProviderRatings() {
  console.log('🔍 Checking provider ratings...\n');

  // Get all bookings
  const bookingsSnapshot = await db.collection('bookings').get();
  
  console.log(`📋 Total bookings: ${bookingsSnapshot.size}\n`);
  
  const providerBookings = {};
  
  bookingsSnapshot.forEach(doc => {
    const data = doc.data();
    const providerId = data.providerId;
    
    if (!providerId) return;
    
    if (!providerBookings[providerId]) {
      providerBookings[providerId] = {
        name: data.providerName || 'Unknown',
        total: 0,
        completed: 0,
        withRating: 0,
        ratings: []
      };
    }
    
    providerBookings[providerId].total++;
    
    if (data.status === 'completed' || (data.status === 'payment_received' && data.isPaidUpfront)) {
      providerBookings[providerId].completed++;
      
      // Check for rating fields
      const rating = data.rating || data.reviewRating;
      if (rating) {
        providerBookings[providerId].withRating++;
        providerBookings[providerId].ratings.push(rating);
      }
    }
  });
  
  console.log('👨‍🔧 Provider Ratings Summary:\n');
  
  Object.entries(providerBookings).forEach(([id, stats]) => {
    const avgRating = stats.ratings.length > 0 
      ? (stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length).toFixed(1)
      : '0.0';
    
    console.log(`Provider: ${stats.name}`);
    console.log(`  ID: ${id}`);
    console.log(`  Total Jobs: ${stats.total}`);
    console.log(`  Completed: ${stats.completed}`);
    console.log(`  With Rating: ${stats.withRating}`);
    console.log(`  Average Rating: ${avgRating} ⭐`);
    if (stats.ratings.length > 0) {
      console.log(`  Ratings: ${stats.ratings.join(', ')}`);
    }
    console.log('');
  });
  
  if (Object.keys(providerBookings).length === 0) {
    console.log('❌ No bookings found with provider IDs');
  }
  
  process.exit(0);
}

checkProviderRatings().catch(console.error);
