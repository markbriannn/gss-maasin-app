# PROCESS 7: ADMIN REVIEW BOOKING

## Level 1 DFD - Admin Review Booking

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          PROCESS 7: ADMIN REVIEW BOOKING                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                                                    
    │              │                                                    
    │    ADMIN     │                                                    
    │              │                                                    
    └──────┬───────┘                                                    
           │                                                            
           │ View Pending Bookings                                      
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │      7.1      │──────────────┐                                   
    │     VIEW      │              │ Query                              
    │   BOOKINGS    │              │                                   
    ╰───────────────╯              │                                   
                                   ▼                                   
                            ╔═══════════════╗                          
                            ║               ║                          
                            ║   BOOKINGS    ║                          
                            ║  (Firestore)  ║                          
                            ║   status:     ║                          
                            ║  'pending_    ║                          
                            ║    admin_     ║                          
                            ║   approval'   ║                          
                            ╚═══════╤═══════╝                          
                                    │                                   
                                    │ Booking Details                   
                                    │                                   
                                    ▼                                   
                            ╭───────────────╮                          
                            │      7.2      │                          
                            │    REVIEW     │                          
                            │   BOOKING     │                          
                            │  -Client Info │                          
                            │  -Provider    │                          
                            │  -Payment     │                          
                            │  -Job Details │                          
                            ╰───────┬───────╯                          
                                    │                                   
                                    │ Decision                          
                                    │                                   
                    ┌───────────────┼───────────────┐                  
                    │               │               │                  
                    │ Approve       │ Decline       │                  
                    │               │               │                  
                    ▼               ▼               │                  
            ╭───────────────╮  ╭───────────────╮   │                  
            │      7.3      │  │      7.4      │   │                  
            │    APPROVE    │  │    DECLINE    │   │                  
            │    BOOKING    │  │    BOOKING    │   │                  
            ╰───────┬───────╯  ╰───────┬───────╯   │                  
                    │               │               │                  
                    │ Update        │ Update        │                  
                    │               │               │                  
                    ▼               ▼               │                  
            ╔═══════════════╗  ╔═══════════════╗   │                  
            ║   BOOKINGS    ║  ║   BOOKINGS    ║   │                  
            ║  (Firestore)  ║  ║  (Firestore)  ║   │                  
            ║    status:    ║  ║    status:    ║   │                  
            ║  'approved'   ║  ║  'declined'   ║   │                  
            ╚═══════╤═══════╝  ╚═══════╤═══════╝   │                  
                    │               │               │                  
                    │               │               │                  
                    ▼               ▼               ▼                  
            ╭───────────────╮  ╭───────────────╮  ╭───────────────╮  
            │      7.5      │  │      7.6      │  │      7.7      │  
            │    NOTIFY     │  │    NOTIFY     │  │    MESSAGE    │  
            │   PROVIDER    │  │    CLIENT     │  │  CLIENT OR    │  
            │               │  │               │  │   PROVIDER    │  
            ╰───────┬───────╯  ╰───────┬───────╯  ╰───────┬───────╯  
                    │               │               │                  
                    │               │               │                  
                    ▼               ▼               ▼                  
            ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  
            │   PROVIDER    │  │    CLIENT     │  │  CLIENT OR    │  
            │ (New Job)     │  │  (Declined)   │  │   PROVIDER    │  
            └───────────────┘  └───────────────┘  └───────────────┘  
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **7.1** | View Bookings | Admin views all pending bookings that need review |
| **7.2** | Review Booking | Admin reviews client's booking details, payment confirmation, and job information |
| **7.3** | Approve Booking | Admin approves the booking (status: 'approved') |
| **7.4** | Decline Booking | Admin declines the booking (status: 'declined') |
| **7.5** | Notify Provider | System sends notification to provider about approved job |
| **7.6** | Notify Client | System sends notification to client about declined booking |
| **7.7** | Message | Admin can send messages to client or provider for clarification |

---

## Data Dictionary - Process 7

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **bookingStatus** | Booking approval status | Admin Action | Firestore (bookings) |
| **approvedAt** | Timestamp of approval | System | Firestore (bookings) |
| **declinedAt** | Timestamp of decline | System | Firestore (bookings) |
| **adminNotes** | Admin notes/reason | Admin | Firestore (bookings) |
| **paymentVerified** | Payment confirmation | Admin | Firestore (bookings) |

---

## Booking Status Flow

```
pending_payment → pending_admin_approval → approved → accepted → in_progress → completed
                                         ↓
                                      declined
```

---

## Booking Status Values

| Status | Description | Admin Action |
|--------|-------------|--------------|
| **pending_admin_approval** | Awaiting admin review | Approve or Decline |
| **approved** | Admin approved, sent to provider | None |
| **declined** | Admin declined booking | Refund client |

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
