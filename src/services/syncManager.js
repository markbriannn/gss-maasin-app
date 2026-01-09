import { getSyncQueue, removeFromSyncQueue } from '../services/offlineService';
import { submitReview } from '../services/reviewService';
import { acceptJob, rejectJob } from '../services/realtimeService';
import { db } from '../config/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

/**
 * Sync manager to handle all offline operations when back online
 */
export const SyncManager = {
  /**
   * Process all pending sync operations
   */
  syncAll: async () => {
    try {
      const queue = await getSyncQueue();
      
      if (queue.length === 0) {
        // Don't log when there's nothing to sync - reduces log spam
        return { success: true, synced: 0 };
      }

      let synced = 0;
      const failures = [];

      for (const operation of queue) {
        try {
          const result = await SyncManager.processOperation(operation);
          if (result.success) {
            await removeFromSyncQueue(operation.id);
            synced++;
          } else {
            failures.push({ operation, error: result.error });
          }
        } catch (error) {
          failures.push({ operation, error: error.message });
        }
      }

      console.log(`Synced ${synced}/${queue.length} operations`);
      return {
        success: failures.length === 0,
        synced,
        failures: failures.length > 0 ? failures : null,
      };
    } catch (error) {
      console.error('Error syncing operations:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Process a single operation based on type
   */
  processOperation: async (operation) => {
    try {
      switch (operation.type) {
        case 'send_message':
          return await SyncManager.syncMessage(operation);

        case 'submit_review':
          return await SyncManager.syncReview(operation);

        case 'job_acceptance':
          return await SyncManager.syncJobAcceptance(operation);

        case 'job_rejection':
          return await SyncManager.syncJobRejection(operation);

        case 'job_completion':
          return await SyncManager.syncJobCompletion(operation);

        case 'profile_update':
          return await SyncManager.syncProfileUpdate(operation);

        default:
          return { success: false, error: 'Unknown operation type' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Sync message send
   */
  syncMessage: async (operation) => {
    try {
      const { conversationId, message, timestamp } = operation;

      await addDoc(collection(db, 'messages'), {
        conversationId,
        ...message,
        createdAt: new Date(timestamp),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Sync review submission
   */
  syncReview: async (operation) => {
    try {
      const { jobId, providerId, rating, comment } = operation;

      const result = await submitReview(jobId, providerId, null, rating, comment);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Sync job acceptance
   */
  syncJobAcceptance: async (operation) => {
    try {
      const { jobId, providerId } = operation;
      const result = await acceptJob(jobId, providerId);
      return { success: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Sync job rejection
   */
  syncJobRejection: async (operation) => {
    try {
      const { jobId, providerId, reason } = operation;
      const result = await rejectJob(jobId, providerId, reason);
      return { success: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Sync job completion
   */
  syncJobCompletion: async (operation) => {
    try {
      const { jobId, data } = operation;

      await updateDoc(doc(db, 'bookings', jobId), {
        ...data,
        completedAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Sync profile update
   */
  syncProfileUpdate: async (operation) => {
    try {
      const { userId, data } = operation;

      await updateDoc(doc(db, 'users', userId), {
        ...data,
        updatedAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
