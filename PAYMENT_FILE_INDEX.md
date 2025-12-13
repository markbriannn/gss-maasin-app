# Payment System File Index

## Service Layer

### `src/services/paymentService.js` (320 lines)
**Purpose:** Core payment processing service with Stripe integration
**Exports:** Object with methods for all payment operations
**Key Methods:**
- `createStripeCustomer()` - Setup Stripe customer
- `processBookingPayment()` - Charge client for booking
- `processProviderPayout()` - Pay provider to bank
- `createConnectedAccount()` - Setup Stripe Connect for provider
- `getPaymentMethods()` - List client payment cards
- `calculateEarnings()` - Compute provider earnings
- `refundPayment()` - Refund a charge
- `getTransactionHistory()` - Get transaction records
- `validatePaymentSetup()` - Check if payment ready

**Dependencies:** axios, firebase, AsyncStorage

## UI Screens

### Client Screens

#### `src/screens/payment/PaymentMethodsScreen.jsx` (170 lines)
**Purpose:** Client payment method management
**Props:** `navigation` (React Navigation)
**State:** methods[], loading, refreshing, selectedMethod
**Features:**
- List saved payment methods (Visa, Mastercard, Amex)
- Add new payment method
- Set default payment method
- Remove payment method
- Pull-to-refresh
- Empty state for new users

**Navigation Routes:**
- `AddCardScreen` (not yet implemented)

---

### Provider Screens

#### `src/screens/payment/WalletScreen.jsx` (290 lines)
**Purpose:** Provider earnings dashboard and payout management
**Props:** `navigation` (React Navigation)
**State:** earnings{}, loading, refreshing, payoutReady
**Features:**
- Total earnings display (gradient card)
- Monthly earnings display
- Available/Pending balance breakdown
- Payout setup prompt (if needed)
- Request payout button
- Recent payouts list
- How-it-works informational steps

**Displays:**
- Total earnings
- This month earnings
- Available balance
- Pending balance
- Payout setup status
- Request payout button
- Recent transactions preview

**Navigation Routes:**
- `PayoutSetupScreen` - Setup payout account
- `TransactionHistoryScreen` - Full transaction history

---

#### `src/screens/payment/TransactionHistoryScreen.jsx` (240 lines)
**Purpose:** Comprehensive transaction history viewer
**Props:** `navigation`, `route.params.type` (filter type)
**State:** transactions[], loading, refreshing, filter
**Features:**
- Transaction list with status indicators
- Filter by type (All, Charge, Payout, Refund)
- Date formatting
- Amount with directional indicators
- Transaction status icons
- Summary footer with totals
- Pull-to-refresh

**Filter Options:**
- 'all' - All transactions
- 'charge' - Payments received
- 'payout' - Withdrawals made
- 'refund' - Refunded payments

**Display:**
- Transaction type icon
- Service/description
- Amount with +/- indicator
- Date
- Status (completed/pending)

**Navigation Routes:**
- Back to previous screen

---

#### `src/screens/payment/PayoutSetupScreen.jsx` (310 lines)
**Purpose:** Multi-step Stripe Connect onboarding for providers
**Props:** `navigation` (React Navigation)
**State:** loading, step (1-3), formData{}
**Features:**
- Step 1: Introduction with benefits and requirements
- Step 2: Account details form
  - Account holder name input
  - Email input (pre-filled)
  - Business type selection
  - Form validation
- Step 3: Success confirmation
- Stripe redirect integration

**Form Fields:**
- accountHolderName (required)
- email (required, pre-filled)
- businessType ('individual' or 'business')

**Stripe Integration:**
- Creates connected account
- Generates onboarding URL
- Redirects to Stripe for completion

**Navigation Routes:**
- Returns to previous screen after setup

---

## Styles

### `src/styles/paymentStyles.js` (520 lines)
**Purpose:** Centralized styling for all payment screens
**Exports:** Object with style groups
**Style Categories:**

#### Payment Methods Styles
- `methodCard` - Payment method display card
- `methodHeader` - Card brand and expiry info
- `methodActions` - Button group for actions
- `methodButton` - Set default/remove buttons
- `defaultBadge` - "Default" indicator

