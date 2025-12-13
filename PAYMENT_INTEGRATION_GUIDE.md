# Payment Integration Guide

This guide explains how to set up Stripe payment processing for your app backend.

## Overview

The payment system consists of:
1. **Client-side** (React Native): Payment screens for clients and providers
2. **Backend** (Node.js/Express): Stripe API integration for processing payments
3. **Database** (Firestore): Transaction records and payout history

## Backend Setup

### 1. Install Dependencies

```bash
npm install stripe express dotenv cors axios
```

### 2. Environment Variables

Create a `.env` file in your backend root:

```env
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
NODE_ENV=production
API_URL=https://your-backend-domain.com
```

### 3. Basic Express Server Setup

```javascript
// backend/server.js
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin Setup
const admin = require('firebase-admin');
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
});

const db = admin.firestore();

// Routes
// (see detailed endpoints below)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Payment server running on port ${PORT}`);
});
```

### 4. Key Stripe Endpoints

#### A. Create Customer

```javascript
app.post('/api/stripe/create-customer', async (req, res) => {
  try {
    const { userId, email, metadata } = req.body;

    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
        ...metadata,
      },
    });

    res.json({ success: true, customerId: customer.id });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

#### B. Add Payment Method

```javascript
app.post('/api/stripe/add-payment-method', async (req, res) => {
  try {
    const { customerId, paymentMethodId } = req.body;

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    res.json({ success: true, paymentMethod });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

#### C. Process Payment (Charge)

```javascript
app.post('/api/stripe/charge', async (req, res) => {
  try {
    const { customerId, amount, currency, description, metadata } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount, // in cents
      currency,
      customer: customerId,
      description,
      metadata,
      confirm: true,
      payment_method_types: ['card'],
    });

    if (paymentIntent.status === 'succeeded') {
      res.json({
        success: true,
        id: paymentIntent.id,
        status: paymentIntent.status,
      });
    } else {
      res.status(400).json({
        success: false,
        error: `Payment status: ${paymentIntent.status}`,
      });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

#### D. Create Connected Account (Stripe Connect)

```javascript
app.post('/api/stripe/create-connected-account', async (req, res) => {
  try {
    const { providerId, email, countryCode } = req.body;

    // Create connected account
    const account = await stripe.accounts.create({
      type: 'express',
      country: countryCode,
      email,
      metadata: { providerId },
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      type: 'account_onboarding',
      refresh_url: `${process.env.API_URL}/stripe/reauth`,
      return_url: `${process.env.API_URL}/stripe/return`,
    });

    res.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

#### E. Process Payout

```javascript
app.post('/api/stripe/payout', async (req, res) => {
  try {
    const { connectedAccountId, amount, currency, description, metadata } = req.body;

    const payout = await stripe.payouts.create(
      {
        amount, // in cents
        currency,
        description,
        metadata,
      },
      { stripeAccount: connectedAccountId }
    );

    res.json({
      success: true,
      id: payout.id,
      status: payout.status,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

#### F. Process Refund

```javascript
app.post('/api/stripe/refund', async (req, res) => {
  try {
    const { chargeId, reason } = req.body;

    const refund = await stripe.refunds.create({
      charge: chargeId,
      reason, // 'duplicate', 'fraudulent', or 'requested_by_customer'
      metadata: { reason },
    });

    res.json({
      success: true,
      id: refund.id,
      status: refund.status,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

#### G. Get Payment Methods

```javascript
app.get('/api/stripe/payment-methods', async (req, res) => {
  try {
    const { customerId } = req.query;

    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    res.json({ success: true, methods: methods.data });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

### 5. Webhook Handler

Stripe sends webhooks for payment status updates:

```javascript
app.post('/api/stripe/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Handle events
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      // Update booking status in Firestore
      break;

    case 'charge.refunded':
      const charge = event.data.object;
      console.log('Charge refunded:', charge.id);
      // Update transaction status in Firestore
      break;

    case 'payout.paid':
      const payout = event.data.object;
      console.log('Payout completed:', payout.id);
      // Update payout status in Firestore
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});
```

### 6. Firestore Integration

Add these helper functions to record transactions:

```javascript
async function recordTransaction(transactionData) {
  try {
    await db.collection('transactions').add({
      ...transactionData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error recording transaction:', error);
    throw error;
  }
}

async function updateUserStripeId(userId, stripeCustomerId) {
  try {
    await db.collection('users').doc(userId).update({
      stripeCustomerId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

async function updateBookingPaymentStatus(bookingId, status) {
  try {
    await db.collection('bookings').doc(bookingId).update({
      paid: status === 'succeeded',
      paymentStatus: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
}
```

## Frontend Integration

The React Native app uses the `paymentService.js` which makes API calls to these endpoints.

### Example Usage in Booking Checkout:

```javascript
// In CheckoutScreen.jsx
const handlePayment = async () => {
  try {
    const result = await paymentService.processBookingPayment(
      bookingId,
      clientId,
      amount,
      'Service booking: Plumbing repair'
    );

    if (result.success) {
      Alert.alert('Success', 'Payment completed. Your booking is confirmed.');
      navigation.navigate('BookingConfirmation', { bookingId });
    } else {
      Alert.alert('Payment Failed', result.error);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to process payment');
  }
};
```

## Testing

### Test Cards

Stripe provides test card numbers:

- **Visa**: 4242 4242 4242 4242
- **Mastercard**: 5555 5555 5555 4444
- **Amex**: 378282246310005

Use any future expiry date and any 3-digit CVC.

### Testing Connected Accounts

- Use test account: `acct_1234567890123456`
- Test payouts in dashboard

## Deployment

### 1. Deploy to Production

```bash
# Set live API keys in environment
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Deploy backend
npm start
```

### 2. Update App

Update `REACT_APP_PAYMENT_API_URL` to production URL in app environment.

### 3. Configure Webhooks

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint URL: `https://your-api.com/api/stripe/webhooks`
3. Select events: `payment_intent.succeeded`, `charge.refunded`, `payout.paid`
4. Copy webhook secret to `.env`

## Fee Structure

- **Client Payment**: 100% of service amount
- **Provider Receives**: 95% (5% service fee)
- **Stripe Processing**: ~2.9% + 30¢ (absorbed by service fee)

## Security Considerations

1. **Never expose secret keys** - Keep `STRIPE_SECRET_KEY` on backend only
2. **Validate amounts** - Check amounts on backend before charging
3. **Use HTTPS** - All API calls must use HTTPS
4. **Validate signatures** - Verify webhook signatures using Stripe's library
5. **PCI Compliance** - Never store full card numbers; use Stripe's token system
6. **Rate Limiting** - Implement rate limiting on payment endpoints

## Troubleshooting

### Error: "Invalid API Key"
- Check `STRIPE_SECRET_KEY` is correct
- Ensure it's a live key for production

### Error: "Customer does not have a payment method"
- User needs to add a payment method first
- Check `stripeCustomerId` exists in Firestore

### Webhook Events Not Received
- Check webhook endpoint is publicly accessible
- Verify webhook secret in environment
- Check Firewall/Security Group allows POST from Stripe IPs

### Refund Failed
- Original charge must be less than 90 days old
- Charge must have succeeded
- Amount cannot exceed original charge

## Next Steps

1. Deploy backend to hosting (Heroku, AWS, Google Cloud)
2. Configure production Stripe keys
3. Set up webhook handling
4. Test end-to-end payment flow
5. Deploy security rules to Firestore
6. Test with real test card numbers

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- React Native Stripe: https://github.com/stripe/stripe-react-native
