# PROCESS 9: SERVICE EXECUTION

## Level 1 DFD - Service Execution Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PROCESS 9: SERVICE EXECUTION                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘


    ┌──────────────┐                                                    ┌──────────────┐
    │              │                                                    │              │
    │    CLIENT    │                                                    │   PROVIDER   │
    │              │                                                    │              │
    └──────┬───────┘                                                    └──────┬───────┘
           │                                                                   │
           │                                                                   │ [FROM PROCESS 8]
           │                                                                   │ Job accepted
           │                                                                   ▼
           │                                                            ╭───────────────╮
           │                                                            │      9.1      │
           │                                                            │     START     │
           │                                                            │    TRAVEL     │
           │                                                            ╰───────┬───────╯
           │                                                                   │
           │                                                                   │ [ACTION]
           │                                                                   │ Provider taps "I'm on my way"
           │                                                                   ▼
           │                                                            ╔═══════════════╗
           │                                                            ║               ║
           │                                                            ║   BOOKINGS    ║
           │                                                            ║  (Firestore)  ║
           │                                                            ║               ║
           │                                                            ║ status:       ║
           │                                                            ║  'traveling'  ║
           │                                                            ║ travelStarted:║
           │                                                            ║  timestamp    ║
           │                                                            ╚═══════╤═══════╝
           │                                                                   │
           │                                                                   │ [TRIGGER]
           │                                                                   │ Send notification to client
           │                                                                   │
           │  [NOTIFICATION]                                                   │
           │  "Provider is on the way"                                         │
           │◀──────────────────────────────────────────────────────────────────┘
           │
           │ [REALTIME]
           │ Subscribe to location updates
           ▼
    ╭───────────────╮                                                   ╭───────────────╮
    │      9.2      │                                                   │      9.3      │
    │     TRACK     │◀────[REALTIME]─Real-Time Location─────────────────│     TRACK     │
    │   PROVIDER    │     Subscribe to GPS updates                      │   LOCATION    │
    │   LOCATION    │                                                   │   (Provider)  │
    ╰───────────────╯                                                   ╰───────┬───────╯
           │                                                                   │
           │                                                                   │ [UPDATE]
           │                                                                   │ GPS coordinates every 5s
           │                                                                   ▼
           │                                                            ╔═══════════════╗
           │                                                            ║               ║
           │                                                            ║   BOOKINGS    ║
           │                                                            ║  (Firestore)  ║
           │                                                            ║               ║
           │                                                            ║ providerLat:  ║
           │                                                            ║  XX.XXXX      ║
           │                                                            ║ providerLng:  ║
           │                                                            ║  XXX.XXXX     ║
           │                                                            ╚═══════╤═══════╝
           │                                                                   │
           │                                                                   │ [ACTION]
           │                                                                   │ Provider marks arrived
           │                                                                   ▼
           │                                                            ╭───────────────╮
           │                                                            │      9.4      │
           │                                                            │     MARK      │
           │                                                            │    ARRIVED    │
           │                                                            ╰───────┬───────╯
           │                                                                   │
           │                                                                   │ [ACTION]
           │                                                                   │ Provider taps "I've arrived"
           │                                                                   ▼
           │                                                            ╔═══════════════╗
           │                                                            ║               ║
           │                                                            ║   BOOKINGS    ║
           │                                                            ║  (Firestore)  ║
           │                                                            ║               ║
           │                                                            ║ status:       ║
           │                                                            ║  'arrived'    ║
           │                                                            ║ arrivedAt:    ║
           │                                                            ║  timestamp    ║
           │                                                            ╚═══════╤═══════╝
           │                                                                   │
           │                                                                   │ [TRIGGER]
           │                                                                   │ Send notification to client
           │                                                                   │
           │  [NOTIFICATION]                                                   │
           │  "Provider has arrived"                                           │
           │◀──────────────────────────────────────────────────────────────────┘
           │
           │                                                                   │ [ACTION]
           │                                                                   │ Provider starts work
           │                                                                   ▼
           │                                                            ╭───────────────╮
           │                                                            │      9.5      │
           │                                                            │     START     │
           │                                                            │     WORK      │
           │                                                            ╰───────┬───────╯
           │                                                                   │
           │                                                                   │ Update Status
           │                                                                   ▼
           │                                                            ╔═══════════════╗
           │                                                            ║               ║
           │                                                            ║   BOOKINGS    ║
           │                                                            ║  (Firestore)  ║
           │                                                            ║               ║
           │                                                            ║ status:       ║
           │                                                            ║  'in_progress'║
           │                                                            ║ workStarted:  ║
           │                                                            ║  timestamp    ║
           │                                                            ╚═══════╤═══════╝
           │                                                                   │
           │  Notification: "Work has started"                                 │
           │◀──────────────────────────────────────────────────────────────────┘
           │
           │                                                                   │ Complete Work
           │                                                                   ▼
           │                                                            ╭───────────────╮
           │                                                            │      9.6      │
           │                                                            │    COMPLETE   │
           │                                                            │     WORK      │
           │                                                            ╰───────┬───────╯
           │                                                                   │
           │                                                                   │ Update Status
           │                                                                   ▼
           │                                                            ╔═══════════════╗
           │                                                            ║               ║
           │                                                            ║   BOOKINGS    ║
           │                                                            ║  (Firestore)  ║
           │                                                            ║               ║
           │                                                            ║ status:       ║
           │                                                            ║  'pending_    ║
           │                                                            ║   completion' ║
           │                                                            ║ workCompleted:║
           │                                                            ║  timestamp    ║
           │                                                            ╚═══════╤═══════╝
           │                                                                   │
           │  Notification: "Work completed. Please confirm"                   │
           │◀──────────────────────────────────────────────────────────────────┘
           │
           │  Confirm Completion
           ▼
    ╭───────────────╮
    │      9.7      │
    │    CLIENT     │
    │   CONFIRMS    │
    │  COMPLETION   │
    ╰───────┬───────╯
            │
            │ [UPDATE]
            │ Set status='completed'
            ▼
    ╔═══════════════╗
    ║               ║
    ║   BOOKINGS    ║
    ║  (Firestore)  ║
    ║               ║
    ║ status:       ║
    ║  'completed'  ║
    ║ completedAt:  ║
    ║  timestamp    ║
    ║ confirmedBy:  ║
    ║  clientId     ║
    ╚═══════╤═══════╝
            │
            │ [TO PROCESS 10]
            │ Proceed to rating
            ▼
    ┌───────────────┐
    │               │
    │   PROCESS 10  │
    │   FEEDBACK &  │
    │    RATING     │
    │               │
    └───────────────┘
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **9.1** | Start Travel | Provider marks "On the way" (status: 'traveling') |
| **9.2** | Track Provider Location (Client) | Client views provider's real-time location on map |
| **9.3** | Track Location (Provider) | Provider's GPS location continuously updated |
| **9.4** | Mark Arrived | Provider marks "Arrived" at client location (status: 'arrived') |
| **9.5** | Start Work | Provider marks "Work started" (status: 'in_progress') |
| **9.6** | Complete Work | Provider marks "Work completed" (status: 'pending_completion') |
| **9.7** | Client Confirms Completion | Client confirms work is done (status: 'completed') |

