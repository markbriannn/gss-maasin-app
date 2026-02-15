# PROCESS 2: PROVIDER APPROVAL

## Level 1 DFD - Provider Approval Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PROCESS 2: PROVIDER APPROVAL                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘


    ┌──────────────┐                                                    ┌──────────────┐
    │              │                                                    │              │
    │   PROVIDER   │                                                    │    ADMIN     │
    │              │                                                    │              │
    └──────┬───────┘                                                    └──────┬───────┘
           │                                                                   │
           │ [FROM PROCESS 2 REGISTRATION]                                     │
           │ Registration complete                                             │
           │ (providerStatus: 'pending')                                       │
           ▼                                                                   │
    ╭───────────────╮                                                          │
    │      2.1      │                                                          │
    │    PENDING    │                                                          │
    │   APPROVAL    │                                                          │
    │    SCREEN     │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ [STORE]                                                          │
            │ Provider data in database                                        │
            ▼                                                                  │
    ╔═══════════════╗                                                          │
    ║               ║                                                          │
    ║    USERS      ║◀─────────────────────────────────────────────────────────┘
    ║  (Firestore)  ║         [QUERY] Fetch pending providers
    ║               ║
    ╚═══════╤═══════╝
            │
            │ [DATA]
            │ List of pending providers
            ▼
    ╭───────────────╮
    │      2.2      │
    │     VIEW      │
    │   PROVIDER    │
    │     LIST      │
    ╰───────┬───────╯
            │
            │ [ACTION]
            │ Admin selects provider
            ▼
    ╭───────────────╮
    │      2.3      │
    │     VIEW      │
    │   PROVIDER    │
    │    DETAILS    │
    ╰───────┬───────╯
            │
            │ [DISPLAY]
            │ Provider info + documents
            ▼
    ╭───────────────╮
    │      2.4      │
    │    VERIFY     │
    │   DOCUMENTS   │
    ╰───────┬───────╯
            │
            │ [DECISION]
            ├───────────────────────────────────────┐
            │                                       │
            ▼                                       ▼
    ╭───────────────╮                       ╭───────────────╮
    │      2.5      │                       │      2.6      │
    │    APPROVE    │                       │    REJECT     │
    │   PROVIDER    │                       │   PROVIDER    │
    ╰───────┬───────╯                       ╰───────┬───────╯
            │                                       │
            │ [UPDATE]                              │ [UPDATE]
            │ Set providerStatus='approved'         │ Set providerStatus='rejected'
            ▼                                       ▼
    ╔═══════════════╗                       ╔═══════════════╗
    ║               ║                       ║               ║
    ║    USERS      ║                       ║    USERS      ║
    ║  (Firestore)  ║                       ║  (Firestore)  ║
    ║               ║                       ║               ║
    ║ providerStatus║                       ║ providerStatus║
    ║  : 'approved' ║                       ║  : 'rejected' ║
    ║ isOnline: true║                       ║               ║
    ╚═══════╤═══════╝                       ╚═══════╤═══════╝
            │                                       │
            │ [TRIGGER]                             │ [TRIGGER]
            │ Send notification                     │ Send notification
            ▼                                       ▼
    ╭───────────────╮                       ╭───────────────╮
    │      2.7      │                       │      2.8      │
    │    NOTIFY     │                       │    NOTIFY     │
    │   PROVIDER    │                       │   PROVIDER    │
    │  (APPROVED)   │                       │  (REJECTED)   │
    ╰───────┬───────╯                       ╰───────┬───────╯
            │                                       │
            │ [NOTIFICATION]                        │ [NOTIFICATION]
            │ Push notification + Email             │ Push notification + Email
            ▼                                       ▼
    ┌───────────────┐                       ┌───────────────┐
    │               │                       │               │
    │   PROVIDER    │                       │   PROVIDER    │
    │   DASHBOARD   │                       │   REJECTED    │
    │               │                       │    SCREEN     │
    │  (Can go      │                       │               │
    │   online)     │                       │  (Can re-     │
    │               │                       │   apply)      │
    └───────────────┘                       └───────────────┘


                            SUSPEND FLOW
                            ────────────

    ╭───────────────╮
    │      2.9      │
    │    SUSPEND    │
    │   PROVIDER    │
    ╰───────┬───────╯
            │
            │ [UPDATE]
            │ Set providerStatus='suspended'
            ▼
    ╔═══════════════╗
    ║               ║
    ║    USERS      ║
    ║  (Firestore)  ║
    ║               ║
    ║ providerStatus║
    ║ : 'suspended' ║
    ║isOnline: false║
    ╚═══════╤═══════╝
            │
            │ [TRIGGER]
            │ Send notification
            ▼
    ╭───────────────╮
    │     2.10      │
    │    NOTIFY     │
    │   PROVIDER    │
    │  (SUSPENDED)  │
    ╰───────────────╯
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **2.1** | Pending Approval Screen | Provider waits on this screen after registration |
| **2.2** | View Provider List | Admin views list of pending providers |
| **2.3** | View Provider Details | Admin views provider's full profile and documents |
| **2.4** | Verify Documents | Admin reviews Valid ID, Barangay Clearance, Police Clearance, Selfie with ID |
| **2.5** | Approve Provider | Admin approves provider (providerStatus: 'approved', isOnline: true) |
| **2.6** | Reject Provider | Admin rejects provider (providerStatus: 'rejected') |
| **2.7** | Notify Provider (Approved) | System sends push notification and email to approved provider |
| **2.8** | Notify Provider (Rejected) | System sends push notification and email to rejected provider |
| **2.9** | Suspend Provider | Admin suspends an approved provider (providerStatus: 'suspended', isOnline: false) |
| **2.10** | Notify Provider (Suspended) | System sends notification to suspended provider |

