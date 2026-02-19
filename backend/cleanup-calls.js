const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function cleanupCalls() {
  try {
    console.log('Cleaning up active/ringing calls...\n');

    // Get all calls with status 'ringing' or 'active'
    const callsSnapshot = await db.collection('calls')
      .where('status', 'in', ['ringing', 'active'])
      .get();

    if (callsSnapshot.empty) {
      console.log('✅ No calls to clean up');
      return;
    }

    console.log(`Found ${callsSnapshot.size} call(s) to clean up\n`);

    const batch = db.batch();
    let count = 0;

    callsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Ending call: ${data.callerName} → ${data.receiverName}`);
      
      // Update to 'missed' status and set endedAt
      batch.update(doc.ref, {
        status: 'missed',
        endedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      count++;
    });

    await batch.commit();
    console.log(`\n✅ Successfully cleaned up ${count} call(s)`);

  } catch (error) {
    console.error('Error cleaning up calls:', error);
  } finally {
    process.exit(0);
  }
}

cleanupCalls();
