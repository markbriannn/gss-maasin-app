// Script to check users and their conversations
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkUsers() {
  console.log('Checking users...\n');
  
  const usersSnapshot = await db.collection('users').get();
  
  const users = {};
  usersSnapshot.docs.forEach(doc => {
    const data = doc.data();
    users[doc.id] = {
      name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || 'Unknown',
      role: data.role,
      email: data.email
    };
    console.log(`User: ${doc.id}`);
    console.log(`  Name: ${users[doc.id].name}`);
    console.log(`  Role: ${data.role}`);
    console.log(`  Email: ${data.email}\n`);
  });
  
  console.log('\n\n--- Conversations with user names ---\n');
  
  const conversationsSnapshot = await db.collection('conversations').get();
  
  for (const convDoc of conversationsSnapshot.docs) {
    const convData = convDoc.data();
    const participants = convData.participants || [];
    
    console.log(`Conversation: ${convDoc.id}`);
    console.log(`  Participants:`);
    participants.forEach(uid => {
      const user = users[uid];
      if (user) {
        console.log(`    - ${uid}: ${user.name} (${user.role})`);
      } else {
        console.log(`    - ${uid}: UNKNOWN USER`);
      }
    });
    console.log(`  Last message: ${convData.lastMessage}`);
    console.log('');
  }
}

checkUsers()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