#### Wallet Styles
- `earningsCard` - Gradient earning cards
- `statsRow` - Available/pending balance display
- `setupBox` - Setup prompt banner
- `payoutButton` - Request payout button
- `historySection` - Recent transactions list

#### Transaction History Styles
- `filterButton` - Filter type buttons
- `transactionItem` - Individual transaction row
- `transactionAmount` - Amount with color coding
- `summaryFooter` - Total summary

#### Payout Setup Styles
- `setupContainer` - Main layout container
- `form` - Form container
- `formGroup` - Individual form field
- `formInput` - Text input field
- `businessTypeButtons` - Business type selection
- `setupPrimaryButton` - Main CTA button
- `setupSecondaryButton` - Secondary action button

#### Common Styles
- `header` - Screen header
- `emptyState` - Empty state display
- `infoBox` - Information banner
- `filterScroll` - Horizontal filter scroll
- Colors, typography, spacing guidelines

**Color Palette:**
- Primary: `#FF6B35` (Orange)
- Success: `#27AE60` (Green)
- Warning: `#F39C12` (Yellow)
- Error: `#E74C3C` (Red)
- Info: `#3498DB` (Blue)
- Text: `#2C3E50` (Dark)
- Muted: `#95A5A6` (Gray)

## Navigation Integration

### `src/navigation/AppNavigator.jsx` (modifications)
**Changes Made:**
1. Import payment screens:
   ```javascript
   import PaymentMethodsScreen from '../screens/payment/PaymentMethodsScreen';
   import WalletScreen from '../screens/payment/WalletScreen';
   import TransactionHistoryScreen from '../screens/payment/TransactionHistoryScreen';
   import PayoutSetupScreen from '../screens/payment/PayoutSetupScreen';
   ```

2. Added to PROVIDER stack:
   ```javascript
   <Stack.Screen name="Wallet" component={WalletScreen} />
   <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
   <Stack.Screen name="PayoutSetup" component={PayoutSetupScreen} />
   ```

3. Payment methods already exists in both stacks

**Routing Structure:**
```
ProviderTabs
  └─ Earnings tab → ProviderEarningsScreen (redirects to Wallet)
      └─ Wallet → WalletScreen
          ├─ TransactionHistory → TransactionHistoryScreen
          └─ PayoutSetup → PayoutSetupScreen

ClientTabs
  └─ Profile tab → ClientProfileScreen
      └─ PaymentMethods → PaymentMethodsScreen
```

---

## Screen Components Redirected

### `src/screens/provider/ProviderEarningsScreen.jsx` (updated)
**Original:** Full earnings dashboard with real-time data
**Updated:** Simple redirect component
**Current Behavior:**
```javascript
useEffect(() => {
  navigation.replace('Wallet');
}, [navigation]);
```
**Result:** Earnings tab now opens new WalletScreen

---

## Documentation Files

### `PAYMENT_INTEGRATION_GUIDE.md` (500+ lines)
**Content:** Complete backend setup guide for Stripe integration
**Sections:**
- Overview of system architecture
- Backend dependencies installation
- Environment variables setup
- Express server configuration
- Stripe API endpoint implementations
- Webhook handler setup
- Firestore integration helpers
- Frontend usage examples
- Testing procedures
- Deployment instructions
- Fee structure explanation
- Security considerations
- Troubleshooting guide

**Audience:** Backend developers

**Key Topics:**
- Stripe Secret Key configuration
- Creating customers and payment methods
- Processing payments and payouts
- Handling webhooks
- Recording transactions in Firestore
- Connected accounts for providers

---

### `PAYMENT_IMPLEMENTATION_SUMMARY.md` (400+ lines)
**Content:** Technical overview and implementation details
**Sections:**
- Files created and their purposes
- Database schema extensions
- Integration with existing screens
- API integration points
- Fee structure
- Security features
- Testing procedures
- Deployment checklist
- Known limitations
- Future enhancements
- Error handling guide
- File modification list
- Next steps

**Audience:** Project leads, developers, architects

---

