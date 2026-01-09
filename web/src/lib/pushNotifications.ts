// Web Push Notification Service using Firebase Cloud Messaging
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import app from './firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';

let messaging: ReturnType<typeof getMessaging> | null = null;

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
  jobApprovedToClient: (clientId: string, jobId: string, serviceCategory: string) =>
    sendPushToUser(
      clientId,
      '✅ Booking Approved',
      `Your ${serviceCategory} request has been approved and sent to providers.`,
      { type: 'job_approved', jobId }
    ),

  // Notify provider about new available job
  newJobToProvider: (providerId: string, jobId: string, serviceCategory: string) =>
    sendPushToUser(
      providerId,
      '📋 New Job Available',
      `New ${serviceCategory} job is available for you.`,
      { type: 'new_job', jobId }
    ),

  // Notify client about job rejection
  jobRejectedToClient: (clientId: string, jobId: string, serviceCategory: string) =>
    sendPushToUser(
      clientId,
      '❌ Booking Rejected',
      `Your ${serviceCategory} request was not approved.`,
      { type: 'job_rejected', jobId }
    ),

  // Notify client about job acceptance
  jobAcceptedToClient: (clientId: string, jobId: string, providerName: string) =>
    sendPushToUser(
      clientId,
      '🎉 Job Accepted!',
      `${providerName} has accepted your service request!`,
      { type: 'job_accepted', jobId }
    ),

  // Notify client about provider traveling
  providerTravelingToClient: (clientId: string, jobId: string) =>
    sendPushToUser(
      clientId,
      '🚗 Provider On The Way',
      'Your provider is traveling to your location.',
      { type: 'provider_traveling', jobId }
    ),

  // Notify client about provider arrived
  providerArrivedToClient: (clientId: string, jobId: string) =>
    sendPushToUser(
      clientId,
      '📍 Provider Arrived',
      'Your provider has arrived at your location.',
      { type: 'provider_arrived', jobId }
    ),

  // Notify client about job started
  jobStartedToClient: (clientId: string, jobId: string, serviceCategory: string) =>
    sendPushToUser(
      clientId,
      '🔧 Work Started',
      `Your ${serviceCategory} job is now in progress.`,
      { type: 'job_started', jobId }
    ),

  // Notify client about job completed
  jobCompletedToClient: (clientId: string, jobId: string, serviceCategory: string) =>
    sendPushToUser(
      clientId,
      '✅ Work Complete',
      `Your ${serviceCategory} job has been completed. Please confirm and leave a review!`,
      { type: 'job_completed', jobId }
    ),

  // Notify about job cancellation
  jobCancelledToUser: (userId: string, jobId: string, cancelledBy: string) =>
    sendPushToUser(
      userId,
      '❌ Job Cancelled',
      `The job has been cancelled by ${cancelledBy}.`,
      { type: 'job_cancelled', jobId }
    ),

  // Notify about new message
  newMessageToUser: (userId: string, senderName: string, messagePreview: string, conversationId: string, senderId?: string) =>
    sendPushToUser(
      userId,
      `💬 ${senderName}`,
      messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
      { type: 'new_message', conversationId, senderName, senderId: senderId || '' }
    ),

  // Notify provider about new review
  newReviewToProvider: (providerId: string, rating: number, reviewerName: string) =>
    sendPushToUser(
      providerId,
      '⭐ New Review!',
      `${reviewerName} gave you ${rating} star${rating > 1 ? 's' : ''}. Check your profile to see the review.`,
      { type: 'new_review' }
    ),

  // Notify provider about payment received
  paymentReceivedToProvider: (providerId: string, jobId: string, amount: number) =>
    sendPushToUser(
      providerId,
      '💰 Payment Received!',
      `You received ₱${amount.toLocaleString()} for your completed job.`,
      { type: 'payment_received', jobId }
    ),
};
