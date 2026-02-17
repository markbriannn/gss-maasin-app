# Entities and Attributes
## General Service System - Maasin City

---

## 1. USERS Entity

**Description:** Central entity storing all user accounts in the system.

**Primary Key:** `uid` (String)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| uid | String | PK, NOT NULL, UNIQUE | Unique user identifier from Firebase Auth |
| email | String | NOT NULL, UNIQUE | User's email address |
| password | String | NOT NULL | Hashed password (bcrypt) |
| firstName | String | NOT NULL | User's first name |
| middleName | String | NULL | User's middle name (optional) |
| lastName | String | NOT NULL | User's last name |
| suffix | String | NULL | Name suffix (Jr., Sr., III, etc.) |
| phoneNumber | String | NOT NULL, UNIQUE | Philippine phone number (+639XXXXXXXXX) |
| dateOfBirth | Date | NULL | User's date of birth |
| profilePhoto | String | NULL | URL to profile photo (Cloudinary) |
| role | Enum | NOT NULL | User role: CLIENT, PROVIDER, ADMIN |
| streetAddress | String | NOT NULL | Street address |
| houseNumber | String | NULL | House/building number |
| barangay | String | NOT NULL | Barangay name (Maasin City) |
| landmark | String | NULL | Nearby landmark for reference |
| city | String | NOT NULL | City name (default: Maasin City) |
| province | String | NOT NULL | Province (default: Southern Leyte) |
| latitude | Number | NOT NULL | GPS latitude coordinate |
| longitude | Number | NOT NULL | GPS longitude coordinate |
| createdAt | Timestamp | NOT NULL | Account creation timestamp |
| updatedAt | Timestamp | NOT NULL | Last update timestamp |

---

## 2. CLIENTS Entity

**Description:** Specialization of USERS for clients who book services.

**Primary Key:** `uid` (String, Foreign Key to USERS)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| uid | String | PK, FK (USERS), NOT NULL | References USERS.uid |
| favorites | Array | NULL | Array of favorite provider IDs |

**Inherited Attributes:** All attributes from USERS entity

---

## 3. PROVIDERS Entity

**Description:** Specialization of USERS for service providers.

**Primary Key:** `uid` (String, Foreign Key to USERS)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| uid | String | PK, FK (USERS), NOT NULL | References USERS.uid |
| serviceCategory | String | NOT NULL | Service type (electrician, plumber, carpenter, cleaner) |
| aboutService | String | NOT NULL | Description of services offered |
| bio | String | NULL | Provider biography |
| yearsExperience | String | NULL | Years of experience |
| priceType | Enum | NOT NULL | Pricing model: per_job, per_hire |
| fixedPrice | Number | NOT NULL | Fixed service price in PHP |
| providerStatus | Enum | NOT NULL | Status: pending, approved, rejected, suspended |
| rating | Number | DEFAULT 0 | Current rating (0-5) |
| averageRating | Number | DEFAULT 0 | Average rating from all reviews |
| reviewCount | Number | DEFAULT 0 | Total number of reviews |
| completedJobs | Number | DEFAULT 0 | Total completed jobs |
| isOnline | Boolean | DEFAULT false | Provider online status |
| documents | Object | NOT NULL | Provider verification documents |
| documents.idType | String | NOT NULL | Type of government ID |
| documents.governmentIdUrl | String | NOT NULL | URL to government ID photo |
| documents.validId | String | NOT NULL | URL to valid ID |
| documents.barangayClearanceUrl | String | NOT NULL | URL to barangay clearance |
| documents.barangayClearance | String | NOT NULL | URL to barangay clearance |
| documents.policeClearanceUrl | String | NOT NULL | URL to police clearance |
| documents.policeClearance | String | NOT NULL | URL to police clearance |
| documents.selfieUrl | String | NOT NULL | URL to selfie with ID |
| documents.selfie | String | NOT NULL | URL to selfie with ID |

**Inherited Attributes:** All attributes from USERS entity

---

## 4. ADMINS Entity

**Description:** Specialization of USERS for system administrators.

**Primary Key:** `uid` (String, Foreign Key to USERS)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| uid | String | PK, FK (USERS), NOT NULL | References USERS.uid |
| permissions | Array | NULL | Array of admin permissions |
| lastActive | Timestamp | NULL | Last admin activity timestamp |

**Inherited Attributes:** All attributes from USERS entity

---

## 5. BOOKINGS Entity

**Description:** Service booking/job requests created by clients.

