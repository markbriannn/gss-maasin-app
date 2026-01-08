# ENTITY RELATIONSHIP DIAGRAM (ERD)

## GSS Maasin System - Entities and Attributes

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          ENTITY RELATIONSHIP DIAGRAM                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────┐                                    ┌─────────────────────────┐
│         USERS           │                                    │        BOOKINGS         │
├─────────────────────────┤                                    ├─────────────────────────┤
│ PK  uid                 │                                    │ PK  id                  │
│     firstName           │                                    │ FK  clientId            │
│     lastName            │                                    │ FK  providerId          │
│     email               │         creates                    │     serviceCategory     │
│     phoneNumber         │◄────────────────────────────────────     status              │
│     role                │         (1:M)                      │     totalAmount         │
│     profilePhoto        │                                    │     systemFee           │
│     barangay            │                                    │     paid                │
│     streetAddress       │                                    │     paymentMethod       │
│     latitude            │         receives                   │     paymentId           │
│     longitude           │◄────────────────────────────────────     adminApproved       │
│     createdAt           │         (1:M)                      │     address             │
│                         │                                    │     latitude            │
│ --- CLIENT ONLY ---     │                                    │     longitude           │
│     favorites[]         │                                    │     mediaFiles[]        │
│                         │                                    │     additionalNotes     │
│ --- PROVIDER ONLY ---   │                                    │     createdAt           │
│     serviceCategory     │                                    │     completedAt         │
│     providerStatus      │                                    └───────────┬─────────────┘
│     isOnline            │                                                │
│     fixedPrice          │                                                │
│     rating              │                                                │
│     reviewCount         │                                                │ has
│     completedJobs       │                                                │ (1:1)
│     availableBalance    │                                                │
│     totalEarnings       │                                                ▼
│     documents{}         │                                    ┌─────────────────────────┐
│                         │                                    │        PAYMENTS         │
│ --- ADMIN ONLY ---      │                                    ├─────────────────────────┤
│     isAdmin: true       │                                    │ PK  id                  │
└───────────┬─────────────┘                                    │ FK  bookingId           │
            │                                                  │ FK  userId              │
            │                                                  │     amount              │
            │ writes                                           │     type (gcash/maya)   │
            │ (1:M)                                            │     status              │
            │                                                  │     sourceId            │
            ▼                                                  │     paymentId           │
┌─────────────────────────┐                                    │     createdAt           │
│        REVIEWS          │                                    └─────────────────────────┘
├─────────────────────────┤
│ PK  id                  │
│ FK  bookingId           │
│ FK  clientId            │
│ FK  providerId          │
│     rating              │
│     comment             │
│     createdAt           │
└─────────────────────────┘


┌─────────────────────────┐         belongs to         ┌─────────────────────────┐
│       FAVORITES         │         (M:1)              │         USERS           │
├─────────────────────────┤◄───────────────────────────┤       (CLIENT)          │
│ PK  id                  │                            └─────────────────────────┘
│ FK  userId              │
│ FK  providerId          │         references         ┌─────────────────────────┐
│     createdAt           │         (M:1)              │         USERS           │
└─────────────────────────┘◄───────────────────────────┤      (PROVIDER)         │
                                                       └─────────────────────────┘


┌─────────────────────────┐                            ┌─────────────────────────┐
│      TRANSACTIONS       │         belongs to         │         USERS           │
├─────────────────────────┤         (M:1)              │      (PROVIDER)         │
│ PK  id                  │◄───────────────────────────┤                         │
│ FK  bookingId           │                            └─────────────────────────┘
│ FK  providerId          │
│ FK  clientId            │
│     type                │
│     amount              │
│     providerShare       │
│     platformCommission  │
│     createdAt           │
└─────────────────────────┘


┌─────────────────────────┐                            ┌─────────────────────────┐
│       MESSAGES          │         sent by            │         USERS           │
├─────────────────────────┤         (M:1)              │                         │
│ PK  id                  │◄───────────────────────────┤                         │
│ FK  conversationId      │                            └─────────────────────────┘
│ FK  senderId            │
│ FK  receiverId          │         received by        ┌─────────────────────────┐
│     text                │         (M:1)              │         USERS           │
│     timestamp           │◄───────────────────────────┤                         │
│     read                │                            └─────────────────────────┘
└─────────────────────────┘


