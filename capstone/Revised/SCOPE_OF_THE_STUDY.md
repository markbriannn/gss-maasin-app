# Scope of the Study

This study covers the design, development, implementation, and evaluation of a web-based and mobile platform known as the General Service System (GSS), created to facilitate service transactions between clients and freelance service providers offering sideline services in Maasin City, Southern Leyte.

The system is developed as both a mobile application (React Native for Android/iOS) and a web application (Next.js) for access through desktop and mobile web browsers. It is intended to support informal workers such as electricians, plumbers, carpenters, cleaners, and other skilled individuals.

The scope includes the development of key system modules, namely:

1. **User and Service Provider Registration** – Clients register using basic personal information with email and phone verification. Service providers submit additional documents including valid government-issued identification, a selfie with ID, Barangay Clearance, and Police Clearance for identity verification.

2. **Identity Verification** – Provider registrations undergo admin review and approval before activation on the platform.

3. **Service Listing and Provider Browsing** – Clients can browse available service categories, view provider profiles with ratings, reviews, and availability status.

4. **Job Request and Management** – Clients submit service requests which are reviewed by administrators before being forwarded to providers. Providers can accept or decline job requests through the system.

5. **Real-time GPS Tracking** – Once a job is accepted, clients can track the provider's location in real-time and view estimated arrival time through live map navigation.

6. **In-app Messaging** – Built-in text messaging allows clients and providers to coordinate service details directly within the platform.

7. **Online Payment Processing** – The system integrates with PayMongo payment gateway supporting GCash and credit/debit card transactions. Cash payment option is also available for clients who prefer offline payment.

8. **Job Status Tracking** – Jobs progress through defined status stages: Pending → Accepted → Traveling → Arrived → In Progress → Completed.

9. **Feedback and Rating Mechanism** – After service completion, clients can provide 5-star ratings and written reviews for service providers.

10. **Push Notifications** – Real-time notifications keep users informed of booking updates, messages, and job status changes.

The General Service System incorporates a platform service fee where a 5% fee is added to the client's total payment as system revenue. The service provider receives their full quoted price, ensuring transparent financial transactions and consistent fee collection for platform maintenance.

An administrative module is included to manage service provider verification, review and approve booking requests, monitor all active jobs on a real-time map view, view platform analytics and earnings, and address reported issues within the platform.

System evaluation is conducted in terms of functionality, usability, efficiency, and reliability using the ISO/IEC 9126 software quality standards, based on feedback gathered from selected service providers and clients within the study locale.

The system does not cover physical verification of submitted documents beyond admin review, dispute resolution outside the platform, services outside Maasin City, Southern Leyte, or integration with government databases for automatic document verification.
