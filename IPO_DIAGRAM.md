# INPUT-PROCESS-OUTPUT DIAGRAM

## GSS Maasin System

```
┌─────────────────────────────┐          ┌─────────────────────────────┐          ┌─────────────────────────────┐
│                             │          │                             │          │                             │
│           INPUT             │          │          PROCESS            │          │          OUTPUT             │
│                             │          │                             │          │                             │
├─────────────────────────────┤          ├─────────────────────────────┤          ├─────────────────────────────┤
│                             │          │                             │          │                             │
│ • Client & Provider         │          │ • Account Verification      │          │ • Verified Service          │
│   Registration              │          │   (Email, Phone, Documents) │          │   Providers                 │
│                             │          │                             │          │                             │
│ • Provider Documents        │          │ • Provider Listing &        │          │ • Secure Payment            │
│   (ID, Clearances)          │   ────►  │   Search on Map             │   ────►  │   Transactions              │
│                             │          │                             │          │                             │
│ • Service Information       │          │ • Job Request &             │          │ • Successful Job            │
│   (Category, Price)         │          │   Matching                  │          │   Matches                   │
│                             │          │                             │          │                             │
│ • Booking Requests          │          │ • Payment Processing        │          │ • Ratings & Feedback        │
│   (Photos, Address, Notes)  │          │   (GCash/Maya via PayMongo) │          │                             │
│                             │          │                             │          │ • Real-time Job             │
│ • Payment Information       │          │ • Admin Approval            │          │   Tracking                  │
│   (GCash/Maya)              │          │   (Providers & Bookings)    │          │                             │
│                             │          │                             │          │ • Provider Earnings         │
│ • Reviews & Ratings         │          │ • Feedback System           │          │   & Payouts                 │
│                             │          │                             │          │                             │
│ • Location Data             │          │ • Real-time Location        │          │ • Service History           │
│   (GPS Coordinates)         │          │   Tracking                  │          │   & Receipts                │
│                             │          │                             │          │                             │
│ • Admin Actions             │          │ • Notification System       │          │ • Notifications &           │
│   (Approve/Reject/Suspend)  │          │   (Push & In-App)           │          │   Alerts                    │
│                             │          │                             │          │                             │
└─────────────────────────────┘          └─────────────────────────────┘          └─────────────────────────────┘
```