┌─────────────────────────┐                            ┌─────────────────────────┐
│     NOTIFICATIONS       │         belongs to         │         USERS           │
├─────────────────────────┤         (M:1)              │                         │
│ PK  id                  │◄───────────────────────────┤                         │
│ FK  userId              │                            └─────────────────────────┘
│     title               │
│     body                │
│     type                │
│     read                │
│     createdAt           │
└─────────────────────────┘
```

---

## Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              RELATIONSHIPS                                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘


                                    ┌───────────┐
                                    │           │
                                    │   USERS   │
                                    │           │
                                    └─────┬─────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
            │ creates (1:M)               │ receives (1:M)              │ writes (1:M)
            │ "Client creates bookings"   │ "Provider receives jobs"    │ "Client writes reviews"
            ▼                             ▼                             ▼
    ┌───────────────┐             ┌───────────────┐             ┌───────────────┐
    │               │             │               │             │               │
    │   BOOKINGS    │             │   BOOKINGS    │             │    REVIEWS    │
    │               │             │               │             │               │
    └───────┬───────┘             └───────────────┘             └───────────────┘
            │
            │ has (1:1)
            │ "Booking has payment"
            ▼
    ┌───────────────┐
    │               │
    │   PAYMENTS    │
    │               │
    └───────────────┘


    ┌───────────┐         saves (1:M)          ┌───────────────┐
    │           │         "Client saves        │               │
    │   USERS   │─────────favorite providers"──▶   FAVORITES   │
    │ (CLIENT)  │                              │               │
    └───────────┘                              └───────────────┘
                                                      │
                                                      │ references (M:1)
                                                      │ "Favorite references provider"
                                                      ▼
                                               ┌───────────────┐
                                               │               │
                                               │     USERS     │
                                               │  (PROVIDER)   │
                                               └───────────────┘


    ┌───────────┐         earns (1:M)          ┌───────────────┐
    │           │         "Provider earns      │               │
    │   USERS   │─────────from completed jobs"─▶ TRANSACTIONS  │
    │(PROVIDER) │                              │               │
    └───────────┘                              └───────────────┘


    ┌───────────┐         sends (1:M)          ┌───────────────┐
    │           │         "User sends          │               │
    │   USERS   │─────────messages"────────────▶   MESSAGES    │
    │           │                              │               │
    └───────────┘                              └───────────────┘


    ┌───────────┐         receives (1:M)       ┌───────────────┐
    │           │         "User receives       │               │
    │   USERS   │─────────notifications"───────▶ NOTIFICATIONS │
    │           │                              │               │
    └───────────┘                              └───────────────┘
```

---

## Entity Attributes Table

### USERS (Firestore Collection)

| Attribute | Type | Description |
|-----------|------|-------------|
| **uid** (PK) | string | Unique user identifier (Firebase Auth UID) |
| firstName | string | User's first name |
| lastName | string | User's last name |
| email | string | User's email address |
| phoneNumber | string | User's phone number |
| role | string | User role: 'CLIENT', 'PROVIDER', 'ADMIN' |
| profilePhoto | string | URL to profile photo (Cloudinary) |
| barangay | string | User's barangay in Maasin City |
| streetAddress | string | User's street address |
| latitude | number | Location latitude coordinate |
| longitude | number | Location longitude coordinate |
| createdAt | timestamp | Account creation date |
| **Provider Only:** | | |
| serviceCategory | string | Service type: Electrician, Plumber, etc. |
| providerStatus | string | Status: pending, approved, rejected, suspended |
| isOnline | boolean | Provider availability status |
| fixedPrice | number | Provider's service rate |
| rating | number | Average rating (1-5) |
| reviewCount | number | Total number of reviews |
| completedJobs | number | Total completed jobs |
| availableBalance | number | Wallet balance available for withdrawal |
| totalEarnings | number | Total lifetime earnings |
| documents | object | Uploaded documents (ID, clearance) |

### BOOKINGS (Firestore Collection)

