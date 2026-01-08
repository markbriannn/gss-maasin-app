# CONTEXT DIAGRAM

## GSS Maasin System - Level 0 Context Diagram

```
                                        PROVIDER
                                       REGISTRATION
                                      (Personal Info,
                                       Documents, Location,
                                       Service Category)
                                      ─────────────►
                    ┌─────────────────┐              ┌─────────────────────────────┐
                    │                 │              │                             │
                    │    SERVICE      │              │                             │
                    │    PROVIDER     │◄─────────────│                             │
                    │                 │  JOB         │                             │
                    └─────────────────┘  NOTIFICATION│                             │
                                        EARNINGS     │                             │
                                                     │                             │
                                        SERVICE      │            0                │
                                        REQUEST      │                             │
                                        (Booking,    │                             │
                                         Payment,    │                             │
                                         Photos)     │                             │
                                      ─────────────► │                             │
                    ┌─────────────────┐              │    GSS Maasin System        │
                    │                 │              │                             │
                    │     CLIENT      │◄─────────────│    (General Service         │
                    │                 │  BOOKING     │     System - Maasin)        │
                    └─────────────────┘  STATUS,     │                             │
                                        TRACKING,    │                             │
                                        RECEIPT      │                             │
                                                     │                             │
                                        VERIFICATION/│                             │
                                        APPROVAL     │                             │
                                      ─────────────► │                             │
                    ┌─────────────────┐              │                             │
                    │                 │              │                             │
                    │     ADMIN       │◄─────────────│                             │
                    │                 │  ANALYTICS/  │                             │
                    └─────────────────┘  DASHBOARD   └─────────────────────────────┘
                                                                   │
                                                                   │
                                                                   ▼
                                                     ┌─────────────────────────────┐
                                                     │                             │
                                        PAYMENT      │         PAYMONGO            │
                                        PROCESSING   │      (GCash / Maya)         │
                                      ◄─────────────►│                             │
                                                     └─────────────────────────────┘
```

---

## Detailed Context Diagram with Data Flows

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    EXTERNAL ENTITIES                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘


                              PROVIDER REGISTRATION
                              (Personal Info, Documents,
                               Location, Service Category,
                               Profile Photo, Fixed Price)
                            ─────────────────────────────►
    ┌───────────────────┐                                   ┌─────────────────────────┐
    │                   │                                   │                         │
    │                   │   JOB NOTIFICATION                │                         │
    │     SERVICE       │◄──────────────────────────────────│                         │
    │     PROVIDER      │   (New Job Request,               │                         │
    │                   │    Admin Approved Jobs)           │                         │
    │                   │                                   │                         │
    │                   │   JOB ACCEPTANCE/REJECTION        │                         │
    │                   │─────────────────────────────────► │                         │
    │                   │                                   │                         │
    │                   │   LOCATION UPDATE                 │                         │
    │                   │   (Real-time Tracking)            │                         │
    │                   │─────────────────────────────────► │                         │
    │                   │                                   │                         │
    │                   │   EARNINGS/WALLET INFO            │          0              │
    │                   │   (95% of Job Price)              │                         │
    │                   │◄──────────────────────────────────│                         │
    └───────────────────┘                                   │                         │
                                                            │                         │
                                                            │    GSS MAASIN           │
                              SERVICE REQUEST               │    SYSTEM               │
                              (Provider Selection,          │                         │
                               Problem Photos/Videos,       │    (General Service     │
                               Address, Payment via         │     System - Maasin     │
                               GCash/Maya)                  │     City)               │
                            ─────────────────────────────►  │                         │
    ┌───────────────────┐                                   │                         │
    │                   │                                   │                         │
    │                   │   BOOKING CONFIRMATION            │                         │
    │      CLIENT       │◄──────────────────────────────────│                         │
    │                   │   (Status Updates, Provider       │                         │
    │                   │    Info, Real-time Tracking,      │                         │
    │                   │    Receipt, Refund Notification)  │                         │
    │                   │                                   │                         │
    │                   │   PROVIDER LIST                   │                         │
    │                   │◄──────────────────────────────────│                         │
    │                   │   (Online Providers on Map,       │                         │
    │                   │    Ratings, Distance, Price)      │                         │
    └───────────────────┘                                   │                         │
                                                            │                         │
                                                            │                         │
                              PROVIDER VERIFICATION         │                         │
                              (Document Review,             │                         │
                               Booking Approval)            │                         │
                            ─────────────────────────────►  │                         │
    ┌───────────────────┐                                   │                         │
    │                   │                                   │                         │
    │                   │   ANALYTICS/REPORTS               │                         │
    │      ADMIN        │◄──────────────────────────────────│                         │
    │                   │   (Dashboard, Earnings,           │                         │
    │                   │    Provider Stats, Job Stats)     │                         │
    │                   │                                   │                         │
    │                   │   APPROVAL/REJECTION              │                         │
    │                   │─────────────────────────────────► │                         │
    │                   │   (Provider Status: approve/      │                         │
    │                   │    reject/suspend, Job Status:    │                         │
    │                   │    approve/reject with refund)    │                         │
    └───────────────────┘                                   └─────────────────────────┘
                                                                       │
                                                                       │
                              ┌─────────────────────────────────────────┘
                              │
                              ▼
    ┌───────────────────────────────────────────────────────────────────────────────────┐
    │                              EXTERNAL SYSTEMS                                      │
    └───────────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
    │                   │   │                   │   │                   │
    │     PAYMONGO      │   │      BREVO        │   │   GOOGLE MAPS     │
    │  (Payment Gateway)│   │  (Email Service)  │   │   (Location)      │
    │                   │   │                   │   │                   │
    │  ◄─────────────►  │   │  ◄─────────────►  │   │  ◄─────────────►  │
    │  Payment Request  │   │  Email            │   │  Geocoding        │
    │  (GCash/Maya)     │   │  Notifications    │   │  Reverse Geocode  │
    │  Payment Status   │   │  (Booking,        │   │  Directions       │
    │  Refund           │   │   Refund,         │   │  Distance         │
    │  (5-10 days)      │   │   Verification)   │   │  Calculation      │
    └───────────────────┘   └───────────────────┘   └───────────────────┘

    ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
    │                   │   │                   │   │                   │
    │   CLOUDINARY      │   │     FIREBASE      │   │      OSRM         │
    │  (Image Storage)  │   │   (Database &     │   │  (Route Service)  │
    │                   │   │    Auth)          │   │                   │
    │  ◄─────────────►  │   │  ◄─────────────►  │   │  ◄─────────────►  │
    │  Upload Photos    │   │  Firestore DB     │   │  Route            │
    │  Profile Photos   │   │  Authentication   │   │  Calculation      │
    │  Document Images  │   │  Real-time        │   │  ETA              │
    │  Problem Photos   │   │  Listeners        │   │                   │
    └───────────────────┘   └───────────────────┘   └───────────────────┘
