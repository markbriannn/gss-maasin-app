# Complete Entity-Relationship Diagram (ERD)
## General Service System - Maasin City
### All Entities Connected

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          GSS MAASIN - COMPLETE ER DIAGRAM                                                                │
│                                          All Entities and Relationships                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


                                                    ┌──────────────────────────────────┐
                                                    │           USERS                  │
                                                    │ ──────────────────────────────── │
                                                    │ PK: uid                          │
                                                    │ ──────────────────────────────── │
                                                    │    email (unique)                │
                                                    │    password (hashed)             │
                                                    │    firstName                     │
                                                    │    middleName                    │
                                                    │    lastName                      │
                                                    │    suffix                        │
                                                    │    phoneNumber (unique)          │
                                                    │    dateOfBirth                   │
                                                    │    profilePhoto                  │
                                                    │    role (CLIENT/PROVIDER/ADMIN)  │
                                                    │    streetAddress                 │
                                                    │    barangay                      │
                                                    │    city, province                │
                                                    │    latitude, longitude           │
                                                    │    createdAt, updatedAt          │
                                                    └──┬────────┬──────────┬───────────┘
                                                       │        │          │
                                    ┌──────────────────┘        │          └──────────────────┐
                                    │                           │                             │
                                    │ IS-A (1:1)                │ IS-A (1:1)                  │ IS-A (1:1)
                                    │                           │                             │
                         ┌──────────▼──────────┐    ┌───────────▼──────────┐    ┌────────────▼─────────┐
                         │     CLIENTS         │    │     PROVIDERS        │    │      ADMINS          │
                         │ ─────────────────── │    │ ──────────────────── │    │ ──────────────────── │
                         │ PK: uid (FK)        │    │ PK: uid (FK)         │    │ PK: uid (FK)         │
                         │ ─────────────────── │    │ ──────────────────── │    │ ──────────────────── │
                         │    favorites[]      │    │  serviceCategory     │    │  permissions[]       │
                         └──┬──────────────────┘    │  aboutService        │    └──┬───────────────────┘
                            │                       │  yearsExperience     │       │
                            │                       │  priceType           │       │
                            │                       │  fixedPrice          │       │
                            │                       │  providerStatus      │       │
                            │                       │  rating              │       │
                            │                       │  averageRating       │       │
                            │                       │  reviewCount         │       │
                            │                       │  completedJobs       │       │
                            │                       │  isOnline            │       │
                            │                       │  documents {}        │       │
                            │                       └──┬───────────────────┘       │
                            │                          │                           │
                            │ Creates (1:M)            │ Accepts (1:M)             │ Approves (1:M)
                            │                          │                           │
                            └──────────────┐  ┌────────┘                           │
                                           │  │                                    │
                                           ▼  ▼                                    │
                                ┌──────────────────────────────┐                  │
                                │        BOOKINGS              │◄─────────────────┘
                                │ ──────────────────────────── │
                                │ PK: bookingId                │
                                │ ──────────────────────────── │
                                │ FK: clientId                 │
                                │ FK: providerId               │
                                │    serviceCategory           │
                                │    serviceDescription        │
                                │    scheduledDate             │
                                │    scheduledTime             │
                                │    status (ENUM)             │
                                │    adminApproved             │
                                │    adminApprovedBy (FK)      │
                                │    amount                    │
                                │    paymentStatus             │
                                │    paymentIntentId           │
                                │    clientLocation {}         │
                                │    providerLocation {}       │
                                │    createdAt, updatedAt      │
                                └──┬──────────┬────────────────┘
                                   │          │
                                   │          │ Generates (1:1)
                                   │          │
                                   │          ▼
                                   │    ┌──────────────────────────┐
                                   │    │    TRANSACTIONS          │
                                   │    │ ──────────────────────── │
                                   │    │ PK: transactionId        │
                                   │    │ ──────────────────────── │
                                   │    │ FK: bookingId            │
                                   │    │ FK: clientId             │
                                   │    │ FK: providerId           │
                                   │    │    amount                │
                                   │    │    type (payment/payout) │
                                   │    │    status                │
                                   │    │    paymentMethod         │
                                   │    │    paymentIntentId       │
                                   │    │    createdAt             │
                                   │    └──────────────────────────┘
                                   │
                                   │ Has (1:0..1)
                                   │
                                   ▼
                            ┌──────────────────────────┐
                            │       REVIEWS            │
                            │ ──────────────────────── │
                            │ PK: reviewId             │
                            │ ──────────────────────── │
                            │ FK: bookingId            │
                            │ FK: clientId             │
                            │ FK: providerId           │
                            │    rating (1-5)          │
                            │    comment               │
                            │    createdAt             │
                            └──────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                    MESSAGING SYSTEM                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                                    ┌──────────────────────────────────┐
                                                    │           USERS                  │
                                                    └──────────────┬───────────────────┘
                                                                   │
                                                                   │ Participates (M:M)
                                                                   │
                                                                   ▼
                                                    ┌──────────────────────────────────┐
                                                    │      CONVERSATIONS               │
                                                    │ ──────────────────────────────── │
                                                    │ PK: conversationId               │
                                                    │ ──────────────────────────────── │
                                                    │    participants[] (userIds)      │
                                                    │    participantDetails {}         │
                                                    │    lastMessage                   │
                                                    │    lastMessageTime               │
                                                    │    unreadCount {}                │
                                                    │    typing {}                     │
                                                    │    deletedBy {}                  │
                                                    │    createdAt, updatedAt          │
                                                    └──────────────┬───────────────────┘
                                                                   │
                                                                   │ Contains (1:M)
                                                                   │
                                                                   ▼
                                                    ┌──────────────────────────────────┐
                                                    │         MESSAGES                 │
                                                    │ ──────────────────────────────── │
                                                    │ PK: messageId                    │
                                                    │ ──────────────────────────────── │
                                                    │ FK: conversationId               │
                                                    │ FK: senderId (userId)            │
                                                    │    text                          │
                                                    │    read (boolean)                │
                                                    │    readAt                        │
                                                    │    type (text/image/system)      │
                                                    │    imageUrl                      │
                                                    │    createdAt                     │
                                                    └──────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                 NOTIFICATION SYSTEM                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                                    ┌──────────────────────────────────┐
                                                    │           USERS                  │
                                                    └──────┬───────────────┬───────────┘
                                                           │               │
                                                           │ Receives      │ Has
                                                           │ (1:M)         │ (1:M)
                                                           │               │
                                                           ▼               ▼
                                            ┌──────────────────────┐  ┌──────────────────────┐
                                            │   NOTIFICATIONS      │  │   DEVICE_TOKENS      │
                                            │ ──────────────────── │  │ ──────────────────── │
                                            │ PK: notificationId   │  │ PK: tokenId          │
                                            │ ──────────────────── │  │ ──────────────────── │
                                            │ FK: userId           │  │ FK: userId           │
                                            │    title             │  │    token (FCM)       │
                                            │    body              │  │    platform          │
                                            │    type              │  │    (android/ios/web) │
                                            │    data {}           │  │    createdAt         │
                                            │    read (boolean)    │  │    updatedAt         │
                                            │    readAt            │  └──────────────────────┘
                                            │    createdAt         │
                                            └──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                   PAYMENT SYSTEM                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────────────────────────┐                    ┌──────────────────────────────────┐
                                    │         PROVIDERS                │                    │           USERS                  │
                                    └──────┬───────────────┬───────────┘                    └──────────────┬───────────────────┘
                                           │               │                                               │
                                           │ Has           │ Requests                                      │ Has
                                           │ (1:M)         │ (1:M)                                         │ (1:M)
                                           │               │                                               │
                                           ▼               ▼                                               ▼
                            ┌──────────────────────┐  ┌──────────────────────┐              ┌──────────────────────────┐
                            │  PAYOUT_ACCOUNTS     │  │  PAYOUT_REQUESTS     │              │   PAYMENT_METHODS        │
                            │ ──────────────────── │  │ ──────────────────── │              │ ──────────────────────── │
                            │ PK: accountId        │◄─┤ PK: payoutId         │              │ PK: methodId             │
                            │ ──────────────────── │  │ ──────────────────── │              │ ──────────────────────── │
                            │ FK: providerId       │  │ FK: providerId       │              │ FK: userId               │
                            │    accountType       │  │ FK: accountId        │              │    type (gcash/card)     │
                            │    accountName       │  │    amount            │              │    name                  │
                            │    accountNumber     │  │    status            │              │    accountNumber         │
                            │    bankName          │  │    requestedAt       │              │    accountName           │
                            │    isDefault         │  │    processedAt       │              │    isDefault             │
                            │    createdAt         │  │    processedBy (FK)  │◄─────┐       │    createdAt             │
                            └──────────────────────┘  │    rejectionReason   │      │       └──────────────────────────┘
                                                      │    completedAt       │      │
                                                      │    referenceNumber   │      │
                                                      └──────────────────────┘      │
                                                                                    │
                                                                                    │ Processes (1:M)
                                                                                    │
                                                                         ┌──────────┴───────────┐
                                                                         │      ADMINS          │
                                                                         └──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                GAMIFICATION SYSTEM                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                                    ┌──────────────────────────────────┐
                                                    │           USERS                  │
                                                    └──────────────┬───────────────────┘
                                                                   │
                                                                   │ Has (1:1)
                                                                   │
                                                                   ▼
                                                    ┌──────────────────────────────────┐
                                                    │      GAMIFICATION                │
                                                    │ ──────────────────────────────── │
                                                    │ PK: gamificationId               │
                                                    │ ──────────────────────────────── │
                                                    │ FK: userId                       │
                                                    │    points                        │
                                                    │    level                         │
                                                    │    tier (bronze/silver/gold/     │
                                                    │          platinum/diamond)       │
                                                    │    badges[]                      │
                                                    │    achievements[]                │
                                                    │    streak                        │
                                                    │    lastActivityDate              │
                                                    │    totalBookings                 │
                                                    │    totalSpent                    │
                                                    │    createdAt, updatedAt          │
                                                    └──────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                            RELATIONSHIP SUMMARY                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

