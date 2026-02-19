const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function addSampleData() {
  console.log('Adding sample analytics data...');

  try {
    // Sample provider IDs (use real ones from your database or create new)
    const providerIds = ['provider1', 'provider2', 'provider3'];
    
    // Add sample completed bookings with locations
    const sampleBookings = [
      {
        status: 'completed',
        serviceType: 'Plumbing',
        finalAmount: 1500,
        totalAmount: 1500,
        systemFee: 75,
        providerEarnings: 1425,
        completedAt: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)), // 5 days ago
        providerId: providerIds[0],
        providerName: 'Juan Dela Cruz',
        providerPhotoURL: null,
        rating: 4.8,
        clientLocation: {
          latitude: 10.1335,
          longitude: 124.8359,
          address: 'Brgy. Poblacion, Maasin City, Southern Leyte'
        },
        adminApproved: true
      },
      {
        status: 'completed',
        serviceType: 'Electrical',
        finalAmount: 2000,
        totalAmount: 2000,
        systemFee: 100,
        providerEarnings: 1900,
        completedAt: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)), // 10 days ago
        providerId: providerIds[1],
        providerName: 'Maria Santos',
        providerPhotoURL: null,
        rating: 4.9,
        clientLocation: {
          latitude: 10.1345,
          longitude: 124.8369,
          address: 'Brgy. Combado, Maasin City, Southern Leyte'
        },
        adminApproved: true
      },
      {
        status: 'completed',
        serviceType: 'Plumbing',
        finalAmount: 1200,
        totalAmount: 1200,
        systemFee: 60,
        providerEarnings: 1140,
        completedAt: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)), // 15 days ago
        providerId: providerIds[0],
        providerName: 'Juan Dela Cruz',
        providerPhotoURL: null,
        rating: 4.7,
        clientLocation: {
          latitude: 10.1325,
          longitude: 124.8349,
          address: 'Brgy. Poblacion, Maasin City, Southern Leyte'
        },
        adminApproved: true
      },
      {
        status: 'completed',
        serviceType: 'Carpentry',
        finalAmount: 3000,
        totalAmount: 3000,
        systemFee: 150,
        providerEarnings: 2850,
        completedAt: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)), // 20 days ago
        providerId: providerIds[2],
        providerName: 'Pedro Cruz',
        providerPhotoURL: null,
        rating: 4.6,
        clientLocation: {
          latitude: 10.1355,
          longitude: 124.8379,
          address: 'Brgy. Tunga-Tunga, Maasin City, Southern Leyte'
        },
        adminApproved: true
      },
      {
        status: 'completed',
        serviceType: 'Electrical',
        finalAmount: 1800,
        totalAmount: 1800,
        systemFee: 90,
        providerEarnings: 1710,
        completedAt: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)), // 25 days ago
        providerId: providerIds[1],
        providerName: 'Maria Santos',
        providerPhotoURL: null,
        rating: 5.0,
        clientLocation: {
          latitude: 10.1340,
          longitude: 124.8364,
          address: 'Brgy. Combado, Maasin City, Southern Leyte'
        },
        adminApproved: true
      },
      {
        status: 'completed',
        serviceType: 'Plumbing',
        finalAmount: 1600,
        totalAmount: 1600,
        systemFee: 80,
        providerEarnings: 1520,
        completedAt: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), // 3 days ago
        providerId: providerIds[0],
        providerName: 'Juan Dela Cruz',
        providerPhotoURL: null,
        rating: 4.8,
        clientLocation: {
          latitude: 10.1330,
          longitude: 124.8354,
          address: 'Brgy. Poblacion, Maasin City, Southern Leyte'
        },
        adminApproved: true
      },
      {
        status: 'completed',
        serviceType: 'Cleaning',
        finalAmount: 800,
        totalAmount: 800,
        systemFee: 40,
        providerEarnings: 760,
        completedAt: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // 7 days ago
        providerId: providerIds[2],
        providerName: 'Pedro Cruz',
        providerPhotoURL: null,
        rating: 4.5,
        clientLocation: {
          latitude: 10.1315,
          longitude: 124.8339,
          address: 'Brgy. Abgao, Maasin City, Southern Leyte'
        },
        adminApproved: true
      },
      {
        status: 'completed',
        serviceType: 'Painting',
        finalAmount: 2500,
        totalAmount: 2500,
        systemFee: 125,
        providerEarnings: 2375,
        completedAt: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)), // 12 days ago
        providerId: providerIds[1],
        providerName: 'Maria Santos',
        providerPhotoURL: null,
        rating: 4.9,
        clientLocation: {
          latitude: 10.1350,
          longitude: 124.8374,
          address: 'Brgy. Tunga-Tunga, Maasin City, Southern Leyte'
        },
        adminApproved: true
      }
    ];

    // Add bookings to Firestore
    const batch = db.batch();
    for (const booking of sampleBookings) {
      const docRef = db.collection('bookings').doc();
      batch.set(docRef, booking);
    }

    await batch.commit();
    console.log(`✅ Added ${sampleBookings.length} sample bookings`);

    // Summary
    console.log('\n📊 Sample Data Summary:');
    console.log(`- Total bookings: ${sampleBookings.length}`);
    console.log(`- Services: Plumbing (3), Electrical (2), Carpentry (1), Cleaning (1), Painting (1)`);
    console.log(`- Locations: Brgy. Poblacion (3), Brgy. Combado (2), Brgy. Tunga-Tunga (2), Brgy. Abgao (1)`);
    console.log(`- Total revenue: ₱${sampleBookings.reduce((sum, b) => sum + b.finalAmount, 0).toLocaleString()}`);
    console.log('\n✨ Now refresh your admin analytics page to see the charts!');
    console.log('🗺️  Heat map will show MAASIN CITY, SOUTHERN LEYTE (10.1335, 124.8359)');



  } catch (error) {
    console.error('Error adding sample data:', error);
  }
}

addSampleData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
