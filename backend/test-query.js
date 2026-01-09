// Script to test the exact Firestore query used by the mobile app
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Test user IDs from check-users.js output
const TEST_USERS = {
  admin: 'Lt5NQtBjmCV8gSASn1vGTZj5zGg1',
  client: 'vDBwP7j3pSOjOEzsJsoyTLYfHaA2', // Mark Cardoza
  provider: 'iaJEBQIAImPT6U97lFgLRARk8Z83', // mark cardo
};

async function testQuery(userId, label) {
  console.log(`\n========================================`);
  console.log(`Testing query for ${label}: ${userId}`);
  console.log(`========================================`);
  
  try {
    // This is the EXACT query used by the mobile app
    const conversationsRef = db.collection('conversations');
    const q = conversationsRef.where('participants', 'array-contains', userId);
    
    const snapshot = await q.get();
    
    console.log(`Found ${snapshot.docs.length} conversations`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\nConversation ${index + 1}: ${doc.id}`);
      console.log(`  participants: ${JSON.stringify(data.participants)}`);
      console.log(`  lastMessage: ${data.lastMessage?.substring(0, 50) || 'none'}`);
      console.log(`  lastMessageTime: ${data.lastMessageTime?.toDate?.() || 'none'}`);
    });
    
    return snapshot.docs.length;
  } catch (error) {
    console.error(`Error querying for ${label}:`, error);
    return 0;
  }
}

async function listAllConversations() {
  console.log(`\n========================================`);
  console.log(`ALL CONVERSATIONS IN DATABASE`);
  console.log(`========================================`);
  
  const snapshot = await db.collection('conversations').get();
  console.log(`Total conversations: ${snapshot.docs.length}\n`);
  
  snapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`${index + 1}. ${doc.id}`);
    console.log(`   participants: ${JSON.stringify(data.participants)}`);
    console.log(`   lastMessage: ${data.lastMessage?.substring(0, 30) || 'none'}`);
    console.log('');
  });
}

async function main() {
  // First list all conversations
  await listAllConversations();
  
  // Then test queries for each user
  const adminCount = await testQuery(TEST_USERS.admin, 'ADMIN');
  const clientCount = await testQuery(TEST_USERS.client, 'CLIENT (Mark Cardoza)');
  const providerCount = await testQuery(TEST_USERS.provider, 'PROVIDER (mark cardo)');
  
  console.log(`\n========================================`);
  console.log(`SUMMARY`);
  console.log(`========================================`);
  console.log(`Admin conversations: ${adminCount}`);
  console.log(`Client conversations: ${clientCount}`);
  console.log(`Provider conversations: ${providerCount}`);
  
  // Check if there are any conversations that SHOULD include the client but don't
  console.log(`\n========================================`);
  console.log(`CHECKING FOR BROKEN CONVERSATIONS`);
  console.log(`========================================`);
  
  const allConvs = await db.collection('conversations').get();
  for (const doc of allConvs.docs) {
    const data = doc.data();
    const participants = data.participants || [];
    
    // Check if admin is in participants
    if (participants.includes(TEST_USERS.admin)) {
      // This is an admin conversation - check if the other participant is correct
      const otherParticipant = participants.find(p => p !== TEST_USERS.admin);
      console.log(`\nAdmin conversation: ${doc.id}`);
      console.log(`  Other participant: ${otherParticipant}`);
      console.log(`  Is client? ${otherParticipant === TEST_USERS.client}`);
      console.log(`  Is provider? ${otherParticipant === TEST_USERS.provider}`);
    }
  }
}

main()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
