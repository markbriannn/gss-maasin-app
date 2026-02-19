# Provider Approval Notifications - Requirements

## Overview
Ensure providers receive SMS and email notifications when an admin approves a booking that's assigned to them.

## Problem Statement
Currently, when an admin approves a booking in the AdminJobsScreen, only the client receives notifications. The provider should also be notified about the new approved job so they can review and accept it promptly.

## User Stories

### 1. Provider Notification on Booking Approval
**As a** service provider  
**I want to** receive SMS and email notifications when admin approves a booking assigned to me  
**So that** I can quickly review and accept the job request

**Acceptance Criteria:**
- 1.1 When admin clicks "Approve & Send to Provider" button, provider receives SMS notification
- 1.2 When admin clicks "Approve & Send to Provider" button, provider receives email notification
- 1.3 SMS message follows format: "GSS Maasin: New job [ProviderName]! [ServiceCategory] from [ClientName]. Open app to accept!"
- 1.4 Email includes job details: service category, client name, date, time, location, and amount
- 1.5 Notifications are sent even if one fails (SMS failure doesn't block email, and vice versa)
- 1.6 Provider phone number and email are correctly fetched from Firestore users collection
- 1.7 Notification failures are logged but don't block the approval process

### 2. Notification Content Accuracy
**As a** service provider  
**I want to** receive accurate job information in notifications  
**So that** I can make informed decisions about accepting jobs

**Acceptance Criteria:**
- 2.1 SMS contains provider's first name
- 2.2 SMS contains service category (e.g., "Plumbing", "Electrical")
- 2.3 SMS contains client's name
- 2.4 Email contains all booking details: service, client, date, time, location, amount
- 2.5 Email includes job ID for reference
- 2.6 Both notifications encourage provider to open the app

### 3. Error Handling
**As a** system administrator  
**I want** notification failures to be handled gracefully  
**So that** the approval process isn't blocked by notification issues

**Acceptance Criteria:**
- 3.1 If provider phone number is missing, SMS is skipped and email is still sent
- 3.2 If provider email is missing, email is skipped and SMS is still sent
- 3.3 If both notifications fail, approval still succeeds
- 3.4 Notification errors are logged to console for debugging
- 3.5 Admin sees success message regardless of notification status

## Current Implementation Status

### Existing Code
- `AdminJobsScreen.jsx` already calls `smsEmailService.notifyProviderNewApprovedJob()` on line 413-423
- `smsEmailService.js` has `notifyProviderNewApprovedJob()` function that sends both SMS and email
- Backend `smsService.js` has `sendNewJobSMS()` function with desired message format

### Potential Issues
1. Provider data (phone/email) might not be properly fetched from Firestore
2. The SMS message format doesn't match the `sendNewJobSMS` backend function
3. Notifications might be failing silently without proper error visibility

## Technical Requirements

### Data Requirements
- Provider phone number from Firestore `users/{providerId}/phone` or `phoneNumber` field
- Provider email from Firestore `users/{providerId}/email` field
- Provider first name from Firestore `users/{providerId}/firstName` field
- Booking data: id, serviceCategory, scheduledDate, scheduledTime, totalAmount, location
- Client name for SMS message

### API Endpoints
- Backend SMS endpoint: `POST /api/sms/send-sms`
- Backend Email endpoint: `POST /api/email/send-email`

### Environment Variables
- `SEMAPHORE_API_KEY`: For SMS sending via Semaphore
- Backend URL: `https://gss-maasin-app.onrender.com/api`

## Success Metrics
- 100% of approved bookings trigger provider notifications (when provider data exists)
- SMS delivery rate > 95% (when phone number is valid)
- Email delivery rate > 95% (when email is valid)
- Zero approval process failures due to notification issues

## Out of Scope
- Notification retry logic
- Notification delivery tracking in Firestore
- SMS/Email template management system
- Notification preferences for providers
