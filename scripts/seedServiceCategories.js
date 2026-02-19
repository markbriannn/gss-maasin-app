/**
 * Firestore Seed Script: Service Categories
 * 
 * Run this once to populate the serviceCategories collection.
 * Usage: node scripts/seedServiceCategories.js
 * 
 * Or paste this into the browser console while logged in as admin,
 * or run it from the admin services page (it auto-seeds if empty).
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');

// Copy your Firebase config here or use env vars
const firebaseConfig = {
    // Fill in from your .env or firebase console
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const SERVICE_CATEGORIES_SEED = [
    {
        name: 'Electrician',
        icon: '⚡',
        color: '#F59E0B',
        gradient: 'from-yellow-400 to-amber-500',
        basePrice: 200,
    },
    {
        name: 'Plumber',
        icon: '🔧',
        color: '#3B82F6',
        gradient: 'from-blue-400 to-blue-600',
        basePrice: 200,
    },
    {
        name: 'Carpenter',
        icon: '🪚',
        color: '#8B4513',
        gradient: 'from-amber-700 to-amber-900',
        basePrice: 200,
    },
    {
        name: 'Cleaner',
        icon: '🧹',
        color: '#10B981',
        gradient: 'from-emerald-400 to-green-600',
        basePrice: 200,
    },
];

async function seed() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const existing = await getDocs(collection(db, 'serviceCategories'));
    if (!existing.empty) {
        console.log(`serviceCategories already has ${existing.size} documents. Skipping seed.`);
        return;
    }

    for (const category of SERVICE_CATEGORIES_SEED) {
        const ref = await addDoc(collection(db, 'serviceCategories'), {
            ...category,
            createdAt: new Date(),
        });
        console.log(`Added: ${category.name} (${ref.id})`);
    }

    console.log('Seed complete!');
}

seed().catch(console.error);
