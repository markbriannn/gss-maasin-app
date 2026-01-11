const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const { getDb } = require('../config/firebase');
const { sendRefundNotification } = require('../services/emailService');

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;
const PAYMONGO_API = 'https://api.paymongo.com/v1';

// Validate PayMongo secret key
if (!PAYMONGO_SECRET_KEY) {
  console.warn('WARNING: PAYMONGO_SECRET_KEY is not set. Payment features will not work.');
}

const paymongoAuth = {
  headers: {
    Authorization: PAYMONGO_SECRET_KEY ? `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}` : '',
    'Content-Type': 'application/json',
  },
};

// Generic create-source endpoint (routes to gcash or paymaya based on type)
router.post('/create-source', async (req, res) => {
  try {
    const { amount, bookingId, userId, description, type, platform } = req.body;

    if (!amount || !bookingId) {
      return res.status(400).json({ error: 'amount and bookingId are required' });
    }

    const paymentType = type?.toLowerCase() || 'gcash';
    
    if (!['gcash', 'paymaya', 'maya'].includes(paymentType)) {
      return res.status(400).json({ error: 'Invalid payment type. Use gcash or paymaya' });
    }

    const db = getDb();

    // Check for existing pending payment for this booking with same amount
    try {
      const existingPayments = await db.collection('payments')
        .where('bookingId', '==', bookingId)
        .get();

      const pendingPayment = existingPayments.docs
        .map(doc => doc.data())
        .find(p => p.status === 'pending' && p.checkoutUrl && p.amount === amount);

      if (pendingPayment) {
        return res.json({
          success: true,
          sourceId: pendingPayment.sourceId,
          checkoutUrl: pendingPayment.checkoutUrl,
          status: 'pending',
          existing: true,
        });
      }
    } catch (queryError) {
      console.log('Error checking existing payments:', queryError.message);
    }

    // PayMongo requires valid HTTP/HTTPS URLs for redirects
    const webUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*' 
      ? process.env.FRONTEND_URL 
      : 'https://gss-maasin-app.vercel.app';

    // Use different redirect URLs based on platform
    const isWeb = platform === 'web';
    const successUrl = isWeb 
      ? `${webUrl}/client/bookings/${bookingId}?payment=success`
      : `${webUrl}/payment/success?bookingId=${bookingId}`;
    const failedUrl = isWeb 
      ? `${webUrl}/client/bookings/${bookingId}?payment=failed`
      : `${webUrl}/payment/failed?bookingId=${bookingId}`;

    const sourceType = paymentType === 'maya' ? 'paymaya' : paymentType;

    const response = await axios.post(
      `${PAYMONGO_API}/sources`,
      {
        data: {
          attributes: {
            amount: Math.round(amount * 100),
            currency: 'PHP',
            type: sourceType,
            redirect: {
              success: successUrl,
              failed: failedUrl,
            },
            metadata: {
              bookingId,
              userId,
              description: description || 'Service Payment',
            },
          },
        },
      },
      paymongoAuth
    );

    const source = response.data.data;

    await db.collection('payments').doc(source.id).set({
      sourceId: source.id,
      bookingId,
      userId: userId || null,
      amount,
      type: sourceType,
      status: 'pending',
      checkoutUrl: source.attributes.redirect.checkout_url,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      sourceId: source.id,
      checkoutUrl: source.attributes.redirect.checkout_url,
      status: source.attributes.status,
    });
  } catch (error) {
    console.error('Error creating payment source:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      error: error.response?.data?.errors?.[0]?.detail || error.message 
    });
  }
});