CORE RELATIONSHIPS:
1.  USERS (1) ──IS-A──> (1) CLIENTS
2.  USERS (1) ──IS-A──> (1) PROVIDERS
3.  USERS (1) ──IS-A──> (1) ADMINS
4.  CLIENTS (1) ──Creates──> (M) BOOKINGS
5.  PROVIDERS (1) ──Accepts──> (M) BOOKINGS
6.  ADMINS (1) ──Approves──> (M) BOOKINGS
7.  BOOKINGS (1) ──Has──> (0..1) REVIEWS
8.  BOOKINGS (1) ──Generates──> (1) TRANSACTIONS

MESSAGING RELATIONSHIPS:
9.  USERS (M) ──Participates──> (M) CONVERSATIONS
10. CONVERSATIONS (1) ──Contains──> (M) MESSAGES
11. USERS (1) ──Sends──> (M) MESSAGES

NOTIFICATION RELATIONSHIPS:
12. USERS (1) ──Receives──> (M) NOTIFICATIONS
13. USERS (1) ──Has──> (M) DEVICE_TOKENS

PAYMENT RELATIONSHIPS:
14. PROVIDERS (1) ──Has──> (M) PAYOUT_ACCOUNTS
15. PROVIDERS (1) ──Requests──> (M) PAYOUT_REQUESTS
16. PAYOUT_REQUESTS (M) ──Uses──> (1) PAYOUT_ACCOUNTS
17. ADMINS (1) ──Processes──> (M) PAYOUT_REQUESTS
18. USERS (1) ──Has──> (M) PAYMENT_METHODS

