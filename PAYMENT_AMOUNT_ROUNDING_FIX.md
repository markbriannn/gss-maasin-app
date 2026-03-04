# Payment Amount Display vs PayMongo Rounding Issue

## Problem
User sees ₱1.131 in booking details but PayMongo charges ₱1.32 for the completion payment.

## Root Cause Analysis

### Booking Data (bIOUJ8myoxEffgnx3A3n)
- Total Amount: ₱2.63
- Provider Price: ₱2.50
- System Fee: ₱0.00 (stored as 0, but should be ₱0.13)
- Upfront Paid: ₱1.31
- Remaining: ₱1.32

### The Issue
The calculation is:
1. Total = ₱2.63
2. Upfront (50%) = ₱2.63 × 0.5 = ₱1.315 → Displayed as ₱1.31 (rounded down)
3. Remaining (50%) = ₱2.63 - ₱1.31 = ₱1.32

But somewhere the UI is showing ₱1.131 instead of ₱1.31 or ₱1.32.

## Solution

### 1. Ensure Consistent Rounding
When calculating payment amounts, we need to:
- Calculate exact amounts (no premature rounding)
- Round only when displaying or sending to PayMongo
- Use the SAME rounding method everywhere

### 2. PayMongo Rounding Rule
PayMongo requires amounts in centavos (multiply by 100, round to integer):
```javascript
const amountInCentavos = Math.round(amount * 100);
```

This means:
- ₱1.315 → 131.5 centavos → 132 centavos → ₱1.32
- ₱1.31 → 131 centavos → ₱1.31

### 3. Display Rounding Rule
For display, we should show 2 decimal places:
```javascript
amount.toFixed(2) // Always shows 2 decimals
```

## The Fix

### Calculation Strategy
```javascript
// For 50/50 split with odd totals:
const total = 2.63;
const upfront = Math.round((total / 2) * 100) / 100; // ₱1.32 (round up)
const remaining = total - upfront; // ₱1.31 (exact)

// OR (current approach - causes ₱0.01 difference):
const upfront = total / 2; // ₱1.315 (exact)
const remaining = total / 2; // ₱1.315 (exact)
// When sent to PayMongo, both round to ₱1.32
```

### Recommended Approach
**Use exact division, round only for PayMongo:**
```javascript
// Calculate exact amounts
const upfrontExact = totalAmount * 0.5; // ₱1.315
const remainingExact = totalAmount * 0.5; // ₱1.315

// Display with 2 decimals
display: upfrontExact.toFixed(2) // "1.32"
display: remainingExact.toFixed(2) // "1.32"

// Send to PayMongo (rounds to centavos)
paymongo: Math.round(upfrontExact * 100) // 132 centavos = ₱1.32
paymongo: Math.round(remainingExact * 100) // 132 centavos = ₱1.32
```

This way:
- UI shows: ₱1.32 (upfront) + ₱1.32 (remaining) = ₱2.64 displayed
- PayMongo charges: ₱1.32 + ₱1.32 = ₱2.64 actual
- Database stores: ₱2.63 total (original)

**Issue:** This creates a ₱0.01 discrepancy!

### Better Approach: Store Rounded Amounts
```javascript
// When creating booking, store the ACTUAL amounts that will be charged
const totalAmount = 2.63;
const upfrontAmount = Math.round((totalAmount / 2) * 100) / 100; // ₱1.32
const remainingAmount = Math.round((totalAmount / 2) * 100) / 100; // ₱1.32

// Store in database
booking.totalAmount = totalAmount; // ₱2.63
booking.upfrontAmount = upfrontAmount; // ₱1.32 (what will actually be charged)
booking.remainingAmount = remainingAmount; // ₱1.32 (what will actually be charged)

// Note: upfront + remaining = ₱2.64 (₱0.01 more than original)
```

### BEST Approach: Adjust for Rounding
```javascript
// Calculate 50/50 split with proper rounding
const totalAmount = 2.63;
const upfrontAmount = Math.round((totalAmount / 2) * 100) / 100; // ₱1.32 (rounded up)
const remainingAmount = totalAmount - upfrontAmount; // ₱1.31 (exact difference)

// Now: upfront + remaining = ₱1.32 + ₱1.31 = ₱2.63 ✅ PERFECT!
```

## Implementation

### Current Code (web/src/lib/bookingCalculations.ts)
```typescript
export const calculateUpfrontPayment = (booking: Booking | null): number => {
  const clientTotal = /* calculate total */;
  return clientTotal * 0.5; // Returns ₱1.315 (exact)
};

export const calculateCompletionPayment = (booking: Booking | null): number => {
  const clientTotal = /* calculate total */;
  const upfrontPaid = booking.upfrontPaidAmount || (clientTotal * 0.5);
  return (clientTotal - upfrontPaid) + approvedCharges;
};
```

### Fixed Code
```typescript
export const calculateUpfrontPayment = (booking: Booking | null): number => {
  const clientTotal = /* calculate total */;
  // Round upfront to 2 decimals (what PayMongo will charge)
  return Math.round((clientTotal * 0.5) * 100) / 100;
};

export const calculateCompletionPayment = (booking: Booking | null): number => {
  const clientTotal = /* calculate total */;
  const upfrontPaid = booking.upfrontPaidAmount || calculateUpfrontPayment(booking);
  // Remaining is exact difference (no rounding needed)
  const remaining = clientTotal - upfrontPaid;
  return remaining + approvedCharges;
};
```

This ensures:
- Upfront: ₱1.32 (rounded)
- Remaining: ₱1.31 (exact difference)
- Total: ₱1.32 + ₱1.31 = ₱2.63 ✅

## Testing

### Test Case 1: ₱2.63 total
- Upfront: Math.round(2.63 / 2 * 100) / 100 = Math.round(131.5) / 100 = 132 / 100 = ₱1.32
- Remaining: 2.63 - 1.32 = ₱1.31
- Sum: ₱1.32 + ₱1.31 = ₱2.63 ✅

### Test Case 2: ₱10.00 total
- Upfront: Math.round(10.00 / 2 * 100) / 100 = Math.round(500) / 100 = 500 / 100 = ₱5.00
- Remaining: 10.00 - 5.00 = ₱5.00
- Sum: ₱5.00 + ₱5.00 = ₱10.00 ✅

### Test Case 3: ₱10.01 total
- Upfront: Math.round(10.01 / 2 * 100) / 100 = Math.round(500.5) / 100 = 501 / 100 = ₱5.01
- Remaining: 10.01 - 5.01 = ₱5.00
- Sum: ₱5.01 + ₱5.00 = ₱10.01 ✅

## Files to Update
1. `web/src/lib/bookingCalculations.ts` - Web calculation functions
2. `src/utils/bookingCalculations.js` - Mobile calculation functions
3. `backend/routes/payments.js` - Ensure PayMongo amount matches calculation

## Status
- ✅ Issue identified
- ⏳ Fix to be implemented
- ⏳ Testing required
