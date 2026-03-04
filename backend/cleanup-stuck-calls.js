/**
 * Cleanup Stuck Calls Script
 * 
 * This script finds and cleans up any calls that are stuck in 'ringing' status
 * for more than 60 seconds and marks them as 'missed'.
 * 
 * Run with: node backend/cleanup-stuck-calls.js
 */

require('dotenv').config({ path: './backend/.env' });
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function cleanupStuckCalls() {
  try {
    console.log('🔍 Searching for stuck calls...\n');

    // Get all calls with status 'ringing'
    const callsSnapshot = await db.collection('calls')
      .where('status', '==', 'ringing')
      .get();

    if (callsSnapshot.empty) {
      console.log('✅ No stuck calls found!');
      return;
    }

    const now = Date.now();
    const stuckCalls = [];

    callsSnapshot.forEach(doc => {
      const data = doc.data();
      const startTime = data.startedAt?.toDate?.()?.getTime() || 0;
      const age = now - startTime;
      const ageSeconds = Math.round(age / 1000);

      if (age > 60000) { // Older than 60 seconds
        stuckCalls.push({
          id: doc.id,
          ...data,
          age: ageSeconds
        });
      }
    });

    if (stuckCalls.length === 0) {
      console.log('✅ No stuck calls found (all calls are recent)');
      return;
    }

    console.log(`Found ${stuckCalls.length} stuck call(s):\n`);

    for (const call of stuckCalls) {
      console.log(`📞 Call ID: ${call.id}`);
      console.log(`   Caller: ${call.callerName} → ${call.receiverName}`);
      console.log(`   Age: ${call.age} seconds`);
      console.log(`   Channel: ${call.channelName}`);
      
      // Update to missed
      await db.collection('calls').doc(call.id).update({
        status: 'missed',
        endedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`   ✅ Marked as missed\n`);
    }

    console.log(`\n✅ Cleaned up ${stuckCalls.length} stuck call(s)`);

  } catch (error) {
    console.error('❌ Error cleaning up stuck calls:', error);
    throw error;
  }
}

// Run the cleanup
cleanupStuckCalls()
  .then(() => {
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
