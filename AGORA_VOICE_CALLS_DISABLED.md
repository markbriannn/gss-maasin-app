# Agora Voice Calls Disabled

## Summary
Voice calling feature has been temporarily disabled in the mobile app to prevent crashes caused by Agora SDK initialization issues.

## Changes Made

### 1. VoiceCall Component (`src/components/common/VoiceCall.jsx`)
- Added `AGORA_DISABLED = true` flag
- Prevented Agora SDK from loading when flag is enabled
- Component still exists but won't initialize Agora engine

### 2. Client Job Details (`src/screens/client/JobDetailsScreen.jsx`)
- Hidden "Voice Call" button (commented out)
- "Message" button now takes full width
- Client can still message provider

### 3. Provider Job Details (`src/screens/provider/ProviderJobDetailsScreen.jsx`)
- Hidden "Voice Call" button (commented out)
- "Message" and "Directions" buttons remain visible
- Provider can still message client and get directions

### 4. Chat Screen (`src/screens/chat/ChatScreen.jsx`)
- Hidden call button in chat header (commented out)
- Chat messaging functionality remains fully operational
- Call history messages still display correctly

### 5. App.jsx
- Disabled incoming call listener
- Prevents any call-related Firebase listeners from running
- Eliminates potential crash from call notifications

## What Still Works
✅ Text messaging between users
✅ Job booking and management
✅ Payment processing
✅ Location tracking
✅ All other app features

## What's Disabled
❌ Voice calling button (hidden)
❌ Incoming call notifications
❌ Agora SDK initialization
❌ Call-related Firebase listeners

## How to Re-enable Voice Calls

When ready to re-enable voice calls:

1. **VoiceCall.jsx**: Change `AGORA_DISABLED = true` to `AGORA_DISABLED = false`
2. **JobDetailsScreen.jsx**: Uncomment the Voice Call button
3. **ProviderJobDetailsScreen.jsx**: Uncomment the Voice Call button
4. **ChatScreen.jsx**: Uncomment the call button in header
5. **App.jsx**: Uncomment the incoming call listener
6. Rebuild the app: `cd android && ./gradlew clean && cd .. && npx react-native run-android`

## Testing
- App should now launch without crashes
- No call buttons visible in UI
- All other features work normally
- No Agora-related errors in logs

## Date
March 5, 2026
