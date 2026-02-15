const express = require('express');
const router = express.Router();
const { 
  sendOTP, 
  sendProviderApprovalSMS, 
  sendProviderRejectionSMS,
  sendBookingAcceptedSMS,
  sendBookingDeclinedSMS,
  sendNewJobSMS,
  sendBookingApprovedByAdminSMS,
  sendBookingRejectedByAdminSMS,
  sendProviderArrivedSMS,
  sendWorkCompletedSMS,
  sendReviewReminderSMS,
  sendSMS,
} = require('../services/smsService');

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();

/**
 * Send OTP to phone number
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Generate and send OTP
    const result = await sendOTP(phoneNumber);
    
    if (result.success) {
      // Store OTP with expiration (5 minutes)
      otpStore.set(phoneNumber, {
        otp: result.otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
      });

      res.json({ success: true, message: 'OTP sent successfully' });
    } else {
      // Still store OTP for dev/testing even if SMS fails
      otpStore.set(phoneNumber, {
        otp: result.otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
      });
      
      res.json({ 
        success: false, 
        error: result.error,
        devOtp: result.otp, // Return OTP in response for dev/testing
        message: 'SMS failed but OTP generated for testing'
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

/**
 * Verify OTP
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    
    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const storedData = otpStore.get(phoneNumber);

    if (!storedData) {
      return res.status(400).json({ error: 'No OTP found. Please request a new code.' });
    }

    // Check expiration
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(phoneNumber);
      return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
    }

    // Check attempts (max 5)
    if (storedData.attempts >= 5) {
      otpStore.delete(phoneNumber);
      return res.status(400).json({ error: 'Too many attempts. Please request a new code.' });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      storedData.attempts += 1;
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // OTP is valid - clear it
    otpStore.delete(phoneNumber);

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

/**
 * Send provider approval/rejection SMS
 */
router.post('/provider-status', async (req, res) => {
  try {
    const { phoneNumber, providerName, isApproved, reason } = req.body;
    
    if (!phoneNumber || !providerName || isApproved === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let result;
    if (isApproved) {
      result = await sendProviderApprovalSMS(phoneNumber, providerName, true);
    } else {
      result = await sendProviderRejectionSMS(phoneNumber, providerName, reason);
    }

    if (result.success) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Send provider status SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

/**
 * Send booking accepted SMS to client
 */
router.post('/booking-accepted', async (req, res) => {
  try {
    const { phoneNumber, clientName, providerName, serviceCategory } = req.body;
    
    if (!phoneNumber || !clientName || !providerName || !serviceCategory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sendBookingAcceptedSMS(phoneNumber, clientName, providerName, serviceCategory);

    if (result.success) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Send booking accepted SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

/**
 * Send booking declined SMS to client
 */
router.post('/booking-declined', async (req, res) => {
  try {
    const { phoneNumber, clientName, providerName, serviceCategory } = req.body;
    
    if (!phoneNumber || !clientName || !providerName || !serviceCategory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sendBookingDeclinedSMS(phoneNumber, clientName, providerName, serviceCategory);

    if (result.success) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Send booking declined SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

/**
 * Send new job SMS to provider
 */
router.post('/new-job', async (req, res) => {
  try {
    const { phoneNumber, providerName, serviceCategory, clientName, amount } = req.body;
    
    if (!phoneNumber || !providerName || !serviceCategory || !clientName || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sendNewJobSMS(phoneNumber, providerName, serviceCategory, clientName, amount);

    if (result.success) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Send new job SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

/**
 * Send booking approved by admin SMS to client
 */
router.post('/booking-approved-admin', async (req, res) => {
  try {
    const { phoneNumber, clientName, serviceCategory } = req.body;
    
    if (!phoneNumber || !clientName || !serviceCategory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sendBookingApprovedByAdminSMS(phoneNumber, clientName, serviceCategory);

    if (result.success) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Send booking approved SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

/**
 * Send booking rejected by admin SMS to client
 */
router.post('/booking-rejected-admin', async (req, res) => {
  try {
    const { phoneNumber, clientName, serviceCategory, reason } = req.body;
    
    if (!phoneNumber || !clientName || !serviceCategory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sendBookingRejectedByAdminSMS(phoneNumber, clientName, serviceCategory, reason);

    if (result.success) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Send booking rejected SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

/**
 * Send provider arrived SMS to client
 */
router.post('/provider-arrived', async (req, res) => {
  try {
    const { phoneNumber, clientName, providerName, serviceCategory } = req.body;
    
    if (!phoneNumber || !providerName || !serviceCategory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sendProviderArrivedSMS(phoneNumber, clientName || 'Client', providerName, serviceCategory);

    if (result.success) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Send provider arrived SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

/**
 * Send work completed SMS to client
 */
router.post('/work-completed', async (req, res) => {
  try {
    const { phoneNumber, clientName, providerName, serviceCategory } = req.body;
    
    if (!phoneNumber || !providerName || !serviceCategory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sendWorkCompletedSMS(phoneNumber, clientName || 'Client', providerName, serviceCategory);

    if (result.success) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Send work completed SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

/**
 * Send review reminder SMS to client
 */
router.post('/review-reminder', async (req, res) => {
  try {
    const { phoneNumber, clientName, providerName, serviceCategory } = req.body;
    
    if (!phoneNumber || !providerName || !serviceCategory) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sendReviewReminderSMS(phoneNumber, clientName || 'Client', providerName, serviceCategory);

    if (result.success) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Send review reminder SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

/**
 * Send generic SMS
 */
router.post('/send-sms', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await sendSMS(phoneNumber, message);

    if (result.success) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

module.exports = router;
