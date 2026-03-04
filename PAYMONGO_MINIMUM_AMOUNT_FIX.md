# PayMongo Minimum Amount Fix

## Issue
The code had incorrect validation checks requiring a minimum of ₱100 for payments, but PayMongo's actual minimum is ₱1.

## Changes Made

### 1. Removed Payment Validation Checks

#### Mobile App (src/screens/client/JobDetailsScreen.jsx)
- ✅ Removed ₱100 minimum check for QRPh payments
- ✅ Removed ₱100 minimum check for additional charges

#### Web App (web/src/app/client/bookings/[id]/page.tsx)
- ✅ Removed ₱100 minimum check for additional charges

#### Backend (backend/routes/payments.js)
- ✅ Changed payout validation from ₱100 to just checking for positive amount
- ✅ Updated comment to reflect ₱1 minimum

### 2. Updated Payout Minimum References

Changed all references from ₱100 to ₱1:

#### Configuration
- ✅ `src/config/constants.js` - MINIMUM_PAYOUT_AMOUNT: 1

#### Mobile Screens
- ✅ `src/screens/auth/RoleSelectionScreen.jsx` - Terms text
- ✅ `src/screens/legal/TermsScreen.jsx` - Terms text

#### Web Pages
- ✅ `web/src/app/admin/earnings/page.tsx` - MINIMUM_PAYOUT_AMOUNT constant
- ✅ `web/src/app/provider/wallet/page.tsx` - MINIMUM_PAYOUT_AMOUNT constant
- ✅ `web/src/app/register/page.tsx` - Terms text
- ✅ `web/src/app/register/provider/page.tsx` - Terms text
- ✅ `web/src/app/terms/page.tsx` - Terms text

## PayMongo Limits

According to PayMongo documentation:
- **Minimum:** ₱1.00
- **Maximum:** ₱100,000.00 per transaction

## Testing

Test with these amounts to verify:
- ✅ ₱1.00 - Should work
- ✅ ₱5.25 - Should work (like the current booking)
- ✅ ₱50.00 - Should work
- ✅ ₱100.00 - Should work
- ✅ ₱1,000.00 - Should work

## Benefits

1. **Flexibility** - Allows any service amount ≥ ₱1
2. **Testing** - Easier to test with small amounts
3. **Accuracy** - Matches PayMongo's actual limits
4. **User Experience** - No artificial restrictions

## Files Modified

1. `src/screens/client/JobDetailsScreen.jsx`
2. `web/src/app/client/bookings/[id]/page.tsx`
3. `backend/routes/payments.js`
4. `src/config/constants.js`
5. `src/screens/auth/RoleSelectionScreen.jsx`
6. `src/screens/legal/TermsScreen.jsx`
7. `web/src/app/admin/earnings/page.tsx`
8. `web/src/app/provider/wallet/page.tsx`
9. `web/src/app/register/page.tsx`
10. `web/src/app/register/provider/page.tsx`
11. `web/src/app/terms/page.tsx`

## Summary

All incorrect ₱100 minimum checks have been removed. The system now correctly allows payments as low as ₱1, matching PayMongo's actual minimum requirement.
