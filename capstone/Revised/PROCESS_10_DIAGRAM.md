# PROCESS 10: FEEDBACK AND RATING

## Level 1 DFD - Feedback and Rating

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          PROCESS 10: FEEDBACK AND RATING                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                                                    
    │              │                                                    
    │    CLIENT    │                                                    
    │              │                                                    
    └──────┬───────┘                                                    
           │                                                            
           │ Confirm Completion                                         
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │     10.1      │                                                   
    │    CONFIRM    │──────────────┐                                   
    │  COMPLETION   │              │ Verify                             
    │               │              │                                   
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║   BOOKINGS    ║                           
            │              ║  (Firestore)  ║                           
            │              ║    status:    ║                           
            │              ║ 'completed'   ║                           
            │              ╚═══════════════╝                           
            │                                                           
            │ Rate Provider                                             
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │     10.2      │                                                   
    │     RATE      │                                                   
    │   PROVIDER    │                                                   
    │  (1-5 stars)  │                                                   
    ╰───────┬───────╯                                                   
            │                                                           
            │ Rating                                                    
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │     10.3      │                                                   
    │     LEAVE     │                                                   
    │    COMMENT    │                                                   
    │  (Optional)   │                                                   
    ╰───────┬───────╯                                                   
            │                                                           
            │ Comment                                                   
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │     10.4      │                                                   
    │    SUBMIT     │──────────────┐                                   
    │    REVIEW     │              │ Store Review                       
    │               │              │                                   
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║    REVIEWS    ║                           
            │              ║  (Firestore)  ║                           
            │              ║               ║                           
            │              ╚═══════╤═══════╝                           
            │                      │                                   
            │                      │ Update Stats                      
            │                      │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║     USERS     ║                           
            │              ║  (Firestore)  ║                           
            │              ║  -avgRating   ║                           
            │              ║  -totalReviews║                           
            │              ╚═══════════════╝                           
            │                                                           
            │ Release Payment                                           
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │     10.5      │──────────────┐                                   
    │    RELEASE    │              │ Transfer                           
    │    PAYMENT    │              │                                   
    │               │              │                                   
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║   BOOKINGS    ║                           
            │              ║  (Firestore)  ║                           
            │              ║  paymentStatus║                           
            │              ║  'released'   ║                           
            │              ╚═══════╤═══════╝                           
            │                      │                                   
            │ Review Submitted     │ Update Wallet                     
            │                      │                                   
            ▼                      ▼                                   
    ┌──────────────┐       ╔═══════════════╗                          
    │    CLIENT    │       ║   PROVIDER    ║                          
    │              │       ║    WALLET     ║                          
    └──────────────┘       ║  (Firestore)  ║                          
                           ║  +earnings    ║                          
                           ╚═══════╤═══════╝                          
                                   │                                   
                                   │ Notification                      
                                   │                                   
                                   ▼                                   
                           ┌──────────────┐                           
                           │   PROVIDER   │                           
                           │ Payment      │                           
                           │ Received     │                           
                           └──────────────┘                           
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **10.1** | Confirm Completion | Client confirms that service is completed |
| **10.2** | Rate Provider | Client rates provider (1-5 stars) |
| **10.3** | Leave Comment | Client leaves optional comment/feedback |
| **10.4** | Submit Review | System stores review and updates provider stats |
| **10.5** | Release Payment | System releases payment to provider's wallet |

---

## Data Dictionary - Process 10

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **rating** | Star rating (1-5) | Client | Firestore (reviews) |
| **comment** | Review comment | Client | Firestore (reviews) |
| **reviewedAt** | Review timestamp | System | Firestore (reviews) |
| **avgRating** | Provider's average rating | System | Firestore (users) |
| **totalReviews** | Total review count | System | Firestore (users) |
| **paymentStatus** | Payment release status | System | Firestore (bookings) |
| **earnings** | Amount added to wallet | System | Firestore (wallet) |

---

## Review Flow

```
completed → confirm_completion → rate_provider → leave_comment → submit_review → release_payment
```

---

## Payment Release

```
1. Client confirms completion
2. Client submits rating
3. System stores review
4. System updates provider stats
5. System releases payment to provider wallet
6. Provider receives notification
```

---

## Legend

```
┌───────────────┐
│               │     External Entity
│    ENTITY     │
│               │
└───────────────┘

╭───────────────╮
│    10.X       │     Process
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
