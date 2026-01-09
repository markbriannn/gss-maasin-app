// Script to fix broken conversations in Firestore
// Run with: node scripts/fix-conversations.js

const admin = require('firebase-admin');
const serviceAccount = require('../backend/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixBrokenConversations() {
  console.log('Scanning all conversations...\n');
  
  const conversationsSnapshot = await db.collection('conversations').get();
  console.log(`Found ${conversationsSnapshot.docs.length} conversations\n`);
  
  let fixedCount = 0;
  
  for (const convDoc of conversationsSnapshot.docs) {
    const convData = convDoc.data();
    const participants = convData.participants || [];
    
    console.log(`\n--- Conversation: ${convDoc.id} ---`);
    console.log(`Current participants: ${JSON.stringify(participants)}`);
    console.log(`UnreadCount keys: ${JSON.stringify(Object.keys(convData.unreadCount || {}))}`);
    
    // Get all unique user IDs that should be in this conversation
    const shouldBeParticipants = new Set(participants);
    
    // Check unreadCount keys
    if (convData.unreadCount) {
      Object.keys(convData.unreadCount).forEach(uid => {
        if (!shouldBeParticipants.has(uid)) {
          console.log(`  -> Found user ${uid} in unreadCount but NOT in participants!`);
          shouldBeParticipants.add(uid);
        }
      });
    }
    
    // Check messages for senderIds
    const messagesSnapshot = await db.collection('conversations').doc(convDoc.id).collection('messages').get();
    console.log(`Messages count: ${messagesSnapshot.docs.length}`);
    
    for (const msgDoc of messagesSnapshot.docs) {
      const msgData = msgDoc.data();
      if (msgData.senderId && !shouldBeParticipants.has(msgData.senderId)) {
        console.log(`  -> Found sender ${msgData.senderId} in messages but NOT in participants!`);
        shouldBeParticipants.add(msgData.senderId);
      }
    }
    
    // Fix if needed
    const newParticipants = Array.from(shouldBeParticipants);
    if (newParticipants.length !== participants.length || !newParticipants.every(p => participants.includes(p))) {
      console.log(`\n  FIXING: Old participants: ${JSON.stringify(participants)}`);
      console.log(`  FIXING: New participants: ${JSON.stringify(newParticipants)}`);
      
      await db.collection('conversations').doc(convDoc.id).update({
        participants: newParticipants
      });
      
      fixedCount++;
      console.log(`  FIXED!`);
    } else {
      console.log(`  OK - No fix needed`);
    }
  }
  
  console.log(`\n\n========================================`);
  console.log(`Fixed ${fixedCount} conversations`);
  console.log(`========================================\n`);
}

fixBrokenConversations()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
