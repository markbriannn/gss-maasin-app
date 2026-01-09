// Fix deleted flag on conversation
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixDeleted() {
  // Fix the admin-client conversation
  await db.collection('conversations').doc('e4025CBtie9uaMlcbbh9').update({
    'deleted.vDBwP7j3pSOjOEzsJsoyTLYfHaA2': false
  });
  console.log('Fixed conversation e4025CBtie9uaMlcbbh9 - cleared deleted flag for client');
  
  // Also check and fix any other conversations with deleted flags
  const snapshot = await db.collection('conversations').get();
  let fixedCount = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.deleted) {
      // Clear all deleted flags
      const updates = {};
      for (const [userId, isDeleted] of Object.entries(data.deleted)) {
        if (isDeleted === true) {
          updates[`deleted.${userId}`] = false;
          fixedCount++;
        }
      }
      if (Object.keys(updates).length > 0) {
        await db.collection('conversations').doc(doc.id).update(updates);
        console.log(`Fixed conversation ${doc.id} - cleared ${Object.keys(updates).length} deleted flags`);
      }
    }
  }
  
  console.log(`\nTotal deleted flags cleared: ${fixedCount}`);
}

fixDeleted()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
