# Appendices

---

## Appendix A – Survey Questionnaire for System Evaluation

**Title:** Survey Questionnaire for the Evaluation of the General Service System (GSS)

**Purpose:** This questionnaire was used to evaluate the General Service System in terms of functionality, usability, efficiency, and reliability based on the ISO/IEC 9126 software quality model.

### Part I: Respondent Profile

**Role:** ☐ Client ☐ Service Provider

**Age:** __________

**Experience Using GSS:**
☐ First Time User
☐ Occasional User
☐ Frequent User

### Part II: System Evaluation

**Scale:** 5 – Strongly Agree, 4 – Agree, 3 – Neutral, 2 – Disagree, 1 – Strongly Disagree

#### Functionality

| No. | Statement | 5 | 4 | 3 | 2 | 1 |
|-----|-----------|---|---|---|---|---|
| 1 | The system provides all the necessary features for hiring and offering services. | | | | | |
| 2 | The job request and acceptance features function correctly. | | | | | |
| 3 | The feedback and rating system works as intended. | | | | | |
| 4 | The real-time GPS tracking feature displays provider location accurately. | | | | | |
| 5 | The online payment processing (GCash/Card) works correctly. | | | | | |
| 6 | The in-app messaging feature allows effective communication. | | | | | |
| 7 | Push notifications are delivered promptly for booking updates. | | | | | |

#### Usability

| No. | Statement | 5 | 4 | 3 | 2 | 1 |
|-----|-----------|---|---|---|---|---|
| 8 | The system is easy to learn and navigate. | | | | | |
| 9 | Instructions and labels are clear and easy to understand. | | | | | |
| 10 | The system interface is user-friendly. | | | | | |
| 11 | The registration process is straightforward. | | | | | |
| 12 | The booking process is easy to complete. | | | | | |

#### Efficiency

| No. | Statement | 5 | 4 | 3 | 2 | 1 |
|-----|-----------|---|---|---|---|---|
| 13 | The system helps me find or offer services more quickly. | | | | | |
| 14 | Job requests and responses are processed promptly. | | | | | |
| 15 | The system reduces the need for manual coordination. | | | | | |
| 16 | Real-time tracking reduces uncertainty about service arrival. | | | | | |
| 17 | Online payment eliminates the need for cash transactions. | | | | | |

#### Reliability

| No. | Statement | 5 | 4 | 3 | 2 | 1 |
|-----|-----------|---|---|---|---|---|
| 18 | The system performs consistently without errors. | | | | | |
| 19 | Data entered into the system is saved correctly. | | | | | |
| 20 | The system remains usable during normal operations. | | | | | |
| 21 | The system maintains stable performance across mobile and web platforms. | | | | | |

### Part III: Open-Ended Questions

1. What features of the General Service System did you find most useful?

   _______________________________________________________________

2. What difficulties did you experience while using the system?

   _______________________________________________________________

3. What improvements would you suggest for the system?

   _______________________________________________________________

---

## Appendix B – Interview Guide

**Target Respondents:** Clients and service providers in Maasin City, Southern Leyte

### Guide Questions:

1. How did you usually find or offer sideline services before using the system?

2. What challenges did you experience when looking for services or clients?

3. In what ways did the General Service System improve the process?

4. Which system features did you find most useful? (e.g., GPS tracking, online payment, in-app messaging, ratings)

5. How was your experience with the online payment feature (GCash/Card)?

6. Did the real-time GPS tracking help you during service transactions?

7. How would you describe the admin approval process for bookings?

8. What improvements would you suggest for the system?

9. Would you recommend the General Service System to others? Why or why not?

---

## Appendix C – System Screenshots

This appendix presents selected screenshots of the General Service System interface, including the following:

### Mobile Application (React Native)

