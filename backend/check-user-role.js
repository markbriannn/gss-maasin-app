// Check user role
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkUserRole(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found:', userId);
      return;
    }
    
    const user = userDoc.data();
    
    console.log('\n👤 User Details:');
    console.log('ID:', userId);
    console.log('Name:', `${user.firstName || ''} ${user.lastName || ''}`.trim());
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Role (uppercase):', user.role?.toUpperCase());
    
    if (user.role === 'admin' || user.role?.toUpperCase() === 'ADMIN') {
      console.log('\n✅ This user is an ADMIN');
      console.log('✅ Can call anyone without approval');
    } else {
      console.log('\n⚠️ This user is NOT an admin');
      console.log('Role:', user.role);
      console.log('Needs booking approval to make calls');
    }
    
  } catch (error) {
    console.error('Error checking user:', error);
  }
}

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node backend/check-user-role.js <userId>');
  console.log('Example: node backend/check-user-role.js FN251LWYxlVjqcwhDVHPJNqeL953');
  process.exit(1);
}

checkUserRole(userId);
