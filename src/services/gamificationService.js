// Gamification Service - Firebase integration for points, badges, tiers
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  query,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import {db} from '../config/firebase';
import {
  POINTS_CONFIG,
  getClientTier,
  getProviderTier,
  getClientBadges,
  getProviderBadges,
} from '../utils/gamification';

// ============ USER GAMIFICATION DATA ============

// Get or create gamification data for a user
export const getGamificationData = async (userId, role = 'CLIENT') => {
  try {
    const docRef = doc(db, 'gamification', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }

    // Create default gamification data
    const defaultData = {
      points: 0,
      role: role.toUpperCase(),
      stats: role.toUpperCase() === 'PROVIDER' 
        ? { completedJobs: 0, rating: 0, reviewCount: 0, totalEarnings: 0 }
        : { completedBookings: 0, reviewsGiven: 0, totalSpent: 0 },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, defaultData);
    return { id: userId, ...defaultData };
  } catch (error) {
    console.error('Error getting gamification data:', error);
    return null;
  }
};

// ============ POINTS MANAGEMENT ============

// Add points to user
export const addPoints = async (userId, pointType, role = 'CLIENT') => {
  try {
    const roleKey = role.toUpperCase() === 'PROVIDER' ? 'provider' : 'client';
    const points = POINTS_CONFIG[roleKey][pointType] || 0;
    
    if (points === 0) return { success: false, error: 'Invalid point type' };

    const docRef = doc(db, 'gamification', userId);
    await updateDoc(docRef, {
      points: increment(points),
      updatedAt: serverTimestamp(),
      [`pointsHistory.${Date.now()}`]: {
        type: pointType,
        points,
        timestamp: new Date().toISOString(),
      },
    });

    return { success: true, pointsAdded: points };
  } catch (error) {
    console.error('Error adding points:', error);
    // If doc doesn't exist, create it first
    if (error.code === 'not-found') {
      await getGamificationData(userId, role);
      return addPoints(userId, pointType, role);
    }
    return { success: false, error: error.message };
  }
};


