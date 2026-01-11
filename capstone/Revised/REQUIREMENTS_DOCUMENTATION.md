# Requirements Documentation

## 1. Project Scope

The scope of the General Service System (GSS) encompasses the development of a digital freelance platform tailored to empower grassroots service providers and make their services more visible and accessible to the public. This initiative aims to revolutionize how informal workers promote their offerings by equipping them with tools that highlight their credibility, availability, and skillset—bridging the gap between modern demand and traditional labor.

Designed for both mobile applications (React Native for Android/iOS) and web browsers (Next.js), the system features a smooth and intuitive user experience optimized for clients and service providers alike. It serves as a virtual marketplace rooted in community trust, fostering local economic growth through digital transformation in Maasin City, Southern Leyte.

### In-Scope Features

**User Registration and Login Module**: Enables both clients and service providers to register, log in, and manage their accounts with email and phone verification. Service providers must submit valid government-issued identification, selfie with ID, Barangay Clearance, Police Clearance, and a profile photo for verification, ensuring authenticity and system integrity.

**Service Listing Module**: Allows verified providers to showcase their services with descriptions, rates, availability schedules, service categories, and relevant skill tags. This provides clients with transparent insights before hiring.

**Search and Filter Module**: Clients can browse providers using smart filters such as service category, location, user ratings, availability status, and distance—making service discovery fast and relevant.

**Job Request Module**: Facilitates streamlined client-to-provider job requests with admin approval workflow. Integrated push notifications enable real-time decision-making options for providers (accept or decline).

**Job Monitoring Module**: Offers continuous tracking of job status in real-time with GPS location tracking, keeping both parties updated through status stages: Pending → Accepted → Traveling → Arrived → In Progress → Completed.

**In-App Messaging Module**: Built-in text messaging allows clients and providers to coordinate service details directly within the platform.

**Online Payment Module**: Integrated PayMongo payment gateway supporting GCash and credit/debit card transactions. A platform service fee (5%) is added to the client's total payment as system revenue, with providers receiving their full quoted price. Cash payment option is also available.

**Feedback and Rating Module**: Enables clients to leave 5-star ratings and written reviews for providers, establishing a transparent feedback system that supports quality assurance and continuous improvement.

**Push Notification Module**: Real-time notifications keep users informed of booking updates, messages, job status changes, and system announcements.

**Admin Management Module**: Includes an administrator dashboard to manage provider verification and approval, review and approve booking requests, monitor all active jobs on a real-time map view, view platform analytics and earnings, resolve user-reported issues, and ensure platform trust and safety.

### Out-of-Scope Features

- International service provider support (limited to Maasin City, Southern Leyte)
- Built-in voice or video calling features
- Integration with government databases for automatic document verification
- Automated tax reporting or official government tax document generation
- Long-term employment arrangements or payroll systems

## 2. Functional Requirements

### 2.1 User Authentication
- FR-001: System shall allow users to register as Client or Service Provider
- FR-002: System shall verify user email addresses during registration
- FR-003: System shall verify user phone numbers during registration
- FR-004: System shall authenticate users via Firebase Authentication
- FR-005: System shall support password reset functionality via email

### 2.2 Provider Verification
- FR-006: System shall require providers to submit valid government-issued ID
- FR-007: System shall require providers to submit selfie with ID
- FR-008: System shall require providers to submit Barangay Clearance
- FR-009: System shall require providers to submit Police Clearance
- FR-010: System shall require providers to submit profile photo
- FR-011: System shall allow admin to review and approve/reject provider applications

### 2.3 Service Management
- FR-012: System shall allow providers to create and manage service listings
- FR-013: System shall allow providers to set service categories, descriptions, and rates
- FR-014: System shall allow providers to set availability status
- FR-015: System shall display provider profiles with ratings and reviews

### 2.4 Booking Management
- FR-016: System shall allow clients to browse and search for providers
- FR-017: System shall allow clients to filter providers by category, rating, and distance
- FR-018: System shall allow clients to submit job requests
- FR-019: System shall route job requests through admin approval workflow
- FR-020: System shall allow providers to accept or decline job requests
- FR-021: System shall track job status through defined stages

### 2.5 Real-Time Features
- FR-022: System shall provide real-time GPS tracking during active jobs
- FR-023: System shall display provider location on map for clients
- FR-024: System shall provide estimated arrival time
- FR-025: System shall deliver push notifications for booking updates
- FR-026: System shall support in-app messaging between clients and providers

### 2.6 Payment Processing
- FR-027: System shall integrate with PayMongo for online payments
- FR-028: System shall support GCash payment method
- FR-029: System shall support credit/debit card payments
- FR-030: System shall support cash payment option
- FR-031: System shall calculate and add 5% platform fee to client's total
- FR-032: System shall generate digital receipts for completed transactions

### 2.7 Feedback System
- FR-033: System shall allow clients to submit 5-star ratings after service completion
- FR-034: System shall allow clients to submit written reviews
- FR-035: System shall display aggregate ratings on provider profiles

### 2.8 Admin Functions
- FR-036: System shall provide admin dashboard for platform management
- FR-037: System shall allow admin to view all active jobs on real-time map
- FR-038: System shall provide analytics and earnings reports
- FR-039: System shall allow admin to send system-wide notifications

## 3. User Requirements

### Clients

- Effortless registration and login with email and phone verification
- Ability to search and filter providers based on category, rating, distance, and availability
- View provider profiles with ratings, reviews, and service details
- Send job requests and track the service process in real-time
- Communicate with providers through in-app messaging
- Pay through online methods (GCash, Cards) or cash
- Provide 5-star ratings and written feedback after services
- Receive push notifications for booking updates

### Service Providers

- Register with valid government-issued ID, selfie with ID, Barangay Clearance, Police Clearance, and profile photo for verification
- List and manage services with categories, descriptions, rates, and availability
- Accept or decline job requests with real-time push notifications
- Navigate to client location using GPS tracking
- Update job status through service stages
- Communicate with clients through in-app messaging
- Receive full service price (platform fee paid by client)
- View earnings, transaction history, and performance analytics

### Administrator

- Approve and verify provider applications by reviewing submitted documents
- Review and approve/reject booking requests before provider assignment
- Monitor all active jobs on real-time map view
- View platform analytics, earnings, and transaction history
- Handle user concerns and reported issues
- Send system-wide notifications and messages
- Maintain system integrity and platform trust

## 4. Non-Functional Requirements

### 4.1 Performance
- NFR-001: System shall load pages within 3 seconds under normal conditions
- NFR-002: System shall support concurrent users without degradation
- NFR-003: Real-time features shall update within 2 seconds

### 4.2 Security
- NFR-004: System shall use Firebase Authentication for secure login
- NFR-005: System shall implement Firestore security rules for data access control
- NFR-006: System shall process payments securely through PayMongo
- NFR-007: System shall store sensitive documents securely in cloud storage

### 4.3 Usability
- NFR-008: System shall provide intuitive navigation on both mobile and web
- NFR-009: System shall be accessible to users with limited technical background
- NFR-010: System shall provide consistent experience across platforms

### 4.4 Reliability
- NFR-011: System shall maintain 99% uptime during operational hours
- NFR-012: System shall handle network interruptions gracefully
- NFR-013: System shall preserve data integrity during transactions

### 4.5 Compatibility
- NFR-014: Mobile app shall support Android and iOS devices
- NFR-015: Web app shall support modern browsers (Chrome, Firefox, Safari, Edge)
- NFR-016: System shall be responsive across different screen sizes
