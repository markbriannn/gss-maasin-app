// Gamification System for GSS Maasin
// Handles points, badges, tiers for both clients and providers

// ============ TIER CONFIGURATIONS ============

export const CLIENT_TIERS = {
  REGULAR: {
    name: 'Regular',
    minPoints: 0,
    color: '#6B7280',
    icon: 'person',
    benefits: ['Standard booking'],
  },
  VIP: {
    name: 'VIP',
    minPoints: 500,
    color: '#3B82F6',
    icon: 'star',
    benefits: ['Priority support', '2% discount on fees'],
  },
  PREMIUM: {
    name: 'Premium',
    minPoints: 1500,
    color: '#F59E0B',
    icon: 'diamond',
    benefits: ['Priority booking', '5% discount on fees', 'Exclusive providers'],
  },
};

export const PROVIDER_TIERS = {
  BRONZE: {
    name: 'Bronze',
    minPoints: 0,
    color: '#CD7F32',
    icon: 'shield',
    benefits: ['Standard listing'],
    feePercentage: 5,
  },
  SILVER: {
    name: 'Silver',
    minPoints: 1000,
    color: '#C0C0C0',
    icon: 'shield-half',
    benefits: ['Priority in search', '4.5% system fee'],
    feePercentage: 4.5,
  },
  GOLD: {
    name: 'Gold',
    minPoints: 3000,
    color: '#FFD700',
    icon: 'shield-checkmark',
    benefits: ['Featured badge', '4% system fee', 'Top placement'],
    feePercentage: 4,
  },
  PLATINUM: {
    name: 'Platinum',
    minPoints: 7500,
    color: '#E5E4E2',
    icon: 'trophy',
    benefits: ['Exclusive jobs', '3% system fee', 'Premium support'],
    feePercentage: 3,
  },
};

// ============ BADGE CONFIGURATIONS ============

export const CLIENT_BADGES = {
  FIRST_BOOKING: {
    id: 'first_booking',
    name: 'First Booking',
    description: 'Completed your first service booking',
    icon: 'ribbon',
    color: '#10B981',
    requirement: { type: 'bookings', count: 1 },
  },
  REPEAT_CUSTOMER: {
    id: 'repeat_customer',
    name: 'Repeat Customer',
    description: 'Completed 5 bookings',
    icon: 'refresh',
    color: '#3B82F6',
    requirement: { type: 'bookings', count: 5 },
  },
  LOYAL_CLIENT: {
    id: 'loyal_client',
    name: 'Loyal Client',
    description: 'Completed 20 bookings',
    icon: 'heart',
    color: '#EF4444',
    requirement: { type: 'bookings', count: 20 },
  },
  GREAT_REVIEWER: {
    id: 'great_reviewer',
    name: 'Great Reviewer',
    description: 'Left 10 helpful reviews',
    icon: 'chatbubble-ellipses',
    color: '#8B5CF6',
    requirement: { type: 'reviews', count: 10 },
  },
  BIG_SPENDER: {
    id: 'big_spender',
    name: 'Big Spender',
    description: 'Spent over ₱10,000 on services',
    icon: 'cash',
    color: '#F59E0B',
    requirement: { type: 'totalSpent', amount: 10000 },
  },
};

export const PROVIDER_BADGES = {
  FIRST_JOB: {
    id: 'first_job',
    name: 'First Job',
    description: 'Completed your first job',
    icon: 'checkmark-circle',
    color: '#10B981',
    requirement: { type: 'jobs', count: 1 },
  },
  RISING_STAR: {
    id: 'rising_star',
    name: 'Rising Star',
    description: 'Completed 10 jobs',
    icon: 'trending-up',
    color: '#3B82F6',
    requirement: { type: 'jobs', count: 10 },
  },
  EXPERIENCED: {
    id: 'experienced',
    name: 'Experienced Pro',
    description: 'Completed 50 jobs',
    icon: 'medal',
    color: '#8B5CF6',
    requirement: { type: 'jobs', count: 50 },
  },
  MASTER: {
    id: 'master',
    name: 'Master Provider',
    description: 'Completed 100 jobs',
    icon: 'trophy',
    color: '#F59E0B',
    requirement: { type: 'jobs', count: 100 },
  },
  TOP_RATED: {
    id: 'top_rated',
    name: 'Top Rated',
    description: 'Maintained 4.8+ rating with 20+ reviews',
    icon: 'star',
    color: '#FFD700',
    requirement: { type: 'rating', minRating: 4.8, minReviews: 20 },
  },
  FAST_RESPONDER: {
    id: 'fast_responder',
    name: 'Fast Responder',
    description: 'Average response time under 5 minutes',
    icon: 'flash',
    color: '#EF4444',
    requirement: { type: 'responseTime', maxMinutes: 5 },
  },
  VERIFIED_PRO: {
    id: 'verified_pro',
    name: 'Verified Pro',
    description: 'Completed identity verification',
    icon: 'shield-checkmark',
    color: '#00B14F',
    requirement: { type: 'verified', value: true },
  },
};

