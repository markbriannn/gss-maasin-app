import AsyncStorage from '@react-native-async-storage/async-storage';

const RATE_LIMIT_PREFIX = '@rate_limit_';

// Rate limit configurations
const LIMITS = {
  booking: {
    maxAttempts: 20,     // Max 20 bookings per hour (increased from 5)
    windowMs: 60 * 60 * 1000,  // Per hour
    cooldownMs: 1 * 60 * 1000, // 1 min cooldown after limit hit (reduced from 5)
  },
  message: {
    maxAttempts: 20,     // Max 20 messages
    windowMs: 60 * 1000, // Per minute
    cooldownMs: 30 * 1000, // 30 sec cooldown
  },
  login: {
    maxAttempts: 5,      // Max 5 failed attempts
    windowMs: 15 * 60 * 1000, // Per 15 minutes
    cooldownMs: 5 * 60 * 1000, // 5 min lockout
  },
  review: {
    maxAttempts: 3,      // Max 3 reviews
    windowMs: 60 * 60 * 1000, // Per hour
    cooldownMs: 10 * 60 * 1000, // 10 min cooldown
  },
  registration: {
    maxAttempts: 3,      // Max 3 registration attempts
    windowMs: 60 * 60 * 1000, // Per hour
    cooldownMs: 30 * 60 * 1000, // 30 min cooldown
  },
  passwordReset: {
    maxAttempts: 3,      // Max 3 reset requests
    windowMs: 60 * 60 * 1000, // Per hour
    cooldownMs: 15 * 60 * 1000, // 15 min cooldown
  },
};

class RateLimiter {
  constructor() {
    this.cache = new Map(); // In-memory cache for faster checks
  }

  // Get storage key for a specific action and user
  getKey(action, userId) {
    return `${RATE_LIMIT_PREFIX}${action}_${userId || 'anonymous'}`;
  }

  // Get rate limit data from storage
  async getData(action, userId) {
    const key = this.getKey(action, userId);
    
    // Check memory cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache.set(key, data);
        return data;
      }
    } catch (error) {
      console.log('RateLimiter getData error:', error);
    }

    return { attempts: [], cooldownUntil: null };
  }

  // Save rate limit data
  async saveData(action, userId, data) {
    const key = this.getKey(action, userId);
    this.cache.set(key, data);
    
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.log('RateLimiter saveData error:', error);
    }
  }

  // Check if action is allowed
  async checkLimit(action, userId) {
    const config = LIMITS[action];
    if (!config) {
      console.warn(`Unknown rate limit action: ${action}`);
      return { allowed: true };
    }

    const now = Date.now();
    const data = await this.getData(action, userId);

    // Check if in cooldown
    if (data.cooldownUntil && now < data.cooldownUntil) {
      const remainingMs = data.cooldownUntil - now;
      const remainingSec = Math.ceil(remainingMs / 1000);
      const remainingMin = Math.ceil(remainingMs / 60000);
      
      return {
        allowed: false,
        reason: 'cooldown',
        remainingMs,
        message: remainingMin > 1 
          ? `Please wait ${remainingMin} minutes before trying again`
          : `Please wait ${remainingSec} seconds before trying again`,
      };
    }

    // Filter attempts within the time window
    const windowStart = now - config.windowMs;
    const recentAttempts = data.attempts.filter(ts => ts > windowStart);

    // Check if limit exceeded
    if (recentAttempts.length >= config.maxAttempts) {
      // Set cooldown
      const cooldownUntil = now + config.cooldownMs;
      await this.saveData(action, userId, {
        attempts: recentAttempts,
        cooldownUntil,
      });

      const remainingMin = Math.ceil(config.cooldownMs / 60000);
      return {
        allowed: false,
        reason: 'limit_exceeded',
        remainingMs: config.cooldownMs,
        message: `Too many attempts. Please wait ${remainingMin} minutes.`,
        attemptsUsed: recentAttempts.length,
        maxAttempts: config.maxAttempts,
      };
    }

    return {
      allowed: true,
      attemptsUsed: recentAttempts.length,
      attemptsRemaining: config.maxAttempts - recentAttempts.length,
      maxAttempts: config.maxAttempts,
    };
  }

  // Record an attempt
  async recordAttempt(action, userId) {
    const config = LIMITS[action];
    if (!config) return;

    const now = Date.now();
    const data = await this.getData(action, userId);

    // Filter old attempts and add new one
    const windowStart = now - config.windowMs;
    const recentAttempts = data.attempts.filter(ts => ts > windowStart);
    recentAttempts.push(now);

    await this.saveData(action, userId, {
      attempts: recentAttempts,
      cooldownUntil: data.cooldownUntil,
    });

    return {
      attemptsUsed: recentAttempts.length,
      attemptsRemaining: config.maxAttempts - recentAttempts.length,
    };
  }

  // Check and record in one call (most common use case)
  async attempt(action, userId) {
    const check = await this.checkLimit(action, userId);
    
    if (!check.allowed) {
      return check;
    }

    const record = await this.recordAttempt(action, userId);
    return {
      allowed: true,
      ...record,
    };
  }

  // Reset rate limit for a user (e.g., after successful login)
  async reset(action, userId) {
    const key = this.getKey(action, userId);
    this.cache.delete(key);
    
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.log('RateLimiter reset error:', error);
    }
  }

  // Clear all rate limits for a user
  async clearAll(userId) {
    const actions = Object.keys(LIMITS);
    await Promise.all(actions.map(action => this.reset(action, userId)));
  }

  // Get remaining time in human-readable format
  formatRemainingTime(ms) {
    if (ms < 60000) {
      return `${Math.ceil(ms / 1000)} seconds`;
    } else if (ms < 3600000) {
      return `${Math.ceil(ms / 60000)} minutes`;
    } else {
      return `${Math.ceil(ms / 3600000)} hours`;
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

// Convenience functions
export const checkBookingLimit = (userId) => rateLimiter.checkLimit('booking', userId);
export const recordBookingAttempt = (userId) => rateLimiter.recordAttempt('booking', userId);
export const attemptBooking = (userId) => rateLimiter.attempt('booking', userId);
export const resetBookingLimit = (userId) => rateLimiter.reset('booking', userId);

export const checkMessageLimit = (userId) => rateLimiter.checkLimit('message', userId);
export const recordMessageAttempt = (userId) => rateLimiter.recordAttempt('message', userId);
export const attemptMessage = (userId) => rateLimiter.attempt('message', userId);

export const checkLoginLimit = (userId) => rateLimiter.checkLimit('login', userId);
export const recordLoginAttempt = (userId) => rateLimiter.recordAttempt('login', userId);
export const resetLoginLimit = (userId) => rateLimiter.reset('login', userId);

export const checkReviewLimit = (userId) => rateLimiter.checkLimit('review', userId);
export const attemptReview = (userId) => rateLimiter.attempt('review', userId);

export const checkRegistrationLimit = (deviceId) => rateLimiter.checkLimit('registration', deviceId);
export const attemptRegistration = (deviceId) => rateLimiter.attempt('registration', deviceId);

export const checkPasswordResetLimit = (email) => rateLimiter.checkLimit('passwordReset', email);
export const attemptPasswordReset = (email) => rateLimiter.attempt('passwordReset', email);

export default rateLimiter;
