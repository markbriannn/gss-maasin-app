# Results and Discussion

This chapter presents the results of the development, implementation, and evaluation of the General Service System (GSS). It explains how the system performed in relation to the objectives of the study and discusses the findings based on the ISO/IEC 9126 software quality standards. The results are also connected to the problems identified in earlier chapters and supported by relevant theories used as the foundation of the study.

## System Implementation Results

The General Service System (GSS) was successfully developed and deployed as both a web-based platform (Next.js) and a mobile application (React Native), accessible through desktop browsers, mobile web browsers, and native Android/iOS applications. All major features identified during the system design phase were fully implemented and functioned as expected. These features included:

- User and service provider registration with email and phone verification
- Identity verification with document submission
- Service listing and provider browsing
- Admin approval workflow for booking requests
- Job request and management
- Real-time GPS tracking and navigation
- In-app messaging between clients and providers
- Online payment processing via PayMongo (GCash, Cards) and cash options
- Job status tracking (Pending → Accepted → Traveling → Arrived → In Progress → Completed)
- Feedback and rating system
- Push notifications for real-time updates
- Administrative monitoring and analytics

Service providers were able to register on the platform and submit the required verification documents, such as a government-issued ID, a selfie with the ID, Barangay Clearance, and Police Clearance. On the other hand, clients could easily create accounts using basic personal information with email and phone verification, browse through a list of verified service providers, view provider profiles with ratings and reviews, submit job requests, track service progress in real-time, and complete payments through the system interface.

The administrative module allowed system administrators to review and verify service provider applications, approve booking requests before provider assignment, monitor all active jobs on a real-time map view, view platform analytics and earnings, and oversee overall system activities. Functional testing confirmed that the entire workflow—from submitting a job request, admin approval, provider acceptance or rejection, real-time tracking, service completion, payment processing, up to feedback submission—worked smoothly.

These results indicate that the system successfully met its functional requirements and addressed the absence of a centralized platform for sideline service coordination in Maasin City.

## Evaluation Results Based on ISO/IEC 9126

The General Service System was evaluated using selected criteria from the ISO/IEC 9126 software quality model, namely functionality, usability, efficiency, and reliability. The evaluation involved selected service providers and clients who used the system during the testing phase.

### Functionality

The results showed that the system was able to perform all its intended functions effectively. Respondents confirmed that important features such as browsing services, viewing provider profiles, submitting job requests, accepting or rejecting tasks, real-time GPS tracking, in-app messaging, tracking job progress through status stages, and marking services as completed were working properly.

The online payment module successfully processed transactions through PayMongo, supporting both GCash and credit/debit card payments. The platform service fee (5%) was consistently added to the client's total payment, with the full service price credited to the provider. Cash payment option also functioned correctly for users who preferred offline transactions.

The feedback and rating feature functioned as intended, allowing clients to evaluate service providers with 5-star ratings and written reviews after the completion of a job. Push notifications delivered real-time updates for booking status changes, new messages, and provider arrival notifications.

These findings indicate that the GSS successfully provided a complete and organized workflow for service transactions. The system addressed the main issue identified in the study by offering a structured platform that connects clients and service workers efficiently. This supports the system's goal of improving accessibility, transparency, and organization in sideline service coordination.

### Usability

In terms of usability, the system received generally positive responses from users. Most respondents stated that the system was easy to understand and navigate on both mobile and web platforms, even for users with limited technical skills. Tasks such as registration, document submission, job request submission, real-time tracking, payment processing, and job status tracking were completed without confusion.

The clean interface design, clear labels, and logical navigation helped create a positive user experience. The mobile application provided a native experience with smooth animations and intuitive navigation, while the web application offered full functionality for desktop users.

These results support the Technology Acceptance Model (TAM), particularly the concept of perceived ease of use, which suggests that users are more likely to accept and use a system when it is simple and convenient to operate.

### Efficiency

The evaluation results also showed that the General Service System improved efficiency in accessing and managing sideline services. Respondents noted that finding suitable service providers took less time compared to traditional methods such as word-of-mouth referrals or social media messaging.

Key efficiency improvements included:

- Job requests were sent instantly through the platform
- Admin approval workflow ensured quality control while maintaining fast processing
- Service providers were able to respond promptly through push notifications
- Real-time GPS tracking eliminated uncertainty about provider arrival times
- Online payments eliminated the need for face-to-face cash transactions
- In-app messaging streamlined communication between clients and providers
- The centralized database of verified providers reduced the need for repeated inquiries

These findings demonstrate that the GSS helped streamline service transactions and reduced manual effort for both clients and service providers.

### Reliability

The system demonstrated acceptable reliability throughout the testing period. Most users experienced stable performance with only minimal errors. The system consistently functioned during common activities such as browsing services, submitting job requests, tracking provider location, processing payments, and updating job statuses.

The system demonstrated consistent behavior across both mobile and web platforms. Some respondents reported minor delays when using the system under weak or unstable internet connections. However, these issues were attributed to external network conditions rather than system-related problems.

Overall, the system proved reliable within its intended scope and operating environment, especially in the local setting of Maasin City.

## Discussion of Findings

The overall results indicate that the General Service System effectively addressed the problems identified in the study. By replacing informal and fragmented service coordination methods with a centralized digital platform available on both mobile and web, the system improved accessibility, efficiency, and organization in managing sideline services.

### Trust and Verification

The implementation of a comprehensive verification process—requiring government-issued ID, selfie with ID, Barangay Clearance, and Police Clearance—helped increase trust between clients and service providers. This supports the trust model proposed by Mayer, Davis, and Schoorman (1995), which emphasizes the importance of ability, benevolence, and integrity in building trust relationships.

The admin approval workflow for both provider registration and booking requests added an additional layer of quality control, ensuring that only verified providers could offer services and that booking requests were reviewed before being sent to providers.

### Transparency and Accountability

The inclusion of a feedback and rating system promoted accountability and encouraged service providers to maintain good service quality. The transparent fee structure—where the 5% platform fee is added to the client's payment while providers receive their full quoted price—ensured fairness and clarity in financial transactions.

Real-time GPS tracking and push notifications significantly improved transparency by allowing clients to monitor provider location and receive timely updates throughout the service process.

### Technology Adoption

The positive results in usability and efficiency further confirm that the system aligns with the Technology Acceptance Model (TAM) and the Diffusion of Innovation theory. By offering clear advantages over traditional methods while remaining easy to use, the GSS shows strong potential for adoption within the local community.

The multi-platform approach (mobile app + web application) ensured accessibility for users with different device preferences, further supporting adoption potential.

### Limitations Observed

Although the system has limitations, such as dependence on internet connectivity for real-time features (GPS tracking, push notifications, online payments), the findings demonstrate that the General Service System is functional, reliable, and suitable for its intended purpose.

## Conclusion

Overall, the system successfully achieved its objectives of:

1. Improving service accessibility through a centralized digital platform
2. Enhancing coordination efficiency through real-time tracking and instant notifications
3. Building trust through comprehensive provider verification
4. Ensuring transparency through clear fee structures and rating systems
5. Providing a user-friendly digital solution for the informal labor market in Maasin City

The General Service System demonstrates the feasibility of a digital service marketplace tailored to skilled workers and local clients, serving as a foundation for future enhancements and potential large-scale deployment within the community.
