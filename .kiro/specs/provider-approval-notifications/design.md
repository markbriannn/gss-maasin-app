# Provider Approval Notifications - Design

## Problem Analysis

### Current State
The code in `AdminJobsScreen.jsx` already attempts to send SMS and email notifications to providers when a booking is approved. However, there's a critical bug:

**The provider's email address is not being included in the `providerInfo` object** (line 130-145 in AdminJobsScreen.jsx).

When the approval handler tries to send notifications (line 413-423), it passes:
```javascript
const providerData = {
  firstName: job.provider?.name?.split(' ')[0] || 'Provider',
  phone: job.provider?.phone,
  email: job.provider?.email,  // ❌ This is undefined!
};
```

But `job.provider.email` doesn't exist because it was never fetched from Firestore.

### Root Cause
In the provider data fetching logic (lines 130-145), the code fetches:
- ✅ name (firstName + lastName)
- ✅ phone (phone or phoneNumber)
- ✅ tier, points, photo
- ❌ **email is missing**

## Solution Design

### Fix 1: Add Email to Provider Data Fetching

**File:** `src/screens/admin/AdminJobsScreen.jsx`  
**Location:** Lines 130-145 (provider data fetching in useEffect)

Add the email field to the `providerInfo` object:

```javascript
providerInfo = {
  id: data.providerId,
  name: fetchedName || data.providerName || providerData.email?.split('@')[0] || 'Unknown',
  phone: providerData.phone || providerData.phoneNumber || 'Not provided',
  email: providerData.email || null,  // ✅ ADD THIS LINE
  role: 'PROVIDER',
  tier: providerData.tier || null,
  points: providerData.points || 0,
  photo: providerData.profilePhoto || providerData.photoURL || null,
};
```

### Fix 2: Update SMS Message Format

**File:** `src/services/smsEmailService.js`  
**Location:** Line 507 (notifyProviderNewApprovedJob function)

Update the SMS message to remove the amount:

**Current:**
```javascript
const smsMessage = `GSS Maasin: New job request! ${booking.serviceCategory || 'Service'} from ${client?.name || 'a client'} on ${booking.scheduledDate || 'TBD'}. Amount: ₱${(booking.totalAmount || booking.amount || 0).toLocaleString()}. Open app to accept!`;
```

**New:**
```javascript
const smsMessage = `GSS Maasin: New job ${provider.firstName || 'Provider'}! ${booking.serviceCategory || 'Service'} from ${client?.name || 'a client'}. Open app to accept!`;
```

### Fix 3: Verify Client Email is Also Included

**File:** `src/screens/admin/AdminJobsScreen.jsx`  
**Location:** Lines 100-120 (client data fetching in useEffect)

