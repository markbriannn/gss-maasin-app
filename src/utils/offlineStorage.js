/**
 * Offline Storage Service
 * Caches data locally for offline support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_PREFIX = '@gss_cache_';
const CACHE_EXPIRY_KEY = '@gss_cache_expiry_';
const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save data to cache with optional expiry
 */
export const cacheData = async (key, data, expiryMs = DEFAULT_EXPIRY) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_KEY}${key}`;
    const expiry = Date.now() + expiryMs;
    
    await AsyncStorage.multiSet([
      [cacheKey, JSON.stringify(data)],
      [expiryKey, expiry.toString()],
    ]);
    
    return true;
  } catch (error) {
    console.error('Cache save error:', error);
    return false;
  }
};

/**
 * Get cached data if not expired
 */
export const getCachedData = async (key) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_KEY}${key}`;
    
    const [[, data], [, expiry]] = await AsyncStorage.multiGet([cacheKey, expiryKey]);
    
    if (!data) return null;
    
    // Check expiry
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      // Data expired, remove it
      await AsyncStorage.multiRemove([cacheKey, expiryKey]);
      return null;
    }
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
};

/**
 * Remove cached data
 */
export const removeCachedData = async (key) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiryKey = `${CACHE_EXPIRY_KEY}${key}`;
    await AsyncStorage.multiRemove([cacheKey, expiryKey]);
    return true;
  } catch (error) {
    console.error('Cache remove error:', error);
    return false;
  }
};

/**
 * Clear all cached data
 */
export const clearAllCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(
      key => key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_KEY)
    );
    await AsyncStorage.multiRemove(cacheKeys);
    return true;
  } catch (error) {
    console.error('Cache clear error:', error);
    return false;
  }
};

/**
 * Check if device is online
 */
export const isOnline = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable !== false;
  } catch {
    return true; // Assume online if check fails
  }
};

/**
 * Subscribe to network status changes
 */
export const subscribeToNetworkStatus = (callback) => {
  return NetInfo.addEventListener(state => {
    callback(state.isConnected && state.isInternetReachable !== false);
  });
};

/**
 * Fetch with offline fallback
 * Tries to fetch fresh data, falls back to cache if offline
 */
export const fetchWithOfflineFallback = async (key, fetchFn, options = {}) => {
  const {expiryMs = DEFAULT_EXPIRY, forceRefresh = false} = options;
  
  const online = await isOnline();
  
  // If offline, return cached data
  if (!online) {
    const cached = await getCachedData(key);
    return {
      data: cached,
      fromCache: true,
      isOffline: true,
    };
  }
  
  // If not forcing refresh, check cache first
  if (!forceRefresh) {
    const cached = await getCachedData(key);
    if (cached) {
      // Return cached data immediately, refresh in background
      fetchFn().then(freshData => {
        if (freshData) cacheData(key, freshData, expiryMs);
      }).catch(() => {});
      
      return {
        data: cached,
        fromCache: true,
        isOffline: false,
      };
    }
  }
  
  // Fetch fresh data
  try {
    const data = await fetchFn();
    if (data) {
      await cacheData(key, data, expiryMs);
    }
    return {
      data,
      fromCache: false,
      isOffline: false,
    };
  } catch (error) {
    // On error, try to return cached data
    const cached = await getCachedData(key);
    if (cached) {
      return {
        data: cached,
        fromCache: true,
        isOffline: false,
        error,
      };
    }
    throw error;
  }
};

// Cache keys for common data
export const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  PROVIDERS_LIST: 'providers_list',
  SERVICE_CATEGORIES: 'service_categories',
  USER_BOOKINGS: 'user_bookings',
  NOTIFICATIONS: 'notifications',
  FAVORITES: 'favorites',
  MESSAGES: 'messages',
};

export default {
  cacheData,
  getCachedData,
  removeCachedData,
  clearAllCache,
  isOnline,
  subscribeToNetworkStatus,
  fetchWithOfflineFallback,
  CACHE_KEYS,
};
