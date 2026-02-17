# Entity-Relationship Diagram (ERD)
## General Service System - Maasin City

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GSS MAASIN - ER DIAGRAM                              │
└─────────────────────────────────────────────────────────────────────────────┘


                              ┌──────────────────────────┐
                              │        USERS             │
                              │ ──────────────────────── │
                              │ PK: uid                  │
                              │ ──────────────────────── │
                              │    email                 │
                              │    password (hashed)     │
                              │    firstName             │
                              │    middleName            │
                              │    lastName              │
                              │    suffix                │
                              │    phoneNumber           │
                              │    dateOfBirth           │
                              │    profilePhoto          │
                              │    role (ENUM)           │
                              │    streetAddress         │
                              │    houseNumber           │
                              │    barangay              │
                              │    landmark              │
                              │    city                  │
                              │    province              │
                              │    latitude              │
                              │    longitude             │
                              │    createdAt             │
                              │    updatedAt             │
                              └──┬────────────┬──────┬───┘
                                 │            │      │
                    ┌────────────┘            │      └──────────────┐
                    │                         │                     │
                    │ IS-A                    │ IS-A                │ IS-A
                    │ (1:1)                   │ (1:1)               │ (1:1)
                    │                         │                     │
         ┌──────────▼──────────┐   ┌─────────▼──────────┐   ┌──────▼──────────┐
         │    CLIENTS          │   │    PROVIDERS       │   │    ADMINS       │
         │ ─────────────────── │   │ ────────────────── │   │ ─────────────── │
         │ PK: uid (FK)        │   │ PK: uid (FK)       │   │ PK: uid (FK)    │
         │ ─────────────────── │   │ ────────────────── │   │ ─────────────── │
         │    favorites[]      │   │  serviceCategory   │   │  permissions[]  │
         └──────┬──────────────┘   └─────┬──────────────┘   └─────────────────┘
                │                        │
                │ Creates                │ Accepts
                │ (1:M)                  │ (1:M)
                │                        │
                └────────┐      ┌────────┘
                         │      │
                         ▼      ▼
              ┌──────────────────────────────┐
              │       BOOKINGS               │◄──────────────┐
              │ ──────────────────────────── │               │
              │ PK: bookingId                │               │ Approves
              │ ──────────────────────────── │               │ (1:M)
              │ FK: clientId                 │               │
              │ FK: providerId               │               │
              │    serviceCategory           │         ┌─────┴─────┐
              │    serviceDescription        │         │  ADMINS   │
              │    scheduledDate             │         └───────────┘
              │    scheduledTime             │
              │    status (ENUM)             │
              │    adminApproved             │
              │    amount                    │
              │    paymentStatus             │
              │    createdAt                 │
              └──┬────────────┬──────────────┘
                 │            │
                 │ Has        │ Generates
                 │ (1:0..1)   │ (1:1)
                 │            │
                 ▼            ▼
    ┌────────────────────┐  ┌──────────────────────┐
    │     REVIEWS        │  │   TRANSACTIONS       │
    │ ────────────────── │  │ ──────────────────── │
    │ PK: reviewId       │  │ PK: transactionId    │
    │ ────────────────── │  │ ──────────────────── │
    │ FK: bookingId      │  │ FK: bookingId        │
    │ FK: clientId       │  │ FK: clientId         │
    │ FK: providerId     │  │ FK: providerId       │
    │    rating          │  │    amount            │
    │    comment         │  │    type              │
    │    createdAt       │  │    status            │
    └────────────────────┘  │    paymentMethod     │
                            │    createdAt         │
                            └──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                      MESSAGING SYSTEM                                    │
└─────────────────────────────────────────────────────────────────────────┘

         ┌──────────────────────────┐
         │        USERS             │
         └──────────┬───────────────┘
                    │
                    │ Participates
                    │ (M:M)
                    │
                    ▼
         ┌──────────────────────────┐
         │    CONVERSATIONS         │
         │ ──────────────────────── │
         │ PK: conversationId       │
         │ ──────────────────────── │
         │    participants[]        │
         │    lastMessage           │
         │    lastMessageTime       │
         │    unreadCount {}        │
         │    createdAt             │
         └──────────┬───────────────┘
                    │
                    │ Contains
                    │ (1:M)
                    │
                    ▼
         ┌──────────────────────────┐
         │       MESSAGES           │
         │ ──────────────────────── │
         │ PK: messageId            │
         │ ──────────────────────── │
         │ FK: conversationId       │
         │ FK: senderId             │
         │    text                  │
         │    read                  │
         │    type                  │
         │    createdAt             │
         └──────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                      NOTIFICATION SYSTEM                                 │
