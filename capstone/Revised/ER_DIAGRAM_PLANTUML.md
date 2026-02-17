# ER Diagram - PlantUML Format

Copy the code below and paste it into http://www.plantuml.com/plantuml/uml/ to generate the image.

```plantuml
@startuml ER_Diagram

' Entities
entity "USERS" as users {
  * uid : string <<PK>>
  --
  * email : string <<UK>>
  * password : string
  * firstName : string
  middleName : string
  * lastName : string
  suffix : string
  * phoneNumber : string <<UK>>
  * dateOfBirth : date
  profilePhoto : string
  * role : string
  streetAddress : string
  barangay : string
  city : string
  province : string
  latitude : float
  longitude : float
  * createdAt : timestamp
  * updatedAt : timestamp
}

entity "CLIENTS" as clients {
  * uid : string <<PK,FK>>
  --
  favorites : string
}

entity "PROVIDERS" as providers {
  * uid : string <<PK,FK>>
  --
  * serviceCategory : string
  aboutService : string
  yearsExperience : int
  priceType : string
  fixedPrice : float
  * providerStatus : string
  rating : float
  averageRating : float
  reviewCount : int
  completedJobs : int
  * isOnline : boolean
  documents : string
}

entity "ADMINS" as admins {
  * uid : string <<PK,FK>>
  --
  permissions : string
}

entity "BOOKINGS" as bookings {
  * bookingId : string <<PK>>
  --
  * clientId : string <<FK>>
  * providerId : string <<FK>>
  * serviceCategory : string
  serviceDescription : string
  scheduledDate : date
  scheduledTime : time
  * status : string
  adminApproved : boolean
  adminApprovedBy : string <<FK>>
  * amount : float
  * paymentStatus : string
  paymentIntentId : string
  clientLocation : string
  providerLocation : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

entity "REVIEWS" as reviews {
  * reviewId : string <<PK>>
  --
  * bookingId : string <<FK>>
  * clientId : string <<FK>>
  * providerId : string <<FK>>
  * rating : int
  comment : string
  * createdAt : timestamp
}

entity "TRANSACTIONS" as transactions {
  * transactionId : string <<PK>>
  --
  * bookingId : string <<FK>>
  * clientId : string <<FK>>
  * providerId : string <<FK>>
  * amount : float
  * type : string
  * status : string
  paymentMethod : string
  paymentIntentId : string
  * createdAt : timestamp
}

entity "CONVERSATIONS" as conversations {
  * conversationId : string <<PK>>
  --
  * participants : string
  participantDetails : string
  lastMessage : string
  lastMessageTime : timestamp
  unreadCount : string
  typing : string
  deletedBy : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

entity "MESSAGES" as messages {
  * messageId : string <<PK>>
  --
  * conversationId : string <<FK>>
  * senderId : string <<FK>>
  * text : string
  read : boolean
  readAt : timestamp
  type : string
  imageUrl : string
  * createdAt : timestamp
}

entity "NOTIFICATIONS" as notifications {
  * notificationId : string <<PK>>
  --
  * userId : string <<FK>>
  * title : string
  * body : string
  * type : string
  data : string
  read : boolean
  readAt : timestamp
  * createdAt : timestamp
}

entity "DEVICE_TOKENS" as device_tokens {
  * tokenId : string <<PK>>
  --
  * userId : string <<FK>>
  * token : string
  * platform : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

entity "PAYOUT_ACCOUNTS" as payout_accounts {
  * accountId : string <<PK>>
  --
  * providerId : string <<FK>>
  * accountType : string
  * accountName : string
  * accountNumber : string
  bankName : string
  isDefault : boolean
  * createdAt : timestamp
}

entity "PAYOUT_REQUESTS" as payout_requests {
  * payoutId : string <<PK>>
  --
  * providerId : string <<FK>>
  * accountId : string <<FK>>
  * amount : float
  * status : string
  * requestedAt : timestamp
  processedAt : timestamp
  processedBy : string <<FK>>
  rejectionReason : string
  completedAt : timestamp
  referenceNumber : string
}

entity "PAYMENT_METHODS" as payment_methods {
  * methodId : string <<PK>>
  --
  * userId : string <<FK>>
  * type : string
  name : string
  accountNumber : string
  accountName : string
  isDefault : boolean
  * createdAt : timestamp
}

entity "GAMIFICATION" as gamification {
  * gamificationId : string <<PK>>
  --
  * userId : string <<FK>>
  points : int
  level : int
  tier : string
  badges : string
  achievements : string
  streak : int
  lastActivityDate : date
  totalBookings : int
  totalSpent : float
  * createdAt : timestamp
  * updatedAt : timestamp
}

' Relationships
users ||--|| clients : "is a"
users ||--|| providers : "is a"
users ||--|| admins : "is a"
clients ||--o{ bookings : "creates"
providers ||--o{ bookings : "accepts"
admins ||--o{ bookings : "approves"
bookings ||--o| reviews : "has"
bookings ||--|| transactions : "generates"
users }o--o{ conversations : "participates in"
conversations ||--o{ messages : "contains"
users ||--o{ messages : "sends"
users ||--o{ notifications : "receives"
users ||--o{ device_tokens : "has token"
providers ||--o{ payout_accounts : "has account"
providers ||--o{ payout_requests : "requests payout"
payout_requests }o--|| payout_accounts : "uses"
admins ||--o{ payout_requests : "processes"
users ||--o{ payment_methods : "has method"
users ||--|| gamification : "has points"

@enduml
```

## Instructions:

1. Go to http://www.plantuml.com/plantuml/uml/
2. Copy the entire code block above (from @startuml to @enduml)
3. Paste it into the text area
4. Click "Submit" to generate the diagram
5. Download as PNG or SVG

## Alternative: Use PlantUML locally

If you have Java installed:

```bash
# Download PlantUML
curl -L -o plantuml.jar https://github.com/plantuml/plantuml/releases/download/v1.2023.13/plantuml-1.2023.13.jar

# Generate diagram
java -jar plantuml.jar ER_DIAGRAM_PLANTUML.md
```
