import { useEffect, useState, useCallback } from 'react';
import { isOnline, addToSyncQueue, cacheBookings, getCachedBookings } from '../services/offlineService';
import { subscribeToJobNotifications, subscribeToMessageReceipts, subscribeToNotifications } from '../services/realtimeService';

/**
 * Hook for real-time job notifications for providers
 */
export const useJobNotifications = (providerId, serviceCategory) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerId || !serviceCategory) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToJobNotifications(
      providerId,
      serviceCategory,
      (newJobs) => {
        setJobs(newJobs);
        // Cache the jobs
        cacheBookings(newJobs);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [providerId, serviceCategory]);

  return { jobs, loading };
};

/**
 * Hook for real-time user notifications
 */
export const useUserNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToNotifications(userId, (newNotifications) => {
      setNotifications(newNotifications);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  return { notifications, loading };
};

/**
 * Hook for real-time message read receipts
 */
export const useMessageReceipts = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToMessageReceipts(conversationId, (newMessages) => {
      setMessages(newMessages);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId]);

  return { messages, loading };
};

/**
 * Hook for offline support with auto-sync
 */
export const useOfflineSupport = () => {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const checkOnline = async () => {
      const isOnlineNow = await isOnline();
      setOnline(isOnlineNow);
    };

    checkOnline();

    // Check every 5 seconds
    const interval = setInterval(checkOnline, 5000);

    return () => clearInterval(interval);
  }, []);

  const queueOperation = useCallback(async (operation) => {
    if (!online) {
      await addToSyncQueue(operation);
      return { queued: true, synced: false };
    }
    return { queued: false, synced: true };
  }, [online]);

  return { online, queueOperation };
};
