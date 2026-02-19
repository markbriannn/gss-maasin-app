// Script to calculate and update avgJobDurationMinutes for all providers
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function calculateAvgJobDuration(specificProviderId = null) {
  console.log('\n=== Calculating Average Job Duration for Providers ===\n');
  
  try {
    // Get all providers
    let providersQuery = db.collection('users').where('role', '==', 'PROVIDER');
    const providersSnapshot = await providersQuery.get();
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const providerDoc of providersSnapshot.docs) {
      const providerId = providerDoc.id;
      const providerData = providerDoc.data();
      
      // Skip if specific provider ID is provided and this isn't it
      if (specificProviderId && providerId !== specificProviderId) {
        continue;
      }
      
      try {
        // Get all completed bookings for this provider
        const completedBookings = await db.collection('bookings')
          .where('providerId', '==', providerId)
          .where('status', '==', 'completed')
          .get();
        
        if (completedBookings.empty) {
          console.log(`⏭️  ${providerData.firstName} ${providerData.lastName} - no completed jobs`);
          skippedCount++;
          continue;
        }
        
        // Calculate durations
        const durations = [];
        const allDurations = []; // Track all durations for debugging
        completedBookings.forEach(doc => {
          const data = doc.data();
          // Try both field name patterns
          const started = data.workStartedAt?.toDate?.() || data.startedAt?.toDate?.();
          const ended = data.workCompletedAt?.toDate?.() || data.completedAt?.toDate?.();
          
          if (started && ended) {
            const mins = (ended.getTime() - started.getTime()) / 60000;
            allDurations.push(mins);
            // Only include reasonable durations (between 0.1 min and 10 hours)
            // Allow very short durations for test data
            if (mins > 0.1 && mins < 600) {
              durations.push(mins);
            }
          }
        });
        
        console.log(`   Raw durations: ${allDurations.map(d => d.toFixed(2)).join(', ')} minutes`);
        
        if (durations.length === 0) {
          console.log(`⏭️  ${providerData.firstName} ${providerData.lastName} - no valid duration data (${completedBookings.size} jobs without timestamps)`);
          skippedCount++;
          continue;
        }
        
        // Calculate average (use ceil to ensure at least 1 minute for very short jobs)
        const avgMinutes = Math.max(1, Math.ceil(durations.reduce((sum, val) => sum + val, 0) / durations.length));
        
        // Update provider document
        await db.collection('users').doc(providerId).update({
          avgJobDurationMinutes: avgMinutes,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        const avgDisplay = avgMinutes >= 60 
          ? `${(avgMinutes / 60).toFixed(1)} hrs` 
          : `${avgMinutes} mins`;
        
        console.log(`✅ ${providerData.firstName} ${providerData.lastName}: ${avgDisplay} avg (from ${durations.length} jobs)`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing ${providerId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n=== Calculation Complete ===`);
    console.log(`✅ Updated: ${updatedCount} providers`);
    console.log(`⏭️  Skipped: ${skippedCount} providers`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }
    
  } catch (error) {
    console.error('Error during calculation:', error);
  }
  
  process.exit(0);
}

// Get provider ID from command line argument
const providerId = process.argv[2];

calculateAvgJobDuration(providerId);
