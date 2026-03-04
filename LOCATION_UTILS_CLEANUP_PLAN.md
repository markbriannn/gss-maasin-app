# Location Utils Cleanup Plan 🗺️

## Problem Identified

The `calculateDistance` and `getEstimatedJobTime` utility functions are **duplicated across 12+ files** in both web and mobile platforms. This violates the DRY principle and makes maintenance difficult.

---

## ✅ Solution Created

### Centralized Utility Files

#### Mobile (JavaScript)
**File**: `src/utils/locationUtils.js`

Functions:
- `calculateDistance(lat1, lon1, lat2, lon2)` - Haversine formula
- `formatDistance(distanceKm)` - Format as "1.5km" or "500m"
- `getEstimatedJobTime(avgMinutes)` - Format as "1h 30m" or "45m"
- `calculateETA(distanceKm, avgSpeedKmh)` - Calculate ETA in minutes
- `formatETA(minutes)` - Format ETA for display
- `decodePolyline(encoded)` - Decode Google Maps polyline
- `isWithinServiceArea(lat, lng)` - Check if within Maasin City
- `getDefaultCenter()` - Get Maasin City coordinates

#### Web (TypeScript)
**File**: `web/src/lib/locationUtils.ts`

Same functions as mobile with:
- Full TypeScript type safety
- Interface definitions (Coordinates, MobileCoordinates, TierStyle)
- `getTierStyle(tier)` - Get tier badge styling

---

## 📋 Files That Need Updating

### High Priority (Core Features)

#### Web Platform
1. ✅ `web/src/lib/locationUtils.ts` - **CREATED**
2. ⏳ `web/src/app/client/page.tsx` - Client dashboard (12 lines duplicate)
3. ⏳ `web/src/app/client/select-provider/page.tsx` - Provider selection (15 lines duplicate)
4. ⏳ `web/src/app/client/bookings/[id]/tracking/page.tsx` - Job tracking (10 lines duplicate)
5. ⏳ `web/src/app/provider/jobs/[id]/tracking/page.tsx` - Provider tracking (10 lines duplicate)

#### Mobile Platform
6. ✅ `src/utils/locationUtils.js` - **CREATED**
7. ⏳ `src/screens/client/ClientHomeScreen.jsx` - Client home (15 lines duplicate + decodePolyline)
8. ⏳ `src/screens/client/SelectProviderScreen.jsx` - Provider selection (15 lines duplicate)
9. ⏳ `src/screens/client/JobTrackingScreen.jsx` - Job tracking (uses locationService)
10. ⏳ `src/screens/provider/ProviderTrackingScreen.jsx` - Provider tracking (uses locationService)
11. ⏳ `src/screens/navigation/DirectionsScreen.jsx` - Directions (10 lines duplicate)
12. ⏳ `src/screens/guest/GuestHomeScreen.jsx` - Guest home (10 lines duplicate)

---

## 🔄 Update Pattern

### Before (Duplicate Code)
```javascript
// DUPLICATED IN 12+ FILES
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getEstimatedJobTime = (avgMinutes) => {
  if (!avgMinutes || avgMinutes <= 0) return null;
  if (avgMinutes >= 60) {
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${avgMinutes}m`;
};
```

### After (Centralized)
```javascript
// ONE LINE IMPORT
import { calculateDistance, getEstimatedJobTime } from '../../utils/locationUtils';

