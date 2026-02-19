// Script to sync gamification data (points, tier) to user documents
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Tier configurations
const PROVIDER_TIERS = {
  BRONZE: { name: 'bronze', minPoints: 0 },
  SILVER: { name: 'silver', minPoints: 1000 },
  GOLD: { name: 'gold', minPoints: 3000 },
  PLATINUM: { name: 'platinum', minPoints: 7500 },
};

function getProviderTier(points) {
  if (points >= PROVIDER_TIERS.PLATINUM.minPoints) return PROVIDER_TIERS.PLATINUM.name;
  if (points >= PROVIDER_TIERS.GOLD.minPoints) return PROVIDER_TIERS.GOLD.name;
  if (points >= PROVIDER_TIERS.SILVER.minPoints) return PROVIDER_TIERS.SILVER.name;
  return PROVIDER_TIERS.BRONZE.name;
}

async function syncGamificationToUsers(specificProviderId = null) {
  console.log('\n=== Syncing Gamification Data to User Documents ===\n');
  
  try {
    // Get all gamification documents
    const gamificationSnapshot = await db.collection('gamification').get();
    
    let syncCount = 0;
    let errorCount = 0;
    
    for (const gamDoc of gamificationSnapshot.docs) {
      const userId = gamDoc.id;
      const gamData = gamDoc.data();
      
      // Skip if specific provider ID is provided and this isn't it
      if (specificProviderId && userId !== specificProviderId) {
        continue;
      }
      
      try {
        // Get user document
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
          console.log(`⚠️  User ${userId} not found, skipping`);
          continue;
        }
        
        const userData = userDoc.data();
        const role = userData.role?.toUpperCase();
        
        // Only sync for providers
        if (role !== 'PROVIDER') {
          continue;
        }
        
        const points = gamData.points || 0;
        const tier = getProviderTier(points);
        const stats = gamData.stats || {};
        
        // Update user document with gamification data
        const updateData = {
          points: points,
          tier: tier,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Also sync completedJobs if available in stats
        if (stats.completedJobs !== undefined) {
          updateData.completedJobs = stats.completedJobs;
          updateData.jobsCompleted = stats.completedJobs;
        }
        
        await db.collection('users').doc(userId).update(updateData);
        
        console.log(`✅ Synced ${userData.firstName} ${userData.lastName}: ${points} points, ${tier} tier`);
        syncCount++;
        
      } catch (error) {
        console.error(`❌ Error syncing user ${userId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n=== Sync Complete ===`);
    console.log(`✅ Successfully synced: ${syncCount} providers`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }
    
  } catch (error) {
    console.error('Error during sync:', error);
  }
  
  process.exit(0);
}

// Get provider ID from command line argument
const providerId = process.argv[2];

syncGamificationToUsers(providerId);
