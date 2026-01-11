# Prototype Description

## Overview

The prototype developed in this study is a web-based and mobile service marketplace platform designed to connect skilled workers with clients who require household and maintenance services in Maasin City, Southern Leyte. The system focuses on service providers such as electricians, plumbers, carpenters, and house cleaners who commonly rely on informal methods of finding work. The platform addresses this limitation by offering a centralized digital space where workers can promote their services while enabling clients to easily locate and hire verified service providers based on their specific needs.

## Platform Architecture

The General Service System (GSS) operates as a two-sided marketplace that requires both service providers and clients to create registered user accounts. The platform is accessible through:

- **Web Application** (Next.js) - Accessible through standard web browsers on desktop and mobile devices
- **Mobile Application** (React Native) - Available for Android and iOS devices

This multi-platform approach ensures that the system can be used conveniently by both clients and service providers regardless of their preferred device.

[Insert Platform Architecture Screenshot Here]

## Service Provider Registration and Verification

Service providers must complete a detailed registration process that includes:

- Personal information (name, email, phone number, date of birth)
- Email and phone verification
- Service categories and descriptions
- Areas of expertise and pricing
- Availability schedule
- Service location

[Insert Provider Registration Screenshot Here]

### Document Verification Process

To enhance trust and platform reliability, the prototype includes a comprehensive service provider verification process. Service providers are required to submit the following documents:

1. **Valid Government-Issued ID** - For identity verification
2. **Selfie with ID** - To confirm the person matches the submitted ID
3. **Barangay Clearance** - To verify local residency and good standing
4. **Police Clearance** - To ensure no criminal record
5. **Profile Photo** - For profile display

[Insert Document Upload Screenshot Here]

These documents are reviewed by the system administrator prior to approval. Only verified service providers are granted full access to the platform's job request features. This process is intended to promote user confidence, reduce fraudulent activity, and improve overall service quality within the platform.

[Insert Admin Verification Screenshot Here]

## Client Registration and Access

Clients are also required to register and log in to access the platform's core functionalities. The client registration process includes:

- Basic personal information (name, email, phone number)
- Email verification
- Phone number verification
- Profile photo upload

[Insert Client Registration Screenshot Here]

Once registered, clients can:

- Browse available service providers by category
- View verified provider profiles with ratings and reviews
- Filter providers by rating, distance, and availability
- Submit service requests with job details
- Track service progress in real-time
- Communicate with providers through in-app messaging
- Complete payments through online or cash methods
- Leave ratings and reviews after service completion

[Insert Client Dashboard Screenshot Here]

## Service Browsing and Provider Selection

Clients can browse available service providers using the following features:

- **Category Filtering** - Browse by service type (Electrical, Plumbing, Carpentry, Cleaning, etc.)
- **Rating Filter** - Sort providers by customer ratings
- **Distance Filter** - Find providers near the client's location
- **Availability Status** - View which providers are currently available

[Insert Provider Browsing Screenshot Here]

Each provider profile displays:

- Profile photo and verification badge
- Service categories and descriptions
- Pricing information
- Average rating and review count
- Individual customer reviews
- Availability status

[Insert Provider Profile Screenshot Here]

## Booking and Job Request System

The booking process follows these steps:

1. Client selects a service category
2. Client browses and selects a provider
3. Client enters job details (description, schedule, location)
4. Client selects payment method (GCash, Card, or Cash)
5. System calculates total (service price + 5% platform fee)
6. Client submits booking request
7. Admin reviews and approves booking
8. Provider receives notification and accepts/declines
9. Booking is confirmed upon provider acceptance

[Insert Booking Form Screenshot Here]

### Admin Approval Workflow

All booking requests pass through an admin approval workflow before being sent to providers. This ensures quality control and allows administrators to review requests for appropriateness and completeness.

[Insert Admin Booking Approval Screenshot Here]

## Real-Time GPS Tracking

The prototype integrates a GPS-based location tracking feature that becomes available once a service request has been accepted. This feature includes:

- **Provider Location Tracking** - Clients can view the provider's real-time location on a map
- **Estimated Arrival Time** - System calculates and displays ETA based on current location
- **Navigation Support** - Providers can navigate to the client's location using integrated maps
- **Status Updates** - Job status progresses through stages: Traveling → Arrived → In Progress → Completed

[Insert GPS Tracking Screenshot Here]

The inclusion of GPS functionality improves efficiency, particularly for mobile service providers who frequently travel to different locations.

## Online Payment Integration

The prototype integrates a secure online payment system through PayMongo that enables clients to complete transactions directly through the platform. Supported payment methods include:

- **GCash** - Popular Philippine e-wallet
- **Credit/Debit Cards** - Visa, Mastercard
- **Cash Payment** - For clients who prefer offline payment

[Insert Payment Selection Screenshot Here]

### Platform Fee Structure

The system implements a transparent fee structure:

- **Service Price** - Set by the provider
- **Platform Fee** - 5% added to the client's total payment
- **Provider Earnings** - Provider receives full service price

This structure ensures providers receive their full quoted amount while the platform generates revenue through the client-paid fee.

[Insert Payment Confirmation Screenshot Here]

## In-App Messaging

The platform includes built-in text messaging that allows clients and providers to coordinate service details directly within the system. Features include:

- Real-time message delivery
- Conversation history
- Push notifications for new messages
- Message read status

[Insert Chat Screenshot Here]

## Rating and Review System

After service completion, clients can provide feedback through:

- **5-Star Rating** - Overall service quality rating
- **Written Review** - Detailed feedback about the service experience

[Insert Review Screenshot Here]

Reviews are displayed on provider profiles and contribute to their overall rating, helping future clients make informed decisions.

## Push Notifications

The system delivers real-time push notifications for:

- New booking requests (for providers)
- Booking status updates (for clients)
- Provider arrival notifications
- New messages
- Payment confirmations
- Review reminders

[Insert Notification Screenshot Here]

## Admin Dashboard

The administrative module provides comprehensive platform management capabilities:

- **Provider Verification** - Review and approve/reject provider applications
- **Booking Management** - Review and approve booking requests
- **Real-Time Map** - Monitor all active jobs on a live map
- **Analytics Dashboard** - View platform statistics and trends
- **Earnings Reports** - Track platform revenue and transactions
- **User Management** - Manage client and provider accounts
- **System Notifications** - Send platform-wide announcements

[Insert Admin Dashboard Screenshot Here]

## Technical Implementation

From a technical standpoint, the prototype was developed using modern web and mobile development technologies:

| Component | Technology |
|-----------|------------|
| Mobile App | React Native (Android/iOS) |
| Web App | Next.js with TypeScript |
| Backend API | Node.js with Express.js |
| Database | Firebase Firestore |
| Authentication | Firebase Authentication |
| Payment Gateway | PayMongo |
| Media Storage | Cloudinary |
| Maps/Location | Google Maps API |
| Push Notifications | Firebase Cloud Messaging |
| Hosting | Firebase Hosting |

The user interface was designed to accommodate users with varying levels of technical proficiency, featuring intuitive navigation and clear visual feedback.

## Conclusion

Overall, the prototype demonstrates the feasibility of a digital service marketplace tailored to skilled workers and local clients in Maasin City, Southern Leyte. The system successfully implements its core functionalities including:

- User registration with verification
- Service provider document verification
- Service browsing and booking
- Admin approval workflow
- Real-time GPS tracking
- Online payment processing
- In-app messaging
- Rating and review system
- Push notifications
- Administrative management

While the system is primarily intended as a functional prototype for capstone demonstration, it serves as a solid foundation for future system enhancements and potential large-scale deployment within the local community.
