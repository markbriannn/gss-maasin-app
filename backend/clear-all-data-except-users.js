const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function clearCollection(collectionName) {
  console.log(`\n🗑️  Clearing ${collectionName} collection...`);
  
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`   ✓ ${collectionName} is already empty`);
    return;
  }

  const batchSize = 500;
  let deletedCount = 0;
  
  while (true) {
    const batch = db.batch();
    const docs = await collectionRef.limit(batchSize).get();
    
    if (docs.empty) break;
    
    docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });
    
    await batch.commit();
    console.log(`   Deleted ${deletedCount} documents...`);
  }
  
  console.log(`   ✓ Cleared ${deletedCount} documents from ${collectionName}`);
}

async function clearAllDataExceptUsers() {
  console.log('🚀 Starting data cleanup (keeping user accounts)...\n');
  console.log('⚠️  WARNING: This will delete ALL documents except user accounts!');
  console.log('   Collections will remain but documents will be cleared:');
  console.log('   - bookings (all documents deleted)');
  console.log('   - conversations (all documents deleted)');
  console.log('   - messages (all documents deleted)');
  console.log('   - notifications (all documents deleted)');
  console.log('   - reviews (all documents deleted)');
  console.log('   - favorites (all documents deleted)');
  console.log('   - transactions (all documents deleted)');
  console.log('   - calls (all documents deleted)');
  console.log('   - serviceCategories (all documents deleted)');
  console.log('   - providerStats (all documents deleted)');
  console.log('   - gamification (all documents deleted)');
  console.log('\n   ✓ Collections structure will be preserved');
  console.log('   ✓ Users collection and all user documents will be PRESERVED\n');

  try {
    // Clear all collections except users
    await clearCollection('bookings');
    await clearCollection('conversations');
    await clearCollection('messages');
    await clearCollection('notifications');
    await clearCollection('reviews');
    await clearCollection('favorites');
    await clearCollection('transactions');
    await clearCollection('calls');
    await clearCollection('serviceCategories');
    await clearCollection('providerStats');
    await clearCollection('gamification');

    console.log('\n✅ Data cleanup complete!');
    console.log('   ✓ All collections still exist (structure preserved)');
    console.log('   ✓ User accounts and documents have been preserved');
    console.log('   ✓ All other documents have been deleted');
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
clearAllDataExceptUsers()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
