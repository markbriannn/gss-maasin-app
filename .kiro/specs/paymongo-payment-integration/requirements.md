# Requirements Document

## Introduction

This document specifies the requirements for integrating PayMongo payment gateway into the service booking application. The system will enable clients to pay for services using GCash and Maya e-wallets, with funds collected into the platform's PayMongo account. Providers and admins will be able to request payouts from their earned balances. The integration builds upon existing payment infrastructure including backend routes, payment service, and wallet screens.

## Glossary

- **PayMongo**: A Philippine payment gateway that supports GCash, Maya, cards, and other payment methods
- **Client**: A user who books and pays for services
- **Provider**: A service provider who completes jobs and receives payouts
- **Admin**: Platform administrator who manages the system and receives commission
- **Source**: A PayMongo object representing a payment intent (GCash/Maya checkout)
- **Checkout URL**: The URL where users complete their GCash/Maya payment
- **Webhook**: Server endpoint that receives payment status updates from PayMongo
- **Payout**: Transfer of funds from platform account to provider's e-wallet
- **Commission**: The 5% platform fee deducted from each transaction
- **Available Balance**: Funds that can be withdrawn by provider/admin
- **Pending Balance**: Funds from jobs not yet completed or confirmed

## Requirements

### Requirement 1

**User Story:** As a client, I want to pay for completed services using GCash or Maya, so that I can conveniently pay without cash.

#### Acceptance Criteria

1. WHEN a client clicks "Pay Now" on a job with status `pending_payment` THEN the Payment_System SHALL display payment method options (GCash, Maya, Cash)
2. WHEN a client selects GCash or Maya THEN the Payment_System SHALL create a PayMongo source and open the checkout URL in the device browser
3. WHEN the client completes payment on the GCash/Maya app THEN the Payment_System SHALL receive a webhook notification and update the booking status to `payment_received`
4. WHEN payment is successful THEN the Payment_System SHALL record the transaction in Firestore with payment details (amount, method, paymentId, timestamps)
5. WHEN payment fails or is cancelled THEN the Payment_System SHALL notify the client and keep the booking status as `pending_payment`

### Requirement 2

**User Story:** As a provider, I want to see my earnings and request payouts to my GCash or Maya account, so that I can receive payment for my completed services.

#### Acceptance Criteria

1. WHEN a provider views the Wallet screen THEN the Wallet_System SHALL display available balance, pending balance, and total earnings
2. WHEN a job is marked as `completed` THEN the Wallet_System SHALL add the provider's share (95% of job amount) to their available balance
3. WHEN a provider requests a payout THEN the Wallet_System SHALL validate minimum amount (₱100) and create a payout request record
4. WHEN a payout is processed THEN the Wallet_System SHALL deduct the amount from available balance and record the transaction
5. WHEN a provider has no payout account configured THEN the Wallet_System SHALL prompt them to setup GCash or Maya account details

### Requirement 3

**User Story:** As an admin, I want to view platform earnings and manage payouts, so that I can monitor revenue and process provider payments.

#### Acceptance Criteria

1. WHEN an admin views the earnings dashboard THEN the Admin_System SHALL display total platform revenue, commission earned (5%), and pending payouts
2. WHEN a payment is completed THEN the Admin_System SHALL automatically calculate and record the 5% platform commission
3. WHEN an admin views payout requests THEN the Admin_System SHALL display pending requests with provider details and amounts
4. WHEN an admin approves a payout THEN the Admin_System SHALL update the payout status and notify the provider
5. WHEN an admin views transaction history THEN the Admin_System SHALL display all payments with filtering by date, status, and provider

### Requirement 4

**User Story:** As the system, I want to securely process PayMongo webhooks, so that payment statuses are accurately updated in real-time.

#### Acceptance Criteria

1. WHEN PayMongo sends a `source.chargeable` webhook THEN the Webhook_Handler SHALL create a payment from the source automatically
2. WHEN PayMongo sends a `payment.paid` webhook THEN the Webhook_Handler SHALL update the payment record status to `paid`
3. WHEN PayMongo sends a `payment.failed` webhook THEN the Webhook_Handler SHALL update the payment record status to `failed`
4. WHEN a webhook is received THEN the Webhook_Handler SHALL verify the event signature for security
5. WHEN a payment is confirmed via webhook THEN the Webhook_Handler SHALL update the booking document and create transaction records

### Requirement 5

**User Story:** As a client, I want to see my payment history and receipts, so that I can track my spending on services.

#### Acceptance Criteria

1. WHEN a client views payment history THEN the Transaction_System SHALL display all their payments with date, amount, method, and status
2. WHEN a client taps on a transaction THEN the Transaction_System SHALL display full details including booking reference and provider name
3. WHEN a payment is completed THEN the Transaction_System SHALL store receipt data that can be viewed later

### Requirement 6

**User Story:** As a provider, I want to track my payout history, so that I can verify I received correct payments.

#### Acceptance Criteria

1. WHEN a provider views payout history THEN the Payout_System SHALL display all payout requests with date, amount, status, and destination account
2. WHEN a payout status changes THEN the Payout_System SHALL update the record and notify the provider
3. WHEN a provider views a payout THEN the Payout_System SHALL show the jobs included in that payout

### Requirement 7

**User Story:** As the system, I want to handle payment edge cases gracefully, so that users have a reliable payment experience.

#### Acceptance Criteria

1. IF a payment checkout times out THEN the Payment_System SHALL allow the client to retry payment
2. IF the backend is unreachable THEN the Payment_System SHALL display an appropriate error message and allow retry
3. IF a duplicate webhook is received THEN the Webhook_Handler SHALL ignore it without creating duplicate records
4. IF a payout request fails THEN the Payout_System SHALL restore the provider's available balance and notify them
5. WHEN checking payment status THEN the Payment_System SHALL poll PayMongo if webhook was not received within 5 minutes
