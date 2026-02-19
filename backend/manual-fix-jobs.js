/**
 * Manual fix for provider job counts
 * Run: node backend/manual-fix-jobs.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function fixAllProviders() {
  console.log('\n🔧 Fixing provider job counts...\n');

  try {
    // Get all providers
    const providersSnapshot = await db.collection('users')
      .where('role', '==', 'provider')
      .get();

    console.log(`Found ${providersSnapshot.size} providers\n`);

    for (const providerDoc of providersSnapshot.docs) {
      const providerId = providerDoc.id;
      const providerData = providerDoc.data();
      const providerName = `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim();

      console.log(`\n📋 ${providerName} (${providerId})`);

      // Count completed jobs
      const bookingsSnapshot = await db.collection('bookings')
        .where('providerId', '==', providerId)
        .get();

      let completedCount = 0;
      bookingsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'completed' || (data.status === 'payment_received' && data.isPaidUpfront)) {
          completedCount++;
        }
      });

      console.log(`   Completed jobs: ${completedCount}`);

      // Update user document
      await db.collection('users').doc(providerId).update({
        completedJobs: completedCount,
        jobsCompleted: completedCount,
      });

      console.log(`   ✅ Updated user document`);

      // Update gamification document
      const gamRef = db.collection('gamification').doc(providerId);
      const gamDoc = await gamRef.get();

      if (gamDoc.exists()) {
        await gamRef.update({
          'stats.completedJobs': completedCount,
        });
        console.log(`   ✅ Updated gamification document`);
      } else {
        await gamRef.set({
          points: completedCount * 100,
          role: 'PROVIDER',
          stats: {
            completedJobs: completedCount,
            totalEarnings: 0,
            rating: providerData.rating || 0,
            reviewCount: providerData.reviewCount || 0,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`   ✅ Created gamification document`);
      }
    }

    console.log('\n\n✅ All providers fixed!');
    console.log('\n📱 Now refresh your browser to see the changes\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAllProviders().then(() => process.exit(0));
