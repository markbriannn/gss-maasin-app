# GENERAL SERVICE SYSTEM - COMPLETE PROCESS DIAGRAM

## System Overview - Complete Process Flow

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    GENERAL SERVICE SYSTEM - COMPLETE PROCESS FLOW                                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


    ┌──────────────┐                                                                              ┌──────────────┐
    │              │                                                                              │              │
    │    CLIENT    │                                                                              │   PROVIDER   │
    │              │                                                                              │              │
    └──────┬───────┘                                                                              └──────┬───────┘
           │                                                                                             │
           │ REGISTER                                                                                    │ REGISTER
           │                                                                                             │
           ▼                                                                                             ▼
    ╔══════════════════╗                                                                         ╔══════════════════╗
    ║       1          ║                                                                         ║        2         ║
    ║ CLIENT           ║                                                                         ║ PROVIDER         ║
    ║ REGISTRATION     ║                                                                         ║ REGISTRATION     ║
    ║ -Personal Info   ║                                                                         ║ -Personal Info   ║
    ║ -Email Verify    ║──────────┐                                                 ┌────────────║ -Email Verify    ║
    ║ -Phone Verify    ║          │                                                 │            ║ -Phone Verify    ║
    ║ -Profile Photo   ║          │                                                 │            ║ -Documents       ║
    ╚═══════╤══════════╝          │                                                 │            ║ -ID, Clearance   ║
            │                     │                                                 │            ║ -Services        ║
            │ STORE DATA          ▼                                                 ▼            ║ -Location        ║
            │             ╔═══════════════╗         ╔═══════════════╗                           ╚═══════╤══════════╝
            │             ║     EMAIL     ║         ║      SMS      ║                                   │
            │             ║ VERIFICATION  ║         ║ VERIFICATION  ║                                   │ STORE DATA
            │             ║    (Brevo)    ║         ║      OTP      ║                                   │
            │             ║               ║         ║  (Semaphore)  ║                                   │
            │             ╚═══════╤═══════╝         ╚═══════╤═══════╝                                   │
            │                     │                         │                                           │
            │                     └─────────┬───────────────┘                                           │
            │                               │ Send Codes                                                │
            ▼                               │                                                           ▼
    ╔═══════════════╗                      │                                                   ╔═══════════════╗
    ║               ║                      │                                                   ║ USER DATABASE ║
    ║ USER DATABASE ║◄─────────────────────┴───────────────────────────────────────────────────║(ROLE: PROVIDER║
    ║ (ROLE: CLIENT)║                                                                          ║ProviderStatus:║
    ║  FIRESTORE    ║                                                                          ║   "pending")  ║
    ╚═══════════════╝                                                                          ║  FIRESTORE    ║
                                                                                               ╚═══════╤═══════╝
                                                                                                       │
                                                                                                       │ PENDING APPROVAL
                                                                                                       │
                                                                                                       ▼
                                                                                               ╔═══════════════╗
                                                                                               ║       3       ║
                                                                                               ║ ADMIN         ║
                                                                                               ║ VERIFICATION  ║
                                                                                               ║ -Review Docs  ║
                                                                                               ║ -Verify ID    ║
                                                                                               ║ -Approve/     ║
                                                                                               ║  Reject       ║
                                                                                               ╚═══════╤═══════╝
                                                                                                       │
                                                                                                       │ APPROVE
                                                                                                       │
                                                                                                       ▼
                                                                                               ╔═══════════════╗
                                                                                               ║ PROVIDER GOES ║
                                                                                               ║ ONLINE        ║
                                                                                               ║   (TOGGLE)    ║
                                                                                               ╚═══════╤═══════╝
                                                                                                       │
                                                                                                       │ GOES TO CLIENT SCREEN
                                                                                                       │ (Provider now visible)
                                                                                                       │
    ┌──────────────┐                                                                                   │
    │              │                                                                                   │
    │    CLIENT    │                                                                                   │
    │              │                                                                                   │
    └──────┬───────┘                                                                                   │
           │                                                                                           │
           │ BROWSE PROVIDERS ◄────────────────────────────────────────────────────────────────────────┘
           │
           ▼
    ╔══════════════════╗
    ║        4         ║
    ║ JOB MATCHING     ║
    ║ -Filter Online   ║
    ║ -Filter by       ║
    ║  Service         ║
    ║ -Filter by       ║
    ║  Location        ║
    ║ -Recommended     ║
    ║  (Cheapest,      ║
    ║   Nearest)       ║
    ║ -Select Worker   ║
    ╚═══════╤══════════╝
            │
            │ BOOK SERVICE
            │
            ▼
    ╔══════════════════╗
    ║        5         ║
    ║ JOB PROCESS      ║
    ║ -Create Booking  ║
    ║ -Upload Photos   ║
    ║ -Set Address     ║
    ║ -Set Date/Time   ║
    ║ -Add Notes       ║
    ╚═══════╤══════════╝
            │
            │ PAYMENT REQUIRED (PAY FIRST)
            │
            ▼
    ╔══════════════════╗
    ║        6         ║
    ║ PAYMENT PROCESS  ║
    ║ -Create Source   ║
    ║ -GCash/Maya      ║──────────► ╔═══════════════╗
    ║ -Checkout        ║            ║   PAYMONGO    ║
    ║ -Confirm Payment ║            ║ (GCash/Maya)  ║
    ╚═══════╤══════════╝            ╚═══════╤═══════╝
            │                               │
            │ PAYMENT STATUS                │ PAYMENT CONFIRMED
            │◄──────────────────────────────┘
            │
            ▼
    ╔══════════════════╗
    ║        7         ║
    ║ ADMIN REVIEW     ║
    ║ BOOKING          ║
    ║ -Review Client's ║
    ║  Booking Details ║
    ║ -Check Payment   ║
    ║ -Approve/Decline ║
    ║ -Reject Job      ║
    ╚═══════╤══════════╝
            │
            │ ADMIN APPROVE + NOTIFY PROVIDER
            │
            └──────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                                       │
                                                                                                       ▼
                                                                                               ╔═══════════════╗
                                                                                               ║       8       ║
                                                                                               ║ PROVIDER      ║
                                                                                               ║ RESPONSE      ║
                                                                                               ║ -Accept Job   ║
                                                                                               ║ -Decline Job  ║
                                                                                               ╚═══════╤═══════╝
                                                                                                       │
                                                                                                       │ PROVIDER ACCEPTED
                                                                                                       │
                                                                                                       ▼
                                                                                               ╔═══════════════╗
                                                                                               ║       9       ║
                                                                                               ║ SERVICE       ║
                                                                                               ║ EXECUTION     ║
                                                                                               ║ -Start Travel ║
                                                                                               ║ -Track        ║
                                                                                               ║  Location     ║
                                                                                               ║ -Arrive       ║
                                                                                               ║ -Start Work   ║
                                                                                               ╚═══════╤═══════╝
                                                                                                       │
                                                                                                       │ CLIENT CONFIRM
                                                                                                       │ COMPLETION
                                                                                                       │
                                                                                                       ▼
                                                                                               ╔═══════════════╗
                                                                                               ║      10       ║
                                                                                               ║ FEEDBACK &    ║
                                                                                               ║ RATING        ║
                                                                                               ║ -Rate         ║
                                                                                               ║  Provider     ║
                                                                                               ║ -Leave        ║
                                                                                               ║  Comment      ║
                                                                                               ║ -Release      ║
                                                                                               ║  Payment      ║
                                                                                               ╚═══════╤═══════╝
                                                                                                       │
                                                                                                       │ STORE REVIEW
                                                                                                       │
                                                                                                       ▼
                                                                                               ╔═══════════════╗
                                                                                               ║    REVIEW     ║
                                                                                               ║   DATABASE    ║
                                                                                               ║  (Firestore)  ║
                                                                                               ╚═══════════════╝
