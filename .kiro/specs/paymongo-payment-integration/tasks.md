# Implementation Plan

- [ ] 1. Setup and Configuration
  - [ ] 1.1 Add fast-check testing library to project
    - Install fast-check: `npm install --save-dev fast-check`
    - Configure Jest to work with fast-check
    - _Requirements: Testing Strategy_
  - [x] 1.2 Configure PayMongo environment variables



    - Add `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET` to `.env`
    - Add `API_BASE_URL` to React Native `.env` for backend connection
    - Update `.env.example` with placeholder values
    - _Requirements: 4.4_

- [ ] 2. Backend Payment Routes Enhancement
  - [x] 2.1 Add webhook signature verification


    - Implement signature verification using PayMongo webhook secret
    - Add idempotency check using `webhookProcessed` flag
    - _Requirements: 4.4, 7.3_
  - [ ]* 2.2 Write property test for webhook idempotency
    - **Property 4: Webhook idempotency**
    - **Validates: Requirements 7.3**
  - [x] 2.3 Enhance webhook handler to update booking and create transactions

    - Update booking status to `payment_received` on successful payment
    - Create transaction record with provider share and platform commission
    - _Requirements: 1.3, 1.4, 4.5_
  - [ ]* 2.4 Write property test for transaction record completeness
    - **Property 6: Transaction record completeness**
    - **Validates: Requirements 1.4, 5.1**
  - [x] 2.5 Add provider balance endpoint


    - Create `GET /provider-balance/:providerId` route
    - Calculate available and pending balance from transactions
    - _Requirements: 2.1_
  - [x] 2.6 Add payout request endpoint

    - Create `POST /request-payout` route
    - Validate minimum amount (₱100)
    - Create payout record in Firestore
    - _Requirements: 2.3_
  - [ ]* 2.7 Write property test for minimum payout validation
    - **Property 3: Minimum payout validation**
    - **Validates: Requirements 2.3**

  - [x] 2.8 Add payout history endpoint

    - Create `GET /payout-history/:providerId` route
    - Return payout records with status and details
    - _Requirements: 6.1_

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Backend Admin Routes
  - [x] 4.1 Add admin earnings endpoint


    - Create `GET /admin/earnings` route
    - Calculate total revenue, commission, and pending payouts
    - _Requirements: 3.1_
  - [ ]* 4.2 Write property test for commission calculation
    - **Property 2: Platform commission calculation**
    - **Validates: Requirements 3.2**
  - [x] 4.3 Add admin payouts list endpoint

    - Create `GET /admin/payouts` route
    - Return pending payout requests with provider details
    - _Requirements: 3.3_
  - [x] 4.4 Add payout approval endpoint

    - Create `POST /admin/approve-payout/:payoutId` route
    - Update payout status and deduct from provider balance
    - _Requirements: 3.4_
  - [ ]* 4.5 Write property test for balance consistency after payout
    - **Property 5: Balance consistency after payout**
    - **Validates: Requirements 2.4**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Frontend Payment Service Enhancement
  - [x] 6.1 Add payment status polling function
    - Implement `pollPaymentStatus` with configurable max attempts
    - Poll every 5 seconds until payment confirmed or max attempts reached
    - _Requirements: 7.5_
  - [x] 6.2 Add provider balance fetching
    - Implement `getProviderBalance` calling new backend endpoint
    - _Requirements: 2.1_
  - [x] 6.3 Add payout request function
    - Implemented via `processProviderPayout` calling backend endpoint
    - _Requirements: 2.3_
  - [x] 6.4 Add payout history function
    - Implement `getPayoutHistory` for provider payout records
    - _Requirements: 6.1_
  - [x] 6.5 Add admin earnings function
    - Implemented `getAdminEarnings` and `getAdminPayouts` for admin dashboard
    - _Requirements: 3.1_
  - [ ]* 6.6 Write property test for provider share calculation
    - **Property 1: Provider share calculation**
    - **Validates: Requirements 2.2, 3.2**

- [x] 7. Client Payment Flow UI
  - [x] 7.1 Create payment method selection modal
    - Add modal component with GCash, Maya, Cash options
    - Style with app theme colors
    - _Requirements: 1.1_
  - [x] 7.2 Update handleMakePayment in JobDetailsScreen
    - Show payment method modal instead of direct cash recording
    - Handle GCash/Maya selection to create source and open checkout
    - Handle Cash selection to record cash payment
    - _Requirements: 1.1, 1.2_
  - [x] 7.3 Add payment status checking after app resume
    - Listen for app state changes
    - Poll payment status when returning from checkout
    - Update UI based on payment result
    - _Requirements: 1.3, 7.5_
  - [x] 7.4 Add payment retry functionality
    - Added error state tracking and retry button
    - Show appropriate error messages with dismiss option
    - _Requirements: 7.1, 7.2_
  - [ ]* 7.5 Write property test for payment status transitions
    - **Property 7: Payment status transitions**
    - **Validates: Requirements 4.2, 4.3**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Provider Wallet Enhancement
  - [x] 9.1 Add real-time balance listener
    - Fetches balance from backend endpoint
    - Pull-to-refresh for updates
    - _Requirements: 2.1_
  - [x] 9.2 Add payout history section
    - Display list of past payout requests
    - Show status, amount, date, and destination
    - _Requirements: 6.1_
  - [x] 9.3 Enhance payout request flow
    - Connected to backend payout endpoint via processProviderPayout
    - Shows confirmation with account details
    - Handles success and error states
    - _Requirements: 2.3, 2.4_
  - [ ]* 9.4 Write property test for payout record completeness
    - **Property 8: Payout record completeness**
    - **Validates: Requirements 6.1**

- [x] 10. Admin Earnings Dashboard
  - [x] 10.1 Enhance AdminEarningsScreen with real data
    - Fetch earnings data from new backend endpoint
    - Display total revenue, commission, and payouts
    - _Requirements: 3.1_
  - [x] 10.2 Add pending payouts section
    - Display list of pending payout requests
    - Show provider name, amount, and account details
    - _Requirements: 3.3_
  - [x] 10.3 Add payout approval functionality
    - Add approve button for each pending payout
    - Call backend approval endpoint
    - Update UI on success
    - _Requirements: 3.4_
  - [ ] 10.4 Add transaction history with filtering (optional enhancement)
    - Display recent transactions
    - Add filters for date range, status, provider
    - _Requirements: 3.5_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Error Handling and Edge Cases
  - [x] 12.1 Add failed payout balance restoration


    - Implement balance restoration when payout fails
    - Notify provider of failure
    - _Requirements: 7.4_
  - [ ]* 12.2 Write property test for failed payout balance restoration
    - **Property 9: Failed payout balance restoration**
    - **Validates: Requirements 7.4**
  - [x] 12.3 Add duplicate payment prevention


    - Check for existing pending payments before creating new source
    - _Requirements: 7.3_
  - [x] 12.4 Add network error handling


    - Show appropriate error messages for network failures
    - Implement retry logic with exponential backoff
    - _Requirements: 7.2_
  - [ ]* 12.5 Write property test for booking status after payment
    - **Property 10: Booking status after successful payment**
    - **Validates: Requirements 1.3, 4.5**

- [ ] 13. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
