# PROCESS 4: JOB MATCHING

## Level 1 DFD - Job Matching Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                             PROCESS 4: JOB MATCHING                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐                                                    
    │              │                                                    
    │    CLIENT    │                                                    
    │              │                                                    
    └──────┬───────┘                                                    
           │                                                            
           │ Browse Providers                                           
           │                                                            
           ▼                                                            
    ╭───────────────╮                                                   
    │      4.1      │──────────────┐                                   
    │    SEARCH     │              │ Query                              
    │   PROVIDERS   │              │                                   
    ╰───────────────╯              │                                   
                                   ▼                                   
                            ╔═══════════════╗                          
                            ║               ║                          
                            ║     USERS     ║                          
                            ║  (Firestore)  ║                          
                            ║     ROLE:     ║                          
                            ║   PROVIDER    ║                          
                            ║    status:    ║                          
                            ║  'approved'   ║                          
                            ║   isOnline:   ║                          
                            ║     true      ║                          
                            ╚═══════╤═══════╝                          
                                    │                                   
                                    │ Provider List                     
                                    │                                   
                                    ▼                                   
                            ╭───────────────╮                          
                            │      4.2      │                          
                            │    FILTER     │                          
                            │   PROVIDERS   │                          
                            │ -By Service   │                          
                            │ -By Location  │                          
                            │ -Online Only  │                          
                            ╰───────┬───────╯                          
                                    │                                   
                                    │ Filtered List                     
                                    │                                   
                                    ▼                                   
                            ╭───────────────╮                          
                            │      4.3      │                          
                            │  RANK & SORT  │                          
                            │ -By Rating    │                          
                            │ -By Distance  │                          
                            │ -By Price     │                          
                            │  (Cheapest,   │                          
                            │   Nearest)    │                          
                            ╰───────┬───────╯                          
                                    │                                   
                                    │ Sorted List                       
                                    │                                   
                                    ▼                                   
                            ╭───────────────╮                          
                            │      4.4      │                          
                            │    DISPLAY    │                          
                            │   PROVIDERS   │                          
                            ╰───────┬───────╯                          
                                    │                                   
                                    │ Provider Details                  
                                    │                                   
                                    ▼                                   
                            ┌───────────────┐                          
                            │    CLIENT     │                          
                            │ View Providers│                          
                            └───────┬───────┘                          
                                    │                                   
                                    │ Select Provider                   
                                    │                                   
                                    ▼                                   
                            ╭───────────────╮                          
                            │      4.5      │                          
                            │    SELECT     │                          
                            │   PROVIDER    │                          
                            ╰───────┬───────╯                          
                                    │                                   
                                    │ Proceed to Booking                
                                    │                                   
                                    ▼                                   
                            ┌───────────────┐                          
                            │    CLIENT     │                          
                            │ Create Booking│                          
                            └───────────────┘                          
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **4.1** | Search Providers | System searches for available providers |
| **4.2** | Filter Providers | System filters providers by service category, location, and online status |
| **4.3** | Rank & Sort | System ranks providers by rating, distance, and price (cheapest, nearest) |
| **4.4** | Display Providers | System displays matched providers to client with details |
| **4.5** | Select Provider | Client selects a provider to proceed with booking |

---

## Data Dictionary - Process 4

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **serviceCategory** | Type of service needed | Client | System |
| **clientLocation** | Client's location | Client | System |
| **providerList** | List of available providers | Firestore | Client |
| **providerRating** | Provider's average rating | Firestore | Client |
| **providerDistance** | Distance from client | System | Client |
| **providerPrice** | Provider's hourly rate | Firestore | Client |
| **selectedProvider** | Provider chosen by client | Client | System |

---

## Matching Criteria

```
Provider must be:
1. APPROVED by admin
2. ONLINE (isOnline: true)
3. Offers the requested SERVICE
4. Within service RADIUS (e.g., 10km)
5. No conflicting bookings
```

---

## Sorting Priority

```
1. Rating (highest first)
2. Distance (nearest first)
3. Price (cheapest first)
4. Completed jobs count
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
│     4.X       │     Process
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
