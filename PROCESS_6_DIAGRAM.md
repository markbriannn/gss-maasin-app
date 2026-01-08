# PROCESS 6: FEEDBACK & PAYMENT RELEASE

## Level 1 DFD - Feedback & Payment Release Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          PROCESS 6: FEEDBACK & PAYMENT RELEASE                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘


    ┌──────────────┐                                            ┌──────────────┐
    │              │                                            │              │
    │    CLIENT    │                                            │   PROVIDER   │
    │              │                                            │              │
    └──────┬───────┘                                            └──────┬───────┘
           │                                                           │
           │ Job Completed                                             │
           ▼                                                           │
    ╭───────────────╮                                                  │
    │      6.1      │                                                  │
    │    SUBMIT     │                                                  │
    │    REVIEW     │                                                  │
    │  (1-5 Stars)  │                                                  │
    ╰───────┬───────╯                                                  │
            │                                                          │
            │ Review Data                                              │
            ▼                                                          │
    ╔═══════════════╗                                                  │
    ║               ║                                                  │
    ║    REVIEWS    ║                                                  │
    ║  (Firestore)  ║                                                  │
    ║               ║                                                  │
    ╚═══════╤═══════╝                                                  │
            │                                                          │
            ▼                                                          │
    ╭───────────────╮                                                  │
    │      6.2      │                                                  │
    │    UPDATE     │                                                  │
    │   PROVIDER    │                                                  │
    │    RATING     │                                                  │
    ╰───────┬───────╯                                                  │
            │                                                          │
            ▼                                                          │
    ╭───────────────╮                                                  │
    │      6.3      │                                                  │
    │   RELEASE     │                                                  │
    │   PAYMENT     │                                                  │
    │  TO WALLET    │                                                  │
    ╰───────┬───────╯                                                  │
            │                                                          │
            │ Earnings Added                                           │
            ▼                                                          │
    ╔═══════════════╗                                                  │
    ║               ║                                                  │
    ║    USERS      ║──────────────────────────────────────────────────▶
    ║  (Firestore)  ║         Provider Wallet Updated
    ║               ║
    ║availableBalance║
    ╚═══════╤═══════╝
            │
            ▼
    ╭───────────────╮
    │      6.4      │
    │    NOTIFY     │
    │   PROVIDER    │
    │  (EARNINGS)   │
    ╰───────┬───────╯
            │
            ▼
    ╭───────────────╮
    │      6.5      │
    │    SEND       │
    │   RECEIPT     │
    ╰───────┬───────╯
            │
            │ Email
            ▼
    ┌───────────────┐
    │               │
    │    BREVO      │
    │               │
    └───────────────┘
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **6.1** | Submit Review | Client rates provider (1-5 stars) and writes comment |
| **6.2** | Update Provider Rating | System recalculates provider's average rating |
| **6.3** | Release Payment to Wallet | System adds earnings to provider's wallet |
| **6.4** | Notify Provider | System sends push notification about earnings |
| **6.5** | Send Receipt | System sends receipt email to client |

---

## Earnings Calculation

```
Client Paid:              ₱1,050
├── Provider Price:       ₱1,000  → Goes to Provider Wallet
└── System Fee (5%):      ₱   50  → Platform Revenue
```

---

## Legend

```
╭───────────────╮
│     6.X       │     Process
╰───────────────╯

╔═══════════════╗
║  DATA STORE   ║     Data Store
╚═══════════════╝

─────────────────▶    Data Flow
```

