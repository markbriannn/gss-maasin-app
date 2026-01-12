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
           │ Registration Complete                                             │
           │ (providerStatus: 'pending')                                       │
           ▼                                                                   │
    ╭───────────────╮                                                          │
    │      2.1      │                                                          │
    │    PENDING    │                                                          │
    │   APPROVAL    │                                                          │
    │    SCREEN     │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ Provider Data                                                    │
            ▼                                                                  │
    ╔═══════════════╗                                                          │
    ║               ║                                                          │
    ║    USERS      ║◀─────────────────────────────────────────────────────────┘
    ║  (Firestore)  ║         View Pending Providers
    ║               ║
    ╚═══════╤═══════╝
            │
            │ Pending Providers List
            ▼
    ╭───────────────╮
    │      2.2      │
    │     VIEW      │
    │   PROVIDER    │
    │     LIST      │
    ╰───────┬───────╯
            │
            │ Select Provider
            ▼
    ╭───────────────╮
    │      2.3      │
    │     VIEW      │
    │   PROVIDER    │
    │    DETAILS    │
    ╰───────┬───────╯
            │
            │ Provider Info + Documents
            ▼
    ╭───────────────╮
    │      2.4      │
    │    VERIFY     │
    │   DOCUMENTS   │
    ╰───────┬───────╯
            │
            ├───────────────────────────────────────┐
            │                                       │
            ▼                                       ▼
    ╭───────────────╮                       ╭───────────────╮
    │      2.5      │                       │      2.6      │
    │    APPROVE    │                       │    REJECT     │
    │   PROVIDER    │                       │   PROVIDER    │
    ╰───────┬───────╯                       ╰───────┬───────╯
            │                                       │
            │ Update Status                         │ Update Status
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
            ▼                                       ▼
    ╭───────────────╮                       ╭───────────────╮
    │      2.7      │                       │      2.8      │
    │    NOTIFY     │                       │    NOTIFY     │
    │   PROVIDER    │                       │   PROVIDER    │
    │  (APPROVED)   │                       │  (REJECTED)   │
    ╰───────┬───────╯                       ╰───────┬───────╯
            │                                       │
            │ Push Notification                     │ Push Notification
            │ Email                                 │ Email
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
            │ Update Status
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
| **2.4** | Verify Documents | Admin reviews Valid ID, Barangay Clearance |
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
      │                            │      • Valid ID (Front)       │
      │                            │      • Valid ID (Back)        │
      │                            │      • Barangay Clearance     │
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

