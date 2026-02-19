/**
 * Diagnostic script to check provider stats and job counts
 * Run with: node backend/check-provider-stats.js <providerId>
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

async function checkProviderStats(providerId) {
  console.log('\n=== Provider Stats Diagnostic ===\n');
  console.log('Provider ID:', providerId);
  console.log('\n');

  try {
    // 1. Check provider document
    console.log('1. Checking provider document...');
    const providerDoc = await db.collection('users').doc(providerId).get();
    if (!providerDoc.exists) {
      console.log('❌ Provider not found!');
      return;
    }
    const providerData = providerDoc.data();
    console.log('Provider:', providerData.firstName, providerData.lastName);
    console.log('Role:', providerData.role);
    console.log('completedJobs:', providerData.completedJobs || 0);
    console.log('jobsCompleted:', providerData.jobsCompleted || 0);
    console.log('\n');

    // 2. Check gamification document
    console.log('2. Checking gamification document...');
    const gamDoc = await db.collection('gamification').doc(providerId).get();
    if (gamDoc.exists) {
      const gamData = gamDoc.data();
      console.log('✅ Gamification document exists');
      console.log('Points:', gamData.points || 0);
      console.log('Stats:', JSON.stringify(gamData.stats || {}, null, 2));
    } else {
      console.log('❌ Gamification document NOT found');
    }
    console.log('\n');

    // 3. Count actual completed jobs
    console.log('3. Counting actual completed jobs from bookings...');
    const bookingsSnapshot = await db.collection('bookings')
      .where('providerId', '==', providerId)
      .get();

    let totalJobs = 0;
    let completedJobs = 0;
    let paymentReceivedJobs = 0;
    let otherStatuses = {};

    bookingsSnapshot.forEach(doc => {
      const data = doc.data();
      totalJobs++;
      
      if (data.status === 'completed') {
        completedJobs++;
        console.log(`  ✅ Completed: ${doc.id} - ${data.serviceCategory} - ₱${data.totalAmount || data.price}`);
      } else if (data.status === 'payment_received' && data.isPaidUpfront) {
        paymentReceivedJobs++;
        console.log(`  ✅ Payment Received (Pay First): ${doc.id} - ${data.serviceCategory} - ₱${data.totalAmount || data.price}`);
      } else {
        otherStatuses[data.status] = (otherStatuses[data.status] || 0) + 1;
      }
    });

    console.log('\n📊 Summary:');
    console.log('Total jobs:', totalJobs);
    console.log('Completed jobs:', completedJobs);
    console.log('Payment received (Pay First):', paymentReceivedJobs);
    console.log('Total completed (both types):', completedJobs + paymentReceivedJobs);
    console.log('Other statuses:', JSON.stringify(otherStatuses, null, 2));
    console.log('\n');

    // 4. Check for discrepancies
    console.log('4. Checking for discrepancies...');
    const actualCompleted = completedJobs + paymentReceivedJobs;
    const gamCompleted = gamDoc.exists() ? (gamDoc.data().stats?.completedJobs || 0) : 0;
    const userCompleted = providerData.completedJobs || providerData.jobsCompleted || 0;

    if (actualCompleted !== gamCompleted) {
      console.log(`⚠️  Mismatch: Actual completed (${actualCompleted}) != Gamification (${gamCompleted})`);
    } else {
      console.log(`✅ Gamification stats match actual completed jobs`);
    }

    if (actualCompleted !== userCompleted) {
      console.log(`⚠️  Mismatch: Actual completed (${actualCompleted}) != User document (${userCompleted})`);
    } else {
      console.log(`✅ User document stats match actual completed jobs`);
    }

    // 5. Suggest fix
    if (actualCompleted !== gamCompleted || actualCompleted !== userCompleted) {
      console.log('\n💡 Suggested Fix:');
      console.log(`Run: node backend/update-provider-stats.js ${providerId}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Get provider ID from command line
const providerId = process.argv[2];

if (!providerId) {
  console.log('Usage: node backend/check-provider-stats.js <providerId>');
  process.exit(1);
}

checkProviderStats(providerId).then(() => {
  console.log('\n✅ Diagnostic complete\n');
  process.exit(0);
});
