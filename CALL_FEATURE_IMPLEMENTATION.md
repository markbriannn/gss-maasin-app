# Call Feature Implementation Plan

## Call Permission Matrix

| From → To | Admin | Provider | Client |
|-----------|-------|----------|--------|
| **Admin** | ❌ | ✅ CAN CALL | ✅ CAN CALL |
| **Provider** | ❌ CANNOT | ❌ | ✅ CAN CALL (if approved) |
| **Client** | ❌ CANNOT | ✅ CAN CALL (if approved) | ❌ |

### Rules:
1. ✅ **Admin → Provider**: Admin can call providers (ALWAYS)
2. ✅ **Admin → Client**: Admin can call clients (ALWAYS)
3. ✅ **Provider → Client**: Provider can call client ONLY if `adminApproved === true`
4. ✅ **Client → Provider**: Client can call provider ONLY if `adminApproved === true`
5. ❌ **Provider/Client → Admin**: Cannot call admin (admin initiates calls only)

### Important Condition:
**Client ↔ Provider calls are ONLY enabled after admin approval**

```javascript
// Show call button only if admin approved
{booking.adminApproved && (
  <CallButton phoneNumber={phoneNumber} name={name} />
)}
```

---

## Implementation Locations

### 1. Admin Can Call Provider
**Where**: 
- Admin provider list page (`web/src/app/admin/providers/page.tsx`)
- Admin provider detail page (`web/src/app/admin/providers/[id]/page.tsx`)
- Mobile: `src/screens/admin/AdminProvidersScreen.jsx`

**Button**: Large green "Call Provider" button with phone icon

---

### 2. Admin Can Call Client
**Where**:
- Admin job details page (`web/src/app/admin/jobs/[id]/page.tsx`)
- Mobile: `src/screens/admin/AdminJobsScreen.jsx`

**Button**: "Call Client" button in job details

---

### 3. Provider Can Call Client
**Where**:
- Provider job details page (`web/src/app/provider/jobs/[id]/page.tsx`) - ALREADY EXISTS
- Mobile: `src/screens/provider/ProviderJobDetailsScreen.jsx` - ALREADY EXISTS

**Status**: ✅ Already implemented
**Enhancement**: Make button larger and more prominent for elderly users

**Condition**: ⚠️ Only show if `booking.adminApproved === true`

---

### 4. Client Can Call Provider
**Where**:
- Client booking details page (`web/src/app/client/bookings/[id]/page.tsx`)
- Client provider details page (`web/src/app/client/providers/[id]/page.tsx`)
- Mobile: `src/screens/client/JobDetailsScreen.jsx`

**Button**: Large "Call Provider" button (elderly-friendly)

**Condition**: ⚠️ Only show if `booking.adminApproved === true`

---

## Button Design Specifications

### For Elderly/PWD Users:
```
┌─────────────────────────────────────┐
│  📞  CALL PROVIDER                  │
│                                     │
│  John Doe                           │
│  +63 912 345 6789                   │
└─────────────────────────────────────┘
```

**Specifications**:
- Minimum height: 64px (mobile), 56px (web)
- Font size: 18px (mobile), 16px (web)
- High contrast: Green background (#00B14F), white text
- Large phone icon (24px)
- Shows name and number
- Confirmation dialog before calling

---

## Confirmation Dialog

Before making a call, show confirmation:

```
┌─────────────────────────────────────┐
│  Call John Doe?                     │
│                                     │
│  📞 +63 912 345 6789                │
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │ Cancel  │  │  Call   │          │
│  └─────────┘  └─────────┘          │
└─────────────────────────────────────┘
```

---

## Implementation Code Structure

### Reusable Call Button Component

```typescript
// web/src/components/CallButton.tsx
interface CallButtonProps {
  phoneNumber: string;
  name: string;
  size?: 'small' | 'medium' | 'large';
  showConfirmation?: boolean;
}

export function CallButton({ phoneNumber, name, size = 'medium', showConfirmation = true }: CallButtonProps) {
  // Implementation
}
```

```javascript
// src/components/common/CallButton.jsx (Mobile)
export const CallButton = ({ phoneNumber, name, size = 'medium', showConfirmation = true }) => {
  // Implementation
}
```

---

## Files to Modify

### Web (Next.js/TypeScript):
1. ✅ `web/src/components/CallButton.tsx` - NEW (reusable component)
2. ✅ `web/src/app/admin/providers/page.tsx` - Add call button to provider list
3. ✅ `web/src/app/admin/providers/[id]/page.tsx` - Add call button to provider details
4. ✅ `web/src/app/admin/jobs/[id]/page.tsx` - Add call client button
5. ✅ `web/src/app/client/bookings/[id]/page.tsx` - Add call provider button
6. ✅ `web/src/app/client/providers/[id]/page.tsx` - Add call provider button
7. ⚠️ `web/src/app/provider/jobs/[id]/page.tsx` - ENHANCE existing button

### Mobile (React Native):
1. ✅ `src/components/common/CallButton.jsx` - NEW (reusable component)
2. ✅ `src/screens/admin/AdminProvidersScreen.jsx` - Add call button
3. ✅ `src/screens/admin/AdminJobsScreen.jsx` - Add call client button
4. ✅ `src/screens/client/JobDetailsScreen.jsx` - Add call provider button
5. ⚠️ `src/screens/provider/ProviderJobDetailsScreen.jsx` - ENHANCE existing button

---

## Testing Checklist

### Admin Tests:
- [ ] Admin can call provider from provider list
- [ ] Admin can call provider from provider details
- [ ] Admin can call client from job details
- [ ] Confirmation dialog appears before calling
- [ ] Phone number is correctly formatted
- [ ] Call opens device dialer with correct number

### Provider Tests:
- [ ] Provider can call client from active job
- [ ] Provider CANNOT call if booking not admin approved
- [ ] Call button is hidden if `adminApproved === false`
- [ ] Provider CANNOT see admin phone number
- [ ] Large button is visible and easy to tap
- [ ] Confirmation works correctly

### Client Tests:
- [ ] Client can call provider from booking details
- [ ] Client CANNOT call if booking not admin approved
- [ ] Call button is hidden if `adminApproved === false`
- [ ] Client can call provider from provider profile
- [ ] Client CANNOT see admin phone number
- [ ] Large button is visible and easy to tap (elderly-friendly)

---

## Accessibility Features

### For Elderly Users:
1. ✅ Large touch targets (64px minimum)
2. ✅ High contrast colors
3. ✅ Large text (18px+)
4. ✅ Clear labels ("CALL PROVIDER" not just icon)
5. ✅ Confirmation dialog (prevent accidental calls)
6. ✅ Shows name and number before calling

### For PWD Users:
1. ✅ Screen reader compatible
2. ✅ Keyboard accessible (web)
3. ✅ Voice control compatible
4. ✅ Clear visual feedback

---

## Cost: $0 (FREE)

This feature uses the device's native phone dialer:
- No API required
- No monthly fees
- No per-call charges
- User pays using their own phone plan

---

## Next Steps

1. Create reusable CallButton component (web + mobile)
2. Add call buttons to admin pages
3. Add call buttons to client pages
4. Enhance existing provider call button
5. Test on real devices
6. Deploy

---

## Estimated Time: 4-6 hours

- Component creation: 1 hour
- Web implementation: 2 hours
- Mobile implementation: 2 hours
- Testing: 1 hour

Ready to implement! 🚀
