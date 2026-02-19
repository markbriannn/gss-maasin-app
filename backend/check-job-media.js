const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkJobMedia() {
  const jobId = 'OLz9wrLk1M4adRaOuad2';
  
  console.log(`🔍 Checking job ${jobId} for media fields...\n`);
  
  const jobDoc = await db.collection('bookings').doc(jobId).get();
  
  if (!jobDoc.exists) {
    console.log('❌ Job not found!');
    return;
  }
  
  const data = jobDoc.data();
  
  console.log('📋 All fields in this booking:');
  console.log(Object.keys(data).sort().join(', '));
  
  console.log('\n📸 Media-related fields:');
  const mediaFields = ['mediaFiles', 'mediaUrls', 'media', 'photos', 'images', 'attachments'];
  
  mediaFields.forEach(field => {
    if (data[field]) {
      console.log(`\n✅ Found: ${field}`);
      console.log(`   Type: ${Array.isArray(data[field]) ? 'Array' : typeof data[field]}`);
      console.log(`   Length: ${Array.isArray(data[field]) ? data[field].length : 'N/A'}`);
      console.log(`   Value:`, JSON.stringify(data[field], null, 2));
    }
  });
  
  process.exit(0);
}

checkJobMedia().catch(console.error);