---

## Service Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          SERVICE EXECUTION FLOW                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    PROVIDER                    SYSTEM                          CLIENT
      │                            │                               │
      │  9.1 Start Travel          │                               │
      │  (Tap "On the way")        │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │                            │  Update:                      │
      │                            │  • status: 'traveling'        │
      │                            │  • travelStartedAt: now       │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  Notify Client                │
      │                            │──────────────────────────────▶│
      │                            │                               │  "Provider is on
      │                            │                               │   the way!"
      │  9.3 GPS Updates           │                               │
      │  (Every 5 seconds)         │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │                            │  Update Location              │
      │                            │  • providerLat: XX.XXXX       │
      │                            │  • providerLng: XXX.XXXX      │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  Real-Time Location           │
      │                            │──────────────────────────────▶│
      │                            │                               │  9.2 View Map
      │                            │                               │  (See provider
      │                            │                               │   moving)
      │  9.4 Mark Arrived          │                               │
      │  (Tap "Arrived")           │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │                            │  Update:                      │
      │                            │  • status: 'arrived'          │
      │                            │  • arrivedAt: now             │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  Notify Client                │
      │                            │──────────────────────────────▶│
      │                            │                               │  "Provider has
      │                            │                               │   arrived!"
      │  9.5 Start Work            │                               │
      │  (Tap "Start Work")        │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │                            │  Update:                      │
      │                            │  • status: 'in_progress'      │
      │                            │  • workStartedAt: now         │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  Notify Client                │
      │                            │──────────────────────────────▶│
      │                            │                               │  "Work has
      │                            │                               │   started"
      │  [Performing Work...]      │                               │
      │                            │                               │
      │  9.6 Complete Work         │                               │
      │  (Tap "Complete")          │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │                            │  Update:                      │
      │                            │  • status: 'pending_          │
      │                            │    completion'                │
      │                            │  • workCompletedAt: now       │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  Notify Client                │
      │                            │──────────────────────────────▶│
      │                            │                               │  "Work completed!
      │                            │                               │   Please confirm"
      │                            │                               │
      │                            │  9.7 Client Confirms          │
      │                            │◀──────────────────────────────│
      │                            │                               │
      │                            │  Update:                      │
      │                            │  • status: 'completed'        │
      │                            │  • completedAt: now           │
      │                            │  • confirmedBy: clientId      │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  Proceed to Rating            │
      │                            │──────────────────────────────▶│
      │                            │                               │