Verify that client email is being fetched (it should already be there, but let's confirm):

```javascript
clientInfo = {
  id: data.clientId,
  name: fetchedName || data.clientName || clientData.email?.split('@')[0] || 'Unknown',
  phone: clientData.phone || clientData.phoneNumber || 'Not provided',
  email: clientData.email || null,  // ✅ VERIFY THIS EXISTS
  role: 'CLIENT',
  photo: clientData.profilePhoto || clientData.photoURL || null,
};
```

## Implementation Details

### Modified Data Structure

**Provider Info Object:**
```javascript
{
  id: string,
  name: string,
  phone: string,
  email: string,  // ✅ NEW FIELD
  role: 'PROVIDER',
  tier: string | null,
  points: number,
  photo: string | null
}
```

**Client Info Object:**
```javascript
{
  id: string,
  name: string,
  phone: string,
  email: string,  // ✅ VERIFY EXISTS
  role: 'CLIENT',
  photo: string | null
}
```

### Notification Flow (Already Implemented)

When admin approves a booking:

1. **Update booking status** to 'pending' with `adminApproved: true`
2. **Create Firestore notification** for client
3. **Send FCM push notification** to client
4. **Send FCM push notification** to provider about new job
5. **Send SMS/Email to client** via `smsEmailService.notifyBookingApproved()`
6. **Send SMS/Email to provider** via `smsEmailService.notifyProviderNewApprovedJob()` ✅
7. **Send additional email to client** via `sendBookingConfirmation()` (Brevo)

### SMS Message Format (Updated)

**Provider SMS:**
```
GSS Maasin: New job [ProviderName]! [ServiceCategory] from [ClientName]. Open app to accept!
```

**Provider Email:**
- Subject: "New Job Request - [Service]"
- HTML email with GSS Maasin branding
- Includes: service, client, date, time, location, amount, job ID

## Testing Plan

### Unit Tests
Not applicable - this is a data fetching fix.

### Manual Testing Checklist

1. **Test Provider Email Fetching:**
   - [ ] Open AdminJobsScreen
   - [ ] Check console logs for provider data
   - [ ] Verify `job.provider.email` is populated

2. **Test Approval Notifications:**
   - [ ] Create a test booking with a provider assigned
   - [ ] Admin approves the booking
   - [ ] Verify provider receives SMS (check phone)
   - [ ] Verify provider receives email (check inbox)
   - [ ] Verify client receives SMS and email

3. **Test Error Handling:**
   - [ ] Test with provider missing phone number
   - [ ] Test with provider missing email
   - [ ] Test with provider missing both
   - [ ] Verify approval still succeeds

4. **Test Notification Content:**
   - [ ] Verify SMS has correct provider name, service, client, amount
   - [ ] Verify email has all job details
   - [ ] Verify job ID is included

## Correctness Properties

### Property 1: Email Field Presence
**Validates: Requirements 1.6**

**Property:** For all providers fetched from Firestore, if the provider document has an email field, then the providerInfo object must include that email.

**Test Strategy:**
```javascript
// Property-based test
forAll(providerDocuments, (providerDoc) => {
  const providerData = providerDoc.data();
  const providerInfo = fetchProviderInfo(providerData);
  
  if (providerData.email) {
    return providerInfo.email === providerData.email;
  }
  return true;
});
```

### Property 2: Notification Delivery Attempt
**Validates: Requirements 1.1, 1.2**

**Property:** When admin approves a booking with a provider assigned, the system must attempt to send both SMS and email notifications to the provider.

**Test Strategy:**
```javascript
// Property-based test
forAll(bookingsWithProvider, async (booking) => {
  const notificationAttempts = await approveBooking(booking.id);
  
  return (
    notificationAttempts.sms.attempted === true &&
    notificationAttempts.email.attempted === true
  );
});
```

### Property 3: Graceful Failure
**Validates: Requirements 3.1, 3.2, 3.3**

**Property:** Notification failures must not prevent booking approval from succeeding.

**Test Strategy:**
```javascript
// Property-based test
forAll(bookings, async (booking) => {
  // Simulate notification service failure
  mockNotificationService.fail();
  
  const result = await approveBooking(booking.id);
  const bookingDoc = await getBooking(booking.id);
  
  return (
    result.success === true &&
    bookingDoc.adminApproved === true &&
    bookingDoc.status === 'pending'
  );
});
```

## Files to Modify

1. **src/screens/admin/AdminJobsScreen.jsx**
   - Add `email` field to `providerInfo` object (line ~140)
   - Verify `email` field exists in `clientInfo` object (line ~115)

2. **src/services/smsEmailService.js**
   - Update SMS message format in `notifyProviderNewApprovedJob()` function (line ~507)
   - Remove amount from SMS message
   - Add provider's first name to SMS message

## Dependencies

- Existing: `smsEmailService.notifyProviderNewApprovedJob()` ✅
- Existing: `smsEmailService.notifyBookingApproved()` ✅
- Existing: Backend SMS/Email endpoints ✅
- Existing: Firestore users collection with email field ✅

## Risks and Mitigations

### Risk 1: Provider Email Not in Firestore
**Mitigation:** The code already handles missing email gracefully - it will skip email notification and only send SMS.

### Risk 2: SMS/Email Service Downtime
**Mitigation:** Notifications use `Promise.allSettled()` so failures don't block approval. Errors are logged for debugging.

### Risk 3: Invalid Email Format
**Mitigation:** Email service validates format before sending. Invalid emails are logged and skipped.

## Future Enhancements

1. **Notification Delivery Tracking:** Store notification status in Firestore
2. **Retry Logic:** Implement exponential backoff for failed notifications
3. **Notification Preferences:** Allow providers to opt-out of certain notification types
4. **SMS Template Management:** Centralize SMS message templates
5. **Delivery Reports:** Admin dashboard showing notification success rates