└─────────────────────────────────────────────────────────────────────────┘

         ┌──────────────────────────┐
         │        USERS             │
         └──┬───────────────┬───────┘
            │               │
            │ Receives      │ Has
            │ (1:M)         │ (1:M)
            │               │
            ▼               ▼
┌───────────────────┐  ┌──────────────────────┐
│  NOTIFICATIONS    │  │   DEVICE_TOKENS      │
│ ───────────────── │  │ ──────────────────── │
│ PK: notificationId│  │ PK: tokenId          │
│ ───────────────── │  │ ──────────────────── │
│ FK: userId        │  │ FK: userId           │
│    title          │  │    token             │
│    body           │  │    platform          │
│    type           │  │    createdAt         │
│    read           │  └──────────────────────┘
│    createdAt      │
└───────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                      PAYMENT SYSTEM                                      │
└─────────────────────────────────────────────────────────────────────────┘

         ┌──────────────────────────┐
         │      PROVIDERS           │
         └──┬───────────────┬───────┘
            │               │
            │ Has           │ Requests
            │ (1:M)         │ (1:M)
            │               │
            ▼               ▼
┌───────────────────┐  ┌──────────────────────┐
│ PAYOUT_ACCOUNTS   │  │  PAYOUT_REQUESTS     │
│ ───────────────── │  │ ──────────────────── │
│ PK: accountId     │◄─┤ PK: payoutId         │
│ ───────────────── │  │ ──────────────────── │
│ FK: providerId    │  │ FK: providerId       │
│    accountType    │  │ FK: accountId        │
│    accountName    │  │    amount            │
│    accountNumber  │  │    status            │
│    isDefault      │  │    requestedAt       │
└───────────────────┘  │    processedAt       │
                       └──────────────────────┘
                                  ▲
                                  │
                                  │ Processes
                                  │ (1:M)
                                  │
                       ┌──────────┴───────────┐
                       │      ADMINS          │
                       └──────────────────────┘


         ┌──────────────────────────┐
         │        USERS             │
         └──────────┬───────────────┘
                    │
                    │ Has
                    │ (1:M)
                    │
                    ▼
         ┌──────────────────────────┐
         │   PAYMENT_METHODS        │
         │ ──────────────────────── │
         │ PK: methodId             │
         │ ──────────────────────── │
         │ FK: userId               │
         │    type                  │
         │    name                  │
         │    accountNumber         │
         │    isDefault             │
         └──────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                      GAMIFICATION SYSTEM                                 │
└─────────────────────────────────────────────────────────────────────────┘

         ┌──────────────────────────┐
         │        USERS             │
         └──────────┬───────────────┘
                    │
                    │ Has
                    │ (1:1)
                    │
                    ▼
         ┌──────────────────────────┐
         │    GAMIFICATION          │
         │ ──────────────────────── │
         │ PK: gamificationId       │
         │ ──────────────────────── │
         │ FK: userId               │
         │    points                │
         │    level                 │
         │    tier                  │
         │    badges[]              │
         │    achievements[]        │
         │    streak                │
         │    totalBookings         │
         │    createdAt             │
         └──────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│                         RELATIONSHIPS SUMMARY                             │
└──────────────────────────────────────────────────────────────────────────┘

1. USERS (1) ──── Specializes ──── (1) CLIENTS
2. USERS (1) ──── Specializes ──── (1) PROVIDERS
3. USERS (1) ──── Specializes ──── (1) ADMINS
4. CLIENTS (1) ──── Creates ──── (*) BOOKINGS
5. PROVIDERS (1) ──── Accepts ──── (*) BOOKINGS
6. BOOKINGS (1) ──── Has ──── (0..1) REVIEWS
7. USERS (1) ──── Participates ──── (*) CONVERSATIONS
8. CONVERSATIONS (1) ──── Contains ──── (*) MESSAGES
9. USERS (1) ──── Receives ──── (*) NOTIFICATIONS
10. USERS (1) ──── Has ──── (*) DEVICE_TOKENS
11. BOOKINGS (1) ──── Generates ──── (1) TRANSACTIONS
12. PROVIDERS (1) ──── Has ──── (*) PAYOUT_ACCOUNTS
13. PROVIDERS (1) ──── Requests ──── (*) PAYOUT_REQUESTS
14. USERS (1) ──── Has ──── (*) PAYMENT_METHODS
15. USERS (1) ──── Has ──── (1) GAMIFICATION