```

## System Components

### External Services
- **Email Verification (Brevo)**: Third-party service that sends verification codes to user emails (both client and provider)
- **SMS Verification OTP (Semaphore)**: Third-party service that sends OTP codes to user phone numbers via SMS (both client and provider)
- **Payment Gateway (PayMongo)**: Processes GCash and Maya payments
- **Location Service (Firebase)**: Real-time GPS tracking and streaming

### Databases (Firestore)
- **Users**: Stores client and provider accounts with roles and status
- **Bookings**: Stores all job bookings with status tracking
- **Reviews**: Stores ratings and feedback from clients

### User Roles
- **CLIENT**: Books services, makes payments, tracks providers, leaves reviews
- **PROVIDER**: Offers services, accepts jobs, performs work, receives payments
- **ADMIN**: Verifies providers, approves bookings, monitors system, views analytics

## Process Flow (Sequential Order)

1. **CLIENT REGISTRATION** - Client signs up with email/phone verification
2. **PROVIDER REGISTRATION** - Provider signs up with documents and verification
3. **ADMIN VERIFICATION** - Admin verifies provider documents and approves account
   - Provider can now toggle online/offline
   - Only ONLINE providers are visible to clients
4. **JOB MATCHING** - Client browses ONLINE providers and selects one
5. **JOB PROCESS** - Client creates booking with details
6. **PAYMENT PROCESS** - Client pays via GCash/Maya (PayMongo)
7. **ADMIN REVIEW BOOKING** - Admin reviews client's booking details and payment, can approve/decline
8. **PROVIDER RESPONSE** - Provider receives notification, can accept/decline job
9. **SERVICE EXECUTION** - Provider travels (tracked), performs work, completes job
10. **FEEDBACK & RATING** - Client rates provider and payment is released