| Attribute | Type | Description |
|-----------|------|-------------|
| **id** (PK) | string | Unique booking identifier |
| clientId (FK) | string | Reference to client user |
| providerId (FK) | string | Reference to provider user |
| serviceCategory | string | Type of service requested |
| status | string | Booking status (pending, accepted, traveling, etc.) |
| totalAmount | number | Total amount including system fee |
| systemFee | number | 5% platform fee |
| paid | boolean | Payment completed flag |
| paymentMethod | string | Payment method: gcash, maya |
| paymentId | string | PayMongo payment ID |
| adminApproved | boolean | Admin approval status |
| address | string | Service location address |
| latitude | number | Service location latitude |
| longitude | number | Service location longitude |
| mediaFiles | array | Problem photos/videos URLs |
| additionalNotes | string | Client's description of problem |
| createdAt | timestamp | Booking creation date |
| completedAt | timestamp | Job completion date |

### PAYMENTS (Firestore Collection)

| Attribute | Type | Description |
|-----------|------|-------------|
| **id** (PK) | string | Unique payment identifier |
| bookingId (FK) | string | Reference to booking |
| userId (FK) | string | Reference to paying user |
| amount | number | Payment amount |
| type | string | Payment type: gcash, maya |
| status | string | Payment status: pending, paid, refunded |
| sourceId | string | PayMongo source ID |
| paymentId | string | PayMongo payment ID |
| createdAt | timestamp | Payment creation date |

### REVIEWS (Firestore Collection)

| Attribute | Type | Description |
|-----------|------|-------------|
| **id** (PK) | string | Unique review identifier |
| bookingId (FK) | string | Reference to booking |
| clientId (FK) | string | Reference to client who wrote review |
| providerId (FK) | string | Reference to reviewed provider |
| rating | number | Star rating (1-5) |
| comment | string | Review text |
| createdAt | timestamp | Review creation date |

### FAVORITES (Firestore Collection)

| Attribute | Type | Description |
|-----------|------|-------------|
| **id** (PK) | string | Unique favorite identifier (userId_providerId) |
| userId (FK) | string | Reference to client user |
| providerId (FK) | string | Reference to favorite provider |
| createdAt | timestamp | Date added to favorites |

### TRANSACTIONS (Firestore Collection)

| Attribute | Type | Description |
|-----------|------|-------------|
| **id** (PK) | string | Unique transaction identifier |
| bookingId (FK) | string | Reference to booking |
| providerId (FK) | string | Reference to provider |
| clientId (FK) | string | Reference to client |
| type | string | Transaction type: earning, withdrawal |
| amount | number | Transaction amount |
| providerShare | number | Provider's earnings (100% of their price) |
| platformCommission | number | Platform's 5% fee |
| createdAt | timestamp | Transaction date |

### MESSAGES (Firestore Collection)

| Attribute | Type | Description |
|-----------|------|-------------|
| **id** (PK) | string | Unique message identifier |
| conversationId (FK) | string | Reference to conversation |
| senderId (FK) | string | Reference to sender user |
| receiverId (FK) | string | Reference to receiver user |
| text | string | Message content |
| timestamp | timestamp | Message sent time |
| read | boolean | Message read status |

### NOTIFICATIONS (Firestore Collection)

| Attribute | Type | Description |
|-----------|------|-------------|
| **id** (PK) | string | Unique notification identifier |
| userId (FK) | string | Reference to user |
| title | string | Notification title |
| body | string | Notification content |
| type | string | Notification type |
| read | boolean | Read status |
| createdAt | timestamp | Notification date |

---

## Cardinality Summary

| Relationship | Cardinality | Description |
|--------------|-------------|-------------|
| USERS → BOOKINGS | 1:M | One client creates many bookings |
| USERS → BOOKINGS | 1:M | One provider receives many bookings |
| BOOKINGS → PAYMENTS | 1:1 | One booking has one payment |
| USERS → REVIEWS | 1:M | One client writes many reviews |
| USERS → FAVORITES | 1:M | One client has many favorites |
| USERS → TRANSACTIONS | 1:M | One provider has many transactions |
| USERS → MESSAGES | 1:M | One user sends many messages |
| USERS → NOTIFICATIONS | 1:M | One user receives many notifications |

---

## Legend

```
┌─────────────────────────┐
│        ENTITY           │     Entity (Table/Collection)
├─────────────────────────┤
│ PK  Primary Key         │
│ FK  Foreign Key         │
│     Attribute           │
└─────────────────────────┘

─────────────────────────▶     Relationship with cardinality
        (1:M)                  and description
```