GAMIFICATION RELATIONSHIPS:
19. USERS (1) ──Has──> (1) GAMIFICATION


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              CARDINALITY LEGEND                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

1     = Exactly one (mandatory)
0..1  = Zero or one (optional)
M     = Many (zero or more)
1..M  = One or many (at least one)

RELATIONSHIP TYPES:
─────>  = One-to-Many
◄────>  = Many-to-Many
──IS-A─> = Inheritance/Specialization


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              KEY CONSTRAINTS                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

PRIMARY KEYS (PK):
- Uniquely identify each record
- Cannot be NULL
- Must be unique within the table

FOREIGN KEYS (FK):
- Reference primary keys in other tables
- Enforce referential integrity
- Can be NULL for optional relationships

UNIQUE CONSTRAINTS:
- users.email
- users.phoneNumber
- device_tokens.token (per user)

COMPOSITE KEYS:
- conversations.participants[] (array of user IDs)
- notifications.userId + createdAt (for ordering)


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              BUSINESS RULES                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

USER RULES:
1. Each user has exactly ONE role (CLIENT, PROVIDER, or ADMIN)
2. Email and phone number must be unique across all users
3. Phone numbers must be verified via OTP
4. Email addresses must be verified via code

BOOKING RULES:
5. Bookings must be approved by admin before provider can accept
6. Only approved providers can accept bookings
7. Clients can only create bookings for approved providers
8. Payment must be completed before booking is confirmed

REVIEW RULES:
9. Reviews can only be created after booking is completed
10. One review per booking (1:0..1 relationship)
11. Rating must be between 1-5 stars

PAYMENT RULES:
12. Minimum payout amount is ₱100
13. Payout requests must be processed by admin
14. Transactions are created automatically when payment is made

MESSAGING RULES:
15. Conversations require at least 2 participants
16. Messages are soft-deleted (deletedBy field)
17. Unread count is tracked per user

GAMIFICATION RULES:
18. Points are earned for completed bookings
19. Tier is automatically calculated based on points:
    - Bronze: 0-999 points
    - Silver: 1000-2499 points
    - Gold: 2500-4999 points
    - Platinum: 5000-9999 points
    - Diamond: 10000+ points


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              DATABASE INFORMATION                                                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

DATABASE TYPE: Firebase Firestore (NoSQL Document Database)

COLLECTIONS:
- users                    (All user accounts)
- bookings                 (Service bookings/jobs)
- reviews                  (Service reviews and ratings)
- conversations            (Chat conversations)
- conversations/{id}/messages  (Messages subcollection)
- notifications            (Push notifications)
- deviceTokens             (FCM device tokens)
- transactions             (Payment transactions)
- payoutAccounts           (Provider payout accounts)
- payoutRequests           (Provider payout requests)
- paymentMethods           (User payment methods)
- gamification             (User points and achievements)

INDEXES (for query performance):
- bookings: clientId, providerId, status, scheduledDate
- messages: conversationId, createdAt
- notifications: userId, read, createdAt
- transactions: bookingId, clientId, providerId
- reviews: providerId, rating
- gamification: userId, points, tier

SECURITY:
- Firestore Security Rules enforce role-based access
- Password hashing using bcrypt
- HTTPS/TLS encryption for data in transit
- Firebase automatic encryption at rest
- Philippine Data Privacy Act 2012 compliant


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              DOCUMENT METADATA                                                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Created: December 2024
System: General Service System - Maasin City
Database: Firebase Firestore
Version: 1.0
Document Type: Complete Entity-Relationship Diagram
Purpose: Capstone Project Documentation
```
