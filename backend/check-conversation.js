// Check specific conversation details
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const CLIENT_ID = 'vDBwP7j3pSOjOEzsJsoyTLYfHaA2';
const ADMIN_CONV_ID = 'e4025CBtie9uaMlcbbh9';

async function checkConversation() {
  console.log('Checking conversation:', ADMIN_CONV_ID);
  
  const doc = await db.collection('conversations').doc(ADMIN_CONV_ID).get();
  
  if (doc.exists) {
    const data = doc.data();
    console.log('\nFull conversation data:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n--- Key fields ---');
    console.log('participants:', data.participants);
    console.log('deleted:', data.deleted);
    console.log('archived:', data.archived);
    console.log('lastMessage:', data.lastMessage);
    
    // Check if client would be filtered out
    const isDeleted = data.deleted?.[CLIENT_ID];
    const isArchived = data.archived?.[CLIENT_ID];
    console.log('\n--- Client filter status ---');
    console.log('Is deleted for client?', isDeleted);
    console.log('Is archived for client?', isArchived);
  } else {
    console.log('Conversation not found!');
  }
}

checkConversation()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
