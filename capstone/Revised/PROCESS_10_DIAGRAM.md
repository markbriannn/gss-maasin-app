# PROCESS 10: FEEDBACK & RATING

## Level 1 DFD - Feedback & Rating Process

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          PROCESS 10: FEEDBACK & RATING                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘


    ┌──────────────┐                                                    ┌──────────────┐
    │              │                                                    │              │
    │    CLIENT    │                                                    │   PROVIDER   │
    │              │                                                    │              │
    └──────┬───────┘                                                    └──────┬───────┘
           │                                                                   │
           │ [FROM PROCESS 9]                                                  │
           │ Work completed & confirmed                                        │
           ▼                                                                   │
    ╭───────────────╮                                                          │
    │     10.1      │                                                          │
    │     OPEN      │                                                          │
    │    RATING     │                                                          │
    │    SCREEN     │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ Display Booking Info                                             │
            ▼                                                                  │
    ╭───────────────╮                                                          │
    │     10.2      │                                                          │
    │     RATE      │                                                          │
    │   PROVIDER    │                                                          │
    │   (1-5 STARS) │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ Select Rating                                                    │
            ▼                                                                  │
    ╭───────────────╮                                                          │
    │     10.3      │                                                          │
    │     WRITE     │                                                          │
    │    REVIEW     │                                                          │
    │   (OPTIONAL)  │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ Enter Comment                                                    │
            ▼                                                                  │
    ╭───────────────╮                                                          │
    │     10.4      │                                                          │
    │    UPLOAD     │                                                          │
    │    PHOTOS     │                                                          │
    │   (OPTIONAL)  │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ Select Photos (max 5)                                            │
            ▼                                                                  │
    ╭───────────────╮                                                          │
    │     10.5      │                                                          │
    │    SUBMIT     │                                                          │
    │    REVIEW     │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ Review Data                                                      │
            ▼                                                                  │
    ╔═══════════════╗                                                          │
    ║               ║                                                          │
    ║    REVIEWS    ║                                                          │
    ║   DATABASE    ║                                                          │
    ║  (Firestore)  ║                                                          │
    ║               ║                                                          │
    ║ • rating      ║                                                          │
    ║ • comment     ║                                                          │
    ║ • photos      ║                                                          │
    ║ • clientId    ║                                                          │
    ║ • providerId  ║                                                          │
    ║ • bookingId   ║                                                          │
    ║ • createdAt   ║                                                          │
    ╚═══════╤═══════╝                                                          │
            │                                                                  │
            ▼                                                                  │
    ╭───────────────╮                                                          │
    │     10.6      │                                                          │
    │    UPDATE     │                                                          │
    │   PROVIDER    │                                                          │
    │    RATING     │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ Calculate New Average                                            │
            ▼                                                                  │
    ╔═══════════════╗                                                          │
    ║               ║                                                          │
    ║     USERS     ║                                                          │
    ║  (Firestore)  ║                                                          │
    ║               ║                                                          │
    ║ averageRating:║                                                          │
    ║   4.5         ║                                                          │
    ║ reviewCount:  ║                                                          │
    ║   25          ║                                                          │
    ╚═══════╤═══════╝                                                          │
            │                                                                  │
            ▼                                                                  │
    ╭───────────────╮                                                          │
    │     10.7      │                                                          │
    │    RELEASE    │                                                          │
    │    PAYMENT    │                                                          │
    │  TO PROVIDER  │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ Payment Amount (95%)                                             │
            ▼                                                                  │
    ╔═══════════════╗                                                          │
    ║               ║                                                          │
    ║ TRANSACTIONS  ║                                                          │
    ║   DATABASE    ║                                                          │
    ║  (Firestore)  ║                                                          │
    ║               ║                                                          │
    ║ • amount      ║                                                          │
    ║ • providerId  ║                                                          │
    ║ • bookingId   ║                                                          │
    ║ • status:     ║                                                          │
    ║   'completed' ║                                                          │
    ║ • platformFee:║                                                          │
    ║   5%          ║                                                          │
    ╚═══════╤═══════╝                                                          │
            │                                                                  │
            ▼                                                                  │
    ╭───────────────╮                                                          │
    │     10.8      │                                                          │
    │    UPDATE     │                                                          │
    │   PROVIDER    │                                                          │
    │    WALLET     │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ Add to Available Balance                                         │
            ▼                                                                  │
    ╔═══════════════╗                                                          │
    ║               ║                                                          │
    ║     USERS     ║                                                          │
    ║  (Firestore)  ║                                                          │
    ║               ║                                                          │
    ║ wallet:       ║                                                          │
    ║  available:   ║                                                          │
    ║   ₱1,500      ║                                                          │
    ║  pending: ₱0  ║                                                          │
    ╚═══════╤═══════╝                                                          │
            │                                                                  │
            ▼                                                                  │
    ╭───────────────╮                                                          │
    │     10.9      │                                                          │
    │    NOTIFY     │                                                          │
    │   PROVIDER    │                                                          │
    │  (PAYMENT)    │                                                          │
    ╰───────┬───────╯                                                          │
            │                                                                  │
            │ Push Notification                                                │
            │ "Payment received: ₱475"                                         │
            ▼                                                                  │
    ┌───────────────┐                                                          │
    │               │◀─────────────────────────────────────────────────────────┘
    │   PROVIDER    │
    │   RECEIVES    │
    │   PAYMENT     │
    │               │
    └───────┬───────┘
            │
            ▼
    ╭───────────────╮
    │     10.10     │
    │   AWARD       │
    │ GAMIFICATION  │
    │    POINTS     │
    ╰───────┬───────╯
            │
            │ [UPDATE]
            │ Award points to client & provider
            │ • Client: +10 points (review)
            │ • Provider: +50 points (job completed)
            ▼
    ╔═══════════════╗
    ║               ║
    ║ GAMIFICATION  ║
    ║   DATABASE    ║
    ║  (Firestore)  ║
    ║               ║
    ║ • userPoints  ║
    ║ • badges      ║
    ║ • tier        ║
    ╚═══════════════╝
