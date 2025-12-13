import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_KEYS = {
  USERS: 'cache_users',
  BOOKINGS: 'cache_bookings',
  MESSAGES: 'cache_messages',
  REVIEWS: 'cache_reviews',
  NOTIFICATIONS: 'cache_notifications',
  SYNC_QUEUE: 'sync_queue',
};

/**
 * Check if device is online
 */
export const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};

/**
 * Cache user data locally
 */
export const cacheUser = async (userId, userData) => {
  try {
    const users = await getCachedUsers();
    users[userId] = {
      ...userData,
      cachedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CACHE_KEYS.USERS, JSON.stringify(users));
  } catch (error) {
    console.error('Error caching user:', error);
  }
};

/**
 * Get all cached users
 */
export const getCachedUsers = async () => {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEYS.USERS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error retrieving cached users:', error);
    return {};
  }
};

/**
 * Cache bookings
 */
export const cacheBookings = async (bookings) => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.BOOKINGS,
      JSON.stringify({
        data: bookings,
        cachedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error('Error caching bookings:', error);
  }
};

/**
 * Get cached bookings
 */
export const getCachedBookings = async () => {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEYS.BOOKINGS);
    return data ? JSON.parse(data).data : [];
  } catch (error) {
    console.error('Error retrieving cached bookings:', error);
    return [];
  }
};

/**
 * Cache messages
 */
export const cacheMessages = async (conversationId, messages) => {
  try {
    const allMessages = await getCachedMessages();
    allMessages[conversationId] = {
      data: messages,
      cachedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CACHE_KEYS.MESSAGES, JSON.stringify(allMessages));
  } catch (error) {
    console.error('Error caching messages:', error);
  }
};

/**
 * Get cached messages for a conversation
 */
export const getCachedMessages = async (conversationId = null) => {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEYS.MESSAGES);
    const allMessages = data ? JSON.parse(data) : {};
    
    if (conversationId) {
      return allMessages[conversationId]?.data || [];
    }
    return allMessages;
  } catch (error) {
    console.error('Error retrieving cached messages:', error);
    return conversationId ? [] : {};
  }
};

/**
 * Cache reviews
 */
export const cacheReviews = async (reviews) => {
  try {
    await AsyncStorage.setItem(
      CACHE_KEYS.REVIEWS,
      JSON.stringify({
        data: reviews,
        cachedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error('Error caching reviews:', error);
  }
};

/**
 * Get cached reviews
 */
export const getCachedReviews = async () => {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEYS.REVIEWS);
    return data ? JSON.parse(data).data : [];
  } catch (error) {
    console.error('Error retrieving cached reviews:', error);
    return [];
  }
};

/**
 * Add operation to sync queue (for when offline)
 */
export const addToSyncQueue = async (operation) => {
  try {
    const queue = await getSyncQueue();
    queue.push({
      ...operation,
      queuedAt: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9),
    });
    await AsyncStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('Error adding to sync queue:', error);
  }
};

/**
 * Get pending sync operations
 */
export const getSyncQueue = async () => {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEYS.SYNC_QUEUE);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error retrieving sync queue:', error);
    return [];
  }
};

/**
 * Remove operation from sync queue
 */
export const removeFromSyncQueue = async (operationId) => {
  try {
    const queue = await getSyncQueue();
    const filtered = queue.filter(op => op.id !== operationId);
    await AsyncStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from sync queue:', error);
  }
};

/**
 * Clear all offline cache
 */
export const clearOfflineCache = async () => {
  try {
    await AsyncStorage.multiRemove(Object.values(CACHE_KEYS));
  } catch (error) {
    console.error('Error clearing offline cache:', error);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
  try {
    const users = await getCachedUsers();
    const bookings = await getCachedBookings();
    const messages = await getCachedMessages();
    const reviews = await getCachedReviews();
    const queue = await getSyncQueue();

    return {
      users: Object.keys(users).length,
      bookings: bookings.length,
      conversations: Object.keys(messages).length,
      reviews: reviews.length,
      pendingSyncOperations: queue.length,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {};
  }
};
