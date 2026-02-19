const express = require('express');
const router = express.Router();
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

/**
 * Generate Agora RTC Token
 * POST /api/agora/token
 * Body: { channelName, uid, role }
 */
router.post('/token', async (req, res) => {
  try {
    const { channelName, uid, role = 'publisher' } = req.body;

    if (!channelName) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    if (!APP_ID || !APP_CERTIFICATE) {
      return res.status(500).json({ error: 'Agora credentials not configured' });
    }

    // Token expiration time (24 hours)
    const expirationTimeInSeconds = 86400;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Role: publisher (can send and receive) or subscriber (can only receive)
    const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Generate token
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid || 0, // 0 means Agora will assign a random UID
      rtcRole,
      privilegeExpiredTs
    );

    res.json({
      token,
      appId: APP_ID,
      channelName,
      uid: uid || 0,
      expiresAt: privilegeExpiredTs,
    });
  } catch (error) {
    console.error('Error generating Agora token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;
