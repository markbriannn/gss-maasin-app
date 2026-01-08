# ENTITIES AND ATTRIBUTES

## GSS Maasin System

```
                                                    ●
                                                    │
    ┌─────────────────────┐                ┌─────────────────────┐                ┌─────────────────────┐
    │       USERS         │                │       BOOKINGS      │                │       REVIEWS       │
    │     (PROVIDER)      │                │                     │                │                     │
    ├─────────────────────┤                ├─────────────────────┤                ├─────────────────────┤
    │ PK: uid             │    One to      │ PK: id              │    One to      │ PK: id              │
    │     firstName       │────────────────│ FK: providerId      │────────────────│ FK: jobId           │
    │     lastName        │     many       │ FK: clientId        │      one       │ FK: providerId      │
    │     email           │                │     serviceCategory │                │ FK: reviewerId      │
    │     phoneNumber     │                │     status          │                │     rating          │
    │     role            │                │     providerPrice   │                │     comment         │
    │     profilePhoto    │                │     systemFee       │                │     images[]        │
    │     barangay        │                │     totalAmount     │                │     status          │
    │     streetAddress   │                │     providerEarnings│                │     createdAt       │
    │     latitude        │                │     paid            │                │                     │
    │     longitude       │                │     adminApproved   │                │                     │
    │     serviceCategory │                │     isNegotiable    │                │                     │
    │     providerStatus  │                │     offeredPrice    │                │                     │
    │     isOnline        │                │     counterOfferPrice│               │                     │
    │     fixedPrice      │                │     additionalCharges[]│             │                     │
    │     rating          │                │     approvedBy      │                │                     │
    │     averageRating   │                │     approvedAt      │                │                     │
    │     reviewCount     │                │     acceptedAt      │                │                     │
    │     completedJobs   │                │     completedAt     │                │                     │
    │     availableBalance│                │     createdAt       │                │                     │
    │     totalEarnings   │                │     updatedAt       │                │                     │
    │     documents{}     │                │                     │                │                     │
    │     createdAt       │                │                     │                │                     │
    └──────────┬──────────┘                └──────────┬──────────┘                └─────────────────────┘
               │                                      │
               │                                      │
               │ One to                               │ One to
               │ many                                 │ one
               │                                      │
               │                           ┌──────────┴──────────┐
               │                           │     TRANSACTIONS    │
               │                           ├─────────────────────┤
               │                           │ PK: id              │
               │                           │ FK: bookingId       │
               │                           │ FK: providerId      │
               │                           │ FK: clientId        │
               │                           │     type            │
               │                           │     amount          │
               │                           │     providerShare   │
               │                           │     platformCommission│
               │                           │     createdAt       │
               │                           └─────────────────────┘
               │
               │
    ┌──────────┴──────────┐                                                       ┌─────────────────────┐
    │       USERS         │                                                       │    CONVERSATIONS    │
    │      (CLIENT)       │                                                       │                     │
    ├─────────────────────┤                                                       ├─────────────────────┤
    │ PK: uid             │                         Many to                       │ PK: id              │
    │     firstName       │───────────────────────────────────────────────────────│     participants[]  │
    │     lastName        │                          many                         │     jobId           │
    │     email           │                                                       │     lastMessage     │
    │     phoneNumber     │                                                       │     lastMessageTime │
    │     role            │                                                       │     lastSenderId    │
    │     profilePhoto    │                                                       │     unreadCount{}   │
    │     barangay        │                                                       │     createdAt       │
    │     streetAddress   │                                                       │     updatedAt       │
    │     latitude        │                                                       │                     │
    │     longitude       │                                                       └──────────┬──────────┘
    │     createdAt       │                                                                  │
    └──────────┬──────────┘                                                                  │ One to
               │                                                                             │ many
               │                                                                             │
               │ One to                                                           ┌──────────┴──────────┐
               │ many                                                             │      MESSAGES       │
               │                                                                  ├─────────────────────┤
    ┌──────────┴──────────┐                                                       │ PK: id              │
    │      FAVORITES      │                                                       │ FK: conversationId  │
    ├─────────────────────┤                                                       │     senderId        │
    │ PK: id              │                                                       │     senderName      │
    │ FK: userId          │                                                       │     text            │
    │ FK: providerId      │                                                       │     imageUrl        │
    │     createdAt       │                                                       │     read            │
    │                     │                                                       │     reactions[]     │
    │                     │                                                       │     timestamp       │
    │                     │                                                       │                     │
    └─────────────────────┘                                                       └─────────────────────┘


    ┌─────────────────────┐                                                      ┌─────────────────────┐
    │       USERS         │                                                      │      PAYOUTS        │
    │      (ADMIN)        │                                                      │                     │
    ├─────────────────────┤                One to                                ├─────────────────────┤
    │ PK: uid             │                 many                                 │ PK: id              │
    │     firstName       │◄─────────────────────────────────────────────────────│ FK: providerId      │
    │     lastName        │                                                      │     amount          │
    │     email           │                                                      │     status          │
    │     phoneNumber     │                                                      │     referenceNumber │
    │     role: ADMIN     │                                                      │     approvedBy      │
    │     profilePhoto    │                                                      │     createdAt       │
    │     createdAt       │                                                      │                     │
    │                     │                                                      │                     │
    └─────────────────────┘                                                      └─────────────────────┘
```

---

## Relationships Summary

| Entity 1 | Relationship | Entity 2 | Description |
|----------|--------------|----------|-------------|
| USERS (PROVIDER) | One to Many | BOOKINGS | One provider receives many bookings |
| USERS (CLIENT) | One to Many | BOOKINGS | One client creates many bookings |
| BOOKINGS | One to One | TRANSACTIONS | One booking generates one transaction |
| BOOKINGS | One to One | REVIEWS | One booking has one review |
| USERS (CLIENT) | One to Many | FAVORITES | One client saves many favorite providers |
| USERS (PROVIDER) | One to Many | PAYOUTS | One provider requests many payouts |
| USERS | Many to Many | CONVERSATIONS | Users participate in many conversations |
| CONVERSATIONS | One to Many | MESSAGES | One conversation contains many messages |
| USERS (ADMIN) | One to Many | BOOKINGS | One admin approves many bookings |
| USERS (ADMIN) | One to Many | USERS (PROVIDER) | One admin approves many providers |

