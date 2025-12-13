/**
 * Bulk-fix users missing `role` by setting a role based on heuristics.
 * Heuristic used here: if `status === 'pending'` set role = 'PROVIDER', otherwise set 'CLIENT'.
 * Usage:
 *   node scripts/fix_missing_roles_bulk.js --serviceAccount=./svc.json --dryRun
 * Pass --dryRun to only print changes without applying them.
 */
const admin = require('firebase-admin');
const argv = require('minimist')(process.argv.slice(2));

async function main() {
  const svcPath = argv.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const dryRun = !!argv.dryRun;
  if (!svcPath) {
    console.error('Missing service account. Pass --serviceAccount=path or set GOOGLE_APPLICATION_CREDENTIALS');
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(require(svcPath)) });
  const db = admin.firestore();

  const snapshot = await db.collection('users').get();
  const toFix = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data || typeof data.role === 'undefined' || data.role === null || data.role === '') {
      const role = (data && data.status === 'pending') ? 'PROVIDER' : 'CLIENT';
      toFix.push({id: doc.id, email: data?.email, role, status: data?.status});
    }
  });

  console.log(`Will update ${toFix.length} user(s). dryRun=${dryRun}`);
  toFix.forEach((u) => console.log(`- ${u.id} ${u.email || ''} => ${u.role} (status=${u.status})`));

  if (!dryRun) {
    for (const u of toFix) {
      await db.collection('users').doc(u.id).update({role: u.role, updatedAt: admin.firestore.FieldValue.serverTimestamp()});
      console.log(`Updated ${u.id} => ${u.role}`);
    }
  }

  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(2); });
