# PROCESS 7: ADMIN REVIEW

## Level 1 DFD - Admin Review Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PROCESS 7: ADMIN REVIEW                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘


    ┌──────────────┐                                                    ┌──────────────┐
    │              │                                                    │              │
    │    CLIENT    │                                                    │   PROVIDER   │
    │              │                                                    │              │
    └──────┬───────┘                                                    └──────┬───────┘
           │                                                                   │
           │ [FROM PROCESS 6]                                                  │
           │ Payment Confirmed                                                 │
           │ (status: 'pending_admin_approval')                                │
           ▼                                                                   │
    ╔═══════════════╗                                                          │
    ║               ║                                                          │
    ║   BOOKINGS    ║                                                          │
    ║  (Firestore)  ║                                                          │
    ║               ║                                                          │
    ║ • paid: true  ║                                                          │
    ║ • status:     ║                                                          │
    ║   'pending_   ║                                                          │
    ║    admin_     ║                                                          │
    ║    approval'  ║                                                          │
    ╚═══════╤═══════╝                                                          │
            │                                                                  │
            │ [QUERY] Fetch pending bookings                                   │
            ▼                                                                  │
    ╭───────────────╮                                                          │
    │      7.1      │                                                          │
    │     VIEW      │                                                          │
    │   PENDING     │                                                          │
    │   BOOKINGS    │                                                          │
    │     LIST      │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ Select Booking                                                   │
            ▼                                                                  │
    ╭───────────────╮                                                          │
    │      7.2      │                                                          │
    │     VIEW      │                                                          │
    │   BOOKING     │                                                          │
    │    DETAILS    │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ Booking Info                                                     │
            │ • Client Details                                                 │
            │ • Provider Details                                               │
            │ • Service Type                                                   │
            │ • Location                                                       │
            │ • Payment Status                                                 │
            │ • Photos                                                         │
            ▼                                                                  │
    ╭───────────────╮                                                          │
    │      7.3      │                                                          │
    │    VERIFY     │                                                          │
    │   BOOKING     │                                                          │
    │     INFO      │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            ├───────────────────────────────────────┐                          │
            │                                       │                          │
            ▼                                       ▼                          │
    ╭───────────────╮                       ╭───────────────╮                 │
    │      7.4      │                       │      7.5      │                 │
    │    APPROVE    │                       │    REJECT     │                 │
    │    BOOKING    │                       │    BOOKING    │                 │
    ╰───────┬───────╯                       ╰───────┬───────╯                 │
            │                                       │                          │
            │ Update Status                         │ Update Status            │
            ▼                                       ▼                          │
    ╔═══════════════╗                       ╔═══════════════╗                 │
    ║               ║                       ║               ║                 │
    ║   BOOKINGS    ║                       ║   BOOKINGS    ║                 │
    ║  (Firestore)  ║                       ║  (Firestore)  ║                 │
    ║               ║                       ║               ║                 │
    ║ adminApproved:║                       ║ adminApproved:║                 │
    ║     true      ║                       ║     false     ║                 │
    ║ status:       ║                       ║ status:       ║                 │
    ║  'pending_    ║                       ║  'rejected'   ║                 │
    ║   provider_   ║                       ║ refundStatus: ║                 │
    ║   response'   ║                       ║  'pending'    ║                 │
    ╚═══════╤═══════╝                       ╚═══════╤═══════╝                 │
            │                                       │                          │
            │ [TRIGGER] Send notification           │ [TRIGGER] Send notification│
            ▼                                       ▼                          │
    ╭───────────────╮                       ╭───────────────╮                 │
    │      7.6      │                       │      7.7      │                 │
    │    NOTIFY     │                       │    NOTIFY     │                 │
    │   PROVIDER    │                       │    CLIENT     │                 │
    │  (NEW JOB)    │                       │  (REJECTED)   │                 │
    ╰───────┬───────╯                       ╰───────┬───────╯                 │
            │                                       │                          │
            │ [NOTIFICATION]                        │ [NOTIFICATION]           │
            │ "New job request!"                    │ "Booking rejected"       │
            ▼                                       ▼                          │
    ┌───────────────┐                       ┌───────────────┐                 │
    │               │                       │               │                 │
    │   PROVIDER    │◀──[CONNECTS TO]───────┤    CLIENT     │◀────────────────┘
    │   RECEIVES    │   PROVIDER            │   RECEIVES    │
    │   JOB         │                       │   REFUND      │
    │   REQUEST     │                       │               │
    │               │                       │               │
    │ [TO PROCESS 8]│                       └───────────────┘
    │               │
    └───────────────┘
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **7.1** | View Pending Bookings List | Admin views all bookings awaiting approval |
| **7.2** | View Booking Details | Admin views complete booking information |
| **7.3** | Verify Booking Info | Admin verifies client, provider, payment, and service details |
| **7.4** | Approve Booking | Admin approves booking (adminApproved: true, status: 'pending_provider_response') |
| **7.5** | Reject Booking | Admin rejects booking (adminApproved: false, status: 'rejected', initiate refund) |
| **7.6** | Notify Provider | System sends push notification to provider about new job |
| **7.7** | Notify Client | System sends notification to client about rejection and refund |

