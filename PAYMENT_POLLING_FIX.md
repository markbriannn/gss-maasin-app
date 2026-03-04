# Payment Status Polling Fix

## Problem

After paying 50% upfront via QR code:
1. User scans QR code in their banking app (GCash, Maya, etc.)
2. User completes payment in their banking app
3. Banking app closes
4. User returns to the app
5. **Booking still shows "Awaiting Payment"** ❌
6. Admin panel shows "Awaiting Payment" ❌
7. User sees "Pay Now Full" button (wrong!) ❌

## Root Cause

The QRPaymentModal was only checking for URL redirects (`/payment/success`), but:
- User completes payment **outside the WebView** (in their banking app)
- WebView doesn't automatically detect external payment completion
- No polling mechanism to check payment status
- Booking stays stuck in `awaiting_payment` status

## Solution

Added **automatic payment status polling** to QRPaymentModal:

### 1. Poll Every 5 Seconds
```javascript
useEffect(() => {
  if (!visible || !bookingId) return;
  
  // Check immediately
  checkPaymentStatus();
  
  // Then check every 5 seconds
  pollIntervalRef.current = setInterval(() => {
    checkPaymentStatus();
  }, 5000);
  
  return () => clearInterval(pollIntervalRef.current);
}, [visible, bookingId]);
```

### 2. Verify Payment Status
```javascript
const checkPaymentStatus = async () => {
  const result = await paymentService.verifyAndProcessPayment(bookingId);
  
  if (result.success && result.status === 'paid') {
    // Payment detected!
    clearInterval(pollIntervalRef.current);
    onPaymentComplete();
    Alert.alert('Payment Successful! 💰', 'Your payment has been received.');
  }
};
```

### 3. Pass Booking ID
Updated both screens to pass `bookingId` prop:
- `BookServiceScreen.jsx` - For upfront payment
- `JobDetailsScreen.jsx` - For completion payment

## How It Works Now

1. User creates booking → Status: `awaiting_payment`
2. User scans QR code → Opens banking app
3. User completes payment in banking app
4. **App polls payment status every 5 seconds** ✅
5. Payment detected → Status changes to `pending` ✅
6. User sees success message ✅
7. Admin sees booking in "Pending" (waiting for approval) ✅

## Files Modified

1. **src/components/common/QRPaymentModal.jsx**
   - Added `useEffect` for polling
   - Added `checkPaymentStatus` function
   - Added `bookingId` prop
   - Added success alert

2. **src/screens/booking/BookServiceScreen.jsx**
   - Pass `bookingId={currentBookingId}` to QRPaymentModal

3. **src/screens/client/JobDetailsScreen.jsx**
   - Pass `bookingId={jobData?.id || jobId}` to QRPaymentModal

## Testing

Test the complete flow:

1. **Create Booking**
   - Select service
   - Upload photos
   - Submit booking
   - Status: `awaiting_payment`

2. **Pay 50% Upfront**
   - Click "Pay Now"
   - QR code appears
   - Scan with GCash/Maya
   - Complete payment in banking app
   - **Wait 5-10 seconds** (polling detects payment)
   - See "Payment Successful!" alert ✅
   - Status changes to `pending` ✅

3. **Admin Approval**
   - Admin sees booking in "Pending" list ✅
   - Admin approves booking
   - Status changes to `accepted`

4. **Service Completion**
   - Provider completes service
   - Client pays remaining 50%
   - Same polling mechanism works ✅

## Benefits

✅ Automatic payment detection
✅ No manual refresh needed
✅ Works even if user closes banking app
✅ Polls every 5 seconds (not too aggressive)
✅ Clears polling after payment detected
✅ Shows success message to user
✅ Updates booking status correctly

## Previous vs New Behavior

### Before (Broken):
```
User pays → Banking app closes → Returns to app
→ Still shows "Awaiting Payment" ❌
→ Admin sees "Awaiting Payment" ❌
→ User confused, tries to pay again ❌
```

### After (Fixed):
```
User pays → Banking app closes → Returns to app
→ App polls status every 5s ✅
→ Payment detected within 5-10s ✅
→ Shows "Payment Successful!" ✅
→ Status changes to "Pending" ✅
→ Admin sees booking for approval ✅
```

## Notes

- Polling starts when QR modal opens
- Polling stops when payment detected or modal closes
- Uses existing `verifyAndProcessPayment` API
- No changes needed to backend
- Works for both upfront and completion payments
