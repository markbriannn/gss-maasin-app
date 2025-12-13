const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function createAdminAccount(email, password, firstName, lastName) {
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    await db.collection('users').doc(userRecord.uid).set({
      email,
      firstName,
      lastName,
      role: 'ADMIN',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Admin account created successfully!');
    console.log('User ID:', userRecord.uid);
    console.log('Email:', email);
    console.log('Role: ADMIN');
    
    return userRecord;
  } catch (error) {
    console.error('Error creating admin account:', error);
    throw error;
  }
}

async function setUserAsAdmin(email) {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    
    await db.collection('users').doc(userRecord.uid).update({
      role: 'ADMIN',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('User promoted to admin successfully!');
    console.log('User ID:', userRecord.uid);
    console.log('Email:', email);
    
    return userRecord;
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    throw error;
  }
}

const args = process.argv.slice(2);
const command = args[0];

if (command === 'create') {
  const email = args[1];
  const password = args[2];
  const firstName = args[3] || 'Admin';
  const lastName = args[4] || 'User';
  
  if (!email || !password) {
    console.log('Usage: node create_admin.js create <email> <password> [firstName] [lastName]');
    process.exit(1);
  }
  
  createAdminAccount(email, password, firstName, lastName)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
    
} else if (command === 'promote') {
  const email = args[1];
  
  if (!email) {
    console.log('Usage: node create_admin.js promote <email>');
    process.exit(1);
  }
  
  setUserAsAdmin(email)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
    
} else {
  console.log('GSS Maasin Admin Account Setup');
  console.log('==============================');
  console.log('');
  console.log('Commands:');
  console.log('  create <email> <password> [firstName] [lastName]  - Create new admin account');
  console.log('  promote <email>                                    - Promote existing user to admin');
  console.log('');
  console.log('Before running, place your Firebase serviceAccountKey.json in the scripts folder.');
  console.log('Download it from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key');
}
