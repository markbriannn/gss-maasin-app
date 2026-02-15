# PROCESS 8: PROVIDER RESPONSE

## Level 1 DFD - Provider Response Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            PROCESS 8: PROVIDER RESPONSE                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘


    ┌──────────────┐                                                    ┌──────────────┐
    │              │                                                    │              │
    │    CLIENT    │                                                    │   PROVIDER   │
    │              │                                                    │              │
    └──────┬───────┘                                                    └──────┬───────┘
           │                                                                   │
           │                                                                   │ [FROM PROCESS 7]
           │                                                                   │ Job approved notification
           │                                                                   ▼
           │                                                            ╭───────────────╮
           │                                                            │      8.1      │
           │                                                            │     VIEW      │
           │                                                            │   NEW JOB     │
           │                                                            │   REQUEST     │
           │                                                            ╰───────┬───────╯
           │                                                                   │
           │                                                                   │ [QUERY]
           │                                                                   │ Fetch booking details
           │                                                                   ▼
           │                                                            ╔═══════════════╗
           │                                                            ║               ║
           │                                                            ║   BOOKINGS    ║
           │                                                            ║  (Firestore)  ║
           │                                                            ║               ║
           │                                                            ║ status:       ║
           │                                                            ║  'pending_    ║
           │                                                            ║   provider_   ║
           │                                                            ║   response'   ║
           │                                                            ╚═══════╤═══════╝
           │                                                                   │
           │                                                                   │ [DATA]
           │                                                                   │ Job information
           │                                                                   ▼
           │                                                            ╭───────────────╮
           │                                                            │      8.2      │
           │                                                            │     VIEW      │
           │                                                            │   JOB         │
           │                                                            │   DETAILS     │
           │                                                            ╰───────┬───────╯
           │                                                                   │
           │                                                                   │ [DISPLAY]
           │                                                                   │ • Client Info
           │                                                                   │ • Location
           │                                                                   │ • Service Type
           │                                                                   │ • Payment
           │                                                                   │ • Photos
           │                                                                   ▼
           │                                                            ╭───────────────╮
           │                                                            │      8.3      │
           │                                                            │    DECIDE     │
           │                                                            │   RESPONSE    │
           │                                                            ╰───────┬───────╯
           │                                                                   │
           │                                                                   │ [DECISION]
           │                                    ┌──────────────────────────────┼──────────────────────────────┐
           │                                    │                              │                              │
           │                                    ▼                              ▼                              ▼
           │                             ╭───────────────╮             ╭───────────────╮             ╭───────────────╮
           │                             │      8.4      │             │      8.5      │             │      8.6      │
           │                             │    ACCEPT     │             │    DECLINE    │             │    IGNORE     │
           │                             │      JOB      │             │      JOB      │             │   (TIMEOUT)   │
           │                             ╰───────┬───────╯             ╰───────┬───────╯             ╰───────┬───────╯
           │                                    │                              │                              │
           │                                    │ [UPDATE]                     │ [UPDATE]                     │ [AUTO-UPDATE]
           │                                    │ Set status='accepted'        │ Set status='declined'        │ After 15 min timeout
           │                                    ▼                              ▼                              ▼
           │                             ╔═══════════════╗             ╔═══════════════╗             ╔═══════════════╗
           │                             ║               ║             ║               ║             ║               ║
           │                             ║   BOOKINGS    ║             ║   BOOKINGS    ║             ║   BOOKINGS    ║
           │                             ║  (Firestore)  ║             ║  (Firestore)  ║             ║  (Firestore)  ║
           │                             ║               ║             ║               ║             ║               ║
           │                             ║ status:       ║             ║ status:       ║             ║ status:       ║
           │                             ║  'accepted'   ║             ║  'declined'   ║             ║  'declined'   ║
           │                             ║ acceptedAt:   ║             ║ declinedAt:   ║             ║ declinedAt:   ║
           │                             ║  timestamp    ║             ║  timestamp    ║             ║  timestamp    ║
           │                             ╚═══════╤═══════╝             ╚═══════╤═══════╝             ╚═══════╤═══════╝
           │                                    │                              │                              │
           │                                    │ [TRIGGER]                    │ [TRIGGER]                    │ [TRIGGER]
           │                                    │ Send notification            │ Send notification            │ Send notification
           │                                    ▼                              ▼                              ▼
           │                             ╭───────────────╮             ╭───────────────╮             ╭───────────────╮
           │                             │      8.7      │             │      8.8      │             │      8.9      │
           │                             │    NOTIFY     │             │    NOTIFY     │             │    NOTIFY     │
           │                             │    CLIENT     │             │    CLIENT     │             │    CLIENT     │
           │                             │  (ACCEPTED)   │             │  (DECLINED)   │             │  (DECLINED)   │
           │                             ╰───────┬───────╯             ╰───────┬───────╯             ╰───────┬───────╯
           │                                    │                              │                              │
           │  [NOTIFICATION]                    │                              │                              │
           │  "Provider accepted!"              │                              │                              │
           │◀───────────────────────────────────┘                              │                              │
           │                                                                   │                              │
           │  [NOTIFICATION]                                                   │                              │
           │  "Provider declined"                                              │                              │
           │◀──────────────────────────────────────────────────────────────────┘                              │
           │                                                                                                  │
           │  [NOTIFICATION]                                                                                  │
           │  "Provider did not respond"                                                                      │
           │◀─────────────────────────────────────────────────────────────────────────────────────────────────┘
           │
           │ [TO PROCESS 9]
           │ If accepted
           ▼
    ┌───────────────┐
    │               │
    │    CLIENT     │
    │   RECEIVES    │
    │   UPDATE      │
    │               │
    └───────────────┘
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **8.1** | View New Job Request | Provider views notification of new job request |
| **8.2** | View Job Details | Provider views complete job information |
| **8.3** | Decide Response | Provider decides whether to accept or decline |
| **8.4** | Accept Job | Provider accepts job (status: 'accepted') |
| **8.5** | Decline Job | Provider declines job (status: 'declined') |
| **8.6** | Ignore (Timeout) | Provider doesn't respond within time limit (auto-decline) |
| **8.7** | Notify Client (Accepted) | System notifies client that provider accepted |
| **8.8** | Notify Client (Declined) | System notifies client that provider declined |
| **8.9** | Notify Client (Timeout) | System notifies client that provider didn't respond |