// Update user stats (for badge calculation)
export const updateStats = async (userId, statsUpdate, role = 'CLIENT') => {
  try {
    const docRef = doc(db, 'gamification', userId);
    const updates = {};
    
    Object.keys(statsUpdate).forEach(key => {
      updates[`stats.${key}`] = statsUpdate[key];
    });
    updates.updatedAt = serverTimestamp();

    await updateDoc(docRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating stats:', error);
    if (error.code === 'not-found') {
      await getGamificationData(userId, role);
      return updateStats(userId, statsUpdate, role);
    }
    return { success: false, error: error.message };
  }
};

// Increment a specific stat
export const incrementStat = async (userId, statKey, amount = 1, role = 'CLIENT') => {
  try {
    const docRef = doc(db, 'gamification', userId);
    await updateDoc(docRef, {
      [`stats.${statKey}`]: increment(amount),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error incrementing stat:', error);
    if (error.code === 'not-found') {
      await getGamificationData(userId, role);
      return incrementStat(userId, statKey, amount, role);
    }
    return { success: false, error: error.message };
  }
};

// ============ LEADERBOARD ============

// Get top providers leaderboard
export const getProviderLeaderboard = async (limitCount = 10) => {
  try {
    // Fetch all gamification docs and filter/sort in memory to avoid composite index
    const q = query(collection(db, 'gamification'));
    const snapshot = await getDocs(q);
    
    // Filter providers and sort by points
    const providerDocs = snapshot.docs
      .filter(d => d.data().role === 'PROVIDER')
      .sort((a, b) => (b.data().points || 0) - (a.data().points || 0));

    const leaderboard = [];

    for (const docSnap of providerDocs) {
      // Stop if we have enough approved providers
      if (leaderboard.length >= limitCount) break;
      
      const data = docSnap.data();
      // Get provider profile for name and photo
      const userDoc = await getDoc(doc(db, 'users', docSnap.id));
      if (!userDoc.exists()) continue;
      
      const userData = userDoc.data();
      
      // Only include approved providers
      const isApproved = userData.status === 'approved' || userData.providerStatus === 'approved';
      if (!isApproved) continue;
      
      leaderboard.push({
        id: docSnap.id,
        points: data.points || 0,
        stats: data.stats || {},
        name: userData.firstName 
          ? `${userData.firstName} ${userData.lastName || ''}`.trim()
          : 'Provider',
        service: userData.serviceCategory || userData.service || 'Service Provider',
        rating: userData.rating || userData.averageRating || data.stats?.rating || 0,
        photoURL: userData.profilePhoto || userData.photoURL || null,
        tier: getProviderTier(data.points || 0),
        badges: getProviderBadges(data.stats || {}),
      });
    }

    return leaderboard;
  } catch (error) {
    console.error('Error getting provider leaderboard:', error);
    return [];
  }
};

// Get top clients leaderboard
export const getClientLeaderboard = async (limitCount = 10) => {
  try {
    // First, get gamification data for clients who have it
    const gamificationQuery = query(collection(db, 'gamification'));
    const gamificationSnapshot = await getDocs(gamificationQuery);
    
    // Create a map of client gamification data
    const clientGamificationMap = new Map();
    gamificationSnapshot.docs.forEach(d => {
      const data = d.data();
      if (data.role === 'CLIENT') {
        clientGamificationMap.set(d.id, data);
      }
    });

    // Also fetch all clients from users collection to include those without gamification data
    const usersQuery = query(collection(db, 'users'));
    const usersSnapshot = await getDocs(usersQuery);
    
    const allClients = [];
    
    usersSnapshot.docs.forEach(userDoc => {
      const userData = userDoc.data();
      // Only include clients (not providers or admins)
      if (userData.role?.toUpperCase() !== 'CLIENT') return;
      
      const gamificationData = clientGamificationMap.get(userDoc.id);
      const points = gamificationData?.points || 0;
      const stats = gamificationData?.stats || {};
      
      allClients.push({
        id: userDoc.id,
        points,
        stats,
        name: userData.firstName 
          ? `${userData.firstName} ${userData.lastName || ''}`.trim()
          : 'Client',
        photoURL: userData.profilePhoto || userData.photoURL || null,
        tier: getClientTier(points),
        badges: getClientBadges(stats),
      });
    });

    // Sort by points descending and limit
    allClients.sort((a, b) => b.points - a.points);
    return allClients.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting client leaderboard:', error);
    return [];
  }
};

// ============ BADGE & TIER HELPERS ============

// Get user's current tier and badges
export const getUserTierAndBadges = async (userId, role = 'CLIENT') => {
  try {
    const data = await getGamificationData(userId, role);
    if (!data) return null;

    const isProvider = role.toUpperCase() === 'PROVIDER';
    const tier = isProvider 
      ? getProviderTier(data.points || 0)
      : getClientTier(data.points || 0);
    const badges = isProvider
      ? getProviderBadges(data.stats || {})
      : getClientBadges(data.stats || {});

    return {
      points: data.points || 0,
      tier,
      badges,
      stats: data.stats || {},
    };
  } catch (error) {
    console.error('Error getting tier and badges:', error);
    return null;
  }
};

// ============ EVENT HANDLERS ============

// Call when a booking is completed
export const onBookingCompleted = async (clientId, providerId, amount) => {
  try {
    // Award points to client
    await addPoints(clientId, 'BOOKING_COMPLETED', 'CLIENT');
    await incrementStat(clientId, 'completedBookings', 1, 'CLIENT');
    await incrementStat(clientId, 'totalSpent', amount, 'CLIENT');

    // Award points to provider
    await addPoints(providerId, 'JOB_COMPLETED', 'PROVIDER');
    await incrementStat(providerId, 'completedJobs', 1, 'PROVIDER');
    await incrementStat(providerId, 'totalEarnings', amount, 'PROVIDER');

    return { success: true };
  } catch (error) {
    console.error('Error on booking completed:', error);
    return { success: false, error: error.message };
  }
};

// Call when a review is submitted
export const onReviewSubmitted = async (clientId, providerId, rating) => {
  try {
    // Award points to client for reviewing
    await addPoints(clientId, 'REVIEW_SUBMITTED', 'CLIENT');
    await incrementStat(clientId, 'reviewsGiven', 1, 'CLIENT');
    
    if (rating === 5) {
      await addPoints(clientId, 'FIVE_STAR_REVIEW', 'CLIENT');
      await addPoints(providerId, 'FIVE_STAR_RECEIVED', 'PROVIDER');
    }

    // Update provider's review count
    await incrementStat(providerId, 'reviewCount', 1, 'PROVIDER');

    return { success: true };
  } catch (error) {
    console.error('Error on review submitted:', error);
    return { success: false, error: error.message };
  }
};

export default {
  getGamificationData,
  addPoints,
  updateStats,
  incrementStat,
  getProviderLeaderboard,
  getClientLeaderboard,
  getUserTierAndBadges,
  onBookingCompleted,
  onReviewSubmitted,
};