1. Splash Screen and Onboarding
2. Role Selection Screen (Client/Provider)
3. Client Registration Pages
4. Service Provider Registration and Document Upload
5. Email and Phone Verification Screens
6. Login Page
7. Client Dashboard/Home Screen
8. Service Provider Dashboard
9. Provider Browsing and Selection Screen
10. Provider Profile with Ratings and Reviews
11. Job Request/Booking Form
12. Payment Method Selection (GCash, Card, Cash)
13. Job Status Tracking Page (Pending → Accepted → Traveling → Arrived → In Progress → Completed)
14. Real-Time GPS Tracking Map
15. In-App Messaging/Chat Screen
16. Feedback and Rating Page
17. Digital Receipt Screen
18. Notifications Screen
19. Settings and Profile Management

### Web Application (Next.js)

20. Web Login and Registration Pages
21. Client Web Dashboard
22. Provider Web Dashboard
23. Admin Dashboard Overview
24. Admin Provider Verification Page
25. Admin Booking Approval Page
26. Admin Real-Time Map View
27. Admin Analytics and Earnings Dashboard
28. Web GPS Tracking View
29. Web Chat/Messaging Interface

[Insert Screenshots Here]

---

## Appendix D – Data Flow Diagrams (DFD)

This appendix contains the Data Flow Diagrams of the General Service System, illustrating how data moves between users and system processes.

### Context Diagram of the General Service System

[Insert Context Diagram Here]

**External Entities:**
- Client
- Service Provider
- Administrator
- PayMongo Payment Gateway
- Firebase Services
- Google Maps API

### Level 0 DFD showing major system processes:

1. **User Registration and Authentication**
   - Client registration with email/phone verification
   - Provider registration with document submission

2. **Service Provider Verification**
   - Document review by administrator
   - Account approval/rejection

3. **Service Browsing and Selection**
   - Provider listing and filtering
   - Profile viewing with ratings

4. **Booking Management**
   - Job request submission
   - Admin approval workflow
   - Provider accept/decline

5. **Job Processing and Tracking**
   - Status updates (Pending → Accepted → Traveling → Arrived → In Progress → Completed)
   - Real-time GPS tracking

6. **Payment Processing**
   - PayMongo integration (GCash, Cards)
   - Platform fee calculation (5%)
   - Cash payment recording

7. **Communication**
   - In-app messaging
   - Push notifications

8. **Feedback Management**
   - Rating submission (5-star)
   - Review comments
   - Provider rating calculation

[Insert Level 0 DFD Here]

---

## Appendix E – Entity Relationship Diagram (ERD)

This appendix presents the Entity Relationship Diagram of the General Service System database, showing the relationships among the major entities.

### Main Entities:

| Entity | Description |
|--------|-------------|
| **users** | Stores all user accounts (clients, providers, admins) |
| **providers** | Extended provider information, services, documents, verification status |
| **bookings** | Service requests with status, schedule, location, payment details |
| **reviews** | Client ratings and comments for providers |
| **conversations** | Chat threads between users |
| **messages** | Individual messages within conversations |
| **transactions** | Payment records with amounts and platform fees |
| **notifications** | Push notification records |
| **services** | Service categories and descriptions |

### Key Relationships:

- User (1) → Provider (1) [One-to-One for provider accounts]
- User (1) → Bookings (Many) [Client creates multiple bookings]
- Provider (1) → Bookings (Many) [Provider receives multiple bookings]
- Booking (1) → Review (1) [One review per completed booking]
- Booking (1) → Transaction (1) [One payment per booking]
- User (Many) ↔ Conversation (Many) [Users participate in conversations]
- Conversation (1) → Messages (Many) [Conversation contains messages]

[Insert ERD Diagram Here]

---

## Appendix F – Use Case Diagram

This appendix illustrates the system functionalities based on different user roles.

### Client Use Cases:

- Register and Login (with email/phone verification)
- Browse Service Categories
- Search and Filter Providers
- View Provider Profiles and Reviews
- Send Job Requests
- Select Payment Method (GCash, Card, Cash)
- Track Job Status in Real-Time
- View Provider Location on Map
- Send Messages to Provider
- Complete Payment
- Provide 5-Star Rating and Review
- View Service History and Receipts
- Manage Profile and Settings

