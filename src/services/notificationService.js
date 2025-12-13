import messaging from '@react-native-firebase/messaging';
import {Platform, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {API_BASE_URL} from '@env';

const FCM_TOKEN_KEY = '@fcm_token';
const API_URL = API_BASE_URL || 'http://localhost:3001/api';

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
      let fcmToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      
      if (!fcmToken) {
        fcmToken = await messaging().getToken();
        if (fcmToken) {
          await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
        }
      }
      
      this.fcmToken = fcmToken;
      console.log('FCM Token:', fcmToken);
      return fcmToken;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async registerDeviceToken(userId) {
    try {
      const token = await this.getFCMToken();
      if (token && userId) {
        await axios.post(`${API_URL}/notifications/register-device`, {
          userId,
          token,
          platform: Platform.OS,
        });
        console.log('Device token registered for user:', userId);
      }
    } catch (error) {
      console.error('Error registering device token:', error);
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
      
      if (Platform.OS === 'android') {
        // Show local notification for Android when app is in foreground
        this.showLocalNotification(
          remoteMessage.notification?.title || 'New Notification',
          remoteMessage.notification?.body || '',
          remoteMessage.data || {}
        );
      }
      
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

  showLocalNotification(title, body, data = {}) {
    Alert.alert(title, body, [
      {
        text: 'View',
        onPress: () => {
          console.log('Notification action:', data);
        },
      },
      {
        text: 'Dismiss',
        style: 'cancel',
      },
    ]);
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
    return messaging()
      .subscribeToTopic(topic)
      .then(() => console.log(`Subscribed to topic: ${topic}`))
      .catch((error) => console.error(`Error subscribing to topic ${topic}:`, error));
  }

  unsubscribeFromTopic(topic) {
    return messaging()
      .unsubscribeFromTopic(topic)
      .then(() => console.log(`Unsubscribed from topic: ${topic}`))
      .catch((error) => console.error(`Error unsubscribing from topic ${topic}:`, error));
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
}

export default new NotificationService();
