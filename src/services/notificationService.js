import messaging from '@react-native-firebase/messaging';
import {Platform, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {API_BASE_URL} from '@env';

const FCM_TOKEN_KEY = '@fcm_token';
const API_URL = API_BASE_URL || 'http://localhost:3001/api';

// ========== PUSH NOTIFICATION SENDER (via Backend) ==========

/**
 * Send push notification to a specific user (even when app is closed)
 * This calls your backend which uses Firebase Admin SDK
 */
const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    if (!userId) {
      console.log('[Push] No userId provided, skipping');
      return {success: false};
    }
    
    console.log('[Push] Sending notification to user:', userId);
    console.log('[Push] Title:', title);
    console.log('[Push] Body:', body);
    console.log('[Push] API URL:', `${API_URL}/notifications/send`);
    
    const response = await axios.post(`${API_URL}/notifications/send`, {
      userId,
      title,
      body,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });
    
    console.log('[Push] Backend response:', JSON.stringify(response.data));
    console.log('[Push] Notification sent successfully to user:', userId);
    return {success: true, messageId: response.data?.messageId};
  } catch (error) {
    // Log full error for debugging
    console.log('[Push] FAILED to send notification:', error.message);
    console.log('[Push] Error response:', error.response?.data || error);
    return {success: false, error: error.message};
  }
};

/**
 * Send push notification to all admins
 */
const sendPushToAdmins = async (title, body, data = {}) => {
  try {
    const response = await axios.post(`${API_URL}/notifications/send-to-admins`, {
      title,
      body,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });
    
    console.log('[Push] Notification sent to admins');
    return {success: true, sent: response.data?.sent};
  } catch (error) {
    console.log('[Push] Failed to send to admins:', error.message);
    return {success: false, error: error.message};
  }
};

/**
 * Send push notification to a topic (e.g., all providers)
 */
const sendPushToTopic = async (topic, title, body, data = {}) => {
  try {
    const response = await axios.post(`${API_URL}/notifications/send-to-topic`, {
      topic,
      title,
      body,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });
    
    console.log('[Push] Notification sent to topic:', topic);
    return {success: true, messageId: response.data?.messageId};
  } catch (error) {
    console.log('[Push] Failed to send to topic:', error.message);
    return {success: false, error: error.message};
  }
};

class NotificationService {
  constructor() {
    this.fcmToken = null;
    this.onNotificationListener = null;
    this.onNotificationOpenedListener = null;
  }

  async requestPermission() {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        
        if (enabled) {
          console.log('iOS notification permission granted');
          return true;
        } else {
          console.log('iOS notification permission denied');
          return false;
        }
      } else {
        return true;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async getFCMToken() {
    try {
      // Check if messaging is available
      if (!messaging) {
        console.log('[FCM] Firebase messaging not available');
        return null;
      }

      let fcmToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      
      if (!fcmToken) {
        // Add timeout to prevent hanging
        const tokenPromise = messaging().getToken();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('FCM token timeout')), 10000)
        );
        
        try {
          fcmToken = await Promise.race([tokenPromise, timeoutPromise]);
          if (fcmToken) {
            await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
          }
        } catch (tokenError) {
          // Handle specific FCM errors gracefully
          if (tokenError.message?.includes('SERVICE_NOT_AVAILABLE') || 
              tokenError.message?.includes('timeout')) {
            console.log('[FCM] Google Play Services unavailable - push notifications disabled');
            return null;
          }
          throw tokenError;
        }
      }
      