### Service Provider Use Cases:

- Register and Submit Verification Documents
- Complete Email and Phone Verification
- Wait for Admin Approval
- Manage Service Listings and Pricing
- Set Availability Status
- Receive Job Request Notifications
- Accept or Decline Job Requests
- Update Job Status (Traveling, Arrived, In Progress)
- Navigate to Client Location
- Send Messages to Client
- Mark Jobs as Completed
- View Earnings and Transaction History
- Manage Profile and Settings

### Administrator Use Cases:

- Login to Admin Dashboard
- Review Provider Verification Documents
- Approve or Reject Provider Applications
- Review Booking Requests
- Approve or Reject Bookings
- Monitor All Active Jobs on Real-Time Map
- View Platform Analytics and Statistics
- View Earnings and Transaction Reports
- Send System-Wide Notifications
- Manage User Accounts
- Address User Reports and Issues

[Insert Use Case Diagram Here]

---

## Appendix G – Test Cases and Validation Results

This appendix includes sample test cases used during system testing:

| Test Case | Description | Expected Result | Actual Result | Status |
|-----------|-------------|-----------------|---------------|--------|
| TC-01 | Client Registration | Account successfully created with email verification | Account created, verification email sent | ✓ Passed |
| TC-02 | Provider Registration | Account created with document upload | Documents uploaded, pending admin review | ✓ Passed |
| TC-03 | Provider Verification | Admin can approve/reject provider | Provider status updated correctly | ✓ Passed |
| TC-04 | Login Authentication | User can login with correct credentials | Login successful, redirected to dashboard | ✓ Passed |
| TC-05 | Provider Browsing | Client can view list of verified providers | Provider list displayed with filters | ✓ Passed |
| TC-06 | Job Request Submission | Client can submit booking request | Request sent, pending admin approval | ✓ Passed |
| TC-07 | Admin Booking Approval | Admin can approve booking request | Booking forwarded to provider | ✓ Passed |
| TC-08 | Job Acceptance | Provider can accept job request | Status updated to "Accepted" | ✓ Passed |
| TC-09 | Job Decline | Provider can decline job request | Status updated, client notified | ✓ Passed |
| TC-10 | GPS Tracking | Client can view provider location | Real-time location displayed on map | ✓ Passed |
| TC-11 | Status Updates | Provider can update job status | Status changes reflected in real-time | ✓ Passed |
| TC-12 | In-App Messaging | Users can send/receive messages | Messages delivered in real-time | ✓ Passed |
| TC-13 | GCash Payment | Client can pay via GCash | Payment processed, receipt generated | ✓ Passed |
| TC-14 | Card Payment | Client can pay via credit/debit card | Payment processed successfully | ✓ Passed |
| TC-15 | Cash Payment | Client can select cash payment | Cash payment recorded correctly | ✓ Passed |
| TC-16 | Platform Fee Calculation | 5% fee added to client total | Fee calculated correctly | ✓ Passed |
| TC-17 | Feedback Submission | Client can submit rating and review | Rating saved, provider average updated | ✓ Passed |
| TC-18 | Push Notifications | Users receive booking notifications | Notifications delivered promptly | ✓ Passed |
| TC-19 | Receipt Generation | Digital receipt generated after completion | Receipt displays correct details | ✓ Passed |
| TC-20 | Admin Map View | Admin can view all active jobs on map | All active jobs displayed correctly | ✓ Passed |

---

## Appendix H – ISO/IEC 9126 Evaluation Instrument

This appendix contains the official evaluation instrument used to assess the system based on ISO/IEC 9126 criteria.

### Evaluation Criteria:

#### 1. Functionality
- Suitability: Does the system provide appropriate functions for specified tasks?
- Accuracy: Does the system provide correct results?
- Interoperability: Can the system interact with other systems (PayMongo, Firebase, Google Maps)?
- Security: Does the system protect information and data?

