// Script to initialize gamification data for providers who don't have it
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function initializeProviderGamification() {
  console.log('\n=== Initializing Provider Gamification Data ===\n');
  
  try {
    // Get all providers
    const providersSnapshot = await db.collection('users')
      .where('role', '==', 'PROVIDER')
      .get();
    
    let initializedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const providerDoc of providersSnapshot.docs) {
      const providerId = providerDoc.id;
      const providerData = providerDoc.data();
      
      try {
        // Check if gamification data already exists
        const gamDoc = await db.collection('gamification').doc(providerId).get();
        
        if (gamDoc.exists) {
          console.log(`⏭️  ${providerData.firstName} ${providerData.lastName} - already has gamification data`);
          skippedCount++;
          continue;
        }
        
        // Get actual completed jobs count from bookings
        const completedBookings = await db.collection('bookings')
          .where('providerId', '==', providerId)
          .where('status', '==', 'completed')
          .get();
        
        const completedJobsCount = completedBookings.size;
        
        // Calculate points based on completed jobs (100 points per job)
        const points = completedJobsCount * 100;
        
        // Get reviews count
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
        
        // Calculate total earnings from completed bookings
        let totalEarnings = 0;
        completedBookings.forEach(doc => {
          const data = doc.data();
          totalEarnings += data.totalAmount || data.amount || 0;
        });
        
        // Create gamification document
        const gamificationData = {
          points: points,
          role: 'PROVIDER',
          stats: {
            completedJobs: completedJobsCount,
            rating: parseFloat(averageRating.toFixed(2)),
            reviewCount: reviewCount,
            totalEarnings: totalEarnings,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        await db.collection('gamification').doc(providerId).set(gamificationData);
        
        // Also update user document with points and tier
        let tier = 'bronze';
        if (points >= 7500) tier = 'platinum';
        else if (points >= 3000) tier = 'gold';
        else if (points >= 1000) tier = 'silver';
        
        await db.collection('users').doc(providerId).update({
          points: points,
          tier: tier,
          completedJobs: completedJobsCount,
          jobsCompleted: completedJobsCount,
          rating: parseFloat(averageRating.toFixed(2)),
          reviewCount: reviewCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        console.log(`✅ ${providerData.firstName} ${providerData.lastName}: ${points} points, ${completedJobsCount} jobs, ${tier} tier`);
        initializedCount++;
        
      } catch (error) {
        console.error(`❌ Error initializing ${providerId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n=== Initialization Complete ===`);
    console.log(`✅ Initialized: ${initializedCount} providers`);
    console.log(`⏭️  Skipped (already exists): ${skippedCount} providers`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }
    
  } catch (error) {
    console.error('Error during initialization:', error);
  }
  
  process.exit(0);
}

initializeProviderGamification();
