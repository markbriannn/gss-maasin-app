# CHAPTER 1: INTRODUCTION

## Background of the Study

In today's digital age, the demand for sideline services such as carpentry, electrical work, plumbing, and cleaning continues to grow. These skilled workers play a crucial role in the daily lives of communities, providing essential support to households and small businesses. However, the ways in which these services are promoted and accessed remain largely informal and outdated. Information, which has become a vital resource, is often unmanaged or fragmented, limiting opportunities for both providers and clients.

This research focuses on Maasin City, Southern Leyte, where sideline service providers are deeply embedded in barangay life. Traditionally, service exchanges have relied on personal connections and word-of-mouth, which work well within close-knit communities. Yet as populations increase and communities become more diverse, these informal methods are no longer sufficient to ensure that clients can easily find trustworthy and available providers beyond their immediate networks.

The current situation reveals a significant problem: there is no centralized or organized way to access reliable information about sideline service providers, their skills, availability, or reputation. This lack of accessible, verified data leads to difficulties in decision-making for clients, missed income opportunities for workers, and overall inefficiency in service delivery. Many potential clients struggle to find the right service at the right time, while providers often remain unknown outside their traditional circles.

To better understand these challenges, surveys and interviews were conducted with local sideline workers and service seekers in Maasin City. The results highlighted a clear need for improved methods of connecting providers and clients, enhancing trust, and increasing access to services. Motivated by these findings, this research seeks to identify effective ways to bridge the gap between sideline service providers and the communities they serve.

## Statement of the Problem

The absence of a centralized, organized system for connecting clients with verified sideline service providers in Maasin City, Southern Leyte, creates significant barriers to efficient service delivery, economic opportunity, and community development. This research seeks to address specific problems regarding how clients can efficiently access comprehensive, reliable information about available service providers, their skills, experience, pricing, and availability. It also examines how the authenticity and credibility of service providers can be verified to ensure client safety and confidence in service transactions. 

The study investigates how clients can quickly identify and connect with appropriate service providers who match their specific needs, location, and schedule requirements. It explores how skilled workers can expand their visibility and client base beyond their immediate social networks to maximize income opportunities. Furthermore, it addresses how service bookings, payments, and completion can be managed in a transparent, secure, and documented manner that protects both parties. Finally, the research examines how service quality can be monitored, evaluated, and improved through systematic feedback mechanisms.

## Objectives of the Study

### General Objective

To develop and implement a web-based and mobile General Service System (GSS) that facilitates efficient, secure, and transparent connections between clients and verified sideline service providers in Maasin City, Southern Leyte.

### Specific Objectives

The specific objectives of this study are to design and develop a comprehensive platform that enables clients to search, evaluate, and book verified service providers based on service category, location, availability, ratings, and pricing. The system will implement a rigorous identity verification process that authenticates service providers through government-issued IDs, barangay clearance, police clearance, and photographic verification to ensure user safety and platform credibility. An administrative system will be created to enable efficient management of provider verification, booking approval, system monitoring, and user support.

The platform will integrate secure online payment processing through PayMongo, supporting GCash and credit/debit card transactions with transparent fee structures and automated transaction recording. Real-time job tracking and GPS location monitoring features will be developed to enhance transparency and security throughout the service delivery process. A feedback and rating system will be implemented to enable clients to evaluate service providers, promoting accountability and helping future clients make informed decisions. Gamification elements including points, levels, tiers, and badges will be incorporated to encourage user engagement and reward positive platform participation.

Both web-based and mobile application interfaces will be provided to ensure accessibility across devices and user preferences. Finally, the system's effectiveness, usability, and impact on service delivery efficiency, provider income opportunities, and client satisfaction will be evaluated through user testing and feedback analysis.

## Significance of the Study

This research holds significant value for multiple stakeholders within the Maasin City community and beyond. For service providers, the system provides sideline workers with a professional platform to showcase their skills, expand their market reach beyond personal networks, and access consistent income opportunities. The verification process enhances their credibility, while the rating system rewards quality service delivery. The platform democratizes access to clients, enabling even newly established providers to compete based on merit rather than social connections alone.

For clients, the system empowers service seekers with access to verified, reliable providers, comprehensive information for informed decision-making, and secure transaction mechanisms. Clients benefit from increased choice, competitive pricing, transparent service delivery, and accountability through the feedback system. The platform reduces the time, effort, and risk associated with finding and hiring service providers.

