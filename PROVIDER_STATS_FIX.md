# Provider Stats Not Updating - Fix Guide

## Problem

Provider job count shows 0 even after completing jobs, and estimated response time is not displaying.

## Root Cause

Provider statistics are stored in two places:
1. **Gamification collection** (`gamification/{providerId}`) - stores `stats.completedJobs`, `stats.totalEarnings`
2. **User document** (`users/{providerId}`) - stores `completedJobs`, `jobsCompleted`

When a job is completed, the stats should be updated in both locations, but there may be cases where:
- The gamification document doesn't exist yet
- Stats weren't updated properly during job completion
- There's a mismatch between actual completed jobs and stored stats

## Where Stats Are Updated

### Web App (Provider Job Completion)
File: `web/src/app/provider/jobs/[id]/page.tsx` (lines 420-470)

When provider marks work as complete:
```typescript
// Update gamification stats
await updateDoc(gamificationRef, {
  points: (providerGamDoc.data().points || 0) + 100,
  'stats.completedJobs': (providerGamDoc.data().stats?.completedJobs || 0) + 1,
  'stats.totalEarnings': (providerGamDoc.data().stats?.totalEarnings || 0) + providerEarnings,
  updatedAt: serverTimestamp(),
});
```

### Where Stats Are Displayed

1. **Provider Dashboard** (`web/src/app/provider/page.tsx`)
   - Counts completed jobs from `bookings` collection directly
   - Shows: Today's earnings, week earnings, total earnings, completed jobs

2. **Provider Profile** (`web/src/app/provider/profile/page.tsx`)
   - Counts completed jobs from `bookings` collection
   - Calculates average response time
   - Shows: Jobs completed, response time, rating

3. **Leaderboard** (`web/src/app/leaderboard/page.tsx`)
   - Reads from `gamification` collection
   - Shows: Points, completed jobs, rating

## Diagnostic Tools

### 1. Check Provider Stats
```bash
node backend/check-provider-stats.js <providerId>
```

This will show:
- Provider document stats
- Gamification document stats
- Actual completed jobs count from bookings
- Any discrepancies between them

### 2. Fix Provider Stats
```bash
# Fix single provider
node backend/fix-provider-stats.js <providerId>

# Fix all providers
node backend/fix-provider-stats.js --all
```

This will:
- Count actual completed jobs from bookings collection
- Calculate total earnings
- Calculate average response time
- Update both gamification and user documents

## How to Fix Your Issue

1. **Get your provider ID**
   - Log in to the app
   - Check the browser console or Firestore for your user ID

2. **Run the diagnostic**
   ```bash
   node backend/check-provider-stats.js YOUR_PROVIDER_ID
   ```

3. **Fix the stats**
   ```bash
   node backend/fix-provider-stats.js YOUR_PROVIDER_ID
   ```

4. **Refresh the app**
   - Close and reopen the app
   - Your job count and stats should now be correct

## Prevention

To prevent this issue in the future:

1. **Ensure gamification document exists** before updating stats
2. **Use transactions** when updating multiple documents
3. **Add error handling** for stat updates
4. **Run periodic sync** to keep stats in sync

## Related Files

- `web/src/app/provider/jobs/[id]/page.tsx` - Job completion logic
- `web/src/app/provider/page.tsx` - Provider dashboard
- `web/src/app/provider/profile/page.tsx` - Provider profile
- `src/services/gamificationService.js` - Gamification service (mobile)
- `backend/check-provider-stats.js` - Diagnostic tool
- `backend/fix-provider-stats.js` - Fix tool
- `backend/update-provider-stats.js` - Existing update tool

## Notes

- The "estimated time" you mentioned is actually the "average response time" - how long it takes you to accept jobs
- This is calculated from the time between job creation and acceptance
- It will show "Not enough data" if you haven't accepted enough jobs yet
- After fixing stats, it should display correctly (e.g., "15 min", "2 hrs")

## Quick Fix Command

If you just want to fix all providers at once:
```bash
cd backend
node fix-provider-stats.js --all
```

This will update stats for all providers in the system.
