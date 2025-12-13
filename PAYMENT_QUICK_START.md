# Payment System Quick Start Guide

## What's New

Your app now has a complete payment system for clients to pay for services and providers to receive earnings and request payouts.

## For Clients

### Adding a Payment Method
1. Tap **Profile** in bottom navigation
2. Go to **Payment Methods**
3. Tap **Add Payment Method**
4. Enter card details (test: 4242 4242 4242 4242)
5. Set as default if desired

### Paying for a Service
1. Book a service from a provider
2. At checkout, payment is charged automatically
3. View receipt in **Transaction History**

### Viewing Payment History
1. Tap **Profile** → **Payment Methods**
2. Scroll to see all saved cards
3. Recent transactions show in **Transaction History** (if accessed from menu)

## For Providers

### Setting Up Payouts
1. Tap **Earnings** tab at bottom
2. You'll see your **Wallet** screen
3. Tap **Setup Payout Account** if not configured
4. Follow 2-step wizard:
   - Enter account holder name and email
   - Select business type (Individual/Business)
   - You'll be redirected to Stripe
5. Complete Stripe account setup
6. Return to app - you can now request payouts

### Checking Earnings
1. Tap **Earnings** tab
2. View earnings cards:
   - **Total Earnings** - All-time earnings
   - **This Month** - Current month earnings
   - **Available** - Ready to withdraw
   - **Pending** - Earnings still processing

### Requesting a Payout
1. From **Wallet** screen
2. Ensure balance is ₱100+ (minimum)
3. Tap **Request Payout - ₱[amount]**
4. Confirm the request
5. Funds transfer to your bank in 2-3 business days

### Viewing Payout History
1. From **Wallet** screen
2. Tap **See all** under "Recent Payouts"
3. Filter by transaction type:
   - All
   - Charges (payments you received)
   - Payouts (withdrawals)
   - Refunds

## Fee Structure

- **Service Fee**: 5% from provider earnings
- **Stripe Processing**: ~2.9% + 30¢ (included in service fee)
- **Minimum Payout**: ₱100
- **Payout Time**: 2-3 business days

Example:
- Client pays: ₱1,000
- Provider receives: ₱950 (after 5% fee)

## Testing the Payment System

### Test Cards
Use these cards for testing (expiry: any future date, CVC: any 3 digits):

| Card | Number | Use Case |
|------|--------|----------|
| Visa | 4242 4242 4242 4242 | Successful payment |
| Mastercard | 5555 5555 5555 4444 | Successful payment |
| Amex | 378282246310005 | Successful payment |
| Visa (Decline) | 4000 0000 0000 0002 | Test decline |

### Test Scenarios

**Test as Client:**
1. Login as test client
2. Find a service from test provider
3. Book the service
4. Add payment method (use test card above)
5. Complete booking and payment
6. View transaction in history

**Test as Provider:**
1. Login as test provider
2. Setup payout account (use test Stripe credentials)
3. Have client book and pay for service
4. Complete service (mark as complete)
5. View earnings in Wallet
6. Request payout (must be ₱100+)
7. Verify payout status

## Screens Created

### Client Screens
- **PaymentMethodsScreen** - Manage credit cards
  - Location: Profile → Payment Methods
  - Add/remove cards, set default

### Provider Screens
- **WalletScreen** - Main earnings dashboard
  - Location: Earnings tab (replaces old earnings screen)
  - View earnings, request payouts, setup account

- **TransactionHistoryScreen** - Detailed transaction log
  - View all charges and payouts
  - Filter by type
  - See transaction status

- **PayoutSetupScreen** - Stripe Connect onboarding
  - 3-step wizard for payout account
  - Redirects to Stripe for final setup

## Important Configuration

### Backend Setup Required
The payment system needs a backend server to process Stripe payments. See `PAYMENT_INTEGRATION_GUIDE.md` for detailed backend setup instructions.

### Environment Variables
Add to your `.env` file:
```
REACT_APP_PAYMENT_API_URL=https://your-backend-domain.com/api
```

### Stripe Credentials
1. Create Stripe account: https://stripe.com
2. Get API keys from Stripe Dashboard
3. Backend uses secret key (server-side only)
4. Frontend uses public key (in Stripe Elements)

## Common Issues

### "Payment Method Not Found"
- Add a payment method in Payment Methods screen first
- Make sure card is set as default

### "Minimum Payout Not Met"
- Balance must be ₱100 or more
- Complete more jobs to earn more

### "Payout Account Not Setup"
- Go to Wallet → Setup Payout Account
- Complete Stripe account linking

### "No Transactions Showing"
- Ensure bookings are marked as completed
- Refresh the screen
- Check transaction history filtering

## Firestore Security

Payment transactions are protected by Firestore rules:
- Clients can only see their own transactions
- Providers can only see their own transactions
- Admins can view all transactions
- Transaction data is immutable once created

See `firestore.rules` for complete security configuration.

## Support

### For Development Issues:
1. Check `PAYMENT_INTEGRATION_GUIDE.md` for backend setup
2. Review service file: `src/services/paymentService.js`
3. Check console logs for API errors
4. Verify Stripe test keys are correct

### For Stripe Issues:
1. Check Stripe Dashboard for error details
2. Review API logs in Stripe
3. Verify webhook endpoint is working
4. Contact Stripe support: https://stripe.com/support

## Next Steps

1. ✅ Payment system frontend created
2. 🔶 Setup backend payment API (follow PAYMENT_INTEGRATION_GUIDE.md)
3. 🔶 Deploy backend to production
4. 🔶 Configure Stripe webhooks
5. 🔶 Deploy app with live API keys
6. 🔶 Monitor transactions and payouts
7. 🔶 Setup support process

## Files Modified/Created

**New Files:**
- `src/services/paymentService.js` - Payment service
- `src/screens/payment/PaymentMethodsScreen.jsx` - Client payment methods
- `src/screens/payment/WalletScreen.jsx` - Provider earnings dashboard
- `src/screens/payment/TransactionHistoryScreen.jsx` - Transaction log
- `src/screens/payment/PayoutSetupScreen.jsx` - Payout account setup
- `src/styles/paymentStyles.js` - Payment screen styles
- `PAYMENT_INTEGRATION_GUIDE.md` - Backend integration guide
- `PAYMENT_IMPLEMENTATION_SUMMARY.md` - Technical summary

**Modified Files:**
- `src/navigation/AppNavigator.jsx` - Added payment routes
- `src/screens/provider/ProviderEarningsScreen.jsx` - Redirects to Wallet

---

**Status:** ✅ Frontend Complete | 🔶 Backend Pending

For backend setup, see [PAYMENT_INTEGRATION_GUIDE.md](PAYMENT_INTEGRATION_GUIDE.md)
