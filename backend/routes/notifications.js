// Push Notification Routes
const express = require('express');
const router = express.Router();
const pushService = require('../services/pushNotificationService');
const emailService = require('../services/emailService');

// Send email notification
router.post('/email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ 
        success: false, 
        error: 'to, subject, and html are required' 
      });
    }

    const result = await emailService.sendEmail(to, subject, html, text);
    res.json(result);
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send notification to a specific user
router.post('/send', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId, title, and body are required' 
      });
    }

    const result = await pushService.sendToUser(userId, { title, body }, data || {});
    res.json(result);
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notify provider of new job
router.post('/new-job', async (req, res) => {
  try {
    const { providerId, jobData } = req.body;

    if (!providerId || !jobData) {
      return res.status(400).json({ 
        success: false, 
        error: 'providerId and jobData are required' 
      });
    }

    const result = await pushService.notifyNewJobRequest(providerId, jobData);
    res.json(result);
  } catch (error) {
    console.error('Error notifying new job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notify client of booking accepted
router.post('/booking-accepted', async (req, res) => {
  try {
    const { clientId, jobData } = req.body;

    if (!clientId || !jobData) {
      return res.status(400).json({ 
        success: false, 
        error: 'clientId and jobData are required' 
      });
    }

    const result = await pushService.notifyBookingAccepted(clientId, jobData);
    res.json(result);
  } catch (error) {
    console.error('Error notifying booking accepted:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notify job status update
router.post('/job-status', async (req, res) => {
  try {
    const { clientId, jobData, status } = req.body;

    if (!clientId || !jobData || !status) {
      return res.status(400).json({ 
        success: false, 
        error: 'clientId, jobData, and status are required' 
      });
    }

    const result = await pushService.notifyJobStatusUpdate(clientId, jobData, status);
    res.json(result);
  } catch (error) {
    console.error('Error notifying job status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notify new message
router.post('/new-message', async (req, res) => {
  try {
    const { recipientId, senderName, messagePreview, conversationId } = req.body;

    if (!recipientId || !senderName || !conversationId) {
      return res.status(400).json({ 
        success: false, 
        error: 'recipientId, senderName, and conversationId are required' 
      });
    }

    const result = await pushService.notifyNewMessage(
      recipientId, 
      senderName, 
      messagePreview || 'New message', 
      conversationId
    );
    res.json(result);
  } catch (error) {
    console.error('Error notifying new message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notify provider approved
router.post('/provider-approved', async (req, res) => {
  try {
    const { providerId, providerName } = req.body;

    if (!providerId) {
      return res.status(400).json({ 
        success: false, 
        error: 'providerId is required' 
      });
    }

    const result = await pushService.notifyProviderApproved(providerId, providerName);
    res.json(result);
  } catch (error) {
    console.error('Error notifying provider approved:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Register device FCM token
router.post('/register-device', async (req, res) => {
  try {
    const { userId, token, platform } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId and token are required' 
      });
    }

    const result = await pushService.registerDeviceToken(userId, token, platform);
    res.json(result);
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send notification to all admins
router.post('/send-to-admins', async (req, res) => {
  try {
    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ 
        success: false, 
        error: 'title and body are required' 
      });
    }

    const result = await pushService.sendToAdmins({ title, body }, data || {});
    res.json(result);
  } catch (error) {
    console.error('Error sending to admins:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send notification to a topic
router.post('/send-to-topic', async (req, res) => {
  try {
    const { topic, title, body, data } = req.body;

    if (!topic || !title || !body) {
      return res.status(400).json({ 
        success: false, 
        error: 'topic, title, and body are required' 
      });
    }

    const result = await pushService.sendToTopic(topic, { title, body }, data || {});
    res.json(result);
  } catch (error) {
    console.error('Error sending to topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
