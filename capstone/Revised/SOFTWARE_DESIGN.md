# Design of Software Systems

## 1. System Architecture Overview

The General Service System (GSS) follows a modern three-tier architecture consisting of the Presentation Layer, Application Layer, and Data Layer. The system is designed as a cross-platform solution with a React Native mobile application and a Next.js web application, both communicating with shared backend services.

[Insert System Architecture Diagram Here]

### Architecture Components

**Presentation Layer (Client-Side)**
- React Native Mobile App (Android/iOS)
- Next.js Web Application
- Responsive UI components
- Real-time state management

**Application Layer (Server-Side)**
- Node.js/Express.js Backend API
- Firebase Cloud Functions
- Authentication Services
- Payment Processing Services
- Push Notification Services

**Data Layer**
- Firebase Firestore (NoSQL Database)
- Firebase Authentication
- Cloudinary (Media Storage)
- Firebase Cloud Messaging (FCM)

---

## 2. Use Case Scenarios

### Scenario 1: Client Registration and Login

**Actor**: New Client User

**Precondition**: User has downloaded the mobile app or accessed the web application

**Flow**:
1. User opens the GSS application
2. User selects "Register as Client"
3. User enters personal information (name, email, phone number)
4. System sends email verification link
5. User verifies email address
6. System sends SMS verification code
7. User enters verification code
8. User creates password
9. User uploads profile photo
10. System creates client account
11. User is redirected to client dashboard

[Insert Client Registration Flowchart Here]

---

### Scenario 2: Provider Registration and Verification

**Actor**: New Service Provider

**Precondition**: User wants to offer services on the platform

**Flow**:
1. User opens the GSS application
2. User selects "Register as Provider"
3. User enters personal information (name, email, phone, date of birth)
4. System verifies email and phone number
5. User selects service categories and sets pricing
6. User uploads required documents:
   - Valid Government-Issued ID
   - Selfie with ID
   - Barangay Clearance
   - Police Clearance
   - Profile Photo
7. User sets service location
8. System submits application for admin review
9. Admin reviews submitted documents
10. Admin approves or rejects application
11. Provider receives notification of approval status
12. If approved, provider account is activated

[Insert Provider Registration Flowchart Here]

---

### Scenario 3: Service Booking Process

**Actor**: Client

**Precondition**: Client is logged in and wants to book a service

**Flow**:
1. Client browses available service categories
2. Client selects desired service category
3. System displays list of verified providers
4. Client filters providers by rating, distance, or availability
5. Client views provider profile (ratings, reviews, services)
6. Client selects a provider
7. Client enters job details (description, schedule, location)
8. Client selects payment method (GCash, Card, or Cash)
9. Client submits booking request
10. System calculates total (service price + 5% platform fee)
11. Admin receives booking request for approval
12. Admin reviews and approves booking
13. Provider receives push notification of new job request
14. Provider accepts or declines the job
15. If accepted, client receives confirmation notification
16. Booking status changes to "Accepted"

[Insert Service Booking Flowchart Here]

---

### Scenario 4: Job Execution and Tracking

**Actor**: Client and Provider

**Precondition**: Booking has been accepted by provider

**Flow**:
1. Provider starts traveling to client location
2. Provider updates status to "Traveling"
3. Client receives notification and can track provider location
4. System displays real-time GPS location on map
5. System shows estimated arrival time
6. Provider arrives at client location
7. Provider updates status to "Arrived"
8. Client receives arrival notification
9. Provider begins service work
10. Provider updates status to "In Progress"
11. Provider completes the service
12. Provider updates status to "Completed"
13. System processes payment (if online payment selected)
14. System generates digital receipt
15. Client receives prompt to rate and review provider

[Insert Job Tracking Flowchart Here]

---

### Scenario 5: Payment Processing

**Actor**: Client

**Precondition**: Service has been completed

**Flow (Online Payment)**:
1. System calculates total amount (service price + 5% fee)
2. Client selects payment method (GCash or Card)
3. System creates PayMongo payment link
4. Client is redirected to PayMongo checkout
5. Client completes payment through GCash or Card
6. PayMongo processes transaction
7. System receives payment confirmation webhook
8. Provider receives full service price
9. Platform fee (5%) is recorded as system revenue
10. Digital receipt is generated for both parties

