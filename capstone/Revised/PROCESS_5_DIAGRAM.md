# PROCESS 5: JOB PROCESS

## Level 1 DFD - Job Process (Booking Creation)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            PROCESS 5: JOB PROCESS                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                                                    
    │              │                                                    
    │    CLIENT    │                                                    
    │              │                                                    
    └──────┬───────┘                                                    
           │                                                            
           │ Create Booking                                             
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │      5.1      │                                                   
    │    ENTER      │                                                   
    │  JOB DETAILS  │                                                   
    │ -Service Type │                                                   
    │ -Date & Time  │                                                   
    │ -Address      │                                                   
    ╰───────┬───────╯                                                   
            │                                                           
            │ Job Information                                           
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      5.2      │                                                   
    │    UPLOAD     │                                                   
    │    PHOTOS     │                                                   
    │  (Optional)   │                                                   
    ╰───────┬───────╯                                                   
            │                                                           
            │ Photos                                                    
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      5.3      │                                                   
    │     ADD       │                                                   
    │    NOTES      │                                                   
    │  (Optional)   │                                                   
    ╰───────┬───────╯                                                   
            │                                                           
            │ Additional Notes                                          
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      5.4      │                                                   
    │    REVIEW     │                                                   
    │   BOOKING     │                                                   
    ╰───────┬───────╯                                                   
            │                                                           
            │ Confirm Booking                                           
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      5.5      │──────────────┐                                   
    │    CREATE     │              │ Store Booking                      
    │    BOOKING    │              │                                   
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║               ║                           
            │              ║   BOOKINGS    ║                           
            │              ║  (Firestore)  ║                           
            │              ║    status:    ║                           
            │              ║  'pending_    ║                           
            │              ║   payment'    ║                           
            │              ╚═══════╤═══════╝                           
            │                      │                                   
            │ Booking Created      │ Confirmation                      
            │                      │                                   
            ▼                      ▼                                   
    ┌──────────────┐       ┌──────────────┐                           
    │              │       │              │                           
    │    CLIENT    │       │    CLIENT    │                           
    │              │       │              │                           
    └──────┬───────┘       └──────────────┘                           
           │               Proceed to Payment                          
           │                                                            
           │ PAYMENT REQUIRED                                           
           │                                                            
           ▼                                                            
    ┌──────────────┐                                                   
    │   PROCESS 6  │                                                   
    │   PAYMENT    │                                                   
    └──────────────┘                                                   
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **5.1** | Enter Job Details | Client enters service type, date, time, and address |
| **5.2** | Upload Photos | Client uploads photos of the job site (optional) |
| **5.3** | Add Notes | Client adds additional notes or instructions (optional) |
| **5.4** | Review Booking | Client reviews all booking details before confirming |
| **5.5** | Create Booking | System creates booking record with status 'pending_payment' |

---

## Data Dictionary - Process 5

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **serviceType** | Type of service requested | Client | Firestore (bookings) |
| **scheduledDate** | Date of service | Client | Firestore (bookings) |
| **scheduledTime** | Time of service | Client | Firestore (bookings) |
| **serviceAddress** | Location of service | Client | Firestore (bookings) |
| **jobPhotos** | Photos of job site | Client | Firestore (bookings) |
| **jobNotes** | Additional instructions | Client | Firestore (bookings) |
| **bookingId** | Unique booking identifier | System | Client |
| **bookingStatus** | Current booking status | System | Firestore (bookings) |

---

## Booking Status Flow

```
pending_payment → pending_admin_approval → approved → accepted → in_progress → completed
```

---

## Required Fields

```
✓ Service Type
✓ Date & Time
✓ Service Address
✓ Selected Provider
○ Photos (optional)
○ Notes (optional)
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
│     5.X       │     Process
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