```

---

## Data Dictionary - Process 9

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **travelStartedAt** | Timestamp when travel started | System | Firestore (bookings) |
| **providerLat** | Provider's current latitude | Provider GPS | Firestore (bookings) |
| **providerLng** | Provider's current longitude | Provider GPS | Firestore (bookings) |
| **arrivedAt** | Timestamp when provider arrived | System | Firestore (bookings) |
| **workStartedAt** | Timestamp when work started | System | Firestore (bookings) |
| **workCompletedAt** | Timestamp when work completed | System | Firestore (bookings) |
| **completedAt** | Timestamp when client confirmed | System | Firestore (bookings) |
| **confirmedBy** | Client who confirmed completion | Client | Firestore (bookings) |
| **travelDuration** | Time taken to travel (minutes) | System | Firestore (bookings) |
| **workDuration** | Time taken to complete work (minutes) | System | Firestore (bookings) |

---

## Status Progression

```
accepted → traveling → arrived → in_progress → pending_completion → completed
```

| Status | Description | Duration |
|--------|-------------|----------|
| **traveling** | Provider is on the way | Variable (GPS tracked) |
| **arrived** | Provider has arrived at location | Brief |
| **in_progress** | Provider is performing the work | Variable |
| **pending_completion** | Work done, awaiting client confirmation | Until client confirms |
| **completed** | Client confirmed completion | Final |

---

## Real-Time Location Tracking

### GPS Update Frequency
- **Update Interval:** Every 5 seconds
- **Accuracy:** High accuracy mode (GPS + Network)
- **Battery Optimization:** Balanced power mode

### Location Data
```javascript
{
  providerLat: 10.1335,
  providerLng: 124.8513,
  accuracy: 10, // meters
  timestamp: serverTimestamp(),
  speed: 5.2, // km/h (optional)
  heading: 180 // degrees (optional)
}
```

### Map Display (Client Side)
- Provider's current location (marker)
- Client's location (marker)
- Route between locations (polyline)
- Estimated arrival time
- Distance remaining

---

## Time Tracking

### Travel Time
```
travelDuration = arrivedAt - travelStartedAt
```

### Work Time
```
workDuration = workCompletedAt - workStartedAt
```

### Total Service Time
```
totalDuration = completedAt - travelStartedAt
```

---

## Notifications

| Event | Recipient | Message |
|-------|-----------|---------|
| **Travel Started** | Client | "Provider is on the way!" |
| **Arrived** | Client | "Provider has arrived at your location" |
| **Work Started** | Client | "Work has started" |
| **Work Completed** | Client | "Work completed! Please confirm and rate" |
| **Client Confirmed** | Provider | "Client confirmed completion. Payment will be released" |

---

## Client Confirmation

### Confirmation Options
1. **Confirm Completion**
   - Work is satisfactory
   - Proceed to rating

2. **Report Issue**
   - Work not completed
   - Quality issues
   - Admin review required

### After Confirmation
- Status: 'completed'
- Proceed to Process 10 (Feedback & Rating)
- Payment released to provider

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
