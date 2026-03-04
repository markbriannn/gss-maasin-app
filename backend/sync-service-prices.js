/**
 * Sync Service Prices Script
 * 
 * This script ensures that:
 * 1. Service category prices in serviceCategories collection are up-to-date
 * 2. Provider profiles reflect current service prices
 * 3. Shows any bookings with outdated prices (for reference only - bookings are immutable)
 * 
 * Usage: node backend/sync-service-prices.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function syncServicePrices() {
  console.log('🔄 Starting service price sync...\n');

  try {
    // Step 1: Get all service categories with their current prices
    console.log('📋 Step 1: Fetching service categories...');
    const categoriesSnap = await db.collection('serviceCategories').get();
    
    const categoryPrices = {};
    console.log(`Found ${categoriesSnap.size} service categories:\n`);
    
    categoriesSnap.forEach(doc => {
      const data = doc.data();
      categoryPrices[data.name] = data.basePrice || 0;
      console.log(`  - ${data.name}: ₱${data.basePrice || 0}`);
    });

    if (Object.keys(categoryPrices).length === 0) {
      console.log('\n❌ No service categories found! Please add service categories first.');
      return;
    }

    // Step 2: Update provider profiles with current prices
    console.log('\n📋 Step 2: Updating provider profiles...');
    const providersSnap = await db.collection('users')
      .where('role', '==', 'PROVIDER')
      .get();

    console.log(`Found ${providersSnap.size} providers\n`);

    let updatedCount = 0;
    const batch = db.batch();

    for (const doc of providersSnap.docs) {
      const provider = doc.data();
      const serviceCategory = provider.serviceCategory;
      
      if (!serviceCategory) {
        console.log(`  ⚠️  ${provider.firstName} ${provider.lastName}: No service category`);
        continue;
      }

      const currentPrice = categoryPrices[serviceCategory];
      if (currentPrice === undefined) {
        console.log(`  ⚠️  ${provider.firstName} ${provider.lastName}: Category "${serviceCategory}" not found`);
        continue;
      }

      const oldPrice = provider.fixedPrice || provider.serviceCategoryBasePrice || 0;
      
      if (oldPrice !== currentPrice) {
        batch.update(doc.ref, {
          fixedPrice: currentPrice,
          serviceCategoryBasePrice: currentPrice,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`  ✅ ${provider.firstName} ${provider.lastName}: ₱${oldPrice} → ₱${currentPrice}`);
        updatedCount++;
      } else {
        console.log(`  ✓  ${provider.firstName} ${provider.lastName}: Already up-to-date (₱${currentPrice})`);
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`\n✅ Updated ${updatedCount} provider profiles`);
    } else {
      console.log('\n✅ All provider profiles are already up-to-date');
    }

    // Step 3: Check recent bookings for price mismatches (informational only)
    console.log('\n📋 Step 3: Checking recent bookings...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bookingsSnap = await db.collection('bookings')
      .where('createdAt', '>=', thirtyDaysAgo)
      .where('status', 'in', ['pending', 'awaiting_payment', 'accepted'])
      .get();

    console.log(`Found ${bookingsSnap.size} recent active bookings\n`);

    let mismatchCount = 0;
    bookingsSnap.forEach(doc => {
      const booking = doc.data();
      const serviceCategory = booking.serviceCategory;
      const bookingPrice = booking.providerPrice || booking.fixedPrice || 0;
      const currentPrice = categoryPrices[serviceCategory];

      if (currentPrice && bookingPrice !== currentPrice) {
        console.log(`  ⚠️  Booking ${doc.id}:`);
        console.log(`     Service: ${serviceCategory}`);
        console.log(`     Booking Price: ₱${bookingPrice}`);
        console.log(`     Current Price: ₱${currentPrice}`);
        console.log(`     Status: ${booking.status}`);
        console.log(`     Note: Booking prices are immutable (captured at creation time)\n`);
        mismatchCount++;
      }
    });

    if (mismatchCount === 0) {
      console.log('✅ All recent bookings use current prices');
    } else {
      console.log(`\n📝 Found ${mismatchCount} bookings with old prices`);
      console.log('   This is normal - booking prices are captured at creation time');
      console.log('   New bookings will use the updated prices');
    }

    console.log('\n✅ Service price sync complete!');
    console.log('\n📝 Summary:');
    console.log(`   - Service Categories: ${Object.keys(categoryPrices).length}`);
    console.log(`   - Providers Updated: ${updatedCount}`);
    console.log(`   - Recent Bookings Checked: ${bookingsSnap.size}`);
    console.log(`   - Bookings with Old Prices: ${mismatchCount} (normal)`);

  } catch (error) {
    console.error('\n❌ Error syncing prices:', error);
    throw error;
  }
}

// Run the sync
syncServicePrices()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
