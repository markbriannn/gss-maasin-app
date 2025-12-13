/**
 * Safely update a single user's `role` in Firestore.
 * Usage:
 *   node scripts/fix_user_role.js --serviceAccount=./serviceAccount.json --uid=<UID> --role=PROVIDER
 */
const admin = require('firebase-admin');
const argv = require('minimist')(process.argv.slice(2));

async function main() {
  const svcPath = argv.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const uid = argv.uid;
  const role = argv.role || 'PROVIDER';

  if (!svcPath || !uid) {
    console.error('Usage: --serviceAccount=./svc.json --uid=<UID> [--role=PROVIDER]');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(require(svcPath)),
  });
  const db = admin.firestore();

  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    console.error('User not found:', uid);
    process.exit(2);
  }

  console.log('Current data:', snap.data());
  await userRef.update({role, updatedAt: admin.firestore.FieldValue.serverTimestamp()});
  console.log(`Updated ${uid} role => ${role}`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(3); });