### `PAYMENT_QUICK_START.md` (300+ lines)
**Content:** Quick reference guide for using payment features
**Sections:**
- What's new overview
- Client instructions (add payment, pay, view history)
- Provider instructions (setup, check earnings, request payout)
- Fee structure summary
- Test card numbers
- Test scenarios for both roles
- Common issues and solutions
- Environment setup
- Support contacts
- Next steps checklist
- File list

**Audience:** Developers, testers, product managers

---

## Database Schema Additions

### Firestore Collections Modified

#### `users` collection
**New Fields:**
```
{
  stripeCustomerId: string,           // For client payments
  stripeConnectedAccountId: string,   // For provider payouts
  totalEarnings: number,              // Sum of all earnings
  pendingPayout: number,              // Waiting to be paid
  lastPayoutDate: timestamp,          // Last successful payout
}
```

#### `bookings` collection
**New Fields:**
```
{
  paid: boolean,                      // Payment received
  paymentId: string,                  // Stripe charge ID
  paidAt: timestamp,                  // Payment timestamp
  refunded: boolean,                  // If refunded
  refundedAt: timestamp,              // Refund timestamp
}
```

#### `transactions` collection (new)
```
{
  bookingId: string,
  clientId: string,
  providerId: string,
  type: enum('charge', 'payout', 'refund'),
  amount: number,
  currency: string,
  stripeTransactionId: string,
  stripePayout Id: string,
  stripeRefundId: string,
  status: enum('completed', 'pending', 'failed', 'refunded'),
  description: string,
  bookingIds: array,
  refundReason: string,
  createdAt: timestamp,
  refundedAt: timestamp,
  metadata: object,
}
```

---

## Configuration

### Environment Variables Required
```
REACT_APP_PAYMENT_API_URL=https://your-backend.com/api
```

### Backend Environment Variables
```
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=xxxxx
FIREBASE_CLIENT_EMAIL=xxxxx@xxxxx.iam.gserviceaccount.com
NODE_ENV=production
```

---

## Deployment Checklist

- [ ] Backend API deployed
- [ ] Environment variables configured
- [ ] Stripe live credentials set
- [ ] Webhooks configured in Stripe
- [ ] Payment screens tested with test cards
- [ ] Provider payout account tested
- [ ] Transaction records verified in Firestore
- [ ] Firestore rules configured
- [ ] Error handling tested
- [ ] User notifications setup
- [ ] Support process documented

---

## Testing

### Test Cards
- Visa: `4242 4242 4242 4242`
- Mastercard: `5555 5555 5555 4444`
- Amex: `378282246310005`
- All use any future date and any 3-digit CVC

### Test Flows
1. Client payment flow (booking → payment → history)
2. Provider setup flow (setup account → complete job → payout)
3. Refund flow (charge → refund → status update)

---

## File Statistics

| File | Lines | Type | Status |
|------|-------|------|--------|
| paymentService.js | 320 | Service | ✅ Complete |
| PaymentMethodsScreen.jsx | 170 | Component | ✅ Complete |
| WalletScreen.jsx | 290 | Component | ✅ Complete |
| TransactionHistoryScreen.jsx | 240 | Component | ✅ Complete |
| PayoutSetupScreen.jsx | 310 | Component | ✅ Complete |
| paymentStyles.js | 520 | Styles | ✅ Complete |
| AppNavigator.jsx | Updated | Navigation | ✅ Complete |
| ProviderEarningsScreen.jsx | Updated | Component | ✅ Complete |
| PAYMENT_INTEGRATION_GUIDE.md | 500+ | Docs | ✅ Complete |
| PAYMENT_IMPLEMENTATION_SUMMARY.md | 400+ | Docs | ✅ Complete |
| PAYMENT_QUICK_START.md | 300+ | Docs | ✅ Complete |

**Total New Code:** ~2,500 lines
**Total Documentation:** ~1,200 lines

---

## Related Documentation

- **[FIRESTORE_RULES_GUIDE.md](FIRESTORE_RULES_GUIDE.md)** - Security rules deployment
- **[REALTIME_FEATURES_GUIDE.md](REALTIME_FEATURES_GUIDE.md)** - Real-time notifications
- **[firestore.rules](firestore.rules)** - Firestore security rules (includes payment access control)

---

**Status:** ✅ All payment system files created and documented
**Next:** Deploy backend and configure Stripe
