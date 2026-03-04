# Automatic Refund on Admin Rejection - Implementation Complete

## Overview
When admin rejects/declines a booking that has already been paid, the system now automatically processes a refund to the client.

## Changes Made

### 1. Web Admin (web/src/app/admin/jobs/[id]/page.tsx)
- **Already implemented** - Auto-refund logic was already present in the reject handler
- When admin clicks "Reject", system checks if payment was made (`job.paid || job.isPaidUpfront`)
- If paid, calls `/api/payments/auto-refund/:bookingId` endpoint
- Shows success message with refund amount: "Job rejected. Refund of ₱X.XX processed."

### 2. Mobile Admin (src/screens/admin/AdminJobsScreen.jsx)
- **NEW** - Added automatic refund logic to `handleRejectJob` function
- Alert dialog now shows warning if payment exists: "⚠️ Payment will be automatically refunded."
- After rejection, processes refund via backend API
- Shows appropriate success message based on refund status

### 3. Backend API (backend/routes/payments.js)
- **Already exists** - `/auto-refund/:bookingId` endpoint handles refunds
- Validates payment exists and is refundable
- Calls PayMongo refund API
- Updates booking and payment records
- Sends refund notification email to client
- Handles partial refunds and full refunds

## How It Works

### Flow:
1. Admin clicks "Reject" on a paid booking
2. System confirms rejection with warning about refund
3. Booking status updated to "rejected"
4. Backend processes refund via PayMongo API
5. Client receives:
   - In-app notification
   - SMS notification
   - Email notification
   - Refund confirmation email
6. Money returned to client's payment method (GCash/Maya/Card)

### Refund Details:
- **Refund Amount**: Full upfront payment amount
- **Processing Time**: Instant via PayMongo (5-10 business days to client's account)
- **Refund Reason**: "Admin rejected job"
- **Notification**: Client receives email with refund details

## Payment Status Display Fix

Also fixed the payment status badge issue:
- **Before**: Showed "PENDING PAYMENT" even when status was "payment_received"
- **After**: Shows "PAID" when:
  - `isPaidUpfront === true`, OR
  - `status === 'payment_received'`, OR
  - `status === 'completed'`

## Testing Checklist

- [x] Web admin reject with paid booking → Auto refund
- [x] Mobile admin reject with paid booking → Auto refund
- [x] Reject unpaid booking → No refund attempt
- [x] Payment status badge shows correctly
- [x] Client receives refund notification
- [x] Refund amount matches upfront payment

## Notes

- Refunds are processed through PayMongo's refund API
- If refund fails, system marks booking for manual refund processing
- Admin sees confirmation message with refund amount
- All refund actions are logged in backend console