```

---

## Data Flow Summary Table

| Entity | Data Flow TO System | Data Flow FROM System |
|--------|--------------------|-----------------------|
| **Service Provider** | Registration (info, docs, location), Job Response (accept/decline), Location Updates, Status Updates (traveling, arrived, in_progress, completed) | Job Notifications, Earnings (95%), Messages, Reviews |
| **Client** | Registration, Service Request (booking, photos, address), Payment (GCash/Maya), Review/Rating | Provider List (map), Booking Status, Real-time Tracking, Receipts, Refund Notifications |
| **Admin** | Provider Approval/Rejection/Suspension, Job Approval/Rejection, Settings | Analytics Dashboard, Provider List, Job List, Earnings Reports |
| **PayMongo** | Payment Request (create source), Charge Request | Checkout URL, Payment Status, Refund Confirmation |
| **Brevo** | Email Request (booking, refund, verification) | Delivery Status |
| **Google Maps** | Coordinates (lat/lng) | Address (reverse geocode), Directions, Distance |
| **Cloudinary** | Image Upload (photos, documents) | Image URL |
| **Firebase** | Data Operations (CRUD) | Real-time Updates, Authentication |
| **OSRM** | Origin/Destination Coordinates | Route Polyline, Distance, Duration |

---

## User Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **Client** | Register, Browse providers on map, Book services, Pay via GCash/Maya, Track provider, Rate & review, Chat with provider, View history |
| **Provider** | Register with documents, Wait for admin approval, Go online/offline, Accept/decline jobs, Update location, Complete jobs, View earnings, Withdraw to wallet |
| **Admin** | Approve/reject/suspend providers, Approve/reject bookings (with auto-refund), View analytics, Monitor all jobs, View earnings reports, Manage system settings |

---

## Legend

```
┌─────────────────┐
│                 │     External Entity (User/System)
│    ENTITY       │
│                 │
└─────────────────┘

┌─────────────────────────┐
│                         │
│           0             │     Process (System)
│                         │
│      SYSTEM NAME        │
│                         │
└─────────────────────────┘

─────────────────────────►      Data Flow (with direction)

◄─────────────────────────►     Bidirectional Data Flow
```

