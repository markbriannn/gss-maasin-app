import { collection, query, where, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Real-time job notifications listener
 * Triggers when new jobs matching provider's service are posted
 */
export const subscribeToJobNotifications = (providerId, serviceCategory, callback) => {
  try {
    const q = query(
      collection(db, 'bookings'),
      where('serviceCategory', '==', serviceCategory),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newJobs = [];
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const job = { id: change.doc.id, ...change.doc.data() };
          // Only notify if job doesn't already have a provider assigned
          if (!job.providerId) {
            newJobs.push(job);
          }
        }
      });

      if (newJobs.length > 0) {
        callback(newJobs);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to job notifications:', error);
    return null;
  }
};

/**
 * Real-time job status updates
 * Notifies client when provider accepts/rejects job
 */
export const subscribeToJobUpdates = (jobId, callback) => {
  try {
    const jobRef = doc(db, 'bookings', jobId);
    const unsubscribe = onSnapshot(jobRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to job updates:', error);
    return null;
  }
};

/**
 * Provider accepts a job
 */
export const acceptJob = async (jobId, providerId) => {
  try {
    const jobRef = doc(db, 'bookings', jobId);
    await updateDoc(jobRef, {
      status: 'accepted',
      providerId: providerId,
      acceptedAt: new Date(),
      updatedAt: new Date(),
    });

    // Emit notification to client
    await createNotification(jobId, 'job_accepted', `Provider accepted your job request`);
    return true;
  } catch (error) {
    console.error('Error accepting job:', error);
    return false;
  }
};

/**
 * Provider rejects a job
 */
export const rejectJob = async (jobId, providerId, reason = '') => {
  try {
    const jobRef = doc(db, 'bookings', jobId);
    await updateDoc(jobRef, {
      rejectedBy: [...(jobData?.rejectedBy || []), providerId],
      rejectionReasons: [...(jobData?.rejectionReasons || []), reason],
      updatedAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error('Error rejecting job:', error);
    return false;
  }
};

/**
 * Subscribe to message read receipts
 */
export const subscribeToMessageReceipts = (conversationId, callback) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(messages);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to messages:', error);
    return null;
  }
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (messageId) => {
  try {
    const msgRef = doc(db, 'messages', messageId);
    await updateDoc(msgRef, {
      read: true,
      readAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error('Error marking message as read:', error);
    return false;
  }
};

/**
 * Create a notification in Firestore
 */
export const createNotification = async (jobId, type, message, targetUserId = null) => {
  try {
    const notifRef = doc(collection(db, 'notifications'));
    await updateDoc(notifRef, {
      jobId,
      type,
      message,
      targetUserId,
      createdAt: new Date(),
      read: false,
    });
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

/**
 * Subscribe to user notifications
 */
export const subscribeToNotifications = (userId, callback) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('targetUserId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(notifications);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return null;
  }
};

/**
 * Cache data locally for offline support
 */
export const cacheData = async (key, data) => {
  try {
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error caching data:', error);
  }
};

/**
 * Retrieve cached data
 */
export const getCachedData = async (key) => {
  try {
    const data = await AsyncStorage.getItem(`cache_${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error retrieving cached data:', error);
    return null;
  }
};

/**
 * Clear all cached data
 */
export const clearCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};
