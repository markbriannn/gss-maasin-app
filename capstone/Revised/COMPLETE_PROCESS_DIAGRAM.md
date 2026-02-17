# GENERAL SERVICE SYSTEM - COMPLETE PROCESS DIAGRAM

## Complete System Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        GENERAL SERVICE SYSTEM - COMPLETE PROCESS FLOW                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


    ┌──────────────┐                                                                              ┌──────────────┐
    │              │                                                                              │              │
    │    CLIENT    │                                                                              │   PROVIDER   │
    │              │                                                                              │              │
    └──────┬───────┘                                                                              └──────┬───────┘
           │                                                                                             │
           │ REGISTER                                                                                    │ REGISTER
           │                                                                                             │
           ▼                                                                                             ▼
    ╔══════════════╗                                                                             ╔══════════════╗
    ║   CLIENT     ║                                                                             ║   PROVIDER   ║
    ║ REGISTRATION ║                                                                             ║ REGISTRATION ║
    ║              ║                                                                             ║              ║
    ║ -Email Verify║                                                                             ║ -Email Verify║
    ║ -Phone Verify║                                                                             ║ -Phone Verify║
    ║ -Profile     ║                                                                             ║ -Documents   ║
    ╚══════╤═══════╝                                                                             ║ -Services    ║
           │                                                                                      ║ -Location    ║
           │ STORE DATA                                                                          ╚══════╤═══════╝
           │                                                                                             │
           ▼                                                                                             │ STORE DATA
    ╔══════════════╗                                                                                     │
    ║    USERS     ║◄────────────────────────────────────────────────────────────────────────────────────┘
    ║  (Firestore) ║                                                                                     │
    ║              ║                                                                                     │
    ║ Role: CLIENT ║                                                                      Status: PENDING│
    ╚══════╤═══════╝                                                                                     │
           │                                                                                             │
           │ ACCOUNT CREATED                                                          AWAITING APPROVAL │
           │                                                                                             │
           ▼                                                                                             ▼
    ┌──────────────┐                                                                             ┌──────────────┐
    │              │                                                                             │              │
    │    CLIENT    │                                                                             │   PROVIDER   │
    │              │                                                                             │              │
    └──────┬───────┘                                                                             └──────────────┘
           │                                                                                             │
           │ BROWSE PROVIDERS                                                                            │
           │                                                                                             │
           ▼                                                                                             │
    ╔══════════════╗                                                                                     │
    ║     JOB      ║                                                                                     │
    ║   MATCHING   ║                                                                                     │
    ║              ║                                                                                     │
    ║ -Filter by   ║                                                                                     │
    ║  Category    ║                                                                                     │
    ║ -Filter by   ║                                                                                     │
    ║  Location    ║                                                                                     │
    ║ -Sort by     ║                                                                                     │
    ║  Rating      ║                                                                                     │
    ╚══════╤═══════╝                                                                                     │
           │                                                                                             │
           │ PROVIDER LIST                                                                               │
           │                                                                                             │
           ▼                                                                                             │
    ┌──────────────┐                                                                                     │
    │              │                                                                                     │
    │    CLIENT    │                                                                                     │
    │              │                                                                                     │
    └──────┬───────┘                                                                                     │
           │                                                                                             │
           │ SELECT PROVIDER                                                                             │
           │ & BOOK SERVICE                                                                              │
           │                                                                                             │
           ▼                                                                                             │
    ╔══════════════╗                                                                                     │
    ║   BOOKING    ║                                                                                     │
    ║   CREATED    ║                                                                                     │
    ║              ║                                                                                     │
    ║ -Service     ║                                                                                     │
    ║ -Location    ║                                                                                     │
    ║ -Schedule    ║                                                                                     │
    ║ -Photos      ║                                                                                     │
    ╚══════╤═══════╝                                                                                     │
           │                                                                                             │
           │ STORE BOOKING                                                                               │
           │                                                                                             │
           ▼                                                                                             │
    ╔══════════════╗                                                                                     │
    ║   BOOKINGS   ║                                                                                     │
    ║  (Firestore) ║                                                                                     │
    ║              ║                                                                                     │
    ║Status:PENDING║                                                                                     │
    ╚══════╤═══════╝                                                                                     │
           │                                                                                             │
           │ PAYMENT REQUIRED                                                                            │
           │                                                                                             │
           ▼                                                                                             │
    ╔══════════════╗                                                                                     │
    ║   PAYMENT    ║                                                                                     │
    ║   PROCESS    ║                                                                                     │
    ║              ║──────────────────┐                                                                  │
    ║ -GCash/Maya  ║                  │ PROCESS PAYMENT                                                  │
    ║ -Card        ║                  │                                                                  │
    ║ -Checkout    ║                  ▼                                                                  │
    ╚══════╤═══════╝          ╔═══════════════╗                                                          │
           │                  ║   PAYMONGO    ║                                                          │
           │◄─────────────────║  (Cash/Maya)  ║                                                          │
           │ PAYMENT STATUS   ║               ║                                                          │
           │                  ╚═══════════════╝                                                          │
           │                                                                                             │
           │ PAYMENT CONFIRMED                                                                           │
           │                                                                                             │
           ▼                                                                                             │
    ╔══════════════╗                                                                                     │
    ║   BOOKINGS   ║                                                                                     │
    ║  (Firestore) ║                                                                                     │
    ║              ║                                                                                     │
    ║Status:PENDING║                                                                                     │
    ╚══════╤═══════╝                                                                                     │
           │                                                                                             │
           │                                    ┌────────────────────────────────────────────────────────┘
           │                                    │ ADMIN REVIEW
           │                                    │
           │                                    ▼
           │                            ╔═══════════════╗
           │                            ║     ADMIN     ║
           │                            ║  VERIFICATION ║
           │                            ║               ║
           │                            ║ -Review Docs  ║
           │                            ║ -Verify ID    ║
           │                            ║ -Check Clear. ║
           │                            ╚═══════╤═══════╝
           │                                    │
           │                                    │ APPROVE/REJECT
           │                                    │
           │                                    ▼
           │                            ╔═══════════════╗
           │                            ║     USERS     ║
           │                            ║  (Firestore)  ║
           │                            ║               ║
           │                            ║Status:APPROVED║
           │                            ╚═══════╤═══════╝
           │                                    │
           │                                    │ PROVIDER APPROVED
           │                                    │
           │                                    ▼
           │                            ┌──────────────┐
           │                            │              │
           │                            │   PROVIDER   │
           │                            │              │
           │                            └──────┬───────┘
           │                                   │
           │ JOB NOTIFICATION                  │ RECEIVE JOB
           │◄──────────────────────────────────┤
           │                                   │
           ▼                                   ▼
    ┌──────────────┐                   ╔══════════════╗
    │              │                   ║   PROVIDER   ║
    │    CLIENT    │                   ║   RESPONSE   ║
    │              │                   ║              ║
    └──────────────┘                   ║ -Accept Job  ║
           │                           ║ -Reject Job  ║
           │                           ╚══════╤═══════╝
           │                                  │
           │                                  │ ACCEPT JOB
           │                                  │
           │                                  ▼
           │                          ╔═══════════════╗
           │                          ║   BOOKINGS    ║
           │                          ║  (Firestore)  ║
           │                          ║               ║
           │                          ║Status:ACCEPTED║
           │                          ╚═══════╤═══════╝
           │                                  │
           │ PROVIDER ACCEPTED                │
           │◄─────────────────────────────────┤
           │                                  │
           ▼                                  ▼
    ┌──────────────┐                  ╔══════════════╗
    │              │                  ║   LOCATION   ║
    │    CLIENT    │                  ║   TRACKING   ║
    │              │                  ║              ║
    │ Track Provider│◄─────────────────║ -Real-time   ║
    │ on Map       │  Location Stream ║  GPS         ║
    └──────────────┘                  ║ -Firebase    ║
           │                          ╚══════╤═══════╝
           │                                 │
           │                                 │ PROVIDER ARRIVES
           │                                 │
           │                                 ▼
           │                         ╔═══════════════╗
           │                         ║   START JOB   ║
           │                         ║               ║
           │                         ║ -Begin Work   ║
           │                         ║ -Update Status║
           │                         ╚═══════╤═══════╝
           │                                 │
           │                                 │
           │                                 ▼
           │                         ╔═══════════════╗
           │                         ║   BOOKINGS    ║
           │                         ║  (Firestore)  ║
           │                         ║               ║
           │                         ║Status:        ║
           │                         ║IN_PROGRESS    ║
           │                         ╚═══════╤═══════╝
           │                                 │
           │ JOB IN PROGRESS                 │
           │◄────────────────────────────────┤
           │                                 │
           ▼                                 ▼
    ┌──────────────┐                 ╔══════════════╗
    │              │                 ║  COMPLETE    ║
    │    CLIENT    │                 ║     JOB      ║
    │              │                 ║              ║
    └──────────────┘                 ║ -Finish Work ║
           │                         ║ -Mark Done   ║
           │                         ╚══════╤═══════╝
           │                                │
           │                                │
           │                                ▼
           │                        ╔═══════════════╗
           │                        ║   BOOKINGS    ║
           │                        ║  (Firestore)  ║
           │                        ║               ║
           │                        ║Status:        ║
           │                        ║COMPLETED      ║
           │                        ╚═══════╤═══════╝
           │                                │
           │ JOB COMPLETED                  │
           │◄───────────────────────────────┤
           │                                │
           ▼                                ▼
    ╔══════════════╗                ┌──────────────┐
    ║   CONFIRM &  ║                │              │
    ║     RATE     ║                │   PROVIDER   │
    ║              ║                │              │
    ║ -Confirm     ║                │ Awaiting     │
    ║  Completion  ║                │ Payment      │
    ║ -Rate (1-5)  ║                │              │
    ║ -Review      ║                └──────────────┘
    ╚══════╤═══════╝                        │
           │                                │
           │ SUBMIT RATING                  │
           │                                │
           ▼                                │
    ╔══════════════╗                        │
    ║   REVIEWS    ║                        │
    ║  (Firestore) ║                        │
    ║              ║                        │
    ║ -Rating      ║                        │
    ║ -Comment     ║                        │
    ╚══════╤═══════╝                        │
           │                                │
           │ UPDATE STATS                   │
           │                                │
           ▼                                │
    ╔══════════════╗                        │
    ║    USERS     ║                        │
    ║  (Firestore) ║                        │
    ║              ║                        │
    ║ -Avg Rating  ║                        │
    ║ -Total Jobs  ║                        │
    ║ -Earnings    ║                        │
    ╚══════╤═══════╝                        │
           │                                │
           │ PAYMENT TO PROVIDER             │
           │────────────────────────────────►│
           │                                │
           ▼                                ▼
    ┌──────────────┐                ┌──────────────┐
    │              │                │              │
    │    CLIENT    │                │   PROVIDER   │
    │              │                │              │
    │ Job Complete │                │ Payment      │
    │              │                │ Received     │
    └──────────────┘                └──────────────┘
```

## System Components

### External Services
- **Resend**: Email verification service
- **Semaphore**: SMS/OTP service
- **PayMongo**: Payment processing (GCash/Maya/Cards)
- **Firebase**: Real-time location tracking
- **Cloudinary**: Image storage for documents and photos

### Databases
- **Users (Firestore)**: Client, Provider, Admin accounts
- **Bookings (Firestore)**: Service bookings and job details
- **Reviews (Firestore)**: Ratings and feedback

### Status Flow
1. **Registration**: PENDING → APPROVED (Provider only)
2. **Booking**: PENDING → CONFIRMED → ACCEPTED → IN_PROGRESS → COMPLETED → REVIEWED
3. **Payment**: PENDING → PAID → RELEASED

## Key Processes

1. **Client Registration**: Email verify → Phone verify → Account created
2. **Provider Registration**: Email verify → Phone verify → Documents → Services → Admin approval
3. **Job Matching**: Browse → Filter → Sort → Select provider
4. **Payment**: Create checkout → Process payment → Confirm
5. **Job Execution**: Accept → Track → Start → Complete
6. **Review**: Rate → Comment → Update provider stats
