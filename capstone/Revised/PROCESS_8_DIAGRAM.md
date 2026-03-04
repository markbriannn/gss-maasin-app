# PROCESS 8: PROVIDER RESPONSE

## Level 1 DFD - Provider Response

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          PROCESS 8: PROVIDER RESPONSE                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                                                    
    │              │                                                    
    │   PROVIDER   │                                                    
    │              │                                                    
    └──────┬───────┘                                                    
           │                                                            
           │ View Job Request                                           
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │      8.1      │──────────────┐                                   
    │     VIEW      │              │ Query                              
    │  JOB REQUEST  │              │                                   
    ╰───────────────╯              │                                   
                                   ▼                                   
                            ╔═══════════════╗                          
                            ║               ║                          
                            ║   BOOKINGS    ║                          
                            ║  (Firestore)  ║                          
                            ║    status:    ║                          
                            ║  'approved'   ║                          
                            ╚═══════╤═══════╝                          
                                    │                                   
                                    │ Job Details                       
                                    │                                   
                                    ▼                                   
                            ╭───────────────╮                          
                            │      8.2      │                          
                            │    REVIEW     │                          
                            │      JOB      │                          
                            │  -Client Info │                          
                            │  -Location    │                          
                            │  -Payment     │                          
                            │  -Schedule    │                          
                            ╰───────┬───────╯                          
                                    │                                   
                                    │ Decision                          
                                    │                                   
                    ┌───────────────┼───────────────┐                  
                    │               │               │                  
                    │ Accept        │ Decline       │                  
                    │               │               │                  
                    ▼               ▼               ▼                  
            ╭───────────────╮  ╭───────────────╮  ┌───────────────┐  
            │      8.3      │  │      8.4      │  │   PROVIDER    │  
            │    ACCEPT     │  │    DECLINE    │  │   (Back to    │  
            │      JOB      │  │      JOB      │  │    Jobs)      │  
            ╰───────┬───────╯  ╰───────┬───────╯  └───────────────┘  
                    │               │                                   
                    │ Update        │ Update                               
                    │               │                                   
                    ▼               ▼                                   
            ╔═══════════════╗  ╔═══════════════╗                      
            ║   BOOKINGS    ║  ║   BOOKINGS    ║                      
            ║  (Firestore)  ║  ║  (Firestore)  ║                      
            ║    status:    ║  ║    status:    ║                      
            ║  'accepted'   ║  ║  'declined'   ║                      
            ╚═══════╤═══════╝  ╚═══════╤═══════╝                      
                    │               │                                   
                    │ Notification  │ Notification                      
                    │               │                                   
                    ▼               ▼                                   
            ┌───────────────┐  ┌───────────────┐                      
            │    CLIENT     │  │    CLIENT     │                      
            │  (Accepted)   │  │  (Declined)   │                      
            └───────────────┘  └───────────────┘                      
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **8.1** | View Job Request | Provider receives and views new job notification |
| **8.2** | Review Job | Provider reviews job details (client, location, payment, service) |
| **8.3** | Accept Job | Provider accepts job (status: 'accepted') |
| **8.4** | Decline Job | Provider declines job (status: 'declined') |

---

## Data Dictionary - Process 8

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **bookingStatus** | Job acceptance status | Provider Action | Firestore (bookings) |
| **acceptedAt** | Timestamp of acceptance | System | Firestore (bookings) |
| **declinedAt** | Timestamp of decline | System | Firestore (bookings) |
| **declineReason** | Reason for declining | Provider | Firestore (bookings) |

---

## Job Status Flow

```
approved → accepted → in_progress → completed
         ↓
      declined
```

---

## Booking Status Values

| Status | Description | Provider Action |
|--------|-------------|-----------------|
| **approved** | Admin approved, awaiting provider | Accept or Decline |
| **accepted** | Provider accepted job | Start job |
| **declined** | Provider declined job | None (job ends) |
| **in_progress** | Provider started job | Mark as complete |
| **completed** | Job finished | None |

---

## Legend

```
┌───────────────┐
│               │     External Entity
│    ENTITY     │
│               │
└───────────────┘

╭───────────────╮
│     8.X       │     Process
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