**Flow (Cash Payment)**:
1. System calculates total amount (service price + 5% fee)
2. Client selects cash payment option
3. Service is completed
4. Client pays provider in cash (total amount)
5. Provider marks payment as received
6. System records transaction
7. Digital receipt is generated

[Insert Payment Processing Flowchart Here]

---

### Scenario 6: Rating and Review

**Actor**: Client

**Precondition**: Service has been completed and payment processed

**Flow**:
1. Client receives prompt to rate provider
2. Client opens review screen
3. Client selects star rating (1-5 stars)
4. Client writes optional review comment
5. Client submits review
6. System saves review to database
7. System updates provider's average rating
8. Provider receives notification of new review
9. Review is displayed on provider's profile

[Insert Rating and Review Flowchart Here]

---

### Scenario 7: Admin Approval Workflow

**Actor**: Administrator

**Precondition**: Admin is logged into admin dashboard

**Flow (Provider Verification)**:
1. Admin views list of pending provider applications
2. Admin selects a provider application
3. Admin reviews submitted documents (ID, Selfie, Clearances)
4. Admin verifies document authenticity
5. Admin approves or rejects application
6. If rejected, admin provides rejection reason
7. Provider receives notification of decision
8. If approved, provider account is activated

**Flow (Booking Approval)**:
1. Admin views list of pending booking requests
2. Admin reviews booking details
3. Admin approves or rejects booking
4. If approved, booking is sent to provider
5. Provider receives notification to accept/decline

[Insert Admin Workflow Flowchart Here]

---

### Scenario 8: Real-Time Messaging

**Actor**: Client and Provider

**Precondition**: Booking exists between client and provider

**Flow**:
1. Client or provider opens chat screen
2. System loads conversation history
3. User types message
4. User sends message
5. System saves message to Firestore
6. Recipient receives push notification
7. Message appears in real-time on recipient's screen
8. Conversation continues as needed

[Insert Messaging Flowchart Here]

---

## 3. Component Diagram

[Insert Component Diagram Here]

### Mobile Application Components
- Authentication Module
- Home/Dashboard Module
- Provider Browsing Module
- Booking Management Module
- Real-Time Tracking Module
- Chat/Messaging Module
- Payment Module
- Profile Management Module
- Notifications Module

### Web Application Components
- Authentication Module
- Client Dashboard
- Provider Dashboard
- Admin Dashboard
- Booking Management
- Analytics Module
- User Management Module

### Backend Services
- Authentication Service (Firebase Auth)
- Database Service (Firestore)
- Payment Service (PayMongo API)
- Notification Service (FCM)
- Media Service (Cloudinary)
- Email Service (Nodemailer)

---

## 4. Database Design

[Insert Entity-Relationship Diagram Here]

### Main Collections (Firestore)

**users**
- userId, email, phone, name, role, profilePhoto, createdAt, status

**providers**
- providerId, userId, services, documents, rating, reviewCount, availability, location, verified

**bookings**
- bookingId, clientId, providerId, service, status, scheduledDate, location, totalAmount, platformFee, paymentMethod, paymentStatus

**reviews**
- reviewId, bookingId, clientId, providerId, rating, comment, createdAt

**conversations**
- conversationId, participants, lastMessage, updatedAt

**messages**
- messageId, conversationId, senderId, content, timestamp, read

**transactions**
- transactionId, bookingId, amount, platformFee, paymentMethod, status, createdAt

**notifications**
- notificationId, userId, title, body, type, read, createdAt

---

## 5. Security Design

[Insert Security Architecture Diagram Here]

### Authentication
- Firebase Authentication for user login
- Email and phone verification
- Secure password hashing
- Session management with JWT tokens

### Authorization
- Role-based access control (Client, Provider, Admin)
- Firestore security rules for data access
- API endpoint protection

### Data Protection
- HTTPS encryption for all communications
- Secure document storage in Cloudinary
- Payment data handled by PayMongo (PCI compliant)

---

## 6. Deployment Architecture

[Insert Deployment Diagram Here]

### Production Environment
- Firebase Hosting (Web Application)
- Google Play Store (Android App)
- Apple App Store (iOS App)
- Firebase Cloud Functions (Backend)
- Firebase Firestore (Database)
- Cloudinary CDN (Media Storage)

### External Services
- PayMongo (Payment Gateway)
- Google Maps API (Location Services)
- Firebase Cloud Messaging (Push Notifications)
- Nodemailer (Email Service)