```

---

## Process Descriptions

| Process | Name | Description |
|---------|------|-------------|
| **10.1** | Open Rating Screen | Client opens rating screen after work completion |
| **10.2** | Rate Provider | Client selects star rating (1-5 stars) |
| **10.3** | Write Review | Client writes optional text review/comment |
| **10.4** | Upload Photos | Client uploads optional photos (max 5) |
| **10.5** | Submit Review | Client submits rating and review |
| **10.6** | Update Provider Rating | System calculates new average rating |
| **10.7** | Release Payment | System releases payment to provider (95%) |
| **10.8** | Update Provider Wallet | System adds payment to provider's available balance |
| **10.9** | Notify Provider | System notifies provider of payment received |
| **10.10** | Award Gamification Points | System awards points to client and provider |

---

## Feedback & Rating Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          FEEDBACK & RATING FLOW                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    CLIENT                      SYSTEM                          PROVIDER
      │                            │                               │
      │  10.1 Open Rating Screen   │                               │
      │  (After work confirmed)    │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │  Display:                  │                               │
      │  • Provider Name           │                               │
      │  • Service Type            │                               │
      │  • Date & Time             │                               │
      │  • Amount Paid             │                               │
      │◀───────────────────────────│                               │
      │                            │                               │
      │  10.2 Select Rating        │                               │
      │  (Tap 4 stars)             │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │  10.3 Write Review         │                               │
      │  "Great work! Very         │                               │
      │   professional"            │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │  10.4 Upload Photos        │                               │
      │  [Select 2 photos]         │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │  10.5 Submit Review        │                               │
      │───────────────────────────▶│                               │
      │                            │                               │
      │                            │  Store Review:                │
      │                            │  • rating: 4                  │
      │                            │  • comment: "Great work..."   │
      │                            │  • photos: [url1, url2]       │
      │                            │  • clientId: xxx              │
      │                            │  • providerId: yyy            │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  10.6 Calculate New Rating    │
      │                            │  Old: 4.3 (24 reviews)        │
      │                            │  New: 4.32 (25 reviews)       │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  10.7 Release Payment         │
      │                            │  Amount: ₱500                 │
      │                            │  Platform Fee: ₱25 (5%)       │
      │                            │  Provider Gets: ₱475 (95%)    │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  10.8 Update Wallet           │
      │                            │  Available: +₱475             │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │                            │  10.9 Notify Provider         │
      │                            │──────────────────────────────▶│
      │                            │                               │  "Payment received:
      │                            │                               │   ₱475"
      │                            │                               │  "New review: 4⭐"
      │                            │                               │
      │                            │  10.10 Award Points           │
      │                            │  • Client: +10 points         │
      │                            │  • Provider: +50 points       │
      │                            │──────────┐                    │
      │                            │          │                    │
      │                            │◀─────────┘                    │
      │                            │                               │
      │  "Thank you for your       │                               │
      │   feedback!"               │                               │
      │◀───────────────────────────│                               │
      │                            │                               │
```

---

