# Payment System Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        REACT NATIVE APP                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐         ┌──────────────────────┐    │
│  │  CLIENT SIDE         │         │  PROVIDER SIDE       │    │
│  ├──────────────────────┤         ├──────────────────────┤    │
│  │ • PaymentMethods     │         │ • Wallet Dashboard   │    │
│  │ • Booking Checkout   │         │ • TransactionHistory │    │
│  │ • Transaction View   │         │ • PayoutSetup        │    │
│  │ • Order Confirmation │         │ • Earnings Tracking  │    │
│  └──────────────────────┘         └──────────────────────┘    │
│           │                                 │                  │
│           └─────────────┬───────────────────┘                  │
│                         ▼                                       │
│          ┌──────────────────────────────┐                     │
│          │   paymentService.js          │                     │
│          │  (API Service Layer)         │                     │
│          ├──────────────────────────────┤                     │
│          │ • processBookingPayment()    │                     │
│          │ • processProviderPayout()    │                     │
│          │ • getTransactionHistory()    │                     │
│          │ • createConnectedAccount()   │                     │
│          │ • calculateEarnings()        │                     │
│          └──────────────────────────────┘                     │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼ HTTP Requests
         ┌────────────────────────────────────┐
         │   BACKEND NODE.JS/EXPRESS API      │
         ├────────────────────────────────────┤
         │  /api/stripe/charge                │
         │  /api/stripe/payout                │
         │  /api/stripe/refund                │
         │  /api/stripe/payment-methods       │
         │  /api/stripe/webhooks              │
         └────────────────────────────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
         ┌─────────┐ ┌────────┐ ┌─────────────┐
         │ STRIPE  │ │FIREBASE│ │  BANK       │
         │  API    │ │DATABASE│ │ ACCOUNTS    │
         │         │ │        │ │             │
         │ • Charge│ │• Users │ │• Transfer   │
         │ • Payout│ │• Orders│ │  Money      │
         │ • Refund│ │• Txns  │ │             │
         └─────────┘ └────────┘ └─────────────┘
```

## Payment Flow Diagrams

### Client Payment Flow

```
┌─────────────┐
│ Client      │
│ Browse      │
│ Services    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ SELECT PROVIDER &       │
│ SERVICE DETAILS         │
│                         │
│ • Service Type          │
│ • Location              │
│ • Date & Time           │
│ • Price                 │
└──────┬──────────────────┘
       │
       ▼
┌──────────────────────────┐
│ CONFIRM BOOKING &        │
│ ENTER PAYMENT METHOD     │
│                          │
│ • Select card from list  │
│ • Or add new card        │
│ • Review amount          │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ PROCESS PAYMENT          │
│                          │
│ Backend calls:           │
│ stripe.paymentIntents    │
│ .create({...})           │
└──────┬───────────────────┘
       │
       ├─ SUCCESS ──┐
       │            │
       ▼            ▼
┌─────────────┐ ┌──────────────────┐
│ UPDATE      │ │ RECORD IN        │
│ BOOKING     │ │ FIRESTORE        │
│ STATUS      │ │                  │
│             │ │ transactions {    │
│ paid: true  │ │  status: ok      │
│ paidAt: now │ │  amount: 1000    │
└────┬────────┘ │  provider: paid  │
     │          │ }                │
     └─────┬────┘
           │
           ▼
┌──────────────────────────┐
│ SEND CONFIRMATION        │
│ TO CLIENT & PROVIDER     │
│                          │
│ • Booking confirmed      │
│ • Receipt generated      │
│ • Payment received       │
└──────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│ CLIENT VIEWS             │
│ TRANSACTION HISTORY      │
│                          │
│ • See charge +₱1,000     │
│ • View receipt           │
│ • Download invoice       │
└──────────────────────────┘
```

### Provider Earnings & Payout Flow

```
┌─────────────────────┐
│ PROVIDER            │
│ COMPLETES JOBS      │
│                     │
│ Job 1: +₱950        │
│ Job 2: +₱1,425      │
│ Job 3: +₱1,900      │
└────────┬────────────┘
         │
         ▼
┌─────────────────────────────┐
│ EARNINGS ACCUMULATE         │
│ (5% SERVICE FEE DEDUCTED)    │
│                             │
│ Total: ₱4,275               │
│ (Before fees: ₱4,500)       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ PROVIDER CHECKS WALLET      │
│                             │
│ • Total Earnings: ₱4,275    │
│ • This Month: ₱2,100        │
│ • Available: ₱3,500         │
│ • Pending: ₱775             │
└────────┬────────────────────┘
         │
         ├─ NOT YET SETUP ──┐
         │                  │
         ▼                  ▼
┌───────────────────┐ ┌────────────────────┐
│ SETUP ACCOUNT     │ │ ALREADY SETUP      │
│                   │ │ (SKIP SETUP)       │
│ 3-Step Wizard:    │ │                    │
│ 1. Intro          │ │ Can request payout │
│ 2. Details        │ │ immediately        │
│ 3. Success        │ └────────────────────┘
└─────┬─────────────┘
      │
      ▼
