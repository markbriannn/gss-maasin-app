const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkAnalyticsData() {
  console.log('🔍 Checking Analytics Data...\n');

  // Check users
  const usersSnapshot = await db.collection('users').get();
  const providers = usersSnapshot.docs.filter(doc => doc.data().role === 'PROVIDER');
  const clients = usersSnapshot.docs.filter(doc => doc.data().role === 'CLIENT');
  
  console.log('👥 Users:');
  console.log(`  - Total Providers: ${providers.length}`);
  console.log(`  - Total Clients: ${clients.length}\n`);

  // Check bookings
  const bookingsSnapshot = await db.collection('bookings').get();
  console.log('📋 Bookings:');
  console.log(`  - Total Bookings: ${bookingsSnapshot.size}`);
  
  const bookingsByStatus = {};
  let completedWithLocation = 0;
  let totalRevenue = 0;
  
  bookingsSnapshot.forEach(doc => {
    const data = doc.data();
    const status = data.status || 'unknown';
    bookingsByStatus[status] = (bookingsByStatus[status] || 0) + 1;
    
    if (status === 'completed' || (status === 'payment_received' && data.isPaidUpfront)) {
      const amount = data.finalAmount || data.totalAmount || 0;
      totalRevenue += amount;
      
      if (data.clientLocation?.latitude && data.clientLocation?.longitude) {
        completedWithLocation++;
      }
    }
  });
  
  console.log('\n📊 Bookings by Status:');
  Object.entries(bookingsByStatus).forEach(([status, count]) => {
    console.log(`  - ${status}: ${count}`);
  });
  
  console.log(`\n💰 Total Revenue: ₱${totalRevenue.toLocaleString()}`);
  console.log(`📍 Completed bookings with location: ${completedWithLocation}\n`);

  // Check if there are any completed bookings
  if (bookingsByStatus.completed === 0 && !bookingsByStatus.payment_received) {
    console.log('⚠️  NO COMPLETED BOOKINGS FOUND!');
    console.log('   This is why analytics shows ₱0.00\n');
    console.log('💡 To fix this:');
    console.log('   1. Complete an existing booking, OR');
    console.log('   2. Run: node backend/add-sample-analytics-data.js\n');
  }

  process.exit(0);
}

checkAnalyticsData().catch(console.error);
