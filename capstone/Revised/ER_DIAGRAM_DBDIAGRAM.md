# ER Diagram - dbdiagram.io Format

Copy the code below and paste it into https://dbdiagram.io/d to generate the image.

```dbml
// USERS Table
Table USERS {
  uid string [pk]
  email string [unique]
  password string
  firstName string
  middleName string
  lastName string
  suffix string
  phoneNumber string [unique]
  dateOfBirth date
  profilePhoto string
  role string
  streetAddress string
  barangay string
  city string
  province string
  latitude float
  longitude float
  createdAt timestamp
  updatedAt timestamp
}

// CLIENTS Table
Table CLIENTS {
  uid string [pk, ref: - USERS.uid]
  favorites string
}

// PROVIDERS Table
Table PROVIDERS {
  uid string [pk, ref: - USERS.uid]
  serviceCategory string
  aboutService string
  yearsExperience int
  priceType string
  fixedPrice float
  providerStatus string
  rating float
  averageRating float
  reviewCount int
  completedJobs int
  isOnline boolean
  documents string
}

// ADMINS Table
Table ADMINS {
  uid string [pk, ref: - USERS.uid]
  permissions string
}

// BOOKINGS Table
Table BOOKINGS {
  bookingId string [pk]
  clientId string [ref: > CLIENTS.uid]
  providerId string [ref: > PROVIDERS.uid]
  serviceCategory string
  serviceDescription string
  scheduledDate date
  scheduledTime time
  status string
  adminApproved boolean
  adminApprovedBy string [ref: > ADMINS.uid]
  amount float
  paymentStatus string
  paymentIntentId string
  clientLocation string
  providerLocation string
  createdAt timestamp
  updatedAt timestamp
}

// REVIEWS Table
Table REVIEWS {
  reviewId string [pk]
  bookingId string [ref: - BOOKINGS.bookingId]
  clientId string [ref: > CLIENTS.uid]
  providerId string [ref: > PROVIDERS.uid]
  rating int
  comment string
  createdAt timestamp
}

// TRANSACTIONS Table
Table TRANSACTIONS {
  transactionId string [pk]
  bookingId string [ref: - BOOKINGS.bookingId]
  clientId string [ref: > CLIENTS.uid]
  providerId string [ref: > PROVIDERS.uid]
  amount float
  type string
  status string
  paymentMethod string
  paymentIntentId string
  createdAt timestamp
}

// CONVERSATIONS Table
Table CONVERSATIONS {
  conversationId string [pk]
  participants string
  participantDetails string
  lastMessage string
  lastMessageTime timestamp
  unreadCount string
  typing string
  deletedBy string
  createdAt timestamp
  updatedAt timestamp
}

// MESSAGES Table
Table MESSAGES {
  messageId string [pk]
  conversationId string [ref: > CONVERSATIONS.conversationId]
  senderId string [ref: > USERS.uid]
  text string
  read boolean
  readAt timestamp
  type string
  imageUrl string
  createdAt timestamp
}

// NOTIFICATIONS Table
Table NOTIFICATIONS {
  notificationId string [pk]
  userId string [ref: > USERS.uid]
  title string
  body string
  type string
  data string
  read boolean
  readAt timestamp
  createdAt timestamp
}

// DEVICE_TOKENS Table
Table DEVICE_TOKENS {
  tokenId string [pk]
  userId string [ref: > USERS.uid]
  token string
  platform string
  createdAt timestamp
  updatedAt timestamp
}

// PAYOUT_ACCOUNTS Table
Table PAYOUT_ACCOUNTS {
  accountId string [pk]
  providerId string [ref: > PROVIDERS.uid]
  accountType string
  accountName string
  accountNumber string
  bankName string
  isDefault boolean
  createdAt timestamp
}

// PAYOUT_REQUESTS Table
Table PAYOUT_REQUESTS {
  payoutId string [pk]
  providerId string [ref: > PROVIDERS.uid]
  accountId string [ref: > PAYOUT_ACCOUNTS.accountId]
  amount float
  status string
  requestedAt timestamp
  processedAt timestamp
  processedBy string [ref: > ADMINS.uid]
  rejectionReason string
  completedAt timestamp
  referenceNumber string
}

// PAYMENT_METHODS Table
Table PAYMENT_METHODS {
  methodId string [pk]
  userId string [ref: > USERS.uid]
  type string
  name string
  accountNumber string
  accountName string
  isDefault boolean
  createdAt timestamp
}

// GAMIFICATION Table
Table GAMIFICATION {
  gamificationId string [pk]
  userId string [ref: - USERS.uid]
  points int
  level int
  tier string
  badges string
  achievements string
  streak int
  lastActivityDate date
  totalBookings int
  totalSpent float
  createdAt timestamp
  updatedAt timestamp
}

// Many-to-Many: USERS <-> CONVERSATIONS
Table USER_CONVERSATIONS {
  userId string [ref: > USERS.uid]
  conversationId string [ref: > CONVERSATIONS.conversationId]
  
  indexes {
    (userId, conversationId) [pk]
  }
}
```

## Instructions:

1. Go to https://dbdiagram.io/d
2. Copy the entire code block above
3. Paste it into the editor on the left side
4. The diagram will automatically render on the right side
5. Click "Export" → "Export to PNG" or "Export to PDF"

## Features of dbdiagram.io:

- Clean, professional ER diagrams
- Shows all relationships with proper cardinality
- Color-coded tables
- Easy to read and understand
- Perfect for capstone presentations
- Free to use, no account required

## Relationship Notation:

- `ref: >` = One-to-Many (FK points to PK)
- `ref: -` = One-to-One
- `ref: <>` = Many-to-Many

This is the RECOMMENDED option for your capstone - it produces the cleanest, most professional diagrams!
