const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');

/**
 * POST /api/email/send
 * Send a generic email
 */
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }
    
    const result = await emailService.sendEmail(to, subject, html, text);
    
    if (result.success) {
      res.json({ success: true, messageId: result.id });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email/booking-confirmation
 * Send booking confirmation email
 */
router.post('/booking-confirmation', async (req, res) => {
  try {
    const { clientEmail, booking } = req.body;
    
    if (!clientEmail || !booking) {
      return res.status(400).json({ error: 'Missing clientEmail or booking data' });
    }
    
    const result = await emailService.sendBookingConfirmation(clientEmail, booking);
    res.json(result);
  } catch (error) {
    console.error('Booking confirmation email error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email/job-accepted
 * Send job accepted notification
 */
router.post('/job-accepted', async (req, res) => {
  try {
    const { clientEmail, booking, provider } = req.body;
    
    if (!clientEmail || !booking || !provider) {
      return res.status(400).json({ error: 'Missing required data' });
    }
    
    const result = await emailService.sendJobAcceptedNotification(clientEmail, booking, provider);
    res.json(result);
  } catch (error) {
    console.error('Job accepted email error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email/provider-approval
 * Send provider approval/rejection notification
 */
router.post('/provider-approval', async (req, res) => {
  try {
    const { providerEmail, providerName, approved } = req.body;
    
    if (!providerEmail || !providerName || approved === undefined) {
      return res.status(400).json({ error: 'Missing required data' });
    }
    
    const result = await emailService.sendProviderApprovalNotification(providerEmail, providerName, approved);
    res.json(result);
  } catch (error) {
    console.error('Provider approval email error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email/payment-receipt
 * Send payment receipt
 */
router.post('/payment-receipt', async (req, res) => {
  try {
    const { clientEmail, payment } = req.body;
    
    if (!clientEmail || !payment) {
      return res.status(400).json({ error: 'Missing clientEmail or payment data' });
    }
    
    const result = await emailService.sendPaymentReceipt(clientEmail, payment);
    res.json(result);
  } catch (error) {
    console.error('Payment receipt email error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email/job-rejection
 * Send job rejection notification
 */
router.post('/job-rejection', async (req, res) => {
  try {
    const { clientEmail, booking, reason } = req.body;
    
    if (!clientEmail || !booking) {
      return res.status(400).json({ error: 'Missing clientEmail or booking data' });
    }
    
    const result = await emailService.sendJobRejectionNotification(clientEmail, booking, reason);
    res.json(result);
  } catch (error) {
    console.error('Job rejection email error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