**Primary Key:** `bookingId` (String)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| bookingId | String | PK, NOT NULL, UNIQUE | Unique booking identifier |
| clientId | String | FK (USERS), NOT NULL | References USERS.uid (client) |
| providerId | String | FK (USERS), NULL | References USERS.uid (provider) |
| serviceCategory | String | NOT NULL | Type of service requested |
| serviceDescription | String | NOT NULL | Detailed service description |
| scheduledDate | Date | NOT NULL | Scheduled service date |
| scheduledTime | String | NOT NULL | Scheduled service time |
| status | Enum | NOT NULL | Booking status (see enum below) |
| adminApproved | Boolean | DEFAULT false | Admin approval status |
| adminApprovedAt | Timestamp | NULL | Admin approval timestamp |
| adminApprovedBy | String | FK (USERS), NULL | Admin who approved |
| rejectionReason | String | NULL | Reason for rejection |
| amount | Number | NOT NULL | Service amount in PHP |
| paymentStatus | String | NOT NULL | Payment status |
| paymentIntentId | String | NULL | PayMongo payment intent ID |
| paymentMethod | String | NULL | Payment method used |
| clientLocation | Object | NOT NULL | Client location details |
| clientLocation.latitude | Number | NOT NULL | Client GPS latitude |
| clientLocation.longitude | Number | NOT NULL | Client GPS longitude |
| clientLocation.address | String | NOT NULL | Client full address |
| providerLocation | Object | NULL | Provider current location |
| providerLocation.latitude | Number | NULL | Provider GPS latitude |
| providerLocation.longitude | Number | NULL | Provider GPS longitude |
| providerLocationUpdatedAt | Timestamp | NULL | Last provider location update |
| startedAt | Timestamp | NULL | Work start timestamp |
| arrivedAt | Timestamp | NULL | Provider arrival timestamp |
| completedAt | Timestamp | NULL | Work completion timestamp |
| cancelledAt | Timestamp | NULL | Cancellation timestamp |
| cancelledBy | String | FK (USERS), NULL | User who cancelled |
| cancellationReason | String | NULL | Reason for cancellation |
| createdAt | Timestamp | NOT NULL | Booking creation timestamp |
| updatedAt | Timestamp | NOT NULL | Last update timestamp |

**Status Enum Values:**
- `pending` - Awaiting admin approval
- `approved` - Admin approved, awaiting provider
- `accepted` - Provider accepted
- `traveling` - Provider on the way
- `arrived` - Provider at location
- `in_progress` - Work in progress
- `completed` - Work completed
- `cancelled` - Booking cancelled
- `rejected` - Provider rejected

---

## 6. REVIEWS Entity

**Description:** Service reviews and ratings from clients.

**Primary Key:** `reviewId` (String)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| reviewId | String | PK, NOT NULL, UNIQUE | Unique review identifier |
| bookingId | String | FK (BOOKINGS), NOT NULL | References BOOKINGS.bookingId |
| clientId | String | FK (USERS), NOT NULL | References USERS.uid (client) |
| providerId | String | FK (USERS), NOT NULL | References USERS.uid (provider) |
| rating | Number | NOT NULL, 1-5 | Star rating (1-5) |
| comment | String | NULL | Review comment/feedback |
| createdAt | Timestamp | NOT NULL | Review creation timestamp |
| updatedAt | Timestamp | NOT NULL | Last update timestamp |

---

## 7. CONVERSATIONS Entity

**Description:** Chat conversations between users.

**Primary Key:** `conversationId` (String)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| conversationId | String | PK, NOT NULL, UNIQUE | Unique conversation identifier |
| participants | Array | NOT NULL | Array of participant user IDs |
| participantDetails | Object | NOT NULL | Map of user details by ID |
| lastMessage | String | NULL | Last message text |
| lastMessageTime | Timestamp | NULL | Last message timestamp |
| unreadCount | Object | NULL | Map of unread counts by user ID |
| typing | Object | NULL | Map of typing status by user ID |
| typingTimestamp | Object | NULL | Map of typing timestamps by user ID |
| deletedBy | Object | NULL | Map of deletion status by user ID |
| deletedAt | Object | NULL | Map of deletion timestamps by user ID |
| createdAt | Timestamp | NOT NULL | Conversation creation timestamp |
| updatedAt | Timestamp | NOT NULL | Last update timestamp |

---

## 8. MESSAGES Entity

**Description:** Individual messages within conversations (subcollection).

