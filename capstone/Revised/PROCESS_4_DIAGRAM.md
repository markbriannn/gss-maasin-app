# PROCESS 4: JOB EXECUTION

## Level 1 DFD - Job Execution Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            PROCESS 4: JOB EXECUTION                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                                                    
    │              │                                                    
    │   PROVIDER   │                                                    
    │              │                                                    
    └──────┬───────┘                                                    
           │                                                            
           │ Accept/Reject Job                                          
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │      4.1      │──────────────┐                                   
    │ JOB RESPONSE  │              │ Update Status                      
    │               │              │                                   
    ╰───────┬───────╯              ▼                                   
            │              ╔═══════════════╗                           
            │              ║               ║                           
            │              ║   BOOKINGS    ║                           
            │              ║  (Firestore)  ║                           
            │              ║               ║                           
            │              ╚═══════╤═══════╝                           
            │                      │                                   
            │ If Accepted          │ Notify Client                     
            │                      │                                   
            ▼                      ▼                                   
    ╭───────────────╮      ┌──────────────┐                           
    │      4.2      │      │              │                           
    │START TRACKING │      │    CLIENT    │                           
    │               │      │              │                           
    ╰───────┬───────╯      └──────────────┘                           
            │              Job Accepted/Rejected                       
            │                                                           
            │ Provider Location                                         
            │ Updates (Real-time)                                       
            │                                                           
            ▼                                                           
    ╔═══════════════╗                                                  
    ║               ║                                                  
    ║   LOCATION    ║                                                  
    ║   SERVICE     ║                                                  
    ║  (Firebase)   ║                                                  
    ║               ║                                                  
    ╚═══════╤═══════╝                                                  
            │                                                           
            │ Location Stream                                           
            │                                                           
            ▼                                                           
    ┌──────────────┐                                                   
    │              │                                                   
    │    CLIENT    │                                                   
    │              │                                                   
    └──────────────┘                                                   
    Track Provider                                                     
            │                                                           
            │ Provider Arrives                                          
            │                                                           
            ▼                                                           
    ╭───────────────╮                                                   
    │      4.3      │──────────────┐                                   
    │  START JOB    │              │ Update Status                      
    │               │              │ (IN_PROGRESS)                      
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║               ║                           
            │              ║   BOOKINGS    ║                           
            │              ║  (Firestore)  ║                           
            │              ║               ║                           
            │              ╚═══════╤═══════╝                           
            │                      │                                   
            │ Job Started          │ Notify Client                     
            │                      │                                   
            ▼                      ▼                                   
    ┌──────────────┐       ┌──────────────┐                           
    │              │       │              │                           
    │   PROVIDER   │       │    CLIENT    │                           
    │              │       │              │                           
    └──────┬───────┘       └──────────────┘                           
           │               Job In Progress                             
           │                                                            
           │ Complete Job                                               
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │      4.4      │──────────────┐                                   
    │ COMPLETE JOB  │              │ Update Status                      
    │               │              │ (COMPLETED)                        
    ╰───────┬───────╯              │                                   
            │                      ▼                                   
            │              ╔═══════════════╗                           
            │              ║               ║                           
            │              ║   BOOKINGS    ║                           
            │              ║  (Firestore)  ║                           
            │              ║               ║                           
            │              ╚═══════╤═══════╝                           
            │                      │                                   
            │ Job Completed        │ Notify Client                     
            │                      │                                   
            ▼                      ▼                                   
    ┌──────────────┐       ┌──────────────┐                           
    │              │       │              │                           
    │   PROVIDER   │       │    CLIENT    │                           
    │              │       │              │                           
    └──────────────┘       └──────┬───────┘                           
    Awaiting Payment               │                                   
                                   │ Confirm Completion                
                                   │                                   
                                   ▼                                   
                           ╭───────────────╮                           
                           │      4.5      │                           
                           │CONFIRM & RATE │                           
                           │               │                           
                           ╰───────┬───────╯                           
                                   │                                   
                                   │ Rating & Review                   
                                   │                                   
                                   ▼                                   
                           ╔═══════════════╗                           
                           ║               ║                           
                           ║    REVIEWS    ║                           
                           ║  (Firestore)  ║                           
                           ║               ║                           
                           ╚═══════╤═══════╝                           
                                   │                                   
                                   │ Update Stats                      
                                   │                                   
                                   ▼                                   
                           ╔═══════════════╗                           
                           ║               ║                           
                           ║     USERS     ║                           
                           ║  (Firestore)  ║                           
                           ║               ║                           
                           ╚═══════════════╝                           
```

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **4.1** | Job Response | Provider accepts or rejects the job request |
| **4.2** | Start Tracking | System tracks provider's real-time location as they travel to client |
| **4.3** | Start Job | Provider arrives and starts the job, status changes to IN_PROGRESS |
| **4.4** | Complete Job | Provider marks job as completed when service is finished |
| **4.5** | Confirm & Rate | Client confirms completion and rates the provider's service |

## Data Flows

- **Accept/Reject Job**: Provider's decision on job request
- **Update Status**: Booking status updated in Firestore (ACCEPTED, REJECTED, IN_PROGRESS, COMPLETED)
- **Notify Client**: Push notification sent to client about job status
- **Job Accepted/Rejected**: Client receives notification of provider's decision
- **Provider Location Updates**: Real-time GPS coordinates sent to Firebase Location Service
- **Location Stream**: Continuous location updates streamed to client for tracking
- **Track Provider**: Client views provider's location on map in real-time
- **Provider Arrives**: Provider reaches client's location
- **Job Started**: Notification that service has begun
- **Job In Progress**: Both parties notified that work is ongoing
- **Complete Job**: Provider marks service as finished
- **Job Completed**: Client receives notification that service is done
- **Awaiting Payment**: Provider waits for payment processing
- **Confirm Completion**: Client verifies that service is satisfactory
- **Rating & Review**: Client submits rating (1-5 stars) and written review
- **Update Stats**: Provider's rating, completed jobs count, and earnings updated in database

## Job Status Flow

1. **PENDING** → Initial booking created
2. **CONFIRMED** → Provider assigned to job
3. **ACCEPTED** → Provider accepts the job
4. **IN_PROGRESS** → Provider starts working
5. **COMPLETED** → Provider finishes job
6. **REVIEWED** → Client rates and reviews (final state)

Alternative: **REJECTED** → Provider declines job (client must select another provider)

## External Services

- **Location Service (Firebase)**: Real-time location tracking and streaming service
