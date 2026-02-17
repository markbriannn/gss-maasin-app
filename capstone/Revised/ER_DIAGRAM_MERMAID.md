# ER Diagram - Mermaid Syntax

Copy the code below and paste it into https://mermaid.live/ to generate the image.

```mermaid
erDiagram
    USERS ||--|| CLIENTS : "is a"
    USERS ||--|| PROVIDERS : "is a"
    USERS ||--|| ADMINS : "is a"
    CLIENTS ||--o{ BOOKINGS : creates
    PROVIDERS ||--o{ BOOKINGS : accepts
    ADMINS ||--o{ BOOKINGS : approves
    BOOKINGS ||--o| REVIEWS : has
    BOOKINGS ||--|| TRANSACTIONS : generates
    USERS }o--o{ CONVERSATIONS : "participates in"
    CONVERSATIONS ||--o{ MESSAGES : contains
    USERS ||--o{ MESSAGES : sends
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ DEVICE_TOKENS : "has token"
    PROVIDERS ||--o{ PAYOUT_ACCOUNTS : "has account"
    PROVIDERS ||--o{ PAYOUT_REQUESTS : "requests payout"
    PAYOUT_REQUESTS }o--|| PAYOUT_ACCOUNTS : uses
    ADMINS ||--o{ PAYOUT_REQUESTS : processes
    USERS ||--o{ PAYMENT_METHODS : "has method"
    USERS ||--|| GAMIFICATION : "has points"

    USERS {
        string uid PK
        string email UK
        string password
        string firstName
        string middleName
        string lastName
        string suffix
        string phoneNumber UK
        date dateOfBirth
        string profilePhoto
        string role
        string streetAddress
        string barangay
        string city
        string province
        float latitude
        float longitude
        timestamp createdAt
        timestamp updatedAt
    }

    CLIENTS {
        string uid PK_FK
        string favorites
    }

    PROVIDERS {
        string uid PK_FK
        string serviceCategory
        string aboutService
        int yearsExperience
        string priceType
        float fixedPrice
        string providerStatus
        float rating
        float averageRating
        int reviewCount
        int completedJobs
        boolean isOnline
        string documents
    }

    ADMINS {
        string uid PK_FK
        string permissions
    }

    BOOKINGS {
        string bookingId PK
        string clientId FK
        string providerId FK
        string serviceCategory
        string serviceDescription
        date scheduledDate
        time scheduledTime
        string status
        boolean adminApproved
        string adminApprovedBy FK
        float amount
        string paymentStatus
        string paymentIntentId
        string clientLocation
        string providerLocation
        timestamp createdAt
        timestamp updatedAt
    }

    REVIEWS {
        string reviewId PK
        string bookingId FK
        string clientId FK
        string providerId FK
        int rating
        string comment
        timestamp createdAt
    }

    TRANSACTIONS {
        string transactionId PK
        string bookingId FK
        string clientId FK
        string providerId FK
        float amount
        string type
        string status
        string paymentMethod
        string paymentIntentId
        timestamp createdAt
    }

    CONVERSATIONS {
        string conversationId PK
        string participants
        string participantDetails
        string lastMessage
        timestamp lastMessageTime
        string unreadCount
        string typing
        string deletedBy
        timestamp createdAt
        timestamp updatedAt
    }

    MESSAGES {
        string messageId PK
        string conversationId FK
        string senderId FK
        string text
        boolean read
        timestamp readAt
        string type
        string imageUrl
        timestamp createdAt
    }

    NOTIFICATIONS {
        string notificationId PK
        string userId FK
        string title
        string body
        string type
        string data
        boolean read
        timestamp readAt
        timestamp createdAt
    }

    DEVICE_TOKENS {
        string tokenId PK
        string userId FK
        string token
        string platform
        timestamp createdAt
        timestamp updatedAt
    }

    PAYOUT_ACCOUNTS {
        string accountId PK
        string providerId FK
        string accountType
        string accountName
        string accountNumber
        string bankName
        boolean isDefault
        timestamp createdAt
    }

    PAYOUT_REQUESTS {
        string payoutId PK
        string providerId FK
        string accountId FK
        float amount
        string status
        timestamp requestedAt
        timestamp processedAt
        string processedBy FK
        string rejectionReason
        timestamp completedAt
        string referenceNumber
    }

    PAYMENT_METHODS {
        string methodId PK
        string userId FK
        string type
        string name
        string accountNumber
        string accountName
        boolean isDefault
        timestamp createdAt
    }

    GAMIFICATION {
        string gamificationId PK
        string userId FK
        int points
        int level
        string tier
        string badges
        string achievements
        int streak
        date lastActivityDate
        int totalBookings
        float totalSpent
        timestamp createdAt
        timestamp updatedAt
    }
```

## Instructions:

1. Go to https://mermaid.live/
2. Copy the entire code block above (starting from ```mermaid to ```)
3. Paste it into the editor on the left side
4. The diagram will automatically render on the right side
5. Click "Actions" → "PNG" or "SVG" to download the image

## Alternative: Use Mermaid CLI

If you have Node.js installed, you can generate the image locally:

```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i ER_DIAGRAM_MERMAID.md -o er_diagram.png
```
