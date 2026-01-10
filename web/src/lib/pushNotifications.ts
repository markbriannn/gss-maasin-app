// Web Push Notification Service using Firebase Cloud Messaging
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { collection, doc, setDoc } from 'firebase/firestore';
import app, { db } from './firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';

let messaging: ReturnType<typeof getMessaging> | null = null;

// ========== FIRESTORE NOTIFICATION HELPER ==========

/**
 * Create a notification document in Firestore (for dropdown display)
 */
export async function createFirestoreNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data: Record<string, string> = {}
): Promise<void> {
  try {
    const notifRef = doc(collection(db, 'notifications'));
    await setDoc(notifRef, {
      id: notifRef.id,
      type,
      title,
      message,
      userId,
      targetUserId: userId,
      bookingId: data.jobId || null,
      jobId: data.jobId || null,
      createdAt: new Date(),
      read: false,
      ...data,
    });
    console.log('[Notification] Created Firestore notification for user:', userId);
  } catch (error) {
    console.error('[Notification] Error creating Firestore notification:', error);
  }
}

// Initialize messaging only on client side and if supported
async function getMessagingInstance() {
  if (typeof window === 'undefined') return null;
  
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('[FCM Web] Push notifications not supported in this browser');
      return null;
    }
    
    if (!messaging) {
      messaging = getMessaging(app);
    }
    return messaging;
  } catch (error) {
    console.log('[FCM Web] Error initializing messaging:', error);
    return null;
  }
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    if (!('Notification' in window)) {
      console.log('[FCM Web] Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('[FCM Web] Notifications blocked by user');
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log('[FCM Web] Permission result:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('[FCM Web] Error requesting permission:', error);
    return false;
  }
}

/**
 * Get FCM token for web push notifications
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) return null;

    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[FCM Web] Service worker registered:', registration.scope);

    // Get token
    const token = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('[FCM Web] Token obtained, length:', token.length);
      console.log('[FCM Web] Token preview:', token.substring(0, 30) + '...');
      return token;
    } else {
      console.log('[FCM Web] No token available');
      return null;
    }
  } catch (error) {
    console.error('[FCM Web] Error getting token:', error);
    return null;
  }
}

/**
 * Register device token with backend
 */
export async function registerDeviceToken(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[FCM Web] Starting device registration for user:', userId);
    
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('[FCM Web] No permission, skipping registration');
      return { success: false, error: 'Permission denied' };
    }

    const token = await getFCMToken();
    if (!token) {
      console.log('[FCM Web] No token available');
      return { success: false, error: 'No token' };
    }

    console.log('[FCM Web] Registering token with backend...');
    const response = await fetch(`${API_URL}/notifications/register-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        token,
        platform: 'web',
      }),
    });

    const result = await response.json();
    console.log('[FCM Web] Registration result:', result);
    return result;
  } catch (error) {
    console.error('[FCM Web] Registration error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  if (typeof window === 'undefined') return null;

  getMessagingInstance().then((messagingInstance) => {
    if (!messagingInstance) return;

    onMessage(messagingInstance, (payload) => {
      console.log('[FCM Web] Foreground message received:', payload);
      callback(payload);
    });
  });

  // Return cleanup function (onMessage doesn't return unsubscribe in web SDK)
  return () => {};
}

/**
 * Show a local notification (for foreground messages)
 */
export function showLocalNotification(title: string, body: string, data?: Record<string, string>) {
  if (typeof window === 'undefined') return;
  
  if (Notification.permission !== 'granted') {
    console.log('[FCM Web] Cannot show notification - permission not granted');
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: '/next.svg',
    badge: '/next.svg',
    tag: data?.type || 'gss-notification',
    data,
    requireInteraction: true,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
    
    // Navigate based on notification type
    if (data?.type && data?.jobId) {
      const url = getNotificationUrl(data.type, data);
      if (url) window.location.href = url;
    }
  };
}

/**
 * Get URL for notification navigation
 */
function getNotificationUrl(type: string, data: Record<string, string>): string {
  switch (type) {
    case 'new_job':
    case 'job_approved':
      return data.jobId ? `/provider/jobs/${data.jobId}` : '/provider/jobs';
    case 'booking_accepted':
    case 'job_update':
    case 'counter_offer':
    case 'job_started':
    case 'job_completed':
      return data.jobId ? `/client/bookings/${data.jobId}` : '/client/bookings';
    case 'new_message':
      return data.conversationId ? `/chat/${data.conversationId}` : '/messages';
    case 'provider_approved':
      return '/provider';
    default:
      return '/notifications';
  }
}

/**
 * Check if push notifications are supported
 */
export async function isPushSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    return await isSupported();
  } catch {
    return false;
  }
}


// ========== PUSH NOTIFICATION SENDERS (via Backend) ==========

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId) {
      console.log('[Push Web] No userId provided, skipping');
      return { success: false, error: 'No userId' };
    }

    console.log('[Push Web] Sending notification to user:', userId);
    const response = await fetch(`${API_URL}/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title,
        body,
        data: { ...data, timestamp: new Date().toISOString() },
      }),
    });

    const result = await response.json();
    console.log('[Push Web] Result:', result);
    return result;
  } catch (error) {
    console.error('[Push Web] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send push notification to all admins
 */
export async function sendPushToAdmins(
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Push Web] Sending notification to admins');
    const response = await fetch(`${API_URL}/notifications/send-to-admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        data: { ...data, timestamp: new Date().toISOString() },
      }),
    });

    const result = await response.json();
    console.log('[Push Web] Result:', result);
    return result;
  } catch (error) {
    console.error('[Push Web] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ========== NOTIFICATION TEMPLATES ==========

export const pushNotifications = {
  // Notify admins about new booking
  newBookingToAdmins: (jobId: string, clientName: string, serviceCategory: string) =>
    sendPushToAdmins(
      '📋 New Job Request',
      `${clientName} requested ${serviceCategory}`,
      { type: 'new_job', jobId }
    ),

  // Notify client about job approval
  jobApprovedToClient: async (clientId: string, jobId: string, serviceCategory: string) => {
    const title = '✅ Booking Approved';
    const message = `Your ${serviceCategory} request has been approved and sent to providers.`;
    await createFirestoreNotification(clientId, 'job_approved', title, message, { jobId });
    return sendPushToUser(clientId, title, message, { type: 'job_approved', jobId });
  },

  // Notify provider about new available job
  newJobToProvider: async (providerId: string, jobId: string, serviceCategory: string) => {
    const title = '📋 New Job Available';
    const message = `New ${serviceCategory} job is available for you.`;
    await createFirestoreNotification(providerId, 'new_job', title, message, { jobId });
    return sendPushToUser(providerId, title, message, { type: 'new_job', jobId });
  },

  // Notify client about job rejection
  jobRejectedToClient: async (clientId: string, jobId: string, serviceCategory: string) => {
    const title = '❌ Booking Rejected';
    const message = `Your ${serviceCategory} request was not approved.`;
    await createFirestoreNotification(clientId, 'job_rejected', title, message, { jobId });
    return sendPushToUser(clientId, title, message, { type: 'job_rejected', jobId });
  },

  // Notify client about job acceptance
  jobAcceptedToClient: async (clientId: string, jobId: string, providerName: string) => {
    const title = '🎉 Job Accepted!';
    const message = `${providerName} has accepted your service request!`;
    await createFirestoreNotification(clientId, 'job_accepted', title, message, { jobId });
    return sendPushToUser(clientId, title, message, { type: 'job_accepted', jobId });
  },

  // Notify client about provider traveling
  providerTravelingToClient: async (clientId: string, jobId: string) => {
    const title = '🚗 Provider On The Way';
    const message = 'Your provider is traveling to your location.';
    await createFirestoreNotification(clientId, 'provider_traveling', title, message, { jobId });
    return sendPushToUser(clientId, title, message, { type: 'provider_traveling', jobId });
  },

  // Notify client about provider arrived
  providerArrivedToClient: async (clientId: string, jobId: string) => {
    const title = '📍 Provider Arrived';
    const message = 'Your provider has arrived at your location.';
    await createFirestoreNotification(clientId, 'provider_arrived', title, message, { jobId });
    return sendPushToUser(clientId, title, message, { type: 'provider_arrived', jobId });
  },

  // Notify client about job started
  jobStartedToClient: async (clientId: string, jobId: string, serviceCategory: string) => {
    const title = '🔧 Work Started';
    const message = `Your ${serviceCategory} job is now in progress.`;
    await createFirestoreNotification(clientId, 'job_started', title, message, { jobId });
    return sendPushToUser(clientId, title, message, { type: 'job_started', jobId });
  },

  // Notify client about job completed
  jobCompletedToClient: async (clientId: string, jobId: string, serviceCategory: string) => {
    const title = '✅ Work Complete';
    const message = `Your ${serviceCategory} job has been completed. Please confirm and leave a review!`;
    await createFirestoreNotification(clientId, 'work_completed', title, message, { jobId });
    return sendPushToUser(clientId, title, message, { type: 'job_completed', jobId });
  },

  // Notify about job cancellation
  jobCancelledToUser: async (userId: string, jobId: string, cancelledBy: string) => {
    const title = '❌ Job Cancelled';
    const message = `The job has been cancelled by ${cancelledBy}.`;
    await createFirestoreNotification(userId, 'job_cancelled', title, message, { jobId });
    return sendPushToUser(userId, title, message, { type: 'job_cancelled', jobId });
  },

  // Notify about new message
  newMessageToUser: (userId: string, senderName: string, messagePreview: string, conversationId: string, senderId?: string) =>
    sendPushToUser(
      userId,
      `💬 ${senderName}`,
      messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
      { type: 'new_message', conversationId, senderName, senderId: senderId || '' }
    ),

  // Notify provider about new review
  newReviewToProvider: async (providerId: string, rating: number, reviewerName: string) => {
    const title = '⭐ New Review!';
    const message = `${reviewerName} gave you ${rating} star${rating > 1 ? 's' : ''}. Check your profile to see the review.`;
    await createFirestoreNotification(providerId, 'new_review', title, message, {});
    return sendPushToUser(providerId, title, message, { type: 'new_review' });
  },

  // Notify provider about payment received
  paymentReceivedToProvider: async (providerId: string, jobId: string, amount: number) => {
    const title = '💰 Payment Received!';
    const message = `You received ₱${amount.toLocaleString()} for your completed job.`;
    await createFirestoreNotification(providerId, 'payment_received', title, message, { jobId });
    return sendPushToUser(providerId, title, message, { type: 'payment_received', jobId });
  },
};
