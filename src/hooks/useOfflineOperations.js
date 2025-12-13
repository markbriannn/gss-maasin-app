import { useCallback } from 'react';
import { useOfflineSupport } from './useRealtimeService';
import { cacheBookings, cacheMessages, cacheReviews, addToSyncQueue } from '../services/offlineService';

/**
 * Hook for handling job completion with offline support
 */
export const useJobCompletion = () => {
  const { online, queueOperation } = useOfflineSupport();

  const markJobComplete = useCallback(async (jobId, jobData) => {
    try {
      // Cache the completed job
      await cacheBookings([jobData]);

      // Queue for sync if offline
      if (!online) {
        await addToSyncQueue({
          type: 'job_completion',
          jobId,
          data: jobData,
          timestamp: new Date().toISOString(),
        });
        return { success: true, queued: true };
      }

      return { success: true, queued: false };
    } catch (error) {
      console.error('Error marking job complete:', error);
      return { success: false, error: error.message };
    }
  }, [online]);

  return { markJobComplete, online };
};

/**
 * Hook for message operations with offline support
 */
export const useOfflineMessages = () => {
  const { online, queueOperation } = useOfflineSupport();

  const sendMessage = useCallback(async (conversationId, message) => {
    if (!online) {
      await addToSyncQueue({
        type: 'send_message',
        conversationId,
        message,
        timestamp: new Date().toISOString(),
      });
      return { success: true, queued: true };
    }
    return { success: true, queued: false };
  }, [online]);

  const cacheConversationMessages = useCallback(async (conversationId, messages) => {
    await cacheMessages(conversationId, messages);
  }, []);

  return { sendMessage, cacheConversationMessages, online };
};

/**
 * Hook for review operations with offline support
 */
export const useOfflineReviews = () => {
  const { online, queueOperation } = useOfflineSupport();

  const submitReview = useCallback(async (jobId, providerId, rating, comment) => {
    if (!online) {
      await addToSyncQueue({
        type: 'submit_review',
        jobId,
        providerId,
        rating,
        comment,
        timestamp: new Date().toISOString(),
      });
      return { success: true, queued: true };
    }
    return { success: true, queued: false };
  }, [online]);

  return { submitReview, online };
};