---

## Provider Approval Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PROVIDER APPROVAL FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    PROVIDER                    SYSTEM                          ADMIN
      │                            │                               │
      │  2.1 Wait on Pending       │                               │
      │      Approval Screen       │                               │
      │◀───────────────────────────│                               │
      │                            │                               │
      │                            │  2.2 View Provider List       │
      │                            │◀──────────────────────────────│
      │                            │                               │
      │                            │  2.3 Select Provider          │
      │                            │◀──────────────────────────────│
      │                            │                               │
      │                            │  2.4 View Documents           │
      │                            │      • Valid ID               │
      │                            │      • Barangay Clearance     │
      │                            │      • Police Clearance       │
      │                            │      • Selfie with ID         │
      │                            │◀──────────────────────────────│
      │                            │                               │
      │                            │  2.5 Approve Provider         │
      │                            │◀──────────────────────────────│
      │                            │                               │
      │                            │  Update Firestore:            │
      │                            │  • providerStatus: 'approved' │
      │                            │  • isOnline: true             │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │  2.7 Receive Notification  │                               │
      │      "Your account has     │                               │
      │       been approved!"      │                               │
      │◀───────────────────────────│                               │
      │                            │                               │
      │  Navigate to Dashboard     │                               │
      │  (Can now receive jobs)    │                               │
      │◀───────────────────────────│                               │
      │                            │                               │
```

---

## Data Dictionary - Process 2

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **providerStatus** | Provider approval status | Admin Action | Firestore (users) |
| **isOnline** | Provider availability flag | System | Firestore (users) |
| **approvedAt** | Timestamp of approval | System | Firestore (users) |
| **approvedBy** | Admin who approved | Admin | Firestore (users) |
| **rejectedAt** | Timestamp of rejection | System | Firestore (users) |
| **rejectedBy** | Admin who rejected | Admin | Firestore (users) |
| **rejectReason** | Reason for rejection | Admin | Firestore (users) |
| **suspendedAt** | Timestamp of suspension | System | Firestore (users) |
| **suspendReason** | Reason for suspension | Admin | Firestore (users) |

---

## Provider Status Values

| Status | Description | Can Go Online | Visible to Clients |
|--------|-------------|---------------|-------------------|
| **pending** | Waiting for admin approval | No | No |
| **approved** | Admin approved, can work | Yes | Yes (if online) |
| **rejected** | Admin rejected application | No | No |
| **suspended** | Admin suspended account | No | No |

---

## Document Verification Requirements

### Required Documents for Provider Approval

1. **Valid Government-Issued ID**
   - National ID, Driver's License, Passport, SSS, PhilHealth, Postal ID, Voter's ID, PRC ID, UMID, or TIN ID
   - Must be clear and readable
   - Must not be expired

2. **Barangay Clearance**
   - Issued by the provider's barangay
   - Must be recent (within 6 months)
   - Must show provider's name and address

3. **Police Clearance**
   - Issued by PNP (Philippine National Police)
   - Must be recent (within 6 months)
   - Must show "No Criminal Record" or equivalent

4. **Selfie with ID**
   - Provider holding their valid ID next to their face
   - Face and ID must be clearly visible
   - Used for identity verification

---

## Legend

```
┌───────────────┐
│               │     External Entity
│    ENTITY     │
│               │
└───────────────┘

╭───────────────╮
│     2.X       │     Process
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
