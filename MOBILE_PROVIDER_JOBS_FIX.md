# Mobile App Provider Job Count Fix

## Issue
Provider cards on the mobile client home screen show "0 jobs" even after providers complete jobs.

## Root Cause
The mobile app's job completion handler (`ProviderJobDetailsScreen.jsx`) only updated:
- The `gamification` collection with `stats.completedJobs`
- The `users` collection with `totalCompletedJobs` (different field name)

But the client home screen reads `completedJobs` from the `users` collection.

## Fix Applied

### File: `src/screens/provider/ProviderJobDetailsScreen.jsx`

Added code to update the provider's user document with `completedJobs` after gamification points are awarded:

```javascript
// Award gamification points to both client and provider (fire and forget)
if (jobData.clientId && user?.uid) {
  onBookingCompleted(jobData.clientId, user.uid, totalAmount)
    .then(async (result) => {
      if (result.success) {
        console.log('Gamification points awarded successfully');
        
        // Update provider's user document with completedJobs count
        try {
          const gamificationRef = doc(db, 'gamification', user.uid);
          const gamDoc = await getDoc(gamificationRef);
          
          if (gamDoc.exists()) {
            const newCompletedCount = (gamDoc.data().stats?.completedJobs || 0);
            
            await updateDoc(doc(db, 'users', user.uid), {
              completedJobs: newCompletedCount,
              jobsCompleted: newCompletedCount,
              updatedAt: serverTimestamp(),
            });
            console.log('Provider user document updated with completedJobs:', newCompletedCount);
          }
        } catch (updateError) {
          console.log('Error updating user completedJobs:', updateError);
        }
      }
    })
    .catch(err => console.log('Gamification error:', err));
}
```

## How It Works

1. When a provider confirms payment received, the job is marked as completed
2. Gamification points are awarded (updates `gamification` collection)
3. **NEW**: After gamification succeeds, read the updated `completedJobs` count from the gamification document
4. **NEW**: Update the provider's user document with the same count
5. Client home screen now reads the correct count from the user document

## Testing

### For New Job Completions:
1. Complete a job as a provider in the mobile app
2. Confirm payment received
3. Open the client home screen (mobile or web)
4. Provider card should show the correct job count

### For Existing Completed Jobs:
Run the sync script to update existing data:
```bash
node backend/manual-fix-jobs.js
```

This will:
- Count all completed jobs for each provider
- Update both `users` and `gamification` collections
- Sync the data across all platforms

## Related Files

- **Mobile Provider Job Details**: `src/screens/provider/ProviderJobDetailsScreen.jsx` (updated)
- **Mobile Client Home**: `src/screens/client/ClientHomeScreen.jsx` (reads completedJobs)
- **Web Provider Job Details**: `web/src/app/provider/jobs/[id]/page.tsx` (already fixed)
- **Web Client Home**: `web/src/app/client/page.tsx` (reads completedJobs)
- **Sync Script**: `backend/manual-fix-jobs.js`

## Status
✅ Web app - Fixed
✅ Mobile app - Fixed
⏳ Existing data - Needs sync script to be run
