# Conceptual Framework

The conceptual framework of this study is grounded in the Input-Process-Output (IPO) model. It illustrates how the General Service System (GSS), a web-based and mobile freelance service platform, operates by transforming user input into meaningful outputs through a series of core processes. The platform aims to connect service providers such as electricians, plumbers, carpenters, cleaners, and other skilled workers with clients in need of short-term services in Maasin City, Southern Leyte.

## Input

The system receives the following inputs from users:

- **Client Registration Data** – Basic personal information, email, phone number, and profile photo for account creation and verification.

- **Provider Registration Data** – Personal information, service categories, pricing, availability, and required documents (valid government-issued ID, selfie with ID, Barangay Clearance, Police Clearance) for identity verification.

- **Service Requests** – Job details including service type, description, preferred schedule, location, and selected provider submitted by clients.

- **Payment Information** – Payment method selection (GCash, credit/debit card, or cash) and transaction details processed through PayMongo.

- **Feedback Data** – Ratings (1-5 stars) and written reviews submitted by clients after service completion.

## Process

The system processes inputs through the following core operations:

- **User Authentication** – Firebase Authentication validates user credentials and manages secure login sessions for clients, providers, and administrators.

- **Document Verification** – Admin reviews and approves provider-submitted documents to ensure legitimacy before activation on the platform.

- **Booking Management** – Admin approval workflow reviews service requests before forwarding to providers. Providers can accept or decline job requests.

- **Real-time Tracking** – GPS location tracking enables clients to monitor provider location and estimated arrival time during active jobs.

- **Status Management** – Jobs progress through defined stages: Pending → Accepted → Traveling → Arrived → In Progress → Completed.

- **Payment Processing** – PayMongo integration handles online payments with automatic platform fee calculation (5% added to client's total).

- **Communication** – In-app messaging facilitates coordination between clients and providers.

- **Notification Delivery** – Push notifications keep users informed of booking updates, messages, and status changes in real-time.

## Output

The system produces the following outputs:

- **Verified Provider Profiles** – Trusted service provider listings with verified credentials, ratings, reviews, and availability status.

- **Completed Service Transactions** – Successfully matched and fulfilled service engagements between clients and providers.

- **Digital Receipts** – Transaction records documenting service details, payment amounts, and completion status.

- **Rating and Review Records** – Accumulated feedback that builds provider reputation and helps clients make informed decisions.

- **Platform Analytics** – Administrative reports on system usage, earnings, and transaction history for monitoring and decision-making.

- **Push Notifications** – Real-time alerts delivered to users about booking status, messages, and system updates.

## Framework Summary

This framework highlights the digital shift toward efficient, community-based service delivery through technology. By transforming user inputs through systematic processes, the General Service System produces trusted connections, improved visibility for providers, and a streamlined service experience for clients in Maasin City.
