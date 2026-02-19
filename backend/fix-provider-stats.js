/**
 * Script to fix provider stats (completedJobs, estimated time, etc.)
 * Run with: node backend/fix-provider-stats.js <providerId>
 * Or run for all providers: node backend/fix-provider-stats.js --all
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function fixProviderStats(providerId) {
  console.log(`\n🔧 Fixing stats for provider: ${providerId}`);

  try {
    // Get provider data
    const providerDoc = await db.collection('users').doc(providerId).get();
    if (!providerDoc.exists) {
      console.log('❌ Provider not found');
      return;
    }

    const providerData = providerDoc.data();
    console.log(`Provider: ${providerData.firstName} ${providerData.lastName}`);

    // Count completed jobs
    const bookingsSnapshot = await db.collection('bookings')
      .where('providerId', '==', providerId)
      .get();

    let completedCount = 0;
    let totalEarnings = 0;
    let responseTimes = [];

    bookingsSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Count completed jobs
      if (data.status === 'completed' || (data.status === 'payment_received' && data.isPaidUpfront)) {
        completedCount++;
        
        // Calculate earnings
        let providerEarnings = 0;
        if (data.providerPrice || data.offeredPrice) {
          providerEarnings = data.providerPrice || data.offeredPrice;
        } else if (data.totalAmount) {
          providerEarnings = data.totalAmount / 1.05; // Remove 5% system fee
        } else {
          providerEarnings = data.price || 0;
        }
        
        // Add approved additional charges
        const approvedCharges = (data.additionalCharges || [])
          .filter(c => c.status === 'approved')
          .reduce((sum, c) => sum + (c.amount || 0), 0);
        
        totalEarnings += providerEarnings + approvedCharges;
      }

      // Calculate response time
      const createdAt = data.createdAt?.toDate?.();
      const acceptedAt = data.acceptedAt?.toDate?.();
      if (createdAt && acceptedAt) {
        const diffMs = acceptedAt.getTime() - createdAt.getTime();
        if (diffMs >= 0) {
          responseTimes.push(diffMs / 60000); // Convert to minutes
        }
      }
    });

    // Calculate average response time
    const avgResponseMinutes = responseTimes.length > 0
      ? responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length
      : null;

    const formattedResponse = avgResponseMinutes !== null
      ? avgResponseMinutes >= 60 
        ? `${Math.round(avgResponseMinutes / 60)} hr${Math.round(avgResponseMinutes / 60) !== 1 ? 's' : ''}`
        : `${Math.max(1, Math.round(avgResponseMinutes))} min`
      : 'Not enough data';

    console.log(`\n📊 Calculated Stats:`);
    console.log(`Completed Jobs: ${completedCount}`);
    console.log(`Total Earnings: ₱${totalEarnings.toFixed(2)}`);
    console.log(`Avg Response Time: ${formattedResponse}`);

    // Update gamification document
    const gamRef = db.collection('gamification').doc(providerId);
    const gamDoc = await gamRef.get();

    if (gamDoc.exists()) {
      await gamRef.update({
        'stats.completedJobs': completedCount,
        'stats.totalEarnings': totalEarnings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Updated gamification document');
    } else {
      await gamRef.set({
        points: completedCount * 100, // 100 points per completed job
        role: 'PROVIDER',
        stats: {
          completedJobs: completedCount,
          totalEarnings: totalEarnings,
          rating: providerData.rating || providerData.averageRating || 0,
          reviewCount: providerData.reviewCount || 0,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Created gamification document');
    }

    // Update user document
    await db.collection('users').doc(providerId).update({
      completedJobs: completedCount,
      jobsCompleted: completedCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Updated user document');

    console.log(`\n✅ Stats fixed for ${providerData.firstName} ${providerData.lastName}`);
    console.log(`   - Completed Jobs: ${completedCount}`);
    console.log(`   - Total Earnings: ₱${totalEarnings.toFixed(2)}`);
    console.log(`   - Avg Response: ${formattedResponse}`);

  } catch (error) {
    console.error('❌ Error fixing stats:', error);
  }
}

async function fixAllProviders() {
  console.log('\n🔧 Fixing stats for ALL providers...\n');

  try {
    const providersSnapshot = await db.collection('users')
      .where('role', '==', 'provider')
      .get();

    console.log(`Found ${providersSnapshot.size} providers\n`);

    for (const doc of providersSnapshot.docs) {
      await fixProviderStats(doc.id);
      console.log('---');
    }

    console.log('\n✅ All providers fixed!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Main execution
const arg = process.argv[2];

if (!arg) {
  console.log('Usage:');
  console.log('  Fix single provider: node backend/fix-provider-stats.js <providerId>');
  console.log('  Fix all providers:   node backend/fix-provider-stats.js --all');
  process.exit(1);
}

if (arg === '--all') {
  fixAllProviders().then(() => process.exit(0));
} else {
  fixProviderStats(arg).then(() => process.exit(0));
}