// Verify PayMongo webhook signature
const verifyWebhookSignature = (payload, signature, secret) => {
  if (!secret) {
    console.warn('PAYMONGO_WEBHOOK_SECRET not configured, skipping signature verification');
    return true; // Skip verification if secret not configured (dev mode)
  }
  
  try {
    // PayMongo signature format: t=timestamp,te=test_signature,li=live_signature
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const testSigPart = parts.find(p => p.startsWith('te='));
    const liveSigPart = parts.find(p => p.startsWith('li='));
    
    if (!timestampPart) return false;
    
    const timestamp = timestampPart.split('=')[1];
    const expectedSig = testSigPart ? testSigPart.split('=')[1] : (liveSigPart ? liveSigPart.split('=')[1] : null);
    
    if (!expectedSig) return false;
    
    // Create signature: HMAC-SHA256 of timestamp + '.' + payload
    const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
    const computedSig = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(computedSig)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

// Check if webhook event was already processed (idempotency)
const isEventProcessed = async (db, eventId) => {
  const eventDoc = await db.collection('webhookEvents').doc(eventId).get();
  return eventDoc.exists;
};

// Mark webhook event as processed
const markEventProcessed = async (db, eventId, eventType) => {
  await db.collection('webhookEvents').doc(eventId).set({
    eventId,
    eventType,
    processedAt: new Date(),
  });
};

router.post('/create-gcash-source', async (req, res) => {
  try {
    const { amount, bookingId, userId, description, platform } = req.body;

    if (!amount || !bookingId) {
      return res.status(400).json({ error: 'amount and bookingId are required' });
    }

    const db = getDb();

    // Check for existing pending payment for this booking with same amount
    try {
      const existingPayments = await db.collection('payments')
        .where('bookingId', '==', bookingId)
        .get();

      const pendingPayment = existingPayments.docs
        .map(doc => doc.data())
        .find(p => p.status === 'pending' && p.checkoutUrl && p.amount === amount);

      if (pendingPayment) {
        return res.json({
          sourceId: pendingPayment.sourceId,
          checkoutUrl: pendingPayment.checkoutUrl,
          status: 'pending',
          existing: true,
        });
      }
    } catch (queryError) {
      console.log('Error checking existing GCash payments:', queryError.message);
    }

    // PayMongo requires valid HTTP/HTTPS URLs for redirects
    const webUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*' 
      ? process.env.FRONTEND_URL 
      : 'https://gss-maasin-app.vercel.app';

    // Use different redirect URLs based on platform
    const isWeb = platform === 'web';
    const successUrl = isWeb 
      ? `${webUrl}/client/bookings/${bookingId}?payment=success`
      : `${webUrl}/payment/success?bookingId=${bookingId}`;
    const failedUrl = isWeb 
      ? `${webUrl}/client/bookings/${bookingId}?payment=failed`
      : `${webUrl}/payment/failed?bookingId=${bookingId}`;

    const response = await axios.post(
      `${PAYMONGO_API}/sources`,
      {
        data: {
          attributes: {
            amount: Math.round(amount * 100),
            currency: 'PHP',
            type: 'gcash',
            redirect: {
              success: successUrl,
              failed: failedUrl,
            },
            metadata: {
              bookingId,
              userId,
              description: description || 'Service Payment',
            },
          },
        },
      },
      paymongoAuth
    );

    const source = response.data.data;

    await db.collection('payments').doc(source.id).set({
      sourceId: source.id,
      bookingId,
      userId: userId || null,
      amount,
      type: 'gcash',
      status: 'pending',
      checkoutUrl: source.attributes.redirect.checkout_url,
      createdAt: new Date(),
    });

    res.json({
      sourceId: source.id,
      checkoutUrl: source.attributes.redirect.checkout_url,
      status: source.attributes.status,
    });
  } catch (error) {
    console.error('Error creating GCash source:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.errors?.[0]?.detail || error.message });
  }
});

router.post('/create-paymaya-source', async (req, res) => {
  try {
    const { amount, bookingId, userId, description, platform } = req.body;

    if (!amount || !bookingId) {
      return res.status(400).json({ error: 'amount and bookingId are required' });
    }

    const db = getDb();

    // Check for existing pending payment for this booking with same amount
    try {
      const existingPayments = await db.collection('payments')
        .where('bookingId', '==', bookingId)
        .get();

      const pendingPayment = existingPayments.docs
        .map(doc => doc.data())
        .find(p => p.status === 'pending' && p.checkoutUrl && p.amount === amount);

      if (pendingPayment) {
        return res.json({
          sourceId: pendingPayment.sourceId,
          checkoutUrl: pendingPayment.checkoutUrl,
          status: 'pending',
          existing: true,
        });
      }
    } catch (queryError) {
      console.log('Error checking existing Maya payments:', queryError.message);
    }

    // PayMongo requires valid HTTP/HTTPS URLs for redirects
    const webUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*' 
      ? process.env.FRONTEND_URL 
      : 'https://gss-maasin-app.vercel.app';

    // Use different redirect URLs based on platform
    const isWeb = platform === 'web';
    const successUrl = isWeb 
      ? `${webUrl}/client/bookings/${bookingId}?payment=success`
      : `${webUrl}/payment/success?bookingId=${bookingId}`;
    const failedUrl = isWeb 
      ? `${webUrl}/client/bookings/${bookingId}?payment=failed`
      : `${webUrl}/payment/failed?bookingId=${bookingId}`;

    const response = await axios.post(
      `${PAYMONGO_API}/sources`,
      {
        data: {
          attributes: {
            amount: Math.round(amount * 100),
            currency: 'PHP',
            type: 'paymaya',
            redirect: {
              success: successUrl,
              failed: failedUrl,
            },
            metadata: {
              bookingId,
              userId,
              description: description || 'Service Payment',
            },
          },
        },
      },
      paymongoAuth
    );

    const source = response.data.data;

    await db.collection('payments').doc(source.id).set({
      sourceId: source.id,
      bookingId,
      userId: userId || null,
      amount,
      type: 'paymaya',
      status: 'pending',
      checkoutUrl: source.attributes.redirect.checkout_url,
      createdAt: new Date(),
    });

    res.json({
      sourceId: source.id,
      checkoutUrl: source.attributes.redirect.checkout_url,
      status: source.attributes.status,
    });
  } catch (error) {
    console.error('Error creating PayMaya source:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.errors?.[0]?.detail || error.message });
  }
});

router.post('/create-payment', async (req, res) => {
  try {
    const { sourceId, amount, description } = req.body;

    if (!sourceId || !amount) {
      return res.status(400).json({ error: 'sourceId and amount are required' });
    }

    const response = await axios.post(
      `${PAYMONGO_API}/payments`,
      {
        data: {
          attributes: {
            amount: Math.round(amount * 100),
            currency: 'PHP',
            description: description || 'Service Payment',
            source: {
              id: sourceId,
              type: 'source',
            },
          },
        },
      },
      paymongoAuth
    );

    const payment = response.data.data;

    const db = getDb();
    await db.collection('payments').doc(sourceId).update({
      paymentId: payment.id,
      status: payment.attributes.status,
      paidAt: new Date(),
    });

    res.json({
      paymentId: payment.id,
      status: payment.attributes.status,
      amount: payment.attributes.amount / 100,
    });
  } catch (error) {
    console.error('Error creating payment:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.errors?.[0]?.detail || error.message });
  }
});

router.get('/source/:sourceId', async (req, res) => {
  try {
    const { sourceId } = req.params;

    const response = await axios.get(`${PAYMONGO_API}/sources/${sourceId}`, paymongoAuth);
    const source = response.data.data;

    res.json({
      id: source.id,
      status: source.attributes.status,
      amount: source.attributes.amount / 100,
      type: source.attributes.type,
    });
  } catch (error) {
    console.error('Error fetching source:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.errors?.[0]?.detail || error.message });
  }
});

// Manual check and process payment (fallback when webhook fails)
router.post('/verify-and-process/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const db = getDb();

    // Get payment record
    const paymentsSnapshot = await db.collection('payments')
      .where('bookingId', '==', bookingId)
      .get();

    if (paymentsSnapshot.empty) {
      return res.status(404).json({ error: 'No payment found for this booking' });
    }

    const paymentDoc = paymentsSnapshot.docs[0];
    const paymentData = paymentDoc.data();

    // If already paid, check if booking needs to be fixed
    if (paymentData.status === 'paid') {
      // Get booking to check if it needs status fix
      const bookingDoc = await db.collection('bookings').doc(bookingId).get();
      const bookingData = bookingDoc.data();
      
      // Fix stuck "Pay First" jobs that are in pending_payment but already paid
      if (bookingData?.paymentPreference === 'pay_first' && 
          bookingData?.isPaidUpfront && 
          bookingData?.status === 'pending_payment') {
        await db.collection('bookings').doc(bookingId).update({
          status: 'accepted',
          updatedAt: new Date(),
        });
        console.log(`Fixed stuck Pay First booking ${bookingId}: pending_payment -> accepted`);
        return res.json({ status: 'paid', message: 'Payment already processed, booking status fixed' });
      }
      
      return res.json({ status: 'paid', message: 'Payment already processed' });
    }

    // Check source status from PayMongo
    const sourceResponse = await axios.get(
      `${PAYMONGO_API}/sources/${paymentData.sourceId}`,
      paymongoAuth
    );
    const source = sourceResponse.data.data;
    const sourceStatus = source.attributes.status;

    console.log('Source status for', paymentData.sourceId, ':', sourceStatus);

    if (sourceStatus === 'chargeable') {
      // Source is chargeable, create payment
      const amount = source.attributes.amount;
      
      const paymentResponse = await axios.post(
        `${PAYMONGO_API}/payments`,
        {
          data: {
            attributes: {
              amount,
              currency: 'PHP',
              description: source.attributes.metadata?.description || 'Service Payment',
              source: {
                id: paymentData.sourceId,
                type: 'source',
              },
            },
          },
        },
        paymongoAuth
      );

      const payment = paymentResponse.data.data;

      // Update payment record - mark as processed to prevent duplicates
      await db.collection('payments').doc(paymentDoc.id).update({
        paymentId: payment.id,
        status: 'paid',
        paidAt: new Date(),
        balanceUpdated: true, // Flag to prevent duplicate balance updates
      });

      // Get booking to find providerId
      const bookingDoc = await db.collection('bookings').doc(bookingId).get();
      const bookingData = bookingDoc.data();
      const providerId = bookingData?.providerId;
      const amountInPesos = amount / 100;
      // IMPORTANT: Provider keeps their FULL price - 5% fee is paid by client ON TOP
      const providerShare = bookingData?.providerPrice || bookingData?.providerFixedPrice || bookingData?.offeredPrice || Math.round(amountInPesos / 1.05);
      const platformCommission = amountInPesos - providerShare;

      // Check if this is a "pay first" upfront payment
      const isPayFirstBooking = bookingData?.paymentPreference === 'pay_first';
      const isUpfrontPayment = isPayFirstBooking && !bookingData?.isPaidUpfront;

      // Update booking status
      const bookingUpdate = {
        paid: true,
        paymentId: payment.id,
        paymentMethod: paymentData.type,
        paidAt: new Date(),
        updatedAt: new Date(),
      };

      if (isUpfrontPayment) {
        // Pay First - mark as paid upfront, DON'T change status
        bookingUpdate.isPaidUpfront = true;
        bookingUpdate.upfrontPaidAmount = amountInPesos;
        bookingUpdate.upfrontPaidAt = new Date();
        bookingUpdate.paymentStatus = 'held';
        // Don't change status - keep it as pending for admin approval
        console.log(`Pay First upfront payment processed for booking ${bookingId}: ₱${amountInPesos}`);
      } else if (isPayFirstBooking && bookingData?.isPaidUpfront) {
        // Pay First booking that's already paid - only change status if in payment flow
        if (bookingData?.status === 'pending_payment' || bookingData?.status === 'pending_completion') {
          bookingUpdate.status = 'payment_received';
          console.log(`Additional payment processed for Pay First booking ${bookingId}: ₱${amountInPesos}`);
        } else {
          console.log(`Duplicate payment for Pay First booking ${bookingId}, status unchanged: ${bookingData?.status}`);
        }
      } else {
        // Pay Later - mark as payment received
        bookingUpdate.status = 'payment_received';
        console.log(`Pay Later payment processed for booking ${bookingId}: ₱${amountInPesos}`);
      }

      await db.collection('bookings').doc(bookingId).update(bookingUpdate);

      // Check if transaction already exists to avoid duplicates
      const existingTxCheck = await db.collection('transactions')
        .where('bookingId', '==', bookingId)
        .where('type', '==', 'payment')
        .get();

      if (existingTxCheck.empty) {
        // Create transaction record
        await db.collection('transactions').add({
          bookingId: bookingId,
          clientId: paymentData.userId,
          providerId: providerId,
          type: 'payment',
          amount: amountInPesos,
          providerShare: providerShare,
          platformCommission: platformCommission,
          paymentId: payment.id,
          paymentMethod: paymentData.type,
          status: 'completed',
          createdAt: new Date(),
        });

        // Update provider's balance - only if not already updated
        if (providerId) {
          const providerRef = db.collection('users').doc(providerId);
          const providerDoc = await providerRef.get();
          const currentBalance = providerDoc.data()?.availableBalance || 0;
          const currentEarnings = providerDoc.data()?.totalEarnings || 0;
          
          await providerRef.update({
            availableBalance: currentBalance + providerShare,
            totalEarnings: currentEarnings + providerShare,
            updatedAt: new Date(),
          });
          console.log(`Provider balance updated: +₱${providerShare}`);
        }
      } else {
        console.log(`Transaction already exists for booking ${bookingId}, skipping balance update`);
      }

      console.log(`Manual payment processed: ₱${amountInPesos} for booking ${bookingId}`);
      return res.json({ status: 'paid', message: 'Payment processed successfully' });
    } else if (sourceStatus === 'paid') {
      // Already paid at PayMongo, sync our records and update provider balance
      await db.collection('payments').doc(paymentDoc.id).update({
        status: 'paid',
        paidAt: new Date(),
      });

      // Get booking data
      const bookingDoc = await db.collection('bookings').doc(bookingId).get();
      const bookingData = bookingDoc.data();
      const providerId = bookingData?.providerId;
      const amountInPesos = source.attributes.amount / 100;
      // IMPORTANT: Provider keeps their FULL price - 5% fee is paid by client ON TOP
      const providerShare = bookingData?.providerPrice || bookingData?.providerFixedPrice || bookingData?.offeredPrice || Math.round(amountInPesos / 1.05);
      const platformCommission = amountInPesos - providerShare;

      // Check if this is a "pay first" upfront payment
      const isUpfrontPayment = bookingData?.paymentPreference === 'pay_first' && !bookingData?.isPaidUpfront;

      // Update booking status
      const bookingUpdate = {
        paid: true,
        paymentMethod: paymentData.type,
        paidAt: new Date(),
        updatedAt: new Date(),
      };

      if (isUpfrontPayment) {
        bookingUpdate.isPaidUpfront = true;
        bookingUpdate.upfrontPaidAmount = amountInPesos;
        bookingUpdate.upfrontPaidAt = new Date();
        if (bookingData?.status === 'pending_payment') {
          bookingUpdate.status = 'accepted';
        }
      } else {
        bookingUpdate.status = 'payment_received';
      }

      await db.collection('bookings').doc(bookingId).update(bookingUpdate);

      // Check if transaction already exists to avoid duplicates
      const existingTx = await db.collection('transactions')
        .where('bookingId', '==', bookingId)
        .where('type', '==', 'payment')
        .get();

      if (existingTx.empty) {
        // Create transaction record
        await db.collection('transactions').add({
          bookingId: bookingId,
          clientId: paymentData.userId,
          providerId: providerId,
          type: 'payment',
          amount: amountInPesos,
          providerShare: providerShare,
          platformCommission: platformCommission,
          paymentMethod: paymentData.type,
          status: 'completed',
          createdAt: new Date(),
        });

        // Update provider's balance
        if (providerId) {
          const providerRef = db.collection('users').doc(providerId);
          const providerDoc = await providerRef.get();
          const currentBalance = providerDoc.data()?.availableBalance || 0;
          const currentEarnings = providerDoc.data()?.totalEarnings || 0;
          
          await providerRef.update({
            availableBalance: currentBalance + providerShare,
            totalEarnings: currentEarnings + providerShare,
            updatedAt: new Date(),
          });
        }

        console.log(`Payment synced: ₱${amountInPesos} - Provider: ₱${providerShare}`);
      }

      return res.json({ status: 'paid', message: 'Payment status synced' });
    } else if (sourceStatus === 'expired' || sourceStatus === 'cancelled') {
      await db.collection('payments').doc(paymentDoc.id).update({
        status: 'failed',
        failedAt: new Date(),
      });
      return res.json({ status: 'failed', message: 'Payment expired or cancelled' });
    }

    // Still pending
    return res.json({ status: sourceStatus, message: 'Payment still pending' });
  } catch (error) {
    console.error('Error verifying payment:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.errors?.[0]?.detail || error.message });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['paymongo-signature'];
    const db = getDb();
    
    // Verify webhook signature (skip in dev if not configured)
    if (PAYMONGO_WEBHOOK_SECRET && !verifyWebhookSignature(req.body, signature, PAYMONGO_WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body.data;
    const eventId = event.id;
    const eventType = event.attributes.type;

    console.log('PayMongo webhook received:', eventType, 'Event ID:', eventId);

    // Idempotency check - skip if already processed
    if (await isEventProcessed(db, eventId)) {
      console.log('Event already processed, skipping:', eventId);
      return res.json({ received: true, skipped: true });
    }

    if (eventType === 'source.chargeable') {
      const source = event.attributes.data;
      const sourceId = source.id;
      const amount = source.attributes.amount;

      // Create payment from chargeable source
      const paymentResponse = await axios.post(
        `${PAYMONGO_API}/payments`,
        {
          data: {
            attributes: {
              amount,
              currency: 'PHP',
              description: source.attributes.metadata?.description || 'Service Payment',
              source: {
                id: sourceId,
                type: 'source',
              },
            },
          },
        },
        paymongoAuth
      );

      const payment = paymentResponse.data.data;

      // Update payment record
      await db.collection('payments').doc(sourceId).update({
        paymentId: payment.id,
        status: 'paid',
        paidAt: new Date(),
        webhookProcessed: true,
        balanceUpdated: true, // Flag to prevent duplicate balance updates
      });

      // Get payment data for booking update
      const paymentDoc = await db.collection('payments').doc(sourceId).get();
      const paymentData = paymentDoc.data();

      if (paymentData?.bookingId) {
        // Check if transaction already exists to avoid duplicates
        const existingTx = await db.collection('transactions')
          .where('bookingId', '==', paymentData.bookingId)
          .where('type', '==', 'payment')
          .get();

        if (!existingTx.empty) {
          console.log(`Transaction already exists for booking ${paymentData.bookingId}, skipping webhook processing`);
          await markEventProcessed(db, eventId, eventType);
          return res.json({ received: true, skipped: true, reason: 'transaction_exists' });
        }

        // Get booking to find providerId
        const bookingDoc = await db.collection('bookings').doc(paymentData.bookingId).get();
        const bookingData = bookingDoc.data();
        const providerId = bookingData?.providerId;
        const amountInPesos = amount / 100;
        // IMPORTANT: Provider keeps their FULL price - 5% fee is paid by client ON TOP
        const providerShare = bookingData?.providerPrice || bookingData?.providerFixedPrice || bookingData?.offeredPrice || Math.round(amountInPesos / 1.05);
        const platformCommission = amountInPesos - providerShare;

        // Check if this is an escrow payment (awaiting_payment status)
        const isEscrowPayment = bookingData?.status === 'awaiting_payment';
        // Check if this is a "pay first" upfront payment
        const isPayFirstBooking = bookingData?.paymentPreference === 'pay_first';
        const isUpfrontPayment = isPayFirstBooking && !bookingData?.isPaidUpfront;

        // Update booking
        const bookingUpdate = {
          paid: true,
          paymentId: payment.id,
          paymentMethod: paymentData.type,
          paidAt: new Date(),
          updatedAt: new Date(),
        };

        if (isEscrowPayment) {
          // Escrow payment - mark as paid and change status to pending (awaiting admin approval)
          bookingUpdate.isPaidUpfront = true;
          bookingUpdate.upfrontPaidAmount = amountInPesos;
          bookingUpdate.upfrontPaidAt = new Date();
          bookingUpdate.paymentStatus = 'held'; // Money is held in escrow
          bookingUpdate.status = 'pending'; // Now waiting for admin approval
          console.log(`Escrow payment received for booking ${paymentData.bookingId}: ₱${amountInPesos}`);
        } else if (isUpfrontPayment) {
          // Pay First - mark as paid upfront, DON'T change status (keep as pending for admin approval)
          bookingUpdate.isPaidUpfront = true;
          bookingUpdate.upfrontPaidAmount = amountInPesos;
          bookingUpdate.upfrontPaidAt = new Date();
          bookingUpdate.paymentStatus = 'held';
          // Don't change status - keep it as pending for admin approval, then provider accepts
          console.log(`Pay First upfront payment received for booking ${paymentData.bookingId}: ₱${amountInPesos}, status remains: ${bookingData?.status}`);
        } else if (isPayFirstBooking && bookingData?.isPaidUpfront) {
          // Pay First booking that's already paid - this is likely additional charges payment
          // Only change to payment_received if we're in pending_payment or pending_completion status
          if (bookingData?.status === 'pending_payment' || bookingData?.status === 'pending_completion') {
            bookingUpdate.status = 'payment_received';
            console.log(`Additional payment received for Pay First booking ${paymentData.bookingId}: ₱${amountInPesos}`);
          } else {
            // Don't change status for already-paid Pay First bookings in other statuses
            console.log(`Duplicate/extra payment for Pay First booking ${paymentData.bookingId}, status unchanged: ${bookingData?.status}`);
          }
        } else {
          // Pay Later - mark as payment received (this is the final payment after work is done)
          bookingUpdate.status = 'payment_received';
          console.log(`Pay Later payment received for booking ${paymentData.bookingId}: ₱${amountInPesos}`);
        }

        await db.collection('bookings').doc(paymentData.bookingId).update(bookingUpdate);

        // Create transaction record (we already checked it doesn't exist above)
        await db.collection('transactions').add({
          bookingId: paymentData.bookingId,
          clientId: paymentData.userId,
          providerId: providerId,
          type: isEscrowPayment ? 'escrow_payment' : 'payment',
          amount: amountInPesos,
          providerShare: providerShare,
          platformCommission: platformCommission,
          paymentId: payment.id,
          paymentMethod: paymentData.type,
          status: isEscrowPayment ? 'held' : 'completed',
          createdAt: new Date(),
        });

        // Only update provider's balance for non-escrow payments
        if (!isEscrowPayment && providerId) {
          const providerRef = db.collection('users').doc(providerId);
          const providerDoc = await providerRef.get();
          const currentBalance = providerDoc.data()?.availableBalance || 0;
          const currentEarnings = providerDoc.data()?.totalEarnings || 0;
          
          await providerRef.update({
            availableBalance: currentBalance + providerShare,
            totalEarnings: currentEarnings + providerShare,
            updatedAt: new Date(),
          });
          console.log(`Webhook: Provider balance updated: +₱${providerShare}`);
        }

        console.log(`Payment processed: ₱${amountInPesos} - Provider: ₱${providerShare}, Platform: ₱${platformCommission}`);
      }
    }

    if (eventType === 'payment.paid') {
      const payment = event.attributes.data;
      console.log('Payment completed:', payment.id);
    }

    if (eventType === 'payment.failed') {
      const payment = event.attributes.data;
      console.log('Payment failed:', payment.id);

      const sourceId = payment.attributes.source?.id;
      if (sourceId) {
        await db.collection('payments').doc(sourceId).update({
          status: 'failed',
          failedAt: new Date(),
          webhookProcessed: true,
        });
      }
    }

    // Mark event as processed for idempotency
    await markEventProcessed(db, eventId, eventType);

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/payment-status/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const db = getDb();
    
    // Query without orderBy to avoid needing composite index
    const paymentsSnapshot = await db
      .collection('payments')
      .where('bookingId', '==', bookingId)
      .get();

    if (paymentsSnapshot.empty) {
      return res.json({ status: 'not_found' });
    }

    // Sort manually to get the most recent payment
    const payments = paymentsSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    }));
    
    // Sort by createdAt descending (most recent first)
    payments.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
      return dateB - dateA;
    });

    const payment = payments[0];

    res.json({
      status: payment.status,
      amount: payment.amount,
      type: payment.type,
      paidAt: payment.paidAt,
    });
  } catch (error) {
    console.error('Error fetching payment status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/refund', async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required' });
    }

    const response = await axios.post(
      `${PAYMONGO_API}/refunds`,
      {
        data: {
          attributes: {
            amount: amount ? Math.round(amount * 100) : undefined,
            payment_id: paymentId,
            reason: reason || 'requested_by_customer',
          },
        },
      },
      paymongoAuth
    );

    const refund = response.data.data;

    res.json({
      refundId: refund.id,
      status: refund.attributes.status,
      amount: refund.attributes.amount / 100,
    });
  } catch (error) {
    console.error('Error processing refund:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.errors?.[0]?.detail || error.message });
  }
});

// Automatic refund for cancelled/rejected bookings
router.post('/auto-refund/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason, cancelledBy } = req.body;
    const db = getDb();

    // Get booking data
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const bookingData = bookingDoc.data();

    // Check if booking was paid
    if (!bookingData.paid && !bookingData.isPaidUpfront) {
      return res.json({ success: true, message: 'No payment to refund', refunded: false });
    }

    // Check if already refunded
    if (bookingData.refunded) {
      return res.json({ success: true, message: 'Already refunded', refunded: true });
    }

    // Get payment record
    const paymentsSnapshot = await db.collection('payments')
      .where('bookingId', '==', bookingId)
      .where('status', '==', 'paid')
      .get();

    if (paymentsSnapshot.empty) {
      // Try to find by paymentId on booking
      if (!bookingData.paymentId) {
        return res.json({ success: true, message: 'No payment record found', refunded: false });
      }
    }

    const paymentDoc = paymentsSnapshot.docs[0];
    const paymentData = paymentDoc?.data();
    const paymentId = paymentData?.paymentId || bookingData.paymentId;

    if (!paymentId) {
      return res.json({ success: true, message: 'No PayMongo payment ID found', refunded: false });
    }

    // Calculate refund amount
    const refundAmount = bookingData.upfrontPaidAmount || bookingData.totalAmount || paymentData?.amount;

    if (!refundAmount || refundAmount <= 0) {
      return res.json({ success: true, message: 'No amount to refund', refunded: false });
    }

    console.log(`Processing auto-refund for booking ${bookingId}: ₱${refundAmount}`);

    // PayMongo only accepts these valid refund reasons: requested_by_customer, duplicate, fraudulent, others
    // Map custom reasons to valid PayMongo reasons and store original in notes
    const validPaymongoReasons = ['requested_by_customer', 'duplicate', 'fraudulent', 'others'];
    const paymongoReason = validPaymongoReasons.includes(reason) ? reason : 'requested_by_customer';
    const originalReason = reason || 'Booking cancelled';

    // Process refund via PayMongo
    const refundResponse = await axios.post(
      `${PAYMONGO_API}/refunds`,
      {
        data: {
          attributes: {
            amount: Math.round(refundAmount * 100), // Convert to centavos
            payment_id: paymentId,
            reason: paymongoReason,
            notes: `Auto-refund for cancelled booking. Reason: ${originalReason}. Cancelled by: ${cancelledBy || 'system'}`,
          },
        },
      },
      paymongoAuth
    );

    const refund = refundResponse.data.data;

    // Update booking with refund info
    await db.collection('bookings').doc(bookingId).update({
      refunded: true,
      refundedAt: new Date(),
      refundId: refund.id,
      refundAmount: refund.attributes.amount / 100,
      refundStatus: refund.attributes.status,
      paymentStatus: 'refunded',
      cancelReason: originalReason,
    });

    // Update payment record
    if (paymentDoc) {
      await db.collection('payments').doc(paymentDoc.id).update({
        refunded: true,
        refundId: refund.id,
        refundedAt: new Date(),
        refundAmount: refund.attributes.amount / 100,
      });
    }

    // Create refund transaction record
    await db.collection('transactions').add({
      bookingId: bookingId,
      clientId: bookingData.clientId,
      providerId: bookingData.providerId,
      type: 'refund',
      amount: refund.attributes.amount / 100,
      refundId: refund.id,
      reason: reason || 'Booking cancelled',
      cancelledBy: cancelledBy || 'system',
      status: 'completed',
      createdAt: new Date(),
    });

    // If provider already received payment, deduct from their balance
    if (bookingData.providerId && !bookingData.paymentStatus?.includes('held')) {
      const providerRef = db.collection('users').doc(bookingData.providerId);
      const providerDoc = await providerRef.get();
      if (providerDoc.exists) {
        const providerData = providerDoc.data();
        // IMPORTANT: Provider keeps their FULL price - use providerPrice not 95% of total
        const providerShare = bookingData.providerPrice || bookingData.providerFixedPrice || bookingData.offeredPrice || Math.round(refundAmount / 1.05);
        const currentBalance = providerData.availableBalance || 0;
        const currentEarnings = providerData.totalEarnings || 0;
        
        await providerRef.update({
          availableBalance: Math.max(0, currentBalance - providerShare),
          totalEarnings: Math.max(0, currentEarnings - providerShare),
          updatedAt: new Date(),
        });
      }
    }

    console.log(`Auto-refund successful for booking ${bookingId}: ₱${refund.attributes.amount / 100}`);

    // Send refund notification email to client
    try {
      // Get client email
      if (bookingData.clientId) {
        const clientDoc = await db.collection('users').doc(bookingData.clientId).get();
        if (clientDoc.exists) {
          const clientData = clientDoc.data();
          const clientEmail = clientData.email;
          
          if (clientEmail) {
            await sendRefundNotification(clientEmail, {
              amount: refund.attributes.amount / 100,
              serviceCategory: bookingData.serviceCategory,
              paymentMethod: paymentData?.type || bookingData.paymentMethod || 'GCash/Maya',
              refundId: refund.id,
            });
            console.log(`Refund notification email sent to ${clientEmail}`);
          }
        }
      }
    } catch (emailError) {
      console.error('Error sending refund notification email:', emailError.message);
      // Don't fail the refund if email fails
    }

    res.json({
      success: true,
      refunded: true,
      refundId: refund.id,
      amount: refund.attributes.amount / 100,
      status: refund.attributes.status,
      message: 'Refund processed successfully',
    });
  } catch (error) {
    console.error('Error processing auto-refund:', error.response?.data || error.message);
    
    // If PayMongo refund fails, still mark as needing manual refund
    const db = getDb();
    try {
      await db.collection('bookings').doc(req.params.bookingId).update({
        refundPending: true,
        refundError: error.response?.data?.errors?.[0]?.detail || error.message,
      });
    } catch (updateError) {
      console.error('Error updating booking with refund error:', updateError);
    }

    res.status(500).json({ 
      success: false,
      error: error.response?.data?.errors?.[0]?.detail || error.message,
      message: 'Refund failed - marked for manual processing'
    });
  }
});

// Get provider balance
router.get('/provider-balance/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const db = getDb();

    // Get provider's balance from user document
    const providerDoc = await db.collection('users').doc(providerId).get();
    
    if (!providerDoc.exists) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const providerData = providerDoc.data();
    
    // Calculate pending balance from incomplete jobs
    const pendingJobsSnapshot = await db.collection('bookings')
      .where('providerId', '==', providerId)
      .where('status', 'in', ['in_progress', 'pending_completion', 'pending_payment'])
      .get();
    
    let pendingBalance = 0;
    pendingJobsSnapshot.docs.forEach(doc => {
      const job = doc.data();
      const amount = job.totalAmount || job.providerPrice || 0;
      pendingBalance += amount * 0.95; // 95% provider share
    });

    res.json({
      availableBalance: providerData.availableBalance || 0,
      pendingBalance: pendingBalance,
      totalEarnings: providerData.totalEarnings || 0,
      totalPayouts: providerData.totalPayouts || 0,
    });
  } catch (error) {
    console.error('Error fetching provider balance:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Request payout
router.post('/request-payout', async (req, res) => {
  try {
    const { providerId, amount, accountMethod, accountNumber, accountName } = req.body;
    const db = getDb();

    // Validate minimum amount
    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Minimum payout amount is ₱100' });
    }

    // Get provider's current balance
    const providerDoc = await db.collection('users').doc(providerId).get();
    if (!providerDoc.exists) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const providerData = providerDoc.data();
    const availableBalance = providerData.availableBalance || 0;

    if (amount > availableBalance) {
      return res.status(400).json({ 
        error: `Insufficient balance. Available: ₱${availableBalance.toFixed(2)}` 
      });
    }

    // Create payout request
    const payoutRef = await db.collection('payouts').add({
      providerId,
      providerName: `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim() || 'Provider',
      amount,
      accountMethod: accountMethod || providerData.payoutAccount?.method,
      accountNumber: accountNumber || providerData.payoutAccount?.accountNumber,
      accountName: accountName || providerData.payoutAccount?.accountName,
      status: 'pending',
      requestedAt: new Date(),
    });

    // Deduct from available balance (will be restored if payout fails)
    await db.collection('users').doc(providerId).update({
      availableBalance: availableBalance - amount,
      pendingPayout: (providerData.pendingPayout || 0) + amount,
      updatedAt: new Date(),
    });

    // Send notification to all admins about the payout request
    try {
      const adminsSnapshot = await db.collection('users')
        .where('role', '==', 'ADMIN')
        .get();
      
      const providerName = `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim() || 'A provider';
      const payoutMethod = (accountMethod || providerData.payoutAccount?.method || 'wallet').toUpperCase();
      
      const notificationPromises = adminsSnapshot.docs.map(adminDoc => {
        return db.collection('notifications').add({
          userId: adminDoc.id,
          targetUserId: adminDoc.id,
          type: 'payout_request',
          title: 'New Payout Request',
          message: `${providerName} requested a payout of ₱${amount.toLocaleString()} via ${payoutMethod}`,
          data: {
            payoutId: payoutRef.id,
            providerId,
            providerName,
            amount,
            accountMethod: payoutMethod,
          },
          read: false,
          createdAt: new Date(),
        });
      });
      
      await Promise.all(notificationPromises);
      console.log(`Sent payout request notification to ${adminsSnapshot.docs.length} admins`);
    } catch (notifError) {
      console.error('Error sending admin notification:', notifError.message);
      // Don't fail the payout request if notification fails
    }

    res.json({
      success: true,
      payoutId: payoutRef.id,
      message: 'Payout request submitted successfully',
    });
  } catch (error) {
    console.error('Error requesting payout:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get payout history
router.get('/payout-history/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const db = getDb();

    // Use simple query without orderBy to avoid composite index requirement
    const payoutsSnapshot = await db.collection('payouts')
      .where('providerId', '==', providerId)
      .get();

    const payouts = payoutsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: doc.data().requestedAt?.toDate?.() || doc.data().requestedAt,
      approvedAt: doc.data().approvedAt?.toDate?.() || doc.data().approvedAt,
      completedAt: doc.data().completedAt?.toDate?.() || doc.data().completedAt,
    }));

    // Sort by requestedAt descending in memory
    payouts.sort((a, b) => {
      const dateA = a.requestedAt ? new Date(a.requestedAt) : new Date(0);
      const dateB = b.requestedAt ? new Date(b.requestedAt) : new Date(0);
      return dateB - dateA;
    });

    res.json({ payouts: payouts.slice(0, 50) });
  } catch (error) {
    console.error('Error fetching payout history:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/cash-payment', async (req, res) => {
  try {
    const { bookingId, userId, amount, providerId } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'bookingId and amount are required' });
    }

    const db = getDb();

    // Get booking to find provider's actual price
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    const bookingData = bookingDoc.exists ? bookingDoc.data() : null;

    // IMPORTANT: Provider keeps their FULL price - 5% fee is paid by client ON TOP
    const providerShare = bookingData?.providerPrice || bookingData?.providerFixedPrice || bookingData?.offeredPrice || Math.round(amount / 1.05);
    const platformCommission = amount - providerShare;

    await db.collection('payments').add({
      bookingId,
      userId,
      providerId,
      amount,
      providerShare,
      platformCommission,
      type: 'cash',
      status: 'completed',
      paidAt: new Date(),
      createdAt: new Date(),
    });

    await db.collection('bookings').doc(bookingId).update({
      paid: true,
      paymentMethod: 'cash',
      paidAt: new Date(),
    });

    await db.collection('transactions').add({
      bookingId,
      clientId: userId,
      providerId,
      type: 'payment',
      amount,
      providerShare,
      platformCommission,
      paymentMethod: 'cash',
      status: 'completed',
      createdAt: new Date(),
    });

    // Update provider's balance
    if (providerId) {
      const providerRef = db.collection('users').doc(providerId);
      const providerDoc = await providerRef.get();
      if (providerDoc.exists) {
        const currentBalance = providerDoc.data()?.availableBalance || 0;
        const currentEarnings = providerDoc.data()?.totalEarnings || 0;
        
        await providerRef.update({
          availableBalance: currentBalance + providerShare,
          totalEarnings: currentEarnings + providerShare,
          updatedAt: new Date(),
        });
      }
    }

    console.log(`Cash payment recorded: ₱${amount} - Provider: ₱${providerShare}, Platform: ₱${platformCommission}`);
    res.json({ success: true, message: 'Cash payment recorded' });
  } catch (error) {
    console.error('Error recording cash payment:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get earnings summary
router.get('/admin/earnings', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const db = getDb();

    // Build query for transactions
    let query = db.collection('transactions').where('type', '==', 'payment');
    
    // Get all completed transactions
    const transactionsSnapshot = await query.get();
    
    let totalRevenue = 0;
    let totalCommission = 0;
    let transactionCount = 0;

    transactionsSnapshot.docs.forEach(doc => {
      const tx = doc.data();
      const txDate = tx.createdAt?.toDate?.() || new Date(tx.createdAt);
      
      // Filter by date if provided
      if (startDate && txDate < new Date(startDate)) return;
      if (endDate && txDate > new Date(endDate)) return;
      
      totalRevenue += tx.amount || 0;
      totalCommission += tx.platformCommission || (tx.amount * 0.05) || 0;
      transactionCount++;
    });

    // Get pending payouts
    const pendingPayoutsSnapshot = await db.collection('payouts')
      .where('status', '==', 'pending')
      .get();
    
    let pendingPayoutsAmount = 0;
    pendingPayoutsSnapshot.docs.forEach(doc => {
      pendingPayoutsAmount += doc.data().amount || 0;
    });

    // Get completed payouts
    const completedPayoutsSnapshot = await db.collection('payouts')
      .where('status', '==', 'completed')
      .get();
    
    let completedPayoutsAmount = 0;
    completedPayoutsSnapshot.docs.forEach(doc => {
      completedPayoutsAmount += doc.data().amount || 0;
    });

    res.json({
      totalRevenue,
      totalCommission,
      transactionCount,
      pendingPayouts: pendingPayoutsAmount,
      pendingPayoutsCount: pendingPayoutsSnapshot.size,
      completedPayouts: completedPayoutsAmount,
      completedPayoutsCount: completedPayoutsSnapshot.size,
    });
  } catch (error) {
    console.error('Error fetching admin earnings:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get pending payout requests
router.get('/admin/payouts', async (req, res) => {
  try {
    const { status } = req.query;
    const db = getDb();

    // Query both 'payouts' (mobile) and 'payoutRequests' (web) collections
    let payoutsSnapshot, payoutRequestsSnapshot;
    if (status) {
      payoutsSnapshot = await db.collection('payouts')
        .where('status', '==', status)
        .get();
      payoutRequestsSnapshot = await db.collection('payoutRequests')
        .where('status', '==', status)
        .get();
    } else {
      payoutsSnapshot = await db.collection('payouts').get();
      payoutRequestsSnapshot = await db.collection('payoutRequests').get();
    }

    // Combine docs from both collections, track seen IDs to avoid duplicates
    const seenIds = new Set();
    const allDocs = [];
    
    payoutsSnapshot.docs.forEach(doc => {
      seenIds.add(doc.id);
      allDocs.push({ doc, source: 'payouts' });
    });
    
    payoutRequestsSnapshot.docs.forEach(doc => {
      if (!seenIds.has(doc.id)) {
        allDocs.push({ doc, source: 'payoutRequests' });
      }
    });

    // Get provider details for each payout
    const payouts = await Promise.all(allDocs.map(async ({ doc, source }) => {
      const payout = doc.data();
      let providerName = payout.providerName || 'Unknown';
      
      try {
        if (payout.providerId && !payout.providerName) {
          const providerDoc = await db.collection('users').doc(payout.providerId).get();
          if (providerDoc.exists) {
            const p = providerDoc.data();
            providerName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'Provider';
          }
        }
      } catch (e) {
        console.log('Error fetching provider:', e);
      }

      return {
        id: doc.id,
        ...payout,
        providerName,
        source, // Track which collection it came from
        requestedAt: payout.requestedAt?.toDate?.() || payout.requestedAt,
        approvedAt: payout.approvedAt?.toDate?.() || payout.approvedAt,
        completedAt: payout.completedAt?.toDate?.() || payout.completedAt,
      };
    }));

    // Sort by requestedAt descending (most recent first) in memory
    payouts.sort((a, b) => {
      const dateA = a.requestedAt ? new Date(a.requestedAt) : new Date(0);
      const dateB = b.requestedAt ? new Date(b.requestedAt) : new Date(0);
      return dateB - dateA;
    });

    // Limit to 100 results
    res.json({ payouts: payouts.slice(0, 100) });
  } catch (error) {
    console.error('Error fetching admin payouts:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Approve payout
router.post('/admin/approve-payout/:payoutId', async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { adminId, source } = req.body; // source can be 'payouts' or 'payoutRequests'
    const db = getDb();

    // Try payouts collection first, then payoutRequests
    let payoutRef = db.collection('payouts').doc(payoutId);
    let payoutDoc = await payoutRef.get();
    let collectionUsed = 'payouts';

    if (!payoutDoc.exists) {
      // Try payoutRequests collection
      payoutRef = db.collection('payoutRequests').doc(payoutId);
      payoutDoc = await payoutRef.get();
      collectionUsed = 'payoutRequests';
    }

    if (!payoutDoc.exists) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    const payout = payoutDoc.data();

    if (payout.status !== 'pending') {
      return res.status(400).json({ error: `Payout is already ${payout.status}` });
    }

    // Update payout status
    await payoutRef.update({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: adminId,
    });

    // Update provider's pending payout
    const providerRef = db.collection('users').doc(payout.providerId);
    const providerDoc = await providerRef.get();
    const providerData = providerDoc.data();

    await providerRef.update({
      pendingPayout: Math.max((providerData.pendingPayout || 0) - payout.amount, 0),
      totalPayouts: (providerData.totalPayouts || 0) + payout.amount,
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: 'Payout approved successfully',
    });
  } catch (error) {
    console.error('Error approving payout:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Mark payout as completed (after manual transfer)
router.post('/admin/complete-payout/:payoutId', async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { referenceNumber } = req.body;
    const db = getDb();

    // Try payouts collection first, then payoutRequests
    let payoutRef = db.collection('payouts').doc(payoutId);
    let payoutDoc = await payoutRef.get();

    if (!payoutDoc.exists) {
      payoutRef = db.collection('payoutRequests').doc(payoutId);
      payoutDoc = await payoutRef.get();
    }

    if (!payoutDoc.exists) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    const payout = payoutDoc.data();

    if (payout.status !== 'approved') {
      return res.status(400).json({ error: 'Payout must be approved first' });
    }

    await payoutRef.update({
      status: 'completed',
      completedAt: new Date(),
      referenceNumber: referenceNumber || null,
    });

    res.json({
      success: true,
      message: 'Payout marked as completed',
    });
  } catch (error) {
    console.error('Error completing payout:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Mark payout as failed and restore balance
router.post('/admin/fail-payout/:payoutId', async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { reason } = req.body;
    const db = getDb();

    // Try payouts collection first, then payoutRequests
    let payoutRef = db.collection('payouts').doc(payoutId);
    let payoutDoc = await payoutRef.get();

    if (!payoutDoc.exists) {
      payoutRef = db.collection('payoutRequests').doc(payoutId);
      payoutDoc = await payoutRef.get();
    }

    if (!payoutDoc.exists) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    const payout = payoutDoc.data();

    if (payout.status === 'completed') {
      return res.status(400).json({ error: 'Cannot fail a completed payout' });
    }

    // Restore provider's balance
    const providerRef = db.collection('users').doc(payout.providerId);
    const providerDoc = await providerRef.get();
    const providerData = providerDoc.data();

    await providerRef.update({
      availableBalance: (providerData.availableBalance || 0) + payout.amount,
      pendingPayout: Math.max((providerData.pendingPayout || 0) - payout.amount, 0),
      updatedAt: new Date(),
    });

    // Update payout status
    await payoutRef.update({
      status: 'failed',
      failedAt: new Date(),
      failureReason: reason || 'Payout processing failed',
    });

    res.json({
      success: true,
      message: 'Payout marked as failed, balance restored',
    });
  } catch (error) {
    console.error('Error failing payout:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Release escrow payment - called when client confirms job completion
router.post('/release-escrow/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { clientId } = req.body;
    const db = getDb();

    // Get booking
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingDoc.data();

    // Verify client owns this booking
    if (booking.clientId !== clientId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if payment is in escrow (held status)
    if (booking.paymentStatus !== 'held') {
      return res.status(400).json({ error: `Payment is not in escrow. Current status: ${booking.paymentStatus}` });
    }

    // Check if job is in pending_completion status
    if (booking.status !== 'pending_completion') {
      return res.status(400).json({ error: `Job must be marked as done by provider first. Current status: ${booking.status}` });
    }

    const providerId = booking.providerId;
    const totalAmount = booking.escrowAmount || booking.totalAmount || 0;
    
    // IMPORTANT: Provider keeps their FULL price - 5% fee is paid by client ON TOP
    // providerPrice is the provider's actual price, totalAmount includes the 5% fee
    const providerShare = booking.providerPrice || booking.providerFixedPrice || booking.offeredPrice || Math.round(totalAmount / 1.05);
    const platformCommission = totalAmount - providerShare;

    // Update booking status
    await db.collection('bookings').doc(bookingId).update({
      status: 'completed',
      paymentStatus: 'released',
      completedAt: new Date(),
      clientConfirmedAt: new Date(),
      providerEarnings: providerShare,
      updatedAt: new Date(),
    });

    // Update transaction status from 'held' to 'completed'
    const transactionsSnapshot = await db.collection('transactions')
      .where('bookingId', '==', bookingId)
      .where('type', '==', 'escrow_payment')
      .get();

    for (const txDoc of transactionsSnapshot.docs) {
      await txDoc.ref.update({
        status: 'completed',
        releasedAt: new Date(),
      });
    }

    // Now add to provider's balance
    if (providerId) {
      const providerRef = db.collection('users').doc(providerId);
      const providerDoc = await providerRef.get();
      if (providerDoc.exists) {
        const currentBalance = providerDoc.data()?.availableBalance || 0;
        const currentEarnings = providerDoc.data()?.totalEarnings || 0;
        
        await providerRef.update({
          availableBalance: currentBalance + providerShare,
          totalEarnings: currentEarnings + providerShare,
          updatedAt: new Date(),
        });
      }
    }

    // Award gamification points for job completion
    try {
      // Award provider points (JOB_COMPLETED: 100 points)
      const providerGamRef = db.collection('gamification').doc(providerId);
      const providerGamDoc = await providerGamRef.get();
      if (providerGamDoc.exists) {
        const data = providerGamDoc.data();
        await providerGamRef.update({
          points: (data.points || 0) + 100,
          'stats.completedJobs': (data.stats?.completedJobs || 0) + 1,
          'stats.totalEarnings': (data.stats?.totalEarnings || 0) + providerShare,
          updatedAt: new Date(),
        });
      } else {
        await providerGamRef.set({
          points: 100,
          role: 'PROVIDER',
          stats: { completedJobs: 1, totalEarnings: providerShare, rating: 0, reviewCount: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Award client points (BOOKING_COMPLETED: 50 points)
      const clientGamRef = db.collection('gamification').doc(clientId);
      const clientGamDoc = await clientGamRef.get();
      if (clientGamDoc.exists) {
        const data = clientGamDoc.data();
        await clientGamRef.update({
          points: (data.points || 0) + 50,
          'stats.completedBookings': (data.stats?.completedBookings || 0) + 1,
          'stats.totalSpent': (data.stats?.totalSpent || 0) + amount,
          updatedAt: new Date(),
        });
      } else {
        await clientGamRef.set({
          points: 50,
          role: 'CLIENT',
          stats: { completedBookings: 1, totalSpent: amount, reviewsGiven: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      console.log(`Gamification points awarded for escrow release - Provider: 100pts, Client: 50pts`);
    } catch (gamError) {
      console.error('Error awarding gamification points:', gamError);
      // Don't fail the escrow release if gamification fails
    }

    console.log(`Escrow released for booking ${bookingId}: Provider gets ₱${providerShare}`);

    res.json({
      success: true,
      message: 'Payment released to provider',
      amount: amount,
      providerShare: providerShare,
    });
  } catch (error) {
    console.error('Error releasing escrow:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
