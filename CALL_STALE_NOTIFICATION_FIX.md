# Call Stale Notification Fix - Complete ✅

## Problem

When ending a call and immediately making a new call, users were receiving notifications for old/stale calls. This happened because:

1. Old call records with status "ringing" weren't being cleaned up fast enough
2. The `listenToIncomingCalls` listener was picking up these stale calls
3. Race condition between call ending and new call starting

## Root Cause

The Firestore listener query was using `where('startedAt', '>=', recentTime)` which:
- Requires a composite index that might not exist
- Doesn't filter out calls that just ended
- Has timing issues with serverTimestamp()

## Solution

### 1. Improved Call Listener (`src/services/callService.js`)

**Changes Made**:
- Removed the `startedAt` filter from the query (avoids index issues)
- Added immediate cleanup of stale calls on listener mount
- Reduced stale call threshold from 60s to 45s (faster cleanup)
- Added better logging for debugging
- Filter stale calls in the snapshot handler instead of the query
- Automatically mark stale calls as "missed" in background

**How It Works**:
```javascript
1. When listener starts → Clean up any calls older than 45s
2. Listen for all 'ringing' calls for the user
3. When new call detected → Check age
4. If age < 45s → Show call notification
5. If age >= 45s → Ignore and mark as missed
```

### 2. Cleanup Script (`backend/cleanup-stuck-calls.js`)

Created a maintenance script to manually clean up stuck calls:
```bash
node backend/cleanup-stuck-calls.js
```

This finds all calls stuck in "ringing" status for more than 60 seconds and marks them as "missed".

## Files Modified

1. `src/services/callService.js`
   - Improved `listenToIncomingCalls` function
   - Better stale call detection and cleanup
   - Added logging for debugging

2. `backend/cleanup-stuck-calls.js` (NEW)
   - Manual cleanup script for stuck calls
   - Can be run anytime to clean database

## Testing

### Test Scenario 1: Quick Successive Calls
1. User A calls User B
2. User B declines
3. User A immediately calls User B again
4. ✅ User B should only see the NEW call, not the old one

### Test Scenario 2: Missed Call Cleanup
1. User A calls User B
2. User B doesn't answer for 45+ seconds
3. ✅ Call should auto-mark as "missed"
4. ✅ User B should not see this call if they open app later

### Test Scenario 3: App Restart
1. User has app closed
2. Someone calls but user doesn't answer
3. User opens app 2 minutes later
4. ✅ Should NOT see old call notification

## Configuration

### Stale Call Threshold
Currently set to 45 seconds. Can be adjusted in `callService.js`:

```javascript
// Change this value to adjust threshold
if (age < 45000) { // 45 seconds in milliseconds
```

Recommended values:
- 30s - Aggressive cleanup (faster, but might miss legitimate slow connections)
- 45s - Balanced (current setting)
- 60s - Conservative (slower cleanup, more tolerant of delays)

## Monitoring

Check console logs for call activity:
```
[Call Service] Setting up incoming call listener for user: abc123
[Call Service] Cleaning up stale call: xyz789
[Call Service] Incoming call detected: { callId, age: '5s', caller: 'John' }
[Call Service] Ignoring stale call: old123
```

## Manual Cleanup

If users report seeing old calls, run the cleanup script:

```bash
# Clean up all stuck calls
node backend/cleanup-stuck-calls.js

# Check for stuck calls without cleaning
# (modify script to skip the update step)
```

## Prevention

The fix prevents stale calls by:
1. **Immediate cleanup** on listener mount
2. **Age-based filtering** in the snapshot handler
3. **Automatic marking** of stale calls as missed
4. **Reduced threshold** (45s instead of 60s)

## Edge Cases Handled

1. **Clock skew**: Uses client-side timestamp comparison
2. **Network delays**: 45s threshold accounts for slow connections
3. **App backgrounding**: Cleanup runs when listener re-mounts
4. **Multiple devices**: Each device cleans up independently

## Future Improvements

1. Add Cloud Function to auto-cleanup calls older than 2 minutes
2. Add call expiry field to prevent indefinite "ringing" status
3. Implement call queue to prevent overlapping calls
4. Add rate limiting to prevent call spam

## Rollback

If issues occur, revert `src/services/callService.js` to use the old query:

```javascript
const q = query(
  collection(db, 'calls'),
  where('receiverId', '==', userId),
  where('status', '==', 'ringing'),
  where('startedAt', '>=', new Date(Date.now() - 60000))
);
```

## Notes

- The fix is backward compatible
- No database migration needed
- Works with existing call records
- Cleanup happens automatically on each app launch
