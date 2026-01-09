// Script to update provider stats (completedJobs, rating, reviewCount) from actual bookings
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function updateProviderStats() {
  const providerId = 'iaJEBQIAImPT6U97lFgLRARk8Z83'; // mark cardo
  
  console.log(`\n=== Updating stats for provider: ${providerId} ===\n`);
  
  // Get completed bookings for this provider
  const completedBookings = await db.collection('bookings')
    .where('providerId', '==', providerId)
    .where('status', '==', 'completed')
    .get();
  
  const completedCount = completedBookings.size;
  console.log(`Found ${completedCount} completed bookings`);
  
  // Get all bookings (any status) for this provider
  const allBookings = await db.collection('bookings')
    .where('providerId', '==', providerId)
    .get();
  
  console.log(`Total bookings: ${allBookings.size}`);
  
  // Get reviews for this provider (simple query without status filter)
  const reviews = await db.collection('reviews')
    .where('providerId', '==', providerId)
    .get();
  
  let totalRating = 0;
  let reviewCount = 0;
  
  reviews.forEach(doc => {
    const data = doc.data();
    if (data.rating && data.status !== 'deleted') {
      totalRating += data.rating;
      reviewCount++;
    }
  });
  
  const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
  
  console.log(`Reviews: ${reviewCount}, Average Rating: ${averageRating.toFixed(2)}`);
  
  // Update provider document
  const updateData = {
    completedJobs: completedCount,
    jobsCompleted: completedCount,
    reviewCount: reviewCount,
    totalReviews: reviewCount,
    rating: parseFloat(averageRating.toFixed(2)),
    averageRating: parseFloat(averageRating.toFixed(2)),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  console.log('\nUpdating provider with:', updateData);
  
  await db.collection('users').doc(providerId).update(updateData);
  
  console.log('\n✅ Provider stats updated successfully!');
  
  // Verify the update
  const providerDoc = await db.collection('users').doc(providerId).get();
  const providerData = providerDoc.data();
  console.log('\nVerified provider data:');
  console.log('- completedJobs:', providerData.completedJobs);
  console.log('- jobsCompleted:', providerData.jobsCompleted);
  console.log('- reviewCount:', providerData.reviewCount);
  console.log('- rating:', providerData.rating);
}

updateProviderStats()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