**Primary Key:** `messageId` (String)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| messageId | String | PK, NOT NULL, UNIQUE | Unique message identifier |
| conversationId | String | FK (CONVERSATIONS), NOT NULL | References CONVERSATIONS.conversationId |
| senderId | String | FK (USERS), NOT NULL | References USERS.uid (sender) |
| text | String | NOT NULL | Message text content |
| read | Boolean | DEFAULT false | Message read status |
| readAt | Timestamp | NULL | Message read timestamp |
| type | Enum | NOT NULL | Message type: text, image, system |
| imageUrl | String | NULL | URL to image (if type=image) |
| createdAt | Timestamp | NOT NULL | Message creation timestamp |

---

## 9. NOTIFICATIONS Entity

**Description:** Push notifications sent to users.

**Primary Key:** `notificationId` (String)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| notificationId | String | PK, NOT NULL, UNIQUE | Unique notification identifier |
| userId | String | FK (USERS), NOT NULL | References USERS.uid (recipient) |
| title | String | NOT NULL | Notification title |
| body | String | NOT NULL | Notification body text |
| type | String | NOT NULL | Notification type/category |
| data | Object | NULL | Additional notification data |
| read | Boolean | DEFAULT false | Read status |
| readAt | Timestamp | NULL | Read timestamp |
| createdAt | Timestamp | NOT NULL | Notification creation timestamp |

---

## 10. DEVICE_TOKENS Entity

**Description:** FCM device tokens for push notifications.

**Primary Key:** `tokenId` (String)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| tokenId | String | PK, NOT NULL, UNIQUE | Unique token identifier |
| userId | String | FK (USERS), NOT NULL | References USERS.uid |
| token | String | NOT NULL, UNIQUE | FCM device token |
| platform | Enum | NOT NULL | Platform: android, ios, web |
| createdAt | Timestamp | NOT NULL | Token registration timestamp |
| updatedAt | Timestamp | NOT NULL | Last update timestamp |

---

## 11. TRANSACTIONS Entity

**Description:** Payment and payout transactions.

**Primary Key:** `transactionId` (String)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| transactionId | String | PK, NOT NULL, UNIQUE | Unique transaction identifier |
| bookingId | String | FK (BOOKINGS), NULL | References BOOKINGS.bookingId |
| clientId | String | FK (USERS), NULL | References USERS.uid (client) |
| providerId | String | FK (USERS), NULL | References USERS.uid (provider) |
| amount | Number | NOT NULL | Transaction amount in PHP |
| type | Enum | NOT NULL | Type: payment, payout, refund |
| status | String | NOT NULL | Transaction status |
| paymentMethod | String | NULL | Payment method used |
| paymentIntentId | String | NULL | PayMongo payment intent ID |
| paymongoSourceId | String | NULL | PayMongo source ID |
| description | String | NULL | Transaction description |
| createdAt | Timestamp | NOT NULL | Transaction creation timestamp |
| updatedAt | Timestamp | NOT NULL | Last update timestamp |

---

## 12. PAYOUT_ACCOUNTS Entity

**Description:** Provider payout account information.

**Primary Key:** `accountId` (String)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| accountId | String | PK, NOT NULL, UNIQUE | Unique account identifier |
| providerId | String | FK (USERS), NOT NULL | References USERS.uid (provider) |
| accountType | Enum | NOT NULL | Type: gcash, bank |
| accountName | String | NOT NULL | Account holder name |
| accountNumber | String | NOT NULL | Account number |
| bankName | String | NULL | Bank name (if type=bank) |
| isDefault | Boolean | DEFAULT false | Default account flag |
| createdAt | Timestamp | NOT NULL | Account creation timestamp |
| updatedAt | Timestamp | NOT NULL | Last update timestamp |

---

## 13. PAYOUT_REQUESTS Entity

**Description:** Provider payout requests to admin.

**Primary Key:** `payoutId` (String)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| payoutId | String | PK, NOT NULL, UNIQUE | Unique payout request identifier |
| providerId | String | FK (USERS), NOT NULL | References USERS.uid (provider) |
| accountId | String | FK (PAYOUT_ACCOUNTS), NOT NULL | References PAYOUT_ACCOUNTS.accountId |
| amount | Number | NOT NULL | Payout amount in PHP |
| status | Enum | NOT NULL | Status: pending, approved, rejected, completed |
| requestedAt | Timestamp | NOT NULL | Request creation timestamp |
| processedAt | Timestamp | NULL | Processing timestamp |
| processedBy | String | FK (USERS), NULL | Admin who processed |
| rejectionReason | String | NULL | Reason for rejection |
| completedAt | Timestamp | NULL | Completion timestamp |
| referenceNumber | String | NULL | Transaction reference number |
| notes | String | NULL | Admin notes |

