# Estimated Job Time Display Fix

## Problem
The estimated job time was not showing for providers in both web and mobile client views, even though providers had completed jobs.

## Root Causes

1. **Missing Field in Database**: Providers didn't have the `avgJobDurationMinutes` field populated in their user documents
2. **Wrong Field Names**: The code was looking for `workStartedAt` and `workCompletedAt`, but the actual fields in completed bookings were `startedAt` and `completedAt`
3. **Rounding Issue**: Very short job durations (< 1 minute) were being rounded to 0, which made them invalid

## Solutions Implemented

### 1. Database Script

Created `backend/calculate-avg-job-duration.js` to calculate and update `avgJobDurationMinutes` for all providers.

**Features:**
- Reads all completed bookings for each provider
- Calculates average duration from `startedAt` to `completedAt` timestamps
- Handles both old field names (`startedAt`/`completedAt`) and new field names (`workStartedAt`/`workCompletedAt`)
- Filters out unreasonable durations (< 0.1 min or > 10 hours)
- Uses `Math.ceil` and ensures minimum of 1 minute for display
- Updates provider's user document with `avgJobDurationMinutes`

**Usage:**
```bash
# Calculate for all providers
node backend/calculate-avg-job-duration.js

# Calculate for specific provider
node backend/calculate-avg-job-duration.js <providerId>
```

### 2. Web App Fixes

#### Client Dashboard (`web/src/app/client/page.tsx`)
- Updated to check both `workStartedAt`/`workCompletedAt` AND `startedAt`/`completedAt`
- Changed minimum duration threshold from 0 to 0.1 minutes
- Changed rounding from `Math.round` to `Math.ceil` with minimum of 1 minute
- Calculates estimated time in real-time from bookings if not in provider document

**Changes:**
```typescript
// Before
const started = bData.workStartedAt?.toDate?.();
const ended = bData.workCompletedAt?.toDate?.();
if (mins > 0 && mins < 600) ...
const avg = Math.round(...);

// After
const started = bData.workStartedAt?.toDate?.() || bData.startedAt?.toDate?.();
const ended = bData.workCompletedAt?.toDate?.() || bData.completedAt?.toDate?.();
if (mins > 0.1 && mins < 600) ...
const avg = Math.max(1, Math.ceil(...));
```

### 3. Mobile App Fixes

#### Provider Job Details Screen (`src/screens/provider/ProviderJobDetailsScreen.jsx`)
- Updated calculation logic to use both field name patterns
- Changed minimum duration threshold to 0.1 minutes
- Changed rounding to `Math.ceil` with minimum of 1 minute
- Automatically updates `avgJobDurationMinutes` when jobs are completed

**Changes:**
```javascript
// Before
const started = bData.workStartedAt?.toDate?.();
const ended = bData.workCompletedAt?.toDate?.();
if (mins > 0 && mins < 600) durations.push(mins);
updateData.avgJobDurationMinutes = Math.round(...);

// After
const started = bData.workStartedAt?.toDate?.() || bData.startedAt?.toDate?.();
const ended = bData.workCompletedAt?.toDate?.() || bData.completedAt?.toDate?.();
if (mins > 0.1 && mins < 600) durations.push(mins);
updateData.avgJobDurationMinutes = Math.max(1, Math.ceil(...));
```

## Results

After running the script:
- Provider "Jenessa Jocelde" now has `avgJobDurationMinutes: 1`
- Estimated time displays as "Est. ~1 min/job" in both web and mobile
- Future completed jobs will automatically update this value

## Display Format

The estimated time is displayed as:
- **< 60 minutes**: "Est. ~X min/job" (e.g., "Est. ~15 min/job")
- **≥ 60 minutes**: "Est. ~X.X hr/job" (e.g., "Est. ~2.5 hr/job")

## How It Works

1. **On Job Completion**: When a provider marks a job as complete, the system:
   - Queries all their completed bookings
   - Calculates durations from `startedAt` to `completedAt`
   - Computes average duration
   - Updates provider's `avgJobDurationMinutes` field

2. **On Client View**: When clients browse providers:
   - Web: Reads `avgJobDurationMinutes` from provider document, or calculates in real-time from bookings
   - Mobile: Reads `avgJobDurationMinutes` from provider document
   - Displays formatted estimated time

## Testing

To verify the fix:
1. **Web**: Visit `http://localhost:3001/client` - provider cards should show estimated time
2. **Mobile**: Open client home screen - provider cards should show estimated time with clock icon
3. **Provider Modal**: Click on a provider - modal should show estimated time

## Files Modified

### Web
- `web/src/app/client/page.tsx`

### Mobile
- `src/screens/provider/ProviderJobDetailsScreen.jsx`

### Scripts (New)
- `backend/calculate-avg-job-duration.js`
- `backend/check-completed-booking-fields.js`

## Notes

- The current test data shows very short job durations (< 1 minute) because jobs were completed quickly for testing
- In production, real jobs will have more realistic durations (15-120 minutes typically)
- The system handles both old and new field names for backward compatibility
- Minimum display is 1 minute even for sub-minute jobs
