// Push Notification Service - Send FCM notifications from backend
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/**
 * Send push notification to a specific user
 * @param {string} userId - User ID to send notification to
 * @param {object} notification - {title, body}
 * @param {object} data - Additional data payload
 */
const sendToUser = async (userId, notification, data = {}) => {
  try {
    // Get user's FCM token from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    if (!fcmToken) {
      console.log(`No FCM token for user ${userId}`);
      return { success: false, error: 'No FCM token' };
    }

    // Send notification
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // For handling tap
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'gss_notifications',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Push notification sent:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // Handle invalid token
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      // Remove invalid token from user
      await db.collection('users').doc(userId).update({
        fcmToken: null,
      });
    }
    
    return { success: false, error: error.message };
  }
};


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
    await db.collection('users').doc(userId).update({
      fcmToken: token,
      fcmPlatform: platform,
      fcmUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`FCM token registered for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error registering FCM token:', error);
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

    const response = await admin.messaging().send(message);
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
const notifyNewMessage = async (recipientId, senderName, messagePreview, conversationId) => {
  return sendToUser(recipientId, {
    title: `💬 ${senderName}`,
    body: messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
  }, {
    type: 'new_message',
    conversationId,
    senderName,
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
