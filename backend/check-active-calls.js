const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkActiveCalls() {
  try {
    console.log('Checking for active/ringing calls...\n');

    // Get all calls with status 'ringing' or 'active'
    const callsSnapshot = await db.collection('calls')
      .where('status', 'in', ['ringing', 'active'])
      .get();

    if (callsSnapshot.empty) {
      console.log('✅ No active or ringing calls found');
      return;
    }

    console.log(`Found ${callsSnapshot.size} active/ringing call(s):\n`);

    callsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Call ID: ${doc.id}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Caller: ${data.callerName} (${data.callerId})`);
      console.log(`  Receiver: ${data.receiverName} (${data.receiverId})`);
      console.log(`  Channel: ${data.channelName}`);
      console.log(`  Started: ${data.startedAt?.toDate?.() || 'N/A'}`);
      console.log(`  Booking ID: ${data.bookingId || 'N/A'}`);
      console.log('---');
    });

    // Ask if user wants to clean up
    console.log('\nTo clean up these calls, run: node backend/cleanup-calls.js');

  } catch (error) {
    console.error('Error checking calls:', error);
  } finally {
    process.exit(0);
  }
}

checkActiveCalls();