      this.fcmToken = fcmToken;
      console.log('[FCM] Token obtained successfully');
      return fcmToken;
    } catch (error) {
      // Don't log as error if it's just unavailable services
      if (error.message?.includes('SERVICE_NOT_AVAILABLE')) {
        console.log('[FCM] Push notifications unavailable on this device');
      } else {
        console.log('[FCM] Token error (non-critical):', error.message);
      }
      return null;
    }
  }

  async registerDeviceToken(userId) {
    try {
      console.log('[FCM] Starting device token registration for user:', userId);
      const token = await this.getFCMToken();
      
      if (token && userId) {
        console.log('[FCM] Token obtained, length:', token.length);
        console.log('[FCM] Token preview:', token.substring(0, 30) + '...');
        console.log('[FCM] Registering with backend:', `${API_URL}/notifications/register-device`);
        
        const response = await axios.post(`${API_URL}/notifications/register-device`, {
          userId,
          token,
          platform: Platform.OS,
        });
        
        console.log('[FCM] Backend response:', JSON.stringify(response.data));
        console.log('[FCM] Device token registered successfully for user:', userId);
        return {success: true, token};
      } else if (!token) {
        console.log('[FCM] No token available - skipping device registration');
        return {success: false, error: 'No token'};
      }
    } catch (error) {
      // Log full error for debugging
      console.log('[FCM] Device registration FAILED:', error.message);
      console.log('[FCM] Error details:', error.response?.data || error);
      return {success: false, error: error.message};
    }
  }

  onTokenRefresh(callback) {
    return messaging().onTokenRefresh((fcmToken) => {
      AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
      this.fcmToken = fcmToken;
      callback(fcmToken);
    });
  }

  onNotificationReceived(callback) {
    this.onNotificationListener = messaging().onMessage(async (remoteMessage) => {
      console.log('Notification received in foreground:', remoteMessage);
      
      // Let the callback handle showing notifications
      // The callback (NotificationContext) will decide whether to show based on user role
      callback(remoteMessage);
    });
    
    return this.onNotificationListener;
  }

  onNotificationOpened(callback) {
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened from background:', remoteMessage);
      callback(remoteMessage);
    });
    
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Notification opened from quit state:', remoteMessage);
          callback(remoteMessage);
        }
      });
  }

  showLocalNotification(title, body, data = {}, onViewPress = null) {
    Alert.alert(title, body, [
      {
        text: 'View',
        onPress: () => {
          console.log('Notification action:', data);
          if (onViewPress) {
            onViewPress(data);
          } else if (this.navigationCallback) {
            this.navigationCallback(data);
          }
        },
      },
      {
        text: 'Dismiss',
        style: 'cancel',
      },
    ]);
  }

  // Set navigation callback for handling VIEW button taps
  setNavigationCallback(callback) {
    this.navigationCallback = callback;
  }

  async setBadgeCount(count) {
    try {
      if (Platform.OS === 'ios') {
        await messaging().setApplicationIconBadgeNumber(count);
      }
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  async clearBadge() {
    await this.setBadgeCount(0);
  }

  subscribeToTopic(topic) {
    try {
      return messaging()
        .subscribeToTopic(topic)
        .then(() => console.log(`[FCM] Subscribed to: ${topic}`))
        .catch(() => console.log(`[FCM] Topic subscription skipped: ${topic}`));
    } catch (error) {
      console.log(`[FCM] Topic subscription unavailable: ${topic}`);
      return Promise.resolve();
    }
  }

  unsubscribeFromTopic(topic) {
    try {
      return messaging()
        .unsubscribeFromTopic(topic)
        .then(() => console.log(`[FCM] Unsubscribed from: ${topic}`))
        .catch(() => console.log(`[FCM] Topic unsubscription skipped: ${topic}`));
    } catch (error) {
      console.log(`[FCM] Topic unsubscription unavailable: ${topic}`);
      return Promise.resolve();
    }
  }

  cleanup() {
    if (this.onNotificationListener) {
      this.onNotificationListener();
    }
    if (this.onNotificationOpenedListener) {
      this.onNotificationOpenedListener();
    }
  }

  // ========== IN-APP NOTIFICATION HELPERS ==========

  // Notify client about counter offer from provider
  notifyCounterOffer(jobData) {
    this.showLocalNotification(
      '💰 Counter Offer Received!',
      `Provider offers ₱${(jobData.counterOfferPrice || 0).toLocaleString()} for your ${jobData.serviceCategory || 'service'} request. Tap to respond.`,
      {type: 'counter_offer', jobId: jobData.id}
    );
  }

  // Notify client about additional charge request
  notifyAdditionalCharge(jobData, charge) {
    this.showLocalNotification(
      '⚠️ Additional Charge Request',
      `Provider requests +₱${(charge.total || 0).toLocaleString()} for: "${charge.reason}". Approval needed.`,
      {type: 'additional_charge', jobId: jobData.id, chargeId: charge.id}
    );
  }

  // Notify provider about job approval from admin
  notifyJobApproved(jobData) {
    this.showLocalNotification(
      '✅ Job Available!',
      `New ${jobData.serviceCategory || 'service'} job is ready for you. ${jobData.isNegotiable ? `Client offers ₱${(jobData.offeredPrice || 0).toLocaleString()}` : 'Tap to view details.'}`,
      {type: 'job_approved', jobId: jobData.id}
    );
  }

  // Notify provider about client accepting counter offer
  notifyCounterOfferAccepted(jobData) {
    this.showLocalNotification(
      '🎉 Counter Offer Accepted!',
      `Client accepted your offer of ₱${(jobData.counterOfferPrice || 0).toLocaleString()} for ${jobData.serviceCategory || 'service'}.`,
      {type: 'counter_accepted', jobId: jobData.id}
    );
  }

  // Notify provider about additional charge approval
  notifyAdditionalChargeApproved(jobData, charge) {
    this.showLocalNotification(
      '✅ Additional Charge Approved',
      `Client approved +₱${(charge.amount || 0).toLocaleString()} for: "${charge.reason}"`,
      {type: 'charge_approved', jobId: jobData.id}
    );
  }

  // Notify provider about additional charge rejection
  notifyAdditionalChargeRejected(jobData, charge) {
    this.showLocalNotification(
      '❌ Additional Charge Rejected',
      `Client rejected the additional charge for: "${charge.reason}"`,
      {type: 'charge_rejected', jobId: jobData.id}
    );
  }

  // Notify client about admin approval
  notifyAdminApproved(jobData) {
    this.showLocalNotification(
      '✅ Request Approved',
      `Your ${jobData.serviceCategory || 'service'} request has been approved and sent to the provider.`,
      {type: 'admin_approved', jobId: jobData.id}
    );
  }

  // Notify client about admin rejection
  notifyAdminRejected(jobData, reason) {
    this.showLocalNotification(
      '❌ Request Rejected',
      `Your ${jobData.serviceCategory || 'service'} request was not approved. ${reason ? `Reason: ${reason}` : ''}`,
      {type: 'admin_rejected', jobId: jobData.id}
    );
  }

  // Notify client about job acceptance
  notifyJobAccepted(jobData) {
    this.showLocalNotification(
      '🎉 Job Accepted!',
      `A provider has accepted your ${jobData.serviceCategory || 'service'} request!`,
      {type: 'job_accepted', jobId: jobData.id}
    );
  }

  // Notify admin about new job request
  notifyAdminNewJob(jobData) {
    this.showLocalNotification(
      '📋 New Job Request',
      `${jobData.clientName || 'Client'} requested ${jobData.serviceCategory || 'service'}${jobData.isNegotiable ? ` - Offers ₱${(jobData.offeredPrice || 0).toLocaleString()}` : ''}`,
      {type: 'new_job', jobId: jobData.id}
    );
  }

  // ========== JOB STATUS NOTIFICATIONS ==========

  // Notify client when job is started
  notifyJobStarted(jobData) {
    this.showLocalNotification(
      '🚀 Job Started!',
      `Your ${jobData.serviceCategory || 'service'} job is now in progress.`,
      {type: 'job_started', jobId: jobData.id}
    );
  }

  // Notify client when job is completed
  notifyJobCompleted(jobData) {
    this.showLocalNotification(
      '✅ Job Completed!',
      `Your ${jobData.serviceCategory || 'service'} job has been completed. Please leave a review!`,
      {type: 'job_completed', jobId: jobData.id}
    );
  }

  // Notify about job cancellation
  notifyJobCancelled(jobData, cancelledBy, reason) {
    const byText = cancelledBy === 'client' ? 'Client' : 'Provider';
    this.showLocalNotification(
      '❌ Job Cancelled',
      `${byText} cancelled the ${jobData.serviceCategory || 'service'} job.${reason ? ` Reason: ${reason}` : ''}`,
      {type: 'job_cancelled', jobId: jobData.id}
    );
  }

  // ========== MESSAGE NOTIFICATIONS ==========

  // Notify about new message
  notifyNewMessage(senderName, messagePreview, conversationId) {
    this.showLocalNotification(
      `💬 ${senderName}`,
      messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
      {type: 'new_message', conversationId}
    );
  }

  // ========== PROVIDER NOTIFICATIONS ==========

  // Notify provider about new review
  notifyNewReview(rating, reviewerName) {
    this.showLocalNotification(
      '⭐ New Review!',
      `${reviewerName} gave you ${rating} stars. Check your profile to see the review.`,
      {type: 'new_review'}
    );
  }

  // Notify provider about account approval
  notifyProviderApproved() {
    this.showLocalNotification(
      '🎉 Account Approved!',
      'Congratulations! Your provider account has been approved. You can now receive job requests.',
      {type: 'provider_approved'}
    );
  }

  // Notify provider about account suspension
  notifyProviderSuspended(reason) {
    this.showLocalNotification(
      '⚠️ Account Suspended',
      `Your provider account has been suspended.${reason ? ` Reason: ${reason}` : ''} Contact support for assistance.`,
      {type: 'provider_suspended'}
    );
  }

  // ========== RATING REMINDER ==========

  // Remind client to rate completed job
  notifyRatingReminder(jobData, providerName) {
    this.showLocalNotification(
      '⭐ Rate Your Experience',
      `How was your experience with ${providerName}? Your feedback helps other clients!`,
      {type: 'rating_reminder', jobId: jobData.id}
    );
  }

  // ========== PUSH NOTIFICATION METHODS (Background/Closed App) ==========

  /**
   * Send push notification to a specific user
   * Works even when app is closed!
   */
  async sendPushToUser(userId, title, body, data = {}) {
    return sendPushNotification(userId, title, body, data);
  }

  /**
   * Send push notification to all admins
   */
  async sendPushToAdmins(title, body, data = {}) {
    return sendPushToAdmins(title, body, data);
  }

  /**
   * Send push notification to a topic
   */
  async sendPushToTopic(topic, title, body, data = {}) {
    return sendPushToTopic(topic, title, body, data);
  }

  // ========== COMBINED NOTIFICATIONS (Local + Push) ==========

  /**
   * Notify client about job acceptance (local + push)
   */
  async pushJobAccepted(clientId, jobData, providerName) {
    const title = '🎉 Job Accepted!';
    const body = `${providerName} has accepted your ${jobData.serviceCategory || 'service'} request!`;
    
    // Send push notification (works when app is closed)
    await this.sendPushToUser(clientId, title, body, {
      type: 'job_accepted',
      jobId: jobData.id,
    });
  }

  /**
   * Notify provider about new available job (local + push)
   */
  async pushNewJobAvailable(providerId, jobData) {
    const title = '📋 New Job Available!';
    const body = `New ${jobData.serviceCategory || 'service'} job in your area. ${jobData.isNegotiable ? `Client offers ₱${(jobData.offeredPrice || 0).toLocaleString()}` : 'Tap to view details.'}`;
    
    await this.sendPushToUser(providerId, title, body, {
      type: 'new_job',
      jobId: jobData.id,
    });
  }

  /**
   * Notify admins about new job request
   */
  async pushNewJobToAdmins(jobData, clientName) {
    const title = '📋 New Job Request';
    const body = `${clientName || 'Client'} requested ${jobData.serviceCategory || 'service'}${jobData.isNegotiable ? ` - Offers ₱${(jobData.offeredPrice || 0).toLocaleString()}` : ''}`;
    
    await this.sendPushToAdmins(title, body, {
      type: 'new_job',
      jobId: jobData.id,
    });
  }

  /**
   * Notify client about admin approval
   */
  async pushAdminApproved(clientId, jobData) {
    const title = '✅ Request Approved';
    const body = `Your ${jobData.serviceCategory || 'service'} request has been approved and sent to providers.`;
    
    await this.sendPushToUser(clientId, title, body, {
      type: 'admin_approved',
      jobId: jobData.id,
    });
  }

  /**
   * Notify client about counter offer
   */
  async pushCounterOffer(clientId, jobData) {
    const title = '💰 Counter Offer Received!';
    const body = `Provider offers ₱${(jobData.counterOfferPrice || 0).toLocaleString()} for your ${jobData.serviceCategory || 'service'} request.`;
    
    await this.sendPushToUser(clientId, title, body, {
      type: 'counter_offer',
      jobId: jobData.id,
    });
  }

  /**
   * Notify provider about counter offer accepted
   */
  async pushCounterOfferAccepted(providerId, jobData) {
    const title = '🎉 Counter Offer Accepted!';
    const body = `Client accepted your offer of ₱${(jobData.counterOfferPrice || 0).toLocaleString()} for ${jobData.serviceCategory || 'service'}.`;
    
    await this.sendPushToUser(providerId, title, body, {
      type: 'counter_accepted',
      jobId: jobData.id,
    });
  }

  /**
   * Notify client about job status change
   */
  async pushJobStatusUpdate(clientId, jobData, status) {
    const statusMessages = {
      traveling: {title: '🚗 Provider On The Way', body: `Your provider is traveling to your location.`},
      arrived: {title: '📍 Provider Arrived', body: `Your provider has arrived at your location.`},
      in_progress: {title: '🔧 Job Started', body: `Your ${jobData.serviceCategory || 'service'} job is now in progress.`},
      completed: {title: '✅ Job Completed', body: `Your ${jobData.serviceCategory || 'service'} job has been completed. Please leave a review!`},
      cancelled: {title: '❌ Job Cancelled', body: `Your ${jobData.serviceCategory || 'service'} job has been cancelled.`},
    };
    
    const message = statusMessages[status];
    if (message) {
      await this.sendPushToUser(clientId, message.title, message.body, {
        type: `job_${status}`,
        jobId: jobData.id,
      });
    }
  }

  /**
   * Notify about new message
   */
  async pushNewMessage(userId, senderName, messagePreview, conversationId) {
    const title = `💬 ${senderName}`;
    const body = messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview;
    
    await this.sendPushToUser(userId, title, body, {
      type: 'new_message',
      conversationId,
    });
  }

  /**
   * Notify provider about account approval
   */
  async pushProviderApproved(providerId) {
    const title = '🎉 Account Approved!';
    const body = 'Congratulations! Your provider account has been approved. You can now receive job requests.';
    
    await this.sendPushToUser(providerId, title, body, {
      type: 'provider_approved',
    });
  }
}

export default new NotificationService();
