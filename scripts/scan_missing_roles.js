/**
 * Scan Firestore `users` collection and list documents missing a `role` field.
 * Usage:
 *   node scripts/scan_missing_roles.js --serviceAccount=./serviceAccount.json
 *
 * Ensure you have a Firebase service account JSON file and pass its path
 * via --serviceAccount or set the environment variable GOOGLE_APPLICATION_CREDENTIALS.
 */
const admin = require('firebase-admin');
const argv = require('minimist')(process.argv.slice(2));

async function main() {
  const svcPath = argv.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!svcPath) {
    console.error('Missing service account. Pass --serviceAccount=path or set GOOGLE_APPLICATION_CREDENTIALS');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(require(svcPath)),
  });

  const db = admin.firestore();
  console.log('Scanning users collection...');

  const snapshot = await db.collection('users').get();
  const missing = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data || typeof data.role === 'undefined' || data.role === null || data.role === '') {
      missing.push({id: doc.id, email: data?.email || null, status: data?.status || null});
    }
  });

  console.log(`Found ${missing.length} user(s) missing role:`);
  missing.forEach((u) => console.log(`- ${u.id} ${u.email ? `(${u.email})` : ''} status=${u.status}`));
  process.exit(0);
}

main().catch((err) => {
  console.error('Error scanning users:', err);
  process.exit(2);
});