---

## Admin Review Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN REVIEW FLOW                                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    CLIENT                      SYSTEM                          ADMIN
      │                            │                               │
      │  Payment Confirmed         │                               │
      │  (paid: true)              │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │                            │  7.1 View Pending Bookings    │
      │                            │◀──────────────────────────────│
      │                            │                               │
      │                            │  7.2 Select Booking           │
      │                            │◀──────────────────────────────│
      │                            │                               │
      │                            │  7.3 View Details:            │
      │                            │      • Client Info            │
      │                            │      • Provider Info          │
      │                            │      • Service Type           │
      │                            │      • Location               │
      │                            │      • Payment: ₱XXX          │
      │                            │      • Photos                 │
      │                            │◀──────────────────────────────│
      │                            │                               │
      │                            │  7.4 Approve Booking          │
      │                            │◀──────────────────────────────│
      │                            │                               │
      │                            │  Update Firestore:            │
      │                            │  • adminApproved: true        │
      │                            │  • status: 'pending_provider_ │
      │                            │    response'                  │
      │                            │  • approvedAt: timestamp      │
      │                            │  • approvedBy: adminId        │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  7.6 Send Notification        │
      │                            │       to Provider             │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            ▼                               │
                            ┌──────────────┐
                            │   PROVIDER   │
                            │   RECEIVES   │
                            │   NEW JOB    │
                            │   REQUEST    │
                            └──────────────┘


                            REJECTION FLOW
                            ──────────────

    CLIENT                      SYSTEM                          ADMIN
      │                            │                               │
      │                            │  7.5 Reject Booking           │
      │                            │◀──────────────────────────────│
      │                            │                               │
      │                            │  Update Firestore:            │
      │                            │  • adminApproved: false       │
      │                            │  • status: 'rejected'         │
      │                            │  • rejectedAt: timestamp      │
      │                            │  • rejectedBy: adminId        │
      │                            │  • rejectReason: "..."        │
      │                            │  • refundStatus: 'pending'    │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  Initiate Refund              │
      │                            │  (PayMongo Refund API)        │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │  7.7 Receive Notification  │                               │
      │      "Booking rejected"    │                               │
      │      "Refund processing"   │                               │
      │◀───────────────────────────│                               │
      │                            │                               │
```

---

## Data Dictionary - Process 7

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **adminApproved** | Admin approval status | Admin Action | Firestore (bookings) |
| **approvedAt** | Timestamp of approval | System | Firestore (bookings) |
| **approvedBy** | Admin who approved | Admin | Firestore (bookings) |
| **rejectedAt** | Timestamp of rejection | System | Firestore (bookings) |
| **rejectedBy** | Admin who rejected | Admin | Firestore (bookings) |
| **rejectReason** | Reason for rejection | Admin | Firestore (bookings) |
| **refundStatus** | Refund processing status | System | Firestore (bookings) |
| **refundAmount** | Amount to be refunded | System | Firestore (bookings) |

---

## Booking Status After Admin Review

| Admin Action | adminApproved | status | Next Step |
|--------------|---------------|--------|-----------|
| **Approve** | true | 'pending_provider_response' | Provider receives job request |
| **Reject** | false | 'rejected' | Client receives refund |

---

## Admin Review Checklist

### Information to Verify

1. **Client Information**
   - Valid client account
   - Contact information
   - Location accuracy

2. **Provider Information**
   - Provider is approved (providerStatus: 'approved')
   - Provider is available
   - Service category matches request

3. **Payment Information**
   - Payment confirmed (paid: true)
   - Payment amount is correct
   - Payment method verified

4. **Service Details**
   - Service type is clear
   - Location is within service area (Maasin City)
   - Photos are appropriate (if provided)
   - Occasion/remarks are reasonable

5. **Safety & Policy**
   - No suspicious activity
   - Complies with terms of service
   - No duplicate bookings

---

## Rejection Reasons

Common reasons for admin rejection:

1. **Invalid Information**
   - Incomplete or incorrect details
   - Suspicious client/provider information

2. **Payment Issues**
   - Payment verification failed
   - Amount mismatch

3. **Policy Violations**
   - Violates terms of service
   - Inappropriate content in photos/remarks

4. **Provider Unavailability**
   - Provider is suspended
   - Provider is not approved
   - Service area mismatch

5. **Duplicate Booking**
   - Same client, provider, and time
   - Potential fraud

---

## Refund Process

When admin rejects a booking:

1. **Update Booking Status**
   - status: 'rejected'
   - refundStatus: 'pending'

2. **Initiate Refund**
   - Call PayMongo Refund API
   - Refund full amount to client

3. **Update Refund Status**
   - refundStatus: 'processing' → 'completed'
   - refundedAt: timestamp

4. **Notify Client**
   - Push notification
   - Email notification
   - In-app notification

---

## Legend

```
┌───────────────┐
│               │     External Entity
│    ENTITY     │
│               │
└───────────────┘

╭───────────────╮
│     7.X       │     Process
│   PROCESS     │
│               │
╰───────────────╯

╔═══════════════╗
║               ║     Data Store
║  DATA STORE   ║
║               ║
╚═══════════════╝

─────────────────▶    Data Flow
```