---

## 14. PAYMENT_METHODS Entity

**Description:** User payment methods.

**Primary Key:** `methodId` (String)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| methodId | String | PK, NOT NULL, UNIQUE | Unique payment method identifier |
| userId | String | FK (USERS), NOT NULL | References USERS.uid |
| type | Enum | NOT NULL | Type: gcash, card, bank |
| name | String | NOT NULL | Payment method name |
| accountNumber | String | NOT NULL | Account/card number |
| accountName | String | NOT NULL | Account holder name |
| isDefault | Boolean | DEFAULT false | Default payment method flag |
| createdAt | Timestamp | NOT NULL | Creation timestamp |
| updatedAt | Timestamp | NOT NULL | Last update timestamp |

---

## 15. GAMIFICATION Entity

**Description:** User gamification data (points, badges, achievements).

**Primary Key:** `gamificationId` (String)

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| gamificationId | String | PK, NOT NULL, UNIQUE | Unique gamification identifier |
| userId | String | FK (USERS), NOT NULL, UNIQUE | References USERS.uid |
| points | Number | DEFAULT 0 | Total points earned |
| level | Number | DEFAULT 1 | User level |
| tier | Enum | NOT NULL | Tier: bronze, silver, gold, platinum, diamond |
| badges | Array | NULL | Array of earned badge IDs |
| achievements | Array | NULL | Array of earned achievement IDs |
| streak | Number | DEFAULT 0 | Current activity streak |
| lastActivityDate | Date | NULL | Last activity date |
| totalBookings | Number | DEFAULT 0 | Total bookings completed |
| totalSpent | Number | DEFAULT 0 | Total amount spent (PHP) |
| createdAt | Timestamp | NOT NULL | Creation timestamp |
| updatedAt | Timestamp | NOT NULL | Last update timestamp |

**Tier Calculation:**
- Bronze: 0-999 points
- Silver: 1000-2499 points
- Gold: 2500-4999 points
- Platinum: 5000-9999 points
- Diamond: 10000+ points

---

## Data Type Definitions

| Data Type | Description | Example |
|-----------|-------------|---------|
| String | Text data | "John Doe" |
| Number | Numeric data (integer or decimal) | 100, 4.5 |
| Boolean | True/false value | true, false |
| Date | Date value | "2024-12-15" |
| Timestamp | Date and time | "2024-12-15T10:30:00Z" |
| Enum | Predefined set of values | "CLIENT", "PROVIDER", "ADMIN" |
| Array | List of values | ["id1", "id2", "id3"] |
| Object | Key-value pairs | { "key": "value" } |

---

## Constraint Definitions

| Constraint | Description |
|------------|-------------|
| PK | Primary Key - Uniquely identifies each record |
| FK | Foreign Key - References another table's primary key |
| NOT NULL | Field must have a value |
| NULL | Field can be empty |
| UNIQUE | Value must be unique across all records |
| DEFAULT | Default value if not specified |

---

## Enum Value Definitions

### Role Enum
- `CLIENT` - Service client/customer
- `PROVIDER` - Service provider
- `ADMIN` - System administrator

### Provider Status Enum
- `pending` - Awaiting admin approval
- `approved` - Active provider
- `rejected` - Application rejected
- `suspended` - Temporarily disabled

### Booking Status Enum
- `pending` - Awaiting admin approval
- `approved` - Admin approved, awaiting provider
- `accepted` - Provider accepted
- `traveling` - Provider on the way
- `arrived` - Provider at location
- `in_progress` - Work in progress
- `completed` - Work completed
- `cancelled` - Booking cancelled
- `rejected` - Provider rejected

### Transaction Type Enum
- `payment` - Client payment for service
- `payout` - Provider payout
- `refund` - Refund to client

### Payout Status Enum
- `pending` - Awaiting admin review
- `approved` - Admin approved
- `rejected` - Admin rejected
- `completed` - Money transferred

### Platform Enum
- `android` - Android mobile app
- `ios` - iOS mobile app
- `web` - Web application

### Message Type Enum
- `text` - Text message
- `image` - Image message
- `system` - System-generated message

### Tier Enum
- `bronze` - 0-999 points
- `silver` - 1000-2499 points
- `gold` - 2500-4999 points
- `platinum` - 5000-9999 points
- `diamond` - 10000+ points

---

**Document Information:**
- Created: December 2024
- System: General Service System - Maasin City
- Database: Firebase Firestore
- Version: 1.0
- Total Entities: 15