## Data Dictionary - Process 10

| Data Element | Description | Source | Destination |
|--------------|-------------|--------|-------------|
| **rating** | Star rating (1-5) | Client | Firestore (reviews) |
| **comment** | Text review | Client | Firestore (reviews) |
| **photos** | Review photos (URLs) | Client | Firestore (reviews) |
| **clientId** | Client who left review | Client | Firestore (reviews) |
| **providerId** | Provider being reviewed | System | Firestore (reviews) |
| **bookingId** | Related booking | System | Firestore (reviews) |
| **averageRating** | Provider's average rating | System | Firestore (users) |
| **reviewCount** | Total number of reviews | System | Firestore (users) |
| **paymentAmount** | Amount paid to provider | System | Firestore (transactions) |
| **platformFee** | Platform commission (5%) | System | Firestore (transactions) |
| **walletBalance** | Provider's available balance | System | Firestore (users) |

---

## Rating System

### Star Ratings
- **5 Stars** ⭐⭐⭐⭐⭐ - Excellent
- **4 Stars** ⭐⭐⭐⭐ - Good
- **3 Stars** ⭐⭐⭐ - Average
- **2 Stars** ⭐⭐ - Below Average
- **1 Star** ⭐ - Poor

### Average Rating Calculation
```javascript
newAverageRating = (
  (currentAverageRating * currentReviewCount) + newRating
) / (currentReviewCount + 1)
```

Example:
```
Current: 4.3 average (24 reviews)
New Rating: 4 stars
New Average: (4.3 × 24 + 4) / 25 = 4.32
```

---

## Review Components

### Required
- **Star Rating** (1-5 stars) - REQUIRED

### Optional
- **Text Comment** - Up to 500 characters
- **Photos** - Up to 5 photos, max 5MB each

### Review Display
Reviews are displayed on:
- Provider profile page
- Provider card in search results
- Service history

---

## Payment Release

### Payment Breakdown
```
Total Payment: ₱500
Platform Fee (5%): ₱25
Provider Receives (95%): ₱475
```

### Payment Flow
1. **Client submits review**
2. **System releases payment**
   - Deduct 5% platform fee
   - Add 95% to provider's wallet
3. **Provider notified**
4. **Provider can withdraw** to bank account

### Wallet Structure
```javascript
{
  available: 1500,  // Can withdraw
  pending: 0,       // Awaiting completion
  total: 1500       // Total earnings
}
```

---

## Gamification Points

### Points Awarded

| Action | User | Points |
|--------|------|--------|
| **Leave Review** | Client | +10 points |
| **Complete Job** | Provider | +50 points |
| **5-Star Review** | Provider | +10 bonus points |
| **First Review** | Client | +20 bonus points |

### Badges Earned

| Badge | Requirement | Icon |
|-------|-------------|------|
| **First Review** | Leave first review | 🌟 |
| **Helpful Reviewer** | Leave 10 reviews | 📝 |
| **5-Star Provider** | Maintain 5.0 rating (10+ reviews) | ⭐ |
| **Top Rated** | Maintain 4.8+ rating (50+ reviews) | 🏆 |

---

## Review Moderation

### Automatic Checks
- Profanity filter
- Spam detection
- Duplicate review prevention

### Manual Review
Admin can:
- Hide inappropriate reviews
- Remove spam reviews
- Respond to disputes

### Review Guidelines
- Be honest and constructive
- No personal attacks
- No profanity or hate speech
- Focus on the service quality

---

## Notifications

| Event | Recipient | Message |
|-------|-----------|---------|
| **Review Submitted** | Provider | "You received a new 4⭐ review!" |
| **Payment Released** | Provider | "Payment received: ₱475" |
| **Points Awarded** | Client | "You earned 10 points for leaving a review!" |
| **Points Awarded** | Provider | "You earned 50 points for completing a job!" |
| **Badge Earned** | User | "You earned the 'First Review' badge!" |

---

## Review Statistics

### Provider Profile Display
```
⭐ 4.32 (25 reviews)

5 stars: ████████████████░░░░ 60% (15)
4 stars: ████████░░░░░░░░░░░░ 24% (6)
3 stars: ████░░░░░░░░░░░░░░░░ 12% (3)
2 stars: ░░░░░░░░░░░░░░░░░░░░  4% (1)
1 star:  ░░░░░░░░░░░░░░░░░░░░  0% (0)
```

---

## Legend

```
┌───────────────┐
│               │     External Entity
│    ENTITY     │
│               │
└───────────────┘

╭───────────────╮
│     10.X      │     Process
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
