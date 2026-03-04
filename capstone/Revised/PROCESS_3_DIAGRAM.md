    # PROCESS 3: ADMIN VERIFICATION

## Level 1 DFD - Admin Verification of Provider

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          PROCESS 3: ADMIN VERIFICATION                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                                                    
    │              │                                                    
    │    ADMIN     │                                                    
    │              │                                                    
    └──────┬───────┘                                                    
           │                                                            
           │ View Pending Providers                                     
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │      3.1      │──────────────┐                                   
    │     VIEW      │              │ Query                              
    │   PROVIDERS   │              │                                   
    ╰───────────────╯              │                                   
                                   ▼                                   
                            ╔═══════════════╗                          
                            ║               ║                          
                            ║     USERS     ║                          
                            ║  (Firestore)  ║                          
                            ║ProviderStatus:║                          
                            ║   "pending"   ║                          
                            ╚═══════╤═══════╝                          
                                    │                                   
                                    │ Provider Details                  
                                    │                                   
                                    ▼                                   
                            ╭───────────────╮                          
                            │      3.2      │                          
                            │    REVIEW     │                          
                            │   DOCUMENTS   │                          
                            │  -Valid ID    │                          
                            │  -Selfie      │                          
                            │  -Clearances  │                          
                            ╰───────┬───────╯                          
                                    │                                   
                                    │ Decision                          
                                    │                                   
                    ┌───────────────┼───────────────┐                  
                    │               │               │                  
                    │ Approve       │ Reject        │                  
                    │               │               │                  
                    ▼               ▼               ▼                  
            ╭───────────────╮  ╭───────────────╮  ┌───────────────┐  
            │      3.3      │  │      3.4      │  │    ADMIN      │  
            │    APPROVE    │  │    REJECT     │  │   (Back to    │  
            │   PROVIDER    │  │   PROVIDER    │  │   Dashboard)  │  
            ╰───────┬───────╯  ╰───────┬───────╯  └───────────────┘  
                    │               │                                   
                    │ Update        │ Update                            
                    │               │                                   
                    ▼               ▼                                   
            ╔═══════════════╗  ╔═══════════════╗                      
            ║     USERS     ║  ║     USERS     ║                      
            ║  (Firestore)  ║  ║  (Firestore)  ║                      
            ║    status:    ║  ║    status:    ║                      
            ║  'approved'   ║  ║  'rejected'   ║                      
            ╚═══════╤═══════╝  ╚═══════╤═══════╝                      
                    │               │                                   
                    │ Notification  │ Notification                      
                    │               │                                   
                    ▼               ▼                                   
            ┌───────────────┐  ┌───────────────┐                      
            │   PROVIDER    │  │   PROVIDER    │                      
            │  (Approved)   │  │  (Rejected)   │                      
            │ Can Go Online │  │ Cannot Access │                      
            └───────────────┘  └───────────────┘                      
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **3.1** | View Providers | Admin views all pending provider registrations |
| **3.2** | Review Documents | Admin reviews provider's uploaded documents (Valid ID, Selfie with ID, Barangay Clearance, Police Clearance) |
| **3.3** | Approve Provider | Admin approves provider (status: 'approved') - provider can now go online |
| **3.4** | Reject Provider | Admin rejects provider (status: 'rejected') - provider cannot access system |

---

## Data Dictionary - Process 3

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **providerStatus** | Provider verification status | Admin Action | Firestore (users) |
| **approvedAt** | Timestamp of approval | System | Firestore (users) |
| **rejectedAt** | Timestamp of rejection | System | Firestore (users) |
| **rejectionReason** | Reason for rejection | Admin | Firestore (users) |
| **verifiedBy** | Admin who verified | Admin | Firestore (users) |

---

## Provider Status Flow

```
pending → approved → can_go_online
        ↓
     rejected
```

---

## Provider Status Values

| Status | Description | Provider Access |
|--------|-------------|-----------------|
| **pending** | Awaiting admin verification | Cannot go online |
| **approved** | Admin approved documents | Can toggle online/offline |
| **rejected** | Admin rejected application | Cannot access system |

---

## Legend

```
┌───────────────┐
│               │     External Entity
│    ENTITY     │
│               │
└───────────────┘

╭───────────────╮
│     3.X       │     Process
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
