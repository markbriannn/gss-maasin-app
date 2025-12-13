const express = require('express');
const router = express.Router();
const { getDb, getMessaging } = require('../config/firebase');

router.post('/register-device', async (req, res) => {
  try {
    const { userId, token, platform } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: 'userId and token are required' });
    }

    const db = getDb();
    await db.collection('users').doc(userId).update({
      fcmToken: token,
      fcmPlatform: platform || 'unknown',
      fcmUpdatedAt: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required' });
    }

    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    if (!fcmToken) {
      return res.status(400).json({ error: 'User has no FCM token' });
    }

    const messaging = getMessaging();
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: data || {},
    };

    const response = await messaging.send(message);

    await db.collection('notifications').add({
      targetUserId: userId,
      title,
      body,
      data,
      read: false,
      createdAt: new Date(),
    });

    res.json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/send-to-topic', async (req, res) => {
  try {
    const { topic, title, body, data } = req.body;

    if (!topic || !title || !body) {
      return res.status(400).json({ error: 'topic, title, and body are required' });
    }

    const messaging = getMessaging();
    const message = {
      topic,
      notification: { title, body },
      data: data || {},
    };

    const response = await messaging.send(message);
    res.json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error sending topic notification:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/send-to-admins', async (req, res) => {
  try {
    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    const db = getDb();
    const adminsSnapshot = await db
      .collection('users')
      .where('role', '==', 'ADMIN')
      .get();

    const messaging = getMessaging();
    const tokens = [];

    adminsSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.fcmToken) {
        tokens.push(userData.fcmToken);
      }
    });

    if (tokens.length === 0) {
      return res.json({ success: true, sent: 0 });
    }

    const message = {
      notification: { title, body },
      data: data || {},
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    res.json({ success: true, sent: response.successCount });
  } catch (error) {
    console.error('Error sending admin notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
