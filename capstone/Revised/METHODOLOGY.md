# Methodology

As defined by Imy Suzils Ishak and Rose Alinda Alias (2005), methodology refers to a systematic, theoretical analysis of the methods applied to a field of study. It includes the theoretical analysis of principles and methods used, often comprising paradigms, models, and both quantitative and qualitative techniques. In this project, the methodology serves as the overall research strategy that guided the design, development, and evaluation of the General Service System (GSS).

This study employed a developmental research approach, combining both qualitative and quantitative methods. The System Development Life Cycle (SDLC) was used as the core framework, specifically the Waterfall model, which follows a linear sequence of phases: requirements gathering, system design, development, testing, implementation, and evaluation. Each phase was executed systematically to ensure the successful completion of the system.

## Requirements Gathering

Data was collected through interviews and surveys involving 60 participants composed of service workers and potential clients within Maasin City. This helped identify the actual needs and challenges faced in accessing sideline jobs. Key findings included the need for:

- A reliable platform to connect service providers with clients
- Document verification to ensure provider legitimacy
- Real-time tracking for service coordination
- Multiple payment options including online and cash payments
- A rating and review system to build trust

## System Design

Based on the collected data, the system's architecture and user interface were designed using tools and principles learned in System Analysis and Design and Application Development. The following design artifacts were created:

- Wireframes and UI mockups for mobile and web interfaces
- Data Flow Diagrams (DFD) illustrating system processes
- Entity-Relationship Diagrams (ERD) for database structure
- Context diagrams showing system boundaries and external entities
- Process diagrams detailing each system module

The system architecture was designed with three user roles: Client, Service Provider, and Administrator, each with distinct interfaces and functionalities.

## Development Phase

The GSS was developed using modern web and mobile technologies aligned with current Emerging Technologies trends:

- **Mobile Application**: React Native for cross-platform Android and iOS development
- **Web Application**: Next.js with TypeScript for the web platform
- **Backend**: Node.js with Express.js for API services
- **Database**: Firebase Firestore for real-time data storage
- **Authentication**: Firebase Authentication for secure user management
- **Payment Integration**: PayMongo for GCash and credit/debit card processing
- **Cloud Storage**: Cloudinary for image and document storage
- **Maps and Location**: Google Maps API for real-time GPS tracking

Coding followed industry best practices to ensure maintainability and scalability. The system was developed as both a web-based platform and a mobile application, ensuring functional consistency and accessibility across devices.

## Testing and Evaluation

The system was tested for functionality, usability, efficiency, and reliability based on ISO/IEC 9126 software quality standards:

- **Functionality Testing**: Verified all features work as intended including registration, booking, payment, tracking, and messaging
- **Usability Testing**: Involved user feedback from selected service providers and clients to assess ease of use and user experience
- **Reliability Testing**: Evaluated through test cases and simulated usage scenarios to ensure system stability
- **Performance Testing**: Assessed system response times and handling of concurrent users

## Implementation and Deployment

A deployment plan was formulated for use in Maasin City, Southern Leyte. This included:

- Firebase Hosting for web application deployment
- Google Play Store distribution for Android mobile application
- Strategies for promoting system adoption among local service workers and clients
- Training materials and user guides for onboarding
- Administrative procedures for provider verification and platform management

Throughout the study, the students applied key competencies from coursework in system development, database management, and user experience design to create a solution tailored to real-world needs in the local community.
