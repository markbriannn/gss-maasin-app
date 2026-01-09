// Push Notification Service - Send FCM notifications from backend
const { getDb, getMessaging, admin } = require('../config/firebase');

// Get Firestore instance (will initialize Firebase if needed)
const db = getDb();

/**
 * Send push notification to a specific user
 * @param {string} userId - User ID to send notification to
 * @param {object} notification - {title, body}
 * @param {object} data - Additional data payload
 */
const sendToUser = async (userId, notification, data = {}) => {
  try {
    console.log('[FCM Backend] Sending notification to user:', userId);
    console.log('[FCM Backend] Notification:', JSON.stringify(notification));
    
    // Get user's FCM token from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`[FCM Backend] User ${userId} not found in Firestore`);
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;
    const platform = userData.fcmPlatform || 'android';

    console.log('[FCM Backend] User found:', userData.email || userData.name || 'unknown');
    console.log('[FCM Backend] FCM token exists:', !!fcmToken);
    console.log('[FCM Backend] Platform:', platform);
    
    if (fcmToken) {
      console.log('[FCM Backend] Token preview:', fcmToken.substring(0, 30) + '...');
    }

    if (!fcmToken) {
      console.log(`[FCM Backend] No FCM token for user ${userId}`);
      return { success: false, error: 'No FCM token' };
    }

    // Build message based on platform
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    };

    // Add platform-specific options
    if (platform === 'web') {
      message.webpush = {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: '/next.svg',
          badge: '/next.svg',
          requireInteraction: true,
        },
        fcmOptions: {
          link: getNotificationLink(data.type, data),
        },
      };
    } else {
      // Android/iOS
      message.android = {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'gss_notifications',
        },
      };
    }

    console.log('[FCM Backend] Sending message via Firebase Admin SDK...');
    const response = await getMessaging().send(message);
    console.log('[FCM Backend] SUCCESS! Message ID:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('[FCM Backend] ERROR sending push notification:', error.message);
    console.error('[FCM Backend] Error code:', error.code);
    console.error('[FCM Backend] Full error:', error);
    
    // Handle invalid token
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      console.log('[FCM Backend] Removing invalid token from user:', userId);
      // Remove invalid token from user
      await db.collection('users').doc(userId).update({
        fcmToken: null,
      });
    }
    
    return { success: false, error: error.message };
  }
};

// Helper to get notification link for web
function getNotificationLink(type, data) {
  const baseUrl = process.env.WEB_APP_URL || 'https://gss-maasin-app.vercel.app';
  
  switch (type) {
    case 'new_job':
    case 'job_approved':
      return data.jobId ? `${baseUrl}/provider/jobs/${data.jobId}` : `${baseUrl}/provider/jobs`;
    case 'booking_accepted':
    case 'job_update':
    case 'counter_offer':
    case 'job_started':
    case 'job_completed':
      return data.jobId ? `${baseUrl}/client/bookings/${data.jobId}` : `${baseUrl}/client/bookings`;
    case 'new_message':
      return data.conversationId ? `${baseUrl}/chat/${data.conversationId}` : `${baseUrl}/messages`;
    case 'provider_approved':
      return `${baseUrl}/provider`;
    default:
      return `${baseUrl}/notifications`;
  }
}


/**
 * Send notification to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {object} notification - {title, body}
 * @param {object} data - Additional data payload
 */
const sendToMultipleUsers = async (userIds, notification, data = {}) => {
  const results = await Promise.all(
    userIds.map(userId => sendToUser(userId, notification, data))
  );
  return results;
};

/**
 * Register device FCM token for a user
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @param {string} platform - Device platform (android/ios)
 */