┌──────────────────────────────────────────────────────────────────────────┐
│                         CARDINALITY NOTATION                              │
└──────────────────────────────────────────────────────────────────────────┘

1   = Exactly one
0..1 = Zero or one (optional)
*   = Zero or many
1..* = One or many


┌──────────────────────────────────────────────────────────────────────────┐
│                         ENUM DEFINITIONS                                  │
└──────────────────────────────────────────────────────────────────────────┘

ROLE:
  - CLIENT
  - PROVIDER
  - ADMIN

BOOKING_STATUS:
  - pending (awaiting admin approval)
  - approved (admin approved, awaiting provider)
  - accepted (provider accepted)
  - traveling (provider on the way)
  - arrived (provider at location)
  - in_progress (work started)
  - completed (work finished)
  - cancelled (booking cancelled)
  - rejected (provider rejected)

PROVIDER_STATUS:
  - pending (awaiting admin approval)
  - approved (active provider)
  - rejected (application rejected)
  - suspended (temporarily disabled)

PAYMENT_STATUS:
  - pending
  - paid
  - failed
  - refunded

TRANSACTION_TYPE:
  - payment (client pays for service)
  - payout (provider receives earnings)
  - refund (money returned to client)

PAYOUT_STATUS:
  - pending (awaiting admin review)
  - approved (admin approved)
  - rejected (admin rejected)
  - completed (money transferred)

TIER:
  - bronze (0-999 points)
  - silver (1000-2499 points)
  - gold (2500-4999 points)
  - platinum (5000-9999 points)
  - diamond (10000+ points)

PLATFORM:
  - android
  - ios
  - web

MESSAGE_TYPE:
  - text
  - image
  - system


┌──────────────────────────────────────────────────────────────────────────┐
│                         KEY CONSTRAINTS                                   │
└──────────────────────────────────────────────────────────────────────────┘

PRIMARY KEYS (PK):
- Uniquely identify each record in a table
- Cannot be NULL
- Must be unique

FOREIGN KEYS (FK):
- Reference primary keys in other tables
- Enforce referential integrity
- Can be NULL (for optional relationships)

UNIQUE CONSTRAINTS:
- users.email (unique)
- users.phoneNumber (unique)
- device_tokens.token (unique per user)

INDEXES:
- bookings.clientId
- bookings.providerId
- bookings.status
- bookings.scheduledDate
- messages.conversationId
- messages.createdAt
- notifications.userId
- notifications.read
- transactions.bookingId
- reviews.providerId
- gamification.userId


┌──────────────────────────────────────────────────────────────────────────┐
│                         BUSINESS RULES                                    │
└──────────────────────────────────────────────────────────────────────────┘

1. A user can only have ONE role (CLIENT, PROVIDER, or ADMIN)
2. A booking must be approved by admin before provider can accept
3. A provider must be approved before receiving job requests
4. A review can only be created after booking is completed
5. Payment must be completed before booking is confirmed
6. Provider can only request payout for completed bookings
7. Minimum payout amount is ₱100
8. OTP expires after 5 minutes
9. Phone numbers must be unique and verified
10. Email addresses must be unique and verified
11. Providers must upload required documents (ID, clearances, selfie)
12. Clients earn points for completed bookings
13. Tier is automatically calculated based on points
14. Messages are soft-deleted (deletedBy field)
15. Conversations persist even if one user deletes them
```

---

## Database: Firebase Firestore (NoSQL)

**Collections:**
- `users` - All user accounts
- `bookings` - Service bookings/jobs
- `reviews` - Service reviews and ratings
- `conversations` - Chat conversations
- `conversations/{id}/messages` - Messages subcollection
- `notifications` - Push notifications
- `deviceTokens` - FCM device tokens
- `transactions` - Payment transactions
- `payoutAccounts` - Provider payout accounts
- `payoutRequests` - Provider payout requests
- `paymentMethods` - User payment methods
- `gamification` - User points and achievements

**Document Structure:**
- Each entity is stored as a document
- Relationships maintained through document IDs (foreign keys)
- Subcollections used for nested data (messages within conversations)
- Denormalization used for performance (e.g., participant details in conversations)

---

**Created:** December 2024  
**System:** General Service System - Maasin City  
**Database:** Firebase Firestore  
**Version:** 1.0