┌──────────────────────────┐
│ STRIPE CONNECT           │
│ ONBOARDING               │
│                          │
│ • Verify identity        │
│ • Link bank account      │
│ • Complete profile       │
└─────┬────────────────────┘
      │
      ▼
┌──────────────────────────┐
│ ACCOUNT LINKED           │
│ PAYOUT READY             │
└─────┬────────────────────┘
      │
      ▼
┌──────────────────────────┐
│ REQUEST PAYOUT           │
│                          │
│ • Balance ≥ ₱100         │
│ • Confirm amount         │
│ • Tap "Request Payout"   │
└─────┬────────────────────┘
      │
      ▼
┌────────────────────────────┐
│ BACKEND PROCESSES          │
│                            │
│ stripe.payouts.create({    │
│   amount: 350000,          │
│   currency: 'PHP'          │
│ })                         │
└─────┬──────────────────────┘
      │
      ▼
┌──────────────────────────┐
│ STRIPE PROCESSES PAYOUT  │
│                          │
│ • Validates amount       │
│ • Initiates transfer     │
│ • Status: processing     │
└─────┬────────────────────┘
      │
      ├─ 2-3 BUSINESS DAYS ──┐
      │                      │
      ▼                      ▼
┌──────────────────┐  ┌─────────────────────┐
│ MONEY IN BANK    │  │ PROVIDER RECEIVES   │
│ ACCOUNT          │  │ NOTIFICATION        │
│                  │  │                     │
│ Status: Complete │  │ "Payout received"   │
│ Amount: ₱3,500   │  │ "₱3,500 transferred"│
└──────────────────┘  └─────────────────────┘
       │
       ▼
┌──────────────────────────┐
│ VIEW TRANSACTION         │
│ HISTORY                  │
│                          │
│ • Payout: -₱3,500        │
│ • Status: Complete       │
│ • Date: Jan 15, 2024     │
│ • Bank: RCBC ***1234     │
└──────────────────────────┘
```

## Data Structure Flow

```
USER PAYMENT SETUP
┌─────────────────────────────────────┐
│ users (Firestore)                   │
├─────────────────────────────────────┤
│ id: "client123"                     │
│ email: "client@email.com"           │
│ role: "CLIENT"                      │
│ stripeCustomerId: "cus_xxxxx"       │ ◄─ For charging
│                                     │
│ id: "provider456"                   │
│ email: "provider@email.com"         │
│ role: "PROVIDER"                    │
│ stripeConnectedAccountId: "acct_xxx"│ ◄─ For payouts
│ totalEarnings: 15250.50             │
│ pendingPayout: 2100.00              │
│ lastPayoutDate: 2024-01-15          │
└─────────────────────────────────────┘

BOOKING & PAYMENT
┌──────────────────────────────────────────────┐
│ bookings (Firestore)                         │
├──────────────────────────────────────────────┤
│ id: "booking789"                             │
│ clientId: "client123"                        │
│ providerId: "provider456"                    │
│ serviceCategory: "Plumbing"                  │
│ amount: 2500.00                              │
│ status: "completed"                          │
│ paid: true                          ◄─ Payment done
│ paymentId: "pi_xxxxx"               ◄─ Stripe charge ID
│ paidAt: 2024-01-10T14:30:00Z        │
│ completedAt: 2024-01-12T16:45:00Z   │
└──────────────────────────────────────────────┘

TRANSACTION RECORDS
┌────────────────────────────────────────────────┐
│ transactions (Firestore)                       │
├────────────────────────────────────────────────┤
│ TYPE: CHARGE                                   │
│ id: "txn_charge_001"                          │
│ bookingId: "booking789"                       │
│ clientId: "client123"                         │
│ providerId: "provider456"                     │
│ type: "charge"                                │
│ amount: 2500.00                               │
│ currency: "PHP"                               │
│ stripeTransactionId: "pi_xxxxx"               │
│ status: "completed"                           │
│ createdAt: 2024-01-10T14:30:00Z              │
│                                               │
│ TYPE: PAYOUT                                  │
│ id: "txn_payout_001"                          │
│ providerId: "provider456"                     │
│ type: "payout"                                │
│ amount: 7500.00                               │
│ currency: "PHP"                               │
│ stripePayout Id: "po_xxxxx"                   │
│ status: "completed"                           │
│ bookingIds: ["booking789", ...]               │
│ createdAt: 2024-01-15T10:00:00Z              │
│                                               │
│ TYPE: REFUND                                  │
│ id: "txn_refund_001"                          │
│ type: "refund"                                │
│ stripeTransactionId: "pi_xxxxx"               │
│ stripeRefundId: "re_xxxxx"                    │
│ status: "completed"                           │
│ refundReason: "requested_by_customer"         │
│ createdAt: 2024-01-20T09:15:00Z              │
└────────────────────────────────────────────────┘
```

## App Navigation Structure

```
CLIENT APP
├─ Home Tab
│  ├─ Search providers
│  ├─ Browse services
│  └─ Book service ──┬─> PaymentMethodsScreen
│
├─ Bookings Tab
│  ├─ Upcoming bookings
│  ├─ In progress
│  └─ Completed ──────> Review screen
│
├─ Messages Tab
│  └─ Chat with providers
│
└─ Profile Tab
   ├─ Profile info
   ├─ Edit profile
   ├─ Addresses
   ├─ Favorites
   ├─ Payment Methods ──┬─> Add new card
   │                   ├─> Remove card
   │                   └─> Set default
   ├─ Settings
   ├─ Help
   ├─ Terms
   └─ About

