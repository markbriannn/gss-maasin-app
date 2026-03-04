# REQUIREMENT ANALYSIS

## The Proposed System Function (General Service System)

### Who: Key Stakeholders

The General Service System involves three primary user groups operating within Maasin City's service economy:

**Service Providers** - Verified skilled workers such as carpenters, electricians, plumbers, cleaners, appliance repair technicians, and other individuals offering sideline services. These providers register through the platform, submit verification documents (government-issued ID, barangay clearance, police clearance, profile photo), and undergo admin approval before they can accept jobs.

**Clients** - Registered individuals, households, and small businesses who use the platform to search for, book, and hire verified service providers. Clients create accounts with email and phone verification, browse provider profiles, create booking requests, make online payments, and submit feedback after service completion.

**Administrators** - System managers responsible for verifying provider applications, approving booking requests, monitoring platform activities through real-time map view and analytics dashboard, managing user accounts, and ensuring platform integrity and security.

### What: Business Activity

The business activity revolves around the digital coordination and management of sideline service bookings through the General Service System platform. Service providers create profiles showcasing their skills, services offered, pricing (fixed or hourly rates), availability, and credentials. Clients browse and search for providers by service category, location, rating, and availability, then create detailed booking requests specifying service requirements, schedule, location, and payment method.

The system facilitates the entire service lifecycle from initial booking through completion and payment. All transactions are processed digitally through PayMongo payment gateway, supporting GCash e-wallet and credit/debit card payments. The platform automatically calculates and adds a 5% service fee to the client's payment, ensuring providers receive their full quoted amount while the platform generates revenue for sustainability.

Service categories managed through the system include electrical work, plumbing, carpentry, house cleaning, appliance repair, painting, gardening, and other skilled trades. Each transaction is documented with digital receipts, booking records, and transaction history for both parties.

### Where: Location and Setting

The General Service System operates within Maasin City, Southern Leyte, serving residential neighborhoods, small commercial areas, and barangay communities throughout the city. The platform is accessible through two channels: a web application accessible via internet browsers on desktop computers, laptops, tablets, and mobile devices, and native mobile applications for Android and iOS devices available through App.

Service coordination happens entirely through the digital platform, eliminating the need for physical meeting places or informal communication channels. Providers and clients interact through the system's built-in messaging feature, booking interface, and real-time tracking capabilities. The centralized digital platform ensures that all users across Maasin City can access services regardless of their barangay or social network, breaking down geographic and social barriers that previously limited service access.

### When: Timing and Scheduling

The General Service System operates 24/7, allowing clients to browse providers, create booking requests, and schedule services at any time. The platform supports both immediate and advance booking, enabling clients to plan services according to their needs and provider availability. Providers can set their availability schedules within the system, indicating when they are available to accept jobs.

The booking workflow follows a structured timeline: clients create booking requests which enter "PENDING" status awaiting admin approval, administrators review and approve bookings during business hours, approved bookings are sent to selected providers who can accept or decline, accepted jobs progress through defined status stages (TRAVELING, ARRIVED, IN_PROGRESS, COMPLETED), and payments are processed upon job completion with automatic platform fee calculation.

Real-time notifications via push notifications, SMS, and email keep all parties informed of booking status changes, ensuring timely communication throughout the service delivery process. This structured scheduling system eliminates the inefficiencies of manual coordination and allows both providers and clients to plan their time effectively.

### How: System Procedures and Processes

The General Service System performs all procedures through structured digital workflows with automated processes and real-time data management:

**Service Provider Registration and Verification:**
- Providers register through the platform by entering personal information, contact details, and service offerings
- Email verification via Brevo email service and phone verification via Semaphore SMS service ensure valid contact information
- Providers upload required verification documents: government-issued ID, barangay clearance, police clearance, and profile photo
- Administrators review submitted documents and approve or reject applications
- Approved providers can set their service categories, pricing, availability, and go online to receive job requests

**Client Registration:**
- Clients register with basic personal information
- Email and phone verification ensure account authenticity
- Clients can immediately browse providers and create booking requests upon verification

**Service Discovery and Booking:**
- Clients browse provider listings with search and filter capabilities by service category, location, rating, and availability
- Provider profiles display comprehensive information: services offered, pricing, ratings, reviews, completed jobs, and verification status
- Clients create detailed booking requests specifying service type, description, schedule, location, photos, and payment method
- Booking requests enter admin approval queue

**Administrative Review:**
- Administrators review pending booking requests for completeness and payment verification
- Approved bookings are forwarded to selected providers
- Rejected bookings notify clients with reasons

**Provider Response:**
- Providers receive push notifications for new job requests
- Providers can accept or decline jobs based on their availability and preferences
- Accepted jobs move to active status; declined jobs notify clients

**Service Execution and Tracking:**
- Providers update job status through defined stages: TRAVELING, ARRIVED, IN_PROGRESS, COMPLETED
- Real-time GPS tracking allows clients to monitor provider location during active jobs
- In-app messaging enables communication between clients and providers
- Status updates trigger automatic notifications to relevant parties

**Payment Processing:**
- Upon job completion, the system processes payment through PayMongo payment gateway
- Clients pay via GCash e-wallet or credit/debit card
- The system automatically calculates the 5% platform service fee added to the provider's quoted price
- Providers receive their full quoted amount; the platform retains the service fee
- Digital receipts are generated and stored for both parties
- Transaction records are maintained in the system database

**Feedback and Rating:**
- After service completion, clients can rate providers (1-5 stars) and write review comments
- Ratings and reviews are displayed on provider profiles
- Provider average ratings are automatically calculated and updated
- Feedback helps future clients make informed decisions and encourages provider accountability

**Quality Assurance and Trust:**
- Multi-level identity verification (ID, clearances, profile photo) establishes provider credibility
- Admin-monitored verification process ensures only legitimate providers access the platform
- Rating and review system provides transparent performance feedback
- In-app messaging creates documented communication trails
- Digital transaction records provide accountability for both parties

**Gamification and Engagement:**
- Users earn points for completed bookings and platform activities
- Tier system (Bronze, Silver, Gold, Platinum) rewards active users
- Badges and achievements recognize milestones
- Leaderboard displays top-performing users
- Gamification encourages continued platform engagement

**Administrative Monitoring:**
- Real-time map view displays all active jobs and provider locations
- Analytics dashboard shows platform statistics, user growth, and revenue
- Earnings overview tracks platform service fees and transaction volumes
- User management tools allow account activation, suspension, and support

### System Advantages

The General Service System addresses the limitations of informal service coordination by providing:

1. **Centralized Access** - Single platform for all service providers and clients in Maasin City
2. **Trust and Verification** - Multi-level identity verification and transparent rating system
3. **Digital Payments** - Secure online transactions via PayMongo with GCash and card support
4. **Real-Time Tracking** - GPS-based location monitoring during service delivery
5. **Documentation** - Digital receipts, transaction history, and booking records
6. **Accountability** - Rating system, admin oversight, and documented communications
7. **Efficiency** - Automated matching, notifications, and streamlined workflows
8. **Accessibility** - 24/7 platform access via web and mobile applications
9. **Transparency** - Clear pricing, service fees, and provider information
10. **Scalability** - System designed to handle growing user base and transaction volume

These structured digital processes transform the informal, fragmented service economy into an organized, efficient, and trustworthy marketplace that benefits all stakeholders in Maasin City.