// ============ POINTS CONFIGURATION ============

export const POINTS_CONFIG = {
  client: {
    BOOKING_COMPLETED: 50,
    REVIEW_SUBMITTED: 20,
    FIVE_STAR_REVIEW: 10, // Bonus for giving 5 stars
    REFERRAL: 100,
    PROFILE_COMPLETE: 30,
  },
  provider: {
    JOB_COMPLETED: 100,
    FIVE_STAR_RECEIVED: 50,
    QUICK_RESPONSE: 20, // Under 5 min response
    PERFECT_WEEK: 200, // All jobs completed without issues
    REFERRAL: 150,
    PROFILE_COMPLETE: 50,
  },
};

// ============ HELPER FUNCTIONS ============

// Get client tier based on points
export const getClientTier = (points) => {
  if (points >= CLIENT_TIERS.PREMIUM.minPoints) return CLIENT_TIERS.PREMIUM;
  if (points >= CLIENT_TIERS.VIP.minPoints) return CLIENT_TIERS.VIP;
  return CLIENT_TIERS.REGULAR;
};

// Get provider tier based on points
export const getProviderTier = (points) => {
  if (points >= PROVIDER_TIERS.PLATINUM.minPoints) return PROVIDER_TIERS.PLATINUM;
  if (points >= PROVIDER_TIERS.GOLD.minPoints) return PROVIDER_TIERS.GOLD;
  if (points >= PROVIDER_TIERS.SILVER.minPoints) return PROVIDER_TIERS.SILVER;
  return PROVIDER_TIERS.BRONZE;
};

// Get next tier info
export const getNextTier = (currentPoints, isProvider = false) => {
  const tiers = isProvider ? PROVIDER_TIERS : CLIENT_TIERS;
  const tierArray = Object.values(tiers).sort((a, b) => a.minPoints - b.minPoints);
  
  for (const tier of tierArray) {
    if (currentPoints < tier.minPoints) {
      return {
        tier,
        pointsNeeded: tier.minPoints - currentPoints,
        progress: currentPoints / tier.minPoints,
      };
    }
  }
  
  // Already at max tier
  const maxTier = tierArray[tierArray.length - 1];
  return {
    tier: null,
    pointsNeeded: 0,
    progress: 1,
    isMaxTier: true,
    currentTier: maxTier,
  };
};

// Calculate earned badges for client
export const getClientBadges = (stats) => {
  const earned = [];
  const { completedBookings = 0, reviewsGiven = 0, totalSpent = 0 } = stats;

  Object.values(CLIENT_BADGES).forEach(badge => {
    const req = badge.requirement;
    let isEarned = false;

    switch (req.type) {
      case 'bookings':
        isEarned = completedBookings >= req.count;
        break;
      case 'reviews':
        isEarned = reviewsGiven >= req.count;
        break;
      case 'totalSpent':
        isEarned = totalSpent >= req.amount;
        break;
    }

    if (isEarned) earned.push(badge);
  });

  return earned;
};

// Calculate earned badges for provider
export const getProviderBadges = (stats) => {
  const earned = [];
  const {
    completedJobs = 0,
    rating = 0,
    reviewCount = 0,
    avgResponseTime = 999,
    isVerified = false,
  } = stats;

  Object.values(PROVIDER_BADGES).forEach(badge => {
    const req = badge.requirement;
    let isEarned = false;

    switch (req.type) {
      case 'jobs':
        isEarned = completedJobs >= req.count;
        break;
      case 'rating':
        isEarned = rating >= req.minRating && reviewCount >= req.minReviews;
        break;
      case 'responseTime':
        isEarned = avgResponseTime <= req.maxMinutes;
        break;
      case 'verified':
        isEarned = isVerified === req.value;
        break;
    }

    if (isEarned) earned.push(badge);
  });

  return earned;
};

// Format points with commas
export const formatPoints = (points) => {
  return points?.toLocaleString() || '0';
};

// Get tier progress percentage
export const getTierProgress = (currentPoints, isProvider = false) => {
  const currentTier = isProvider ? getProviderTier(currentPoints) : getClientTier(currentPoints);
  const nextTierInfo = getNextTier(currentPoints, isProvider);
  
  if (nextTierInfo.isMaxTier) return 100;
  
  const prevTierPoints = currentTier.minPoints;
  const nextTierPoints = nextTierInfo.tier.minPoints;
  const range = nextTierPoints - prevTierPoints;
  const progress = currentPoints - prevTierPoints;
  
  return Math.min(100, Math.round((progress / range) * 100));
};
