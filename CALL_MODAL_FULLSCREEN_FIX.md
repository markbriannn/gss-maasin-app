# Call Modal Full-Screen Fix

## Issue
When a voice call was initiated or received, the call screen (VoiceCall component) was appearing as an overlay on top of the current screen content (like Job Details), making the background content visible and creating a broken UI experience.

The call screen should be completely full-screen and hide all content behind it.

## Root Cause
The Modal components wrapping the VoiceCall component were missing critical props:
- `statusBarTranslucent` - Needed to extend the modal under the status bar
- `presentationStyle="fullScreen"` - Ensures the modal covers the entire screen
- ChatScreen wasn't using a Modal at all, just rendering VoiceCall directly

## Changes Made

### 1. Fixed JobDetailsScreen (Client)
**File**: `src/screens/client/JobDetailsScreen.jsx`

Added `statusBarTranslucent` and `presentationStyle="fullScreen"` to both call modals:

```javascript
{activeCall && (
  <Modal 
    visible={true} 
    transparent={false} 
    animationType="slide"
    statusBarTranslucent
    presentationStyle="fullScreen"
  >
    <VoiceCall ... />
  </Modal>
)}

{incomingCall && (
  <Modal 
    visible={true} 
    transparent={false} 
    animationType="slide"
    statusBarTranslucent
    presentationStyle="fullScreen"
  >
    <VoiceCall ... />
  </Modal>
)}
```

### 2. Fixed ProviderJobDetailsScreen (Provider)
**File**: `src/screens/provider/ProviderJobDetailsScreen.jsx`

Applied the same fix - added `statusBarTranslucent` and `presentationStyle="fullScreen"` to both call modals.

### 3. Fixed ChatScreen
**File**: `src/screens/chat/ChatScreen.jsx`

This was the main issue - VoiceCall was being rendered directly without a Modal wrapper, causing it to appear as an overlay.

**Before**:
```javascript
{activeCall && (callStatus === 'ringing' || callStatus === 'ongoing') && (
  <VoiceCall ... />
)}
```

**After**:
```javascript
{activeCall && (callStatus === 'ringing' || callStatus === 'ongoing') && (
  <Modal 
    visible={true} 
    transparent={false} 
    animationType="slide"
    statusBarTranslucent
    presentationStyle="fullScreen"
  >
    <VoiceCall ... />
  </Modal>
)}
```

## Modal Props Explained

- `visible={true}` - Shows the modal
- `transparent={false}` - Makes the modal opaque (not see-through)
- `animationType="slide"` - Slides in from bottom
- `statusBarTranslucent` - Extends modal under status bar for true full-screen
- `presentationStyle="fullScreen"` - iOS-specific, ensures full-screen coverage

## User Experience After Fix

### Before:
- Call screen appeared as overlay
- Job Details content visible behind call screen
- Broken, confusing UI

### After:
- Call screen is completely full-screen
- No content visible behind it
- Clean, professional call experience
- Purple call screen fills entire display

## Testing
1. Open a job in Job Details screen
2. Make a call to the provider
3. Verify call screen is completely full-screen
4. No Job Details content should be visible
5. Test from Chat screen as well
6. Test incoming calls
7. Verify on both client and provider sides

## Files Modified
- `src/screens/client/JobDetailsScreen.jsx` - Added full-screen modal props
- `src/screens/provider/ProviderJobDetailsScreen.jsx` - Added full-screen modal props
- `src/screens/chat/ChatScreen.jsx` - Wrapped VoiceCall in Modal with full-screen props

## Next Steps
1. Rebuild the mobile app: `cd android && ./gradlew assembleRelease`
2. Test call functionality from all screens
3. Verify full-screen behavior on different devices