// USE DIRECTLY
const distance = calculateDistance(lat1, lon1, lat2, lon2);
const estimatedTime = getEstimatedJobTime(avgMinutes);
```

---

## 📊 Impact Analysis

### Code Reduction
| Platform | Files | Lines Duplicated | Lines After | Reduction |
|----------|-------|------------------|-------------|-----------|
| Web | 4 files | ~50 lines | ~4 lines | 92% |
| Mobile | 6 files | ~90 lines | ~6 lines | 93% |
| **Total** | **10 files** | **~140 lines** | **~10 lines** | **93%** |

### Benefits
- ✅ **DRY Principle**: Single source of truth
- ✅ **Consistency**: Same calculation everywhere
- ✅ **Maintainability**: Update once, applies everywhere
- ✅ **Testability**: Test once, confidence everywhere
- ✅ **Type Safety**: Full TypeScript support on web
- ✅ **Additional Features**: formatDistance, calculateETA, formatETA

---

## 🎯 Additional Utilities Provided

### New Helper Functions

1. **formatDistance(distanceKm)**
   ```javascript
   formatDistance(0.5)  // "500m"
   formatDistance(1.5)  // "1.5km"
   formatDistance(999)  // "N/A"
   ```

2. **calculateETA(distanceKm, avgSpeedKmh)**
   ```javascript
   calculateETA(15, 30)  // 30 minutes (15km at 30km/h)
   ```

3. **formatETA(minutes)**
   ```javascript
   formatETA(45)   // "45 min"
   formatETA(90)   // "1h 30m"
   formatETA(120)  // "2h"
   ```

4. **isWithinServiceArea(lat, lng)**
   ```javascript
   isWithinServiceArea(10.1335, 124.8513)  // true (Maasin City center)
   isWithinServiceArea(14.5995, 120.9842)  // false (Manila)
   ```

5. **getDefaultCenter()**
   ```javascript
   const center = getDefaultCenter();  // { lat: 10.1335, lng: 124.8513 }
   ```

6. **decodePolyline(encoded)** (Mobile)
   ```javascript
   const route = decodePolyline(encodedPolyline);
   // Returns: [{ latitude: 10.1335, longitude: 124.8513 }, ...]
   ```

7. **getTierStyle(tier)** (Web)
   ```typescript
   const style = getTierStyle('diamond');
   // Returns: { bg: 'from-cyan-400 to-blue-500', label: 'DIAMOND', color: '#06B6D4' }
   ```

---

## 🚀 Implementation Steps

### Phase 1: Update Core Files (High Priority)
1. Update web client dashboard
2. Update web provider selection
3. Update mobile client home
4. Update mobile provider selection

### Phase 2: Update Tracking Files
5. Update web client tracking
6. Update web provider tracking
7. Update mobile client tracking
8. Update mobile provider tracking

### Phase 3: Update Remaining Files
9. Update directions screen
10. Update guest home screen

### Phase 4: Testing
11. Test distance calculations
12. Test ETA calculations
13. Test formatting functions
14. Test edge cases (null values, 999 distance)

### Phase 5: Cleanup
15. Remove old duplicate functions
16. Add JSDoc comments
17. Create unit tests

---

## 🧪 Testing Checklist

### Distance Calculation
- [ ] Test with valid coordinates
- [ ] Test with missing coordinates (should return 999)
- [ ] Test with zero distance (same location)
- [ ] Test with large distances

### Time Estimation
- [ ] Test with minutes < 60
- [ ] Test with hours (>= 60 minutes)
- [ ] Test with null/undefined
- [ ] Test with zero

### Formatting
- [ ] Test formatDistance with meters
- [ ] Test formatDistance with kilometers
- [ ] Test formatETA with minutes
- [ ] Test formatETA with hours

### Service Area
- [ ] Test with Maasin City coordinates (should be true)
- [ ] Test with Manila coordinates (should be false)
- [ ] Test with nearby cities

---

## 📝 Update Instructions

### For Each File:

1. **Add Import**
   ```javascript
   // Mobile
   import { calculateDistance, getEstimatedJobTime } from '../../utils/locationUtils';
   
   // Web
   import { calculateDistance, getEstimatedJobTime } from '@/lib/locationUtils';
   ```

2. **Remove Duplicate Functions**
   - Delete `calculateDistance` function
   - Delete `getEstimatedJobTime` function
   - Delete `decodePolyline` function (if exists)
   - Delete `getTierStyle` function (web only)

3. **Update Usage**
   - No changes needed - function signatures are the same
   - Existing calls will work as-is

4. **Test**
   - Run the app
   - Test distance calculations
   - Test time estimations
   - Verify no errors

---

## 🎓 Clean Code Principles Applied

### DRY (Don't Repeat Yourself) ✅
- Eliminated 140+ lines of duplicate code
- Single source of truth for location calculations

### Single Responsibility ✅
- Each function has ONE clear purpose
- Calculation logic separated from UI logic

### Consistent API ✅
- Same function names across web and mobile
- Same parameters and return types
- Predictable behavior

### Type Safety ✅
- Full TypeScript support on web
- Interface definitions for coordinates
- Type-safe return values

### Testability ✅
- Pure functions (no side effects)
- Easy to unit test
- Predictable outputs

---

## 📈 Expected Results

### Before
- 140+ lines of duplicate code
- Inconsistent calculations
- Hard to maintain
- No type safety
- Limited functionality

### After
- 2 utility files (~200 lines total)
- Consistent calculations everywhere
- Easy to maintain
- Full type safety (web)
- Extended functionality (formatting, ETA, service area)

---

## 🏆 Success Metrics

- ✅ **Code Reduction**: 93% reduction in duplicate code
- ✅ **Consistency**: 100% consistent calculations
- ✅ **Maintainability**: Update once, applies to 10+ files
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Functionality**: 8 utility functions vs 2 duplicated
- ✅ **Testing**: Centralized testing vs testing 12+ files

---

## 💡 Recommendations

### Immediate Actions
1. Update the 4 high-priority files first (client/provider dashboards)
2. Test thoroughly before updating remaining files
3. Add unit tests for location utilities

### Future Enhancements
1. Add caching for distance calculations
2. Add support for different distance units (miles)
3. Add support for different speed units (mph)
4. Add route optimization utilities
5. Add geofencing utilities

---

**Status**: ✅ Utilities Created, ⏳ Files Need Updating
**Priority**: HIGH (Core feature used across entire app)
**Estimated Time**: 2-3 hours for all updates
**Risk**: LOW (function signatures unchanged, backward compatible)