---

## Provider Response Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            PROVIDER RESPONSE FLOW                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    PROVIDER                    SYSTEM                          CLIENT
      │                            │                               │
      │  8.1 Receive Notification  │                               │
      │      "New job request!"    │                               │
      │◀───────────────────────────│                               │
      │                            │                               │
      │  8.2 View Job Details      │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │  Display:                  │                               │
      │  • Client: Juan Dela Cruz  │                               │
      │  • Service: Electrician    │                               │
      │  • Location: Brgy. Abgao   │                               │
      │  • Distance: 2.5 km        │                               │
      │  • Payment: ₱500           │                               │
      │  • Photos: [3 images]      │                               │
      │◀───────────────────────────│                               │
      │                            │                               │
      │  8.4 Accept Job            │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │                            │  Update Firestore:            │
      │                            │  • status: 'accepted'         │
      │                            │  • acceptedAt: timestamp      │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  8.7 Send Notification        │
      │                            │       to Client               │
      │                            │──────────────────────────────▶│
      │                            │                               │
      │                            │                               │  "Provider accepted!"
      │                            │                               │  "Preparing to travel"
      │                            │                               │
```

---

## Data Dictionary - Process 8

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **acceptedAt** | Timestamp when provider accepted | System | Firestore (bookings) |
| **declinedAt** | Timestamp when provider declined | System | Firestore (bookings) |
| **declineReason** | Reason for declining (optional) | Provider | Firestore (bookings) |
| **responseTime** | Time taken to respond | System | Firestore (bookings) |
| **timeoutAt** | Timestamp when request timed out | System | Firestore (bookings) |

---

## Response Time Limit

- **Time Limit:** 15 minutes
- **After 15 minutes:** Job automatically declined
- **Notification:** Client notified of timeout
- **Next Step:** System finds alternative provider

---

## Job Information Displayed to Provider

### Basic Information
- Client name
- Service category
- Location (address + map)
- Distance from provider
- Payment amount

### Additional Details
- Occasion/Remarks
- Photos (if provided)
- Preferred date/time
- Client rating (if available)

### Provider Considerations
- Travel distance
- Current workload
- Payment amount
- Client location safety

---

## Booking Status After Provider Response

| Provider Action | status | Next Process |
|-----------------|--------|--------------|
| **Accept** | 'accepted' | Process 9: Service Execution |
| **Decline** | 'declined' | Find alternative provider |
| **Timeout** | 'declined' | Find alternative provider |

---

## Decline Reasons (Optional)

Provider can optionally provide reason for declining:

1. **Too Far**
   - Location is too far from current position
   - Outside preferred service area

2. **Busy**
   - Already have other jobs
   - Not available at requested time

3. **Low Payment**
   - Payment amount is too low
   - Not worth the travel distance

4. **Other**
   - Personal reasons
   - Safety concerns
   - Weather conditions

---

## Alternative Provider Flow

When provider declines or times out:

1. **Update Booking**
   - status: 'declined'
   - Find next available provider

2. **Notify Client**
   - "Provider declined"
   - "Finding alternative provider..."

3. **Find Alternative**
   - Query next nearest provider
   - Send job request to alternative
   - Repeat Process 8

4. **Maximum Attempts**
   - Try up to 3 providers
   - If all decline, refund client

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
