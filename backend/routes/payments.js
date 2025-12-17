const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const { getDb } = require('../config/firebase');

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;
const PAYMONGO_API = 'https://api.paymongo.com/v1';

const paymongoAuth = {
  headers: {
    Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json',
  },
};

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
    const { amount, bookingId, userId, description } = req.body;

    if (!amount || !bookingId) {
      return res.status(400).json({ error: 'amount and bookingId are required' });
    }

    const db = getDb();

    // Check for existing pending payment for this booking (single where to avoid composite index)
    try {
      const existingPayments = await db.collection('payments')
        .where('bookingId', '==', bookingId)
        .get();

      const pendingPayment = existingPayments.docs
        .map(doc => doc.data())
        .find(p => p.status === 'pending' && p.checkoutUrl);

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

    // Use a proper redirect URL (PayMongo requires valid URLs)
    const baseUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*' 
      ? process.env.FRONTEND_URL 
      : 'https://gss-maasin-app.onrender.com';

    const response = await axios.post(
      `${PAYMONGO_API}/sources`,
      {
        data: {
          attributes: {
            amount: Math.round(amount * 100),
            currency: 'PHP',
            type: 'gcash',
            redirect: {
              success: `${baseUrl}/payment/success?bookingId=${bookingId}`,
              failed: `${baseUrl}/payment/failed?bookingId=${bookingId}`,
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
      userId,
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
    const { amount, bookingId, userId, description } = req.body;

    if (!amount || !bookingId) {
      return res.status(400).json({ error: 'amount and bookingId are required' });
    }

    const db = getDb();

    // Check for existing pending payment for this booking (single where to avoid composite index)
    try {
      const existingPayments = await db.collection('payments')
        .where('bookingId', '==', bookingId)
        .get();

      const pendingPayment = existingPayments.docs
        .map(doc => doc.data())
        .find(p => p.status === 'pending' && p.checkoutUrl);

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

    // Use a proper redirect URL (PayMongo requires valid URLs)
    const baseUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*' 
      ? process.env.FRONTEND_URL 
      : 'https://gss-maasin-app.onrender.com';

    const response = await axios.post(
      `${PAYMONGO_API}/sources`,
      {
        data: {
          attributes: {
            amount: Math.round(amount * 100),
            currency: 'PHP',
            type: 'paymaya',
            redirect: {
              success: `${baseUrl}/payment/success?bookingId=${bookingId}`,
              failed: `${baseUrl}/payment/failed?bookingId=${bookingId}`,
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
      userId,
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

    // If already paid, return success
    if (paymentData.status === 'paid') {
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

      // Update payment record
      await db.collection('payments').doc(paymentDoc.id).update({
        paymentId: payment.id,
        status: 'paid',
        paidAt: new Date(),
      });

      // Get booking to find providerId
      const bookingDoc = await db.collection('bookings').doc(bookingId).get();
      const bookingData = bookingDoc.data();
      const providerId = bookingData?.providerId;
      const amountInPesos = amount / 100;
      const providerShare = amountInPesos * 0.95;
      const platformCommission = amountInPesos * 0.05;

      // Check if this is a "pay first" upfront payment
      const isUpfrontPayment = bookingData?.paymentPreference === 'pay_first' && !bookingData?.isPaidUpfront;

      // Update booking status
      const bookingUpdate = {
        paid: true,
        paymentId: payment.id,
        paymentMethod: paymentData.type,
        paidAt: new Date(),
        updatedAt: new Date(),
      };

      if (isUpfrontPayment) {
        // Pay First - mark as paid upfront, don't change status yet
        bookingUpdate.isPaidUpfront = true;
        bookingUpdate.upfrontPaidAmount = amountInPesos;
        bookingUpdate.upfrontPaidAt = new Date();
      } else {
        // Pay Later - mark as payment received
        bookingUpdate.status = 'payment_received';
      }

      await db.collection('bookings').doc(bookingId).update(bookingUpdate);

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

      console.log(`Manual payment processed: ₱${amountInPesos} for booking ${bookingId}`);
      return res.json({ status: 'paid', message: 'Payment processed successfully' });
    } else if (sourceStatus === 'paid') {
      // Already paid at PayMongo, just update our records
      await db.collection('payments').doc(paymentDoc.id).update({
        status: 'paid',
        paidAt: new Date(),
      });

      await db.collection('bookings').doc(bookingId).update({
        paid: true,
        status: 'payment_received',
        paymentMethod: paymentData.type,
        paidAt: new Date(),
        updatedAt: new Date(),
      });

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
      });

      // Get payment data for booking update
      const paymentDoc = await db.collection('payments').doc(sourceId).get();
      const paymentData = paymentDoc.data();

      if (paymentData?.bookingId) {
        // Get booking to find providerId
        const bookingDoc = await db.collection('bookings').doc(paymentData.bookingId).get();
        const bookingData = bookingDoc.data();
        const providerId = bookingData?.providerId;
        const amountInPesos = amount / 100;
        const providerShare = amountInPesos * 0.95; // 95% to provider
        const platformCommission = amountInPesos * 0.05; // 5% platform fee

        // Check if this is a "pay first" upfront payment
        const isUpfrontPayment = bookingData?.paymentPreference === 'pay_first' && !bookingData?.isPaidUpfront;

        // Update booking
        const bookingUpdate = {
          paid: true,
          paymentId: payment.id,
          paymentMethod: paymentData.type,
          paidAt: new Date(),
          updatedAt: new Date(),
        };

        if (isUpfrontPayment) {
          // Pay First - mark as paid upfront, don't change status yet
          bookingUpdate.isPaidUpfront = true;
          bookingUpdate.upfrontPaidAmount = amountInPesos;
          bookingUpdate.upfrontPaidAt = new Date();
        } else {
          // Pay Later - mark as payment received
          bookingUpdate.status = 'payment_received';
        }

        await db.collection('bookings').doc(paymentData.bookingId).update(bookingUpdate);

        // Create transaction record with provider share and commission
        await db.collection('transactions').add({
          bookingId: paymentData.bookingId,
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

        // Update provider's available balance
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

    await db.collection('payments').add({
      bookingId,
      userId,
      providerId,
      amount,
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
      paymentMethod: 'cash',
      status: 'completed',
      createdAt: new Date(),
    });

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

    // Use simple query without orderBy to avoid composite index requirement
    let payoutsSnapshot;
    if (status) {
      payoutsSnapshot = await db.collection('payouts')
        .where('status', '==', status)
        .get();
    } else {
      payoutsSnapshot = await db.collection('payouts').get();
    }

    // Get provider details for each payout
    const payouts = await Promise.all(payoutsSnapshot.docs.map(async (doc) => {
      const payout = doc.data();
      let providerName = 'Unknown';
      
      try {
        if (payout.providerId) {
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
    const { adminId } = req.body;
    const db = getDb();

    const payoutRef = db.collection('payouts').doc(payoutId);
    const payoutDoc = await payoutRef.get();

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

    const payoutRef = db.collection('payouts').doc(payoutId);
    const payoutDoc = await payoutRef.get();

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

    const payoutRef = db.collection('payouts').doc(payoutId);
    const payoutDoc = await payoutRef.get();

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

module.exports = router;
