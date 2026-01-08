# PROCESS 3: JOB MATCHING

## Level 1 DFD - Job Matching Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PROCESS 3: JOB MATCHING                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘


                                         ┌──────────────┐
                                         │              │
                                         │    CLIENT    │
                                         │              │
                                         └──────┬───────┘
                                                │
                                                │ Open Home Screen
                                                ▼
                                        ╭───────────────╮
                                        │      3.1      │
                                        │     LOAD      │
                                        │   PROVIDERS   │
                                        ╰───────┬───────╯
                                                │
                                                │ Query Online Providers
                                                ▼
                                        ╔═══════════════╗
                                        ║               ║
                                        ║    USERS      ║
                                        ║  (Firestore)  ║
                                        ║               ║
                                        ╚═══════╤═══════╝
                                                │
                                                │ Provider List
                                                ▼
                                        ╭───────────────╮
                                        │      3.2      │
                                        │    DISPLAY    │
                                        │   PROVIDERS   │
                                        │  (Map + Cards)│
                                        ╰───────┬───────╯
                                                │
                                                ▼
                                        ╭───────────────╮
                                        │      3.3      │
                                        │    FILTER     │
                                        │   & SORT      │
                                        ╰───────┬───────╯
                                                │
                                                ▼
                                        ╭───────────────╮
                                        │      3.4      │
                                        │    SELECT     │
                                        │   PROVIDER    │
                                        ╰───────┬───────╯
                                                │
                                                │ Selected Provider
                                                ▼
                                        ╭───────────────╮
                                        │      3.5      │
                                        │     VIEW      │
                                        │   DETAILS     │
                                        │   & ROUTE     │
                                        ╰───────┬───────╯
                                                │
                                                │ Route Request
                                                ▼
                                        ┌───────────────┐
                                        │               │
                                        │     OSRM      │
                                        │   (Routing)   │
                                        │               │
                                        └───────┬───────┘
                                                │
                                                │ Route + Distance
                                                ▼
                                        ╭───────────────╮
                                        │      3.6      │
                                        │   CONTACT     │
                                        │   PROVIDER    │
                                        ╰───────────────╯
                                                │
                                                │ Navigate to Booking
                                                ▼
                                        ┌───────────────┐
                                        │               │
                                        │   PROCESS 4   │
                                        │   BOOKING     │
                                        │               │
                                        └───────────────┘
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **3.1** | Load Providers | Query Firestore for online, approved providers |
| **3.2** | Display Providers | Show providers on map markers and card list |
| **3.3** | Filter & Sort | Filter by category, sort by recommended/cheapest/nearest |
| **3.4** | Select Provider | Client taps on provider card or map marker |
| **3.5** | View Details & Route | Show provider info modal, draw route on map |
| **3.6** | Contact Provider | Navigate to booking screen |

---

## Job Matching Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              JOB MATCHING FLOW                                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    CLIENT                      SYSTEM                          EXTERNAL SERVICES
      │                            │                                    │
      │  3.1 Open Home Screen      │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │                            │  3.1 Query Online Providers        │
      │                            │───────────────────────────────────▶│ FIREBASE
      │                            │                                    │
      │  3.2 View Map + Cards      │                                    │
      │◀───────────────────────────│                                    │
      │                            │                                    │
      │  3.3 Filter by Category    │                                    │
      │      Sort by Nearest       │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │  3.4 Tap Provider          │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
      │                            │  3.5 Fetch Route                   │
      │                            │───────────────────────────────────▶│ OSRM
      │                            │                                    │
      │  3.5 View Provider Modal   │                                    │
      │◀───────────────────────────│                                    │
      │                            │                                    │
      │  3.6 Tap "Contact Us"      │                                    │
      │───────────────────────────▶│                                    │
      │                            │                                    │
```

---

## Data Dictionary - Process 3

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **providers** | List of online providers | Firestore | Client App |
| **serviceCategory** | Provider's service type | Firestore | Filter |
| **fixedPrice** | Provider's rate | Firestore | Sort, Display |
| **rating** | Provider's average rating | Firestore | Sort, Display |
| **distance** | Distance from client | Calculation | Sort, Display |
| **routeCoordinates** | Route polyline | OSRM | Map Display |

---

## Legend

```
╭───────────────╮
│     3.X       │     Process
╰───────────────╯

╔═══════════════╗
║  DATA STORE   ║     Data Store
╚═══════════════╝

─────────────────▶    Data Flow
```

