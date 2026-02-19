# Provider Approval Notifications - Tasks

## Task List

- [x] 1. Add email field to provider data fetching
  - [x] 1.1 Add `email: providerData.email || null` to providerInfo object in AdminJobsScreen.jsx
  - [x] 1.2 Verify the email field is correctly fetched from Firestore users collection

- [x] 2. Update SMS message format
  - [x] 2.1 Modify `notifyProviderNewApprovedJob()` in smsEmailService.js
  - [x] 2.2 Remove amount from SMS message
  - [x] 2.3 Add provider's first name to SMS message
  - [x] 2.4 Update format to: "GSS Maasin: New job [ProviderName]! [ServiceCategory] from [ClientName]. Open app to accept!"

- [x] 3. Verify client email field exists
  - [x] 3.1 Check that clientInfo object includes email field in AdminJobsScreen.jsx
  - [x] 3.2 Add email field if missing

- [x] 4. Test provider notification delivery
  - [x] 4.1 Create a test booking with provider assigned
  - [x] 4.2 Approve the booking as admin
  - [x] 4.3 Verify provider receives SMS notification with correct format
  - [x] 4.4 Verify provider receives email notification
  - [x] 4.5 Check console logs for any notification errors

- [x] 5. Test error handling scenarios
  - [x] 5.1 Test approval with provider missing phone number
  - [x] 5.2 Test approval with provider missing email
  - [x] 5.3 Test approval with provider missing both phone and email
  - [x] 5.4 Verify approval succeeds in all cases

- [x] 6. Verify notification content accuracy
  - [x] 6.1 Check SMS contains correct provider name, service, and client name (no amount)
  - [x] 6.2 Check email contains all job details (service, client, date, time, location, amount)
  - [x] 6.3 Verify job ID is included in email

## Task Details

### Task 1: Add email field to provider data fetching

**File:** `src/screens/admin/AdminJobsScreen.jsx`  
**Location:** Lines 130-145

**Current Code:**
```javascript
providerInfo = {
  id: data.providerId,
  name: fetchedName || data.providerName || providerData.email?.split('@')[0] || 'Unknown',
  phone: providerData.phone || providerData.phoneNumber || 'Not provided',
  role: 'PROVIDER',
  tier: providerData.tier || null,
  points: providerData.points || 0,
  photo: providerData.profilePhoto || providerData.photoURL || null,
};
```

**Required Change:**
Add one line after the `phone` field:
```javascript
email: providerData.email || null,
```

**Expected Result:**
The `job.provider.email` will be available when sending notifications.

### Task 2: Update SMS message format

**File:** `src/services/smsEmailService.js`  
**Location:** Line 507 (notifyProviderNewApprovedJob function)

**Current Code:**
```javascript
const smsMessage = `GSS Maasin: New job request! ${booking.serviceCategory || 'Service'} from ${client?.name || 'a client'} on ${booking.scheduledDate || 'TBD'}. Amount: ₱${(booking.totalAmount || booking.amount || 0).toLocaleString()}. Open app to accept!`;
```

**Required Change:**
```javascript
const smsMessage = `GSS Maasin: New job ${provider.firstName || 'Provider'}! ${booking.serviceCategory || 'Service'} from ${client?.name || 'a client'}. Open app to accept!`;
```

**Expected Result:**
SMS message will be shorter, more direct, and include the provider's name without the amount.

### Task 3: Verify client email field exists

**File:** `src/screens/admin/AdminJobsScreen.jsx`  
**Location:** Lines 100-120

**Check if this line exists:**
```javascript
email: clientData.email || null,
```

**If missing, add it to the clientInfo object.**

### Task 4: Test provider notification delivery

**Prerequisites:**
- Have a test provider account with valid phone number and email
- Have a test client account
- Have admin access

**Steps:**
1. Create a booking from client account
2. Assign the booking to a test provider
3. Log in as admin
4. Navigate to AdminJobsScreen
5. Find the pending booking
6. Click "Approve & Send to Provider"
7. Check provider's phone for SMS
8. Check provider's email inbox
9. Review console logs for notification status

**Expected Results:**
- Provider receives SMS with format: "GSS Maasin: New job [ProviderName]! [Service] from [Client]. Open app to accept!"
- Provider receives email with job details
- Console shows successful notification delivery
- No errors in console

### Task 5: Test error handling scenarios

**Test Case 1: Missing Phone Number**
1. Create provider account without phone number
2. Create and approve booking for this provider
3. Verify: Email is sent, SMS is skipped, approval succeeds

**Test Case 2: Missing Email**
1. Create provider account without email
2. Create and approve booking for this provider
3. Verify: SMS is sent, email is skipped, approval succeeds

**Test Case 3: Missing Both**
1. Create provider account without phone or email
2. Create and approve booking for this provider
3. Verify: Both notifications skipped, approval succeeds

**Expected Results:**
- Approval always succeeds regardless of notification failures
- Errors are logged to console
- Admin sees success message

### Task 6: Verify notification content accuracy

**SMS Content Check:**
- [ ] Provider's first name is correct
- [ ] Service category is correct (e.g., "Plumbing")
- [ ] Client's name is correct
- [ ] Amount is NOT included in SMS
- [ ] Message encourages opening the app

**Email Content Check:**
- [ ] Subject line includes service category
- [ ] Email body has GSS Maasin branding
- [ ] Service category is displayed
- [ ] Client name is displayed
- [ ] Date and time are correct
- [ ] Location is included
- [ ] Amount is prominently displayed in email
- [ ] Job ID is included for reference
- [ ] Call-to-action to open app is clear

## Testing Framework

**Manual Testing:** All tasks require manual testing as they involve SMS/Email delivery and Firestore data.

**Test Environment:**
- Development Firebase project
- Test phone numbers for SMS verification
- Test email addresses for email verification
- Admin test account
- Provider test account
- Client test account

## Success Criteria

- [ ] Provider email field is added to providerInfo object
- [ ] Client email field exists in clientInfo object
- [ ] SMS message format updated to remove amount and include provider name
- [ ] Provider receives both SMS and email when booking is approved
- [ ] SMS follows format: "GSS Maasin: New job [ProviderName]! [ServiceCategory] from [ClientName]. Open app to accept!"
- [ ] Notification content is accurate and complete
- [ ] Error handling works correctly (missing phone/email doesn't block approval)
- [ ] Console logs show notification status for debugging
- [ ] No breaking changes to existing functionality

## Notes

- The notification sending logic already exists in `smsEmailService.js`
- The approval handler already calls the notification functions
- The only missing piece is the provider email field in the data structure
- This is a minimal fix with maximum impact
