# Provider Card Shows "0 jobs" - FIXED

## Problem

On the client home screen, provider cards show "0 jobs" even after the provider has completed jobs.

## Root Cause

The client home screen reads `completedJobs` from the provider's **user document** (`users/{providerId}`):

```typescript
// web/src/app/client/page.tsx line 268
completedJobs: data.completedJobs || 0,
```

However, when a job is completed, the code was ONLY updating the **gamification collection** (`gamification/{providerId}`), NOT the user document!

```typescript
// web/src/app/provider/jobs/[id]/page.tsx
await updateDoc(gamificationRef, {
  'stats.completedJobs': (providerGamDoc.data().stats?.completedJobs || 0) + 1,
  // ... but user document was never updated!
});
```

## The Fix

### 1. Updated Job Completion Code

Added code to update the provider's user document when a job is completed:

**File:** `web/src/app/provider/jobs/[id]/page.tsx`

```typescript
// Update provider's user document with completedJobs count
const providerUserRef = doc(db, 'users', user.uid);
const newCompletedCount = providerGamDoc.exists() 
  ? (providerGamDoc.data().stats?.completedJobs || 0) + 1 
  : 1;

await updateDoc(providerUserRef, {
  completedJobs: newCompletedCount,
  jobsCompleted: newCompletedCount,
  updatedAt: serverTimestamp(),
});
```

### 2. Fix Script for Existing Data

Run this to sync existing completed jobs to user documents:

```bash
# Fix single provider
node backend/fix-provider-stats.js <providerId>

# Fix ALL providers
node backend/fix-provider-stats.js --all
```

This script:
- Counts actual completed jobs from bookings
- Updates BOTH gamification collection AND user document
- Syncs the data so provider cards show correct job counts

## Testing

1. **Complete a new job** as a provider
2. **Check the client home screen** - provider card should show updated job count
3. **For existing providers** - run the fix script first

## Files Changed

- ✅ `web/src/app/provider/jobs/[id]/page.tsx` - Added user document update
- ✅ `backend/fix-provider-stats.js` - Script to sync existing data

## Why This Happened

The gamification system was added later, and stats were moved to the `gamification` collection for better organization. However, the client home screen still reads from the `users` collection, causing a mismatch.

## Future Improvement

Consider either:
1. Update client home screen to read from gamification collection
2. Always keep both collections in sync (current approach)
3. Use a Cloud Function to automatically sync on job completion

Current approach (option 2) is simplest and most reliable.
