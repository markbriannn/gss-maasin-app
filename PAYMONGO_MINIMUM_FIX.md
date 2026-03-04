# PayMongo Minimum Amount Fix

## Issue
The code incorrectly validated that QR Ph payments require a minimum of ₱100, when PayMongo's actual minimum is ₱1 for all payment methods.

## What Was Fixed

### 1. JobDetailsScreen.jsx - Completion Payment Validation
**Removed:**
```jsx
// PayMongo minimum amount is ₱100 for QRPh
if (method === 'qrph' && amount < 100) {
  Alert.alert(
    'Minimum Amount Required',
    `The minimum payment amount for QR Ph is ₱100. Your total is ₱${amount.toLocaleString()}.`,
    [{ text: 'OK' }]
  );
  return;
}
```

**Result:** Users can now pay any amount ≥ ₱1 for completion payments.

### 2. JobDetailsScreen.jsx - Additional Charge Payment Validation
**Removed:**
```jsx
// PayMongo minimum is ₱100
if (chargeAmount < 100) {
  showErrorModal('Minimum Amount', 'The minimum payment amount is ₱100.');
  return;
}
```

**Result:** Users can now pay any amount ≥ ₱1 for additional charges.

### 3. backend/routes/payments.js - Updated Comment
**Changed:**
```javascript
// Note: PayMongo has a minimum of ₱100 for QR Ph, but we'll let PayMongo return their own error
// This allows the system to work with any amount the admin sets
```

**To:**
```javascript
// Note: PayMongo minimum is ₱1 for all payment methods
// The system allows any amount ≥ ₱1
```

**Result:** Accurate documentation in the code.

## What Was NOT Changed

### Payout Minimum (₱100) - KEPT
The ₱100 minimum for PAYOUTS (provider withdrawals) was kept in:
- Terms of Service
- Provider registration screens
- Backend payout validation

**Reason:** This is a business rule to prevent tiny payout requests, not a PayMongo limitation. It's reasonable to require providers to accumulate at least ₱100 before requesting a payout.

## PayMongo Actual Minimums

According to PayMongo documentation:
- **All payment methods:** ₱1 minimum
- **GCash:** ₱1 minimum
- **Maya/PayMaya:** ₱1 minimum
- **QR Ph:** ₱1 minimum
- **Cards:** ₱1 minimum

## Testing

Test these scenarios:
1. ✅ Book a service with total < ₱100 (e.g., ₱50)
2. ✅ Pay 50% upfront (₱25) - should work
3. ✅ Pay remaining 50% (₱25) - should work
4. ✅ Additional charge < ₱100 (e.g., ₱30) - should work
5. ⚠️ Payout request < ₱100 - should be blocked (business rule)

## Summary

✅ Removed incorrect ₱100 minimum validation for payments
✅ Updated code comments to reflect correct ₱1 minimum
✅ Kept ₱100 minimum for payouts (business rule)
✅ System now accepts any payment amount ≥ ₱1

Users can now pay small amounts like ₱5.25 (as shown in the screenshot) without issues.