For the local community, by formalizing and streamlining the sideline service economy, the system contributes to local economic development, job creation, and improved quality of life. It promotes trust and transparency in service transactions, reduces information asymmetries, and creates a more efficient marketplace that benefits the entire community. System administrators gain tools for effective oversight, quality control, and community management, allowing them to monitor system activities, verify provider credentials, resolve disputes, and ensure platform integrity.

From an academic perspective, this study contributes to the body of knowledge on digital platforms for informal economy sectors, particularly in the context of Philippine local communities. It provides insights into user needs, system design considerations, and the impact of technology on traditional service delivery models. For future developers, the research serves as a reference for developing similar platforms in other localities or service sectors, offering lessons learned, best practices, and technical approaches that can be adapted and improved upon.  
The research serves as a reference for developing similar platforms in other localities or service sectors, offering lessons learned, best practices, and technical approaches that can be adapted and improved upon.

## Scope and Limitations

### Scope

This research encompasses geographic coverage specifically designed for Maasin City, Southern Leyte, focusing on service providers and clients within this locality. The platform supports multiple sideline service categories including electrical work, plumbing, carpentry, cleaning, appliance repair, and other skilled trades commonly needed in the community. The system accommodates three distinct user types: Clients (service seekers), Service Providers (service deliverers), and Administrators (system managers). Core features include user registration and verification, service provider profiles and listings, service search and filtering, booking creation and management, online payment processing, real-time job tracking, in-app messaging, feedback and rating system, gamification elements, and administrative oversight tools. The technology stack consists of React Native for mobile applications (Android and iOS), Next.js for web applications, Firebase for backend services (authentication, database, storage, hosting), PayMongo for payment processing, and third-party services for email (Brevo) and SMS (Semaphore) verification. The development period covers the design, development, implementation, and evaluation phases conducted during the academic year 2024-2025.

### Limitations

### Limitations

This research acknowledges several limitations that define the boundaries and constraints of the study. The General Service System is specifically designed for operation within Maasin City, Southern Leyte, and the results may not be directly applicable to other locations with different social, economic, or technological conditions. The system's design reflects the specific needs and characteristics of the Maasin City community, and implementation in other areas would require adaptation to local contexts.

The online payment feature is integrated through PayMongo and supports GCash and credit/debit card transactions. While this covers the most commonly used payment methods in the Philippines, the system does not support other payment options such as bank transfers, cash-on-delivery, or international payment methods. The platform automatically deducts a 5% service fee from each transaction to support system maintenance and operations, but it does not generate official government tax documents such as BIR receipts or perform automated tax reporting. Service providers remain responsible for their own tax compliance and reporting obligations.

The platform is designed specifically to support short-term or sideline service engagements and does not accommodate long-term employment arrangements, payroll systems, or contractual workforce management. The system focuses on connecting clients with service providers for individual jobs or projects rather than ongoing employment relationships. While the platform includes in-app text messaging for communication between users, built-in real-time voice or video calling features are not included. Users may need to rely on external communication platforms such as phone calls or messaging apps for more detailed coordination.

System performance and functionality depend on the availability and stability of internet connectivity within the area. Users in locations with poor network coverage may experience difficulties accessing the platform or using real-time features such as GPS tracking and instant messaging. The system requires active internet connection for most features, though some basic information may be cached for offline viewing. Additionally, the evaluation of the system is limited to the number of participants involved in usability testing during the research period and may not fully represent the perspectives of all potential users across different demographics and usage patterns.

Security mechanisms implemented in the system include standard authentication through email and phone verification, secure payment processing through PayMongo's encrypted gateway, and administrative verification of service provider credentials through document review. However, advanced security features such as biometric authentication, facial recognition, or automated fraud detection systems are not included within the scope of this study. The verification process relies on submitted documents and administrative review rather than real-time background checks or continuous monitoring.

The research focuses on the design, development, implementation, and initial evaluation of the General Service System within the academic timeframe. It does not examine the long-term economic impact of the platform on local employment patterns, the legal implications of platform-mediated service relationships, or the regulatory requirements that may emerge as the platform scales. Long-term effects on the informal service economy, seasonal variations in service demand, and the sustainability of the platform business model are beyond the scope of this study.

Finally, the system is developed primarily in English, which may present accessibility challenges for users who prefer or require Filipino or local dialect interfaces. While the interface is designed to be intuitive and user-friendly, language barriers may affect adoption rates among certain user groups. Future iterations of the system could address this limitation through multilingual support.

Despite these limitations, the research provides valuable insights into the development and implementation of digital platforms for informal service economies and offers a functional system that addresses identified community needs within the defined scope.