PROVIDER APP
├─ Dashboard Tab
│  ├─ Quick stats
│  ├─ Available jobs
│  └─ Job alerts
│
├─ Jobs Tab
│  ├─ Available
│  ├─ In progress
│  ├─ Completed
│  └─ Job details
│
├─ Messages Tab
│  └─ Chat with clients
│
├─ Earnings Tab
│  └─ Wallet Screen ──┬─> TransactionHistoryScreen
│                     ├─> View earnings
│                     ├─> Request payout
│                     └─> Setup account ──> PayoutSetupScreen
│                                         (3-step wizard)
│
└─ Profile Tab
   ├─ Profile info
   ├─ Edit profile
   ├─ Photos
   ├─ Service offered
   ├─ Addresses
   ├─ Settings
   ├─ Help
   ├─ Terms
   └─ About
```

## Security Model

```
┌─────────────────────────────────────────────────┐
│          FIRESTORE SECURITY RULES               │
├─────────────────────────────────────────────────┤
│                                                 │
│ /users/{userId}                                 │
│  ├─ Write: Only user can write own data        │
│  └─ Read: Only user can read own data          │
│                                                 │
│ /transactions/{transactionId}                   │
│  ├─ Write: Only backend (Cloud Functions)      │
│  ├─ Read: User can read own transactions       │
│  └─ Immutable: Cannot update after creation    │
│                                                 │
│ /bookings/{bookingId}                           │
│  ├─ Payment fields (paid, paymentId):          │
│  │  └─ Read/Write: Only backend                │
│  └─ Status fields:                              │
│     ├─ Client: Cannot write status              │
│     ├─ Provider: Can only write completion      │
│     └─ Admin: Full access                       │
│                                                 │
│ PAYMENT DATA ENCRYPTION                         │
│  ├─ Cards: Stored in Stripe only (never app)   │
│  ├─ Amounts: Validated on backend               │
│  ├─ IDs: Stripe tokens (not real card data)    │
│  └─ Transmission: HTTPS only                    │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│        STRIPE SECURITY FEATURES                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ • PCI Level 1 Certification                     │
│ • Tokenization (no full card storage)           │
│ • Webhook signature verification                │
│ • API key rotation support                      │
│ • Fraud detection                               │
│ • Chargebacks management                        │
│ • Payout verification                           │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│       PAYMENT VALIDATION FLOW                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ Client Request ──┐                              │
│                  ▼                               │
│         VALIDATE INPUT                          │
│         • Amount > 0                            │
│         • Currency valid                        │
│         • Card exists                           │
│                  │                               │
│         ✓ Pass ──┼─── ✗ Fail ──> Reject       │
│         │        │                ▲             │
│         ▼        └─────────────────┘             │
│    BACKEND VALIDATION                           │
│    • Double-check amount                        │
│    • Verify user permissions                    │
│    • Check rate limits                          │
│         │                                       │
│         ├─ Pass ──┐                             │
│         └─ Fail ──┤                             │
│                   ▼                             │
│            STRIPE PROCESSING                    │
│            (Encrypted end-to-end)               │
│                   │                             │
│         ┌─────────┴─────────┐                   │
│         ▼                   ▼                    │
│    SUCCESS               FAILED                 │
│    • Record txn       • Log error               │
│    • Update booking   • Notify user             │
│    • Notify parties   • Retry logic             │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Error Handling Flow

```
                   PAYMENT REQUEST
                        │
                        ▼
            ┌─────────────────────────┐
            │  INPUT VALIDATION       │
            │  • Required fields ok?  │
            │  • Amount valid?        │
            │  • User authenticated?  │
            └────────┬────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
    INVALID      VALID        ERROR
        │            │            │
        ▼            ▼            ▼
      ERROR    BACKEND CHECK   EXCEPTION
        │            │            │
        │            ▼            │
        │    ┌───────────────┐    │
        │    │ Amount valid? │    │
        │    │ Rate limited? │    │
        │    │ User exists?  │    │
        │    └───┬───────────┘    │
        │        │                │
        │    PASS / FAIL           │
        │    │       │             │
        └──┬─┘       │             │
           │         ▼             │
           │    STRIPE CHARGE      │
           │         │             │
           │    SUCCESS/FAIL       │
           │    │       │          │
           │    ▼       ▼          │
           │   RECORD  UPDATE      │
           │   TXN     STATUS      │
           │    │       │          │
           └────┴───┬───┴──────────┘
                    │
                    ▼
          ┌─────────────────────┐
          │  NOTIFY CLIENT &    │
          │  PROVIDER           │
          │                     │
          │  Success/Failure    │
          │  Error Message      │
          │  Support Contact    │
          └─────────────────────┘
```

---

**Complete payment system architecture with detailed data flows and security model.**