const registerDeviceToken = async (userId, token, platform = 'android') => {
  try {
    console.log('[FCM Backend] Registering device token for user:', userId);
    console.log('[FCM Backend] Platform:', platform);
    console.log('[FCM Backend] Token preview:', token.substring(0, 30) + '...');
    
    await db.collection('users').doc(userId).update({
      fcmToken: token,
      fcmPlatform: platform,
      fcmUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`[FCM Backend] Token registered successfully for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('[FCM Backend] Error registering FCM token:', error.message);
    console.error('[FCM Backend] Full error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to all admin users
 * @param {object} notification - {title, body}
 * @param {object} data - Additional data payload
 */
const sendToAdmins = async (notification, data = {}) => {
  try {
    // Get all admin users
    const adminsSnapshot = await db.collection('users')
      .where('role', '==', 'ADMIN')
      .get();
    
    if (adminsSnapshot.empty) {
      console.log('No admin users found');
      return { success: true, sent: 0 };
    }

    const adminIds = adminsSnapshot.docs.map(doc => doc.id);
    const results = await sendToMultipleUsers(adminIds, notification, data);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`Sent notification to ${successCount}/${adminIds.length} admins`);
    return { success: true, sent: successCount, total: adminIds.length };
  } catch (error) {
    console.error('Error sending to admins:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to a topic (e.g., all providers, new_jobs)
 * @param {string} topic - Topic name
 * @param {object} notification - {title, body}
 * @param {object} data - Additional data payload
 */
const sendToTopic = async (topic, notification, data = {}) => {
  try {
    const message = {
      topic: topic,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'gss_notifications',
        },
      },
    };

    const response = await getMessaging().send(message);
    console.log(`Push notification sent to topic ${topic}:`, response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error(`Error sending to topic ${topic}:`, error);
    return { success: false, error: error.message };
  }
};

// ============ NOTIFICATION TEMPLATES ============

/**
 * Notify provider of new job request
 */
const notifyNewJobRequest = async (providerId, jobData) => {
  return sendToUser(providerId, {
    title: '🔔 New Job Request!',
    body: `${jobData.clientName} needs ${jobData.serviceCategory}: ${jobData.title}`,
  }, {
    type: 'new_job',
    jobId: jobData.jobId,
  });
};

/**
 * Notify client that provider accepted their booking
 */
const notifyBookingAccepted = async (clientId, jobData) => {
  return sendToUser(clientId, {
    title: '✅ Booking Accepted!',
    body: `${jobData.providerName} accepted your request for ${jobData.title}`,
  }, {
    type: 'booking_accepted',
    jobId: jobData.jobId,
  });
};

/**
 * Notify client of job status update
 */
const notifyJobStatusUpdate = async (clientId, jobData, status) => {
  const statusMessages = {
    traveling: `${jobData.providerName} is on the way!`,
    arrived: `${jobData.providerName} has arrived!`,
    in_progress: `${jobData.providerName} has started working on your job`,
    completed: `Your job "${jobData.title}" has been completed!`,
    pending_payment: 'Please complete payment for your service',
  };

  return sendToUser(clientId, {
    title: '📋 Job Update',
    body: statusMessages[status] || `Job status updated to ${status}`,
  }, {
    type: 'job_update',
    jobId: jobData.jobId,
    status,
  });
};

/**
 * Notify user of new message
 */
const notifyNewMessage = async (recipientId, senderName, messagePreview, conversationId, senderId = null) => {
  return sendToUser(recipientId, {
    title: `💬 ${senderName}`,
    body: messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
  }, {
    type: 'new_message',
    conversationId,
    senderName,
    senderId: senderId || '',
  });
};

/**
 * Notify provider that they've been approved
 */
const notifyProviderApproved = async (providerId, providerName) => {
  return sendToUser(providerId, {
    title: '🎉 Congratulations!',
    body: `Your provider account has been approved! You can now start accepting jobs.`,
  }, {
    type: 'provider_approved',
  });
};

/**
 * Notify provider of payment received
 */
const notifyPaymentReceived = async (providerId, amount, jobTitle) => {
  return sendToUser(providerId, {
    title: '💰 Payment Received!',
    body: `You received ₱${amount.toLocaleString()} for "${jobTitle}"`,
  }, {
    type: 'payment_received',
  });
};

/**
 * Notify client to leave a review
 */
const notifyReviewReminder = async (clientId, providerName, jobId) => {
  return sendToUser(clientId, {
    title: '⭐ How was your experience?',
    body: `Rate your service with ${providerName}`,
  }, {
    type: 'review_reminder',
    jobId,
  });
};

module.exports = {
  sendToUser,
  sendToMultipleUsers,
  registerDeviceToken,
  sendToAdmins,
  sendToTopic,
  notifyNewJobRequest,
  notifyBookingAccepted,
  notifyJobStatusUpdate,
  notifyNewMessage,
  notifyProviderApproved,
  notifyPaymentReceived,
  notifyReviewReminder,
};