#### 2. Usability
- Understandability: Is the system easy to understand?
- Learnability: Can users learn to use the system easily?
- Operability: Can users operate and control the system?
- Attractiveness: Is the interface appealing to users?

#### 3. Efficiency
- Time Behavior: Does the system respond quickly?
- Resource Utilization: Does the system use resources efficiently?

#### 4. Reliability
- Maturity: Does the system avoid failures?
- Fault Tolerance: Can the system maintain performance despite faults?
- Recoverability: Can the system recover from failures?

### Rating Scale:

| Rating | Description |
|--------|-------------|
| 5 | Strongly Agree / Excellent |
| 4 | Agree / Very Good |
| 3 | Neutral / Satisfactory |
| 2 | Disagree / Needs Improvement |
| 1 | Strongly Disagree / Poor |

Respondents evaluated each criterion using the five-point Likert scale above.

---

## Appendix I – Informed Consent Form

This appendix includes the informed consent form signed by respondents.

---

### INFORMED CONSENT FORM

**Research Title:** Development and Evaluation of the General Service System (GSS): A Web-Based and Mobile Platform for Sideline Service Coordination in Maasin City, Southern Leyte

**Researchers:** [Names of Researchers]

**Institution:** [Name of Institution]

---

**Purpose of the Study:**
This study aims to develop and evaluate a digital platform that connects clients with verified service providers for sideline services in Maasin City.

**Participation:**
Your participation in this study is completely voluntary. You will be asked to use the General Service System and provide feedback through a survey questionnaire and/or interview.

**Confidentiality:**
All information collected will be kept confidential and used solely for research purposes. Your identity will not be disclosed in any publication or report.

**Risks and Benefits:**
There are no anticipated risks associated with your participation. Your feedback will contribute to improving the system for the benefit of the local community.

**Right to Withdraw:**
You may withdraw from the study at any time without penalty.

---

**Consent Statement:**

I have read and understood the information provided above. I voluntarily agree to participate in this study.

**Participant's Name:** ________________________

**Signature:** ________________________

**Date:** ________________________

---

## Appendix J – Deployment and Implementation Plan

This appendix outlines the proposed deployment strategy for the General Service System in Maasin City.

### 1. User Orientation and Training

- Conduct barangay-level orientation sessions for potential service providers
- Provide hands-on training for registration and document submission
- Create video tutorials for common system tasks
- Distribute user guides in print and digital formats
- Establish help desk support for user inquiries

### 2. System Promotion Strategies

- Partner with local government units (LGUs) for official endorsement
- Coordinate with barangay offices for community announcements
- Utilize social media platforms for awareness campaigns
- Distribute promotional materials (flyers, posters) in public areas
- Conduct demonstration sessions at community events

### 3. Administrator Assignment

- Designate trained personnel as system administrators
- Define administrator roles and responsibilities
- Establish verification protocols for provider applications
- Create guidelines for booking approval workflow
- Set up monitoring schedules for platform oversight

### 4. Technical Infrastructure

- Deploy web application on Firebase Hosting
- Publish mobile application on Google Play Store
- Configure PayMongo payment gateway for production
- Set up Firebase services (Authentication, Firestore, FCM)
- Establish Cloudinary storage for document uploads

### 5. Maintenance and Technical Support Plan

- Schedule regular system updates and security patches
- Monitor system performance and uptime
- Provide technical support channels (email, phone, in-app)
- Conduct periodic backup of system data
- Plan for scalability as user base grows

### 6. Evaluation and Feedback Collection

- Conduct periodic user satisfaction surveys
- Monitor system usage analytics
- Gather feedback for continuous improvement
- Track key performance indicators (bookings, ratings, transactions)
- Document lessons learned for future enhancements

[See DEPLOYMENT_AND_IMPLEMENTATION_PLAN.md for detailed deployment plan]
