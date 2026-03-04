# PROCESS 9: SERVICE EXECUTION

## Level 1 DFD - Service Execution

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          PROCESS 9: SERVICE EXECUTION                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                                                    
    │              │                                                    
    │   PROVIDER   │                                                    
    │              │                                                    
    └──────┬───────┘                                                    
           │                                                            
           │ Start Travel                                               
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │      9.1      │──────────────┐                                   
    │  START TRAVEL │              │ Update Status                      
    │               │              │                                   
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║   BOOKINGS    ║                           
            │              ║  (Firestore)  ║                           
            │              ║    status:    ║                           
            │              ║ 'in_progress' ║                           
            │              ╚═══════════════╝                           
            │                                                           
            │ Track Location                                            
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      9.2      │──────────────┐                                   
    │     TRACK     │              │ Stream Location                    
    │   LOCATION    │              │                                   
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║   LOCATION    ║                           
            │              ║   SERVICE     ║                           
            │              ║  (Firebase)   ║                           
            │              ╚═══════╤═══════╝                           
            │                      │                                   
            │                      │ Location Stream                   
            │                      │                                   
            │                      ▼                                   
            │              ┌──────────────┐                            
            │              │    CLIENT    │                            
            │              │ Track        │                            
            │              │ Provider     │                            
            │              └──────────────┘                            
            │                                                           
            │ Arrive at Site                                            
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      9.3      │──────────────┐                                   
    │    ARRIVE     │              │ Update Status                      
    │               │              │                                   
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║   BOOKINGS    ║                           
            │              ║  (Firestore)  ║                           
            │              ║  arrivedAt:   ║                           
            │              ║  timestamp    ║                           
            │              ╚═══════════════╝                           
            │                                                           
            │ Start Work                                                
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      9.4      │──────────────┐                                   
    │  START WORK   │              │ Update Status                      
    │               │              │                                   
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║   BOOKINGS    ║                           
            │              ║  (Firestore)  ║                           
            │              ║  startedAt:   ║                           
            │              ║  timestamp    ║                           
            │              ╚═══════════════╝                           
            │                                                           
            │ Complete Work                                             
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      9.5      │──────────────┐                                   
    │   COMPLETE    │              │ Update Status                      
    │     WORK      │              │                                   
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║   BOOKINGS    ║                           
            │              ║  (Firestore)  ║                           
            │              ║    status:    ║                           
            │              ║ 'completed'   ║                           
            │              ╚═══════╤═══════╝                           
            │                      │                                   
            │ Job Completed        │ Notify Client                     
            │                      │                                   
            ▼                      ▼                                   
    ┌──────────────┐       ┌──────────────┐                           
    │   PROVIDER   │       │    CLIENT    │                           
    │ Awaiting     │       │ Confirm      │                           
    │ Payment      │       │ Completion   │                           
    └──────────────┘       └──────────────┘                           
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **9.1** | Start Travel | Provider starts traveling to client location |
| **9.2** | Track Location | System tracks provider's real-time location |
| **9.3** | Arrive | Provider arrives at client's location |
| **9.4** | Start Work | Provider starts performing the service |
| **9.5** | Complete Work | Provider completes the service |

---

## Data Dictionary - Process 9

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **bookingStatus** | Current job status | System | Firestore (bookings) |
| **providerLocation** | Real-time GPS coordinates | Provider Device | Firebase |
| **arrivedAt** | Arrival timestamp | System | Firestore (bookings) |
| **startedAt** | Work start timestamp | System | Firestore (bookings) |
| **completedAt** | Completion timestamp | System | Firestore (bookings) |

---

## Service Status Flow

```
accepted → in_progress (traveling) → arrived → working → completed
```

---

## Location Tracking

```
1. Provider starts travel
2. GPS location streamed to Firebase
3. Client sees real-time location on map
4. Provider arrives (location verified)
5. Provider starts work
6. Provider completes work
7. Client confirms completion
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
│     9.X       │     Process
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
