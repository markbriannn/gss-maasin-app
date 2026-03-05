# Incoming Call Notification Fix

## Issue
When admin calls a client or provider, the admin's screen shows "Ringing..." but the receiver doesn't get the incoming call notification. The call just rings on the caller's side without the receiver being notified.

## Root Cause
1. **No special handling for incoming call notifications** - The backend was treating incoming calls like regular notifications
2. **Missing notification channel** - Android requires a high-priority notification channel for incoming calls
3. **Low priority notifications** - Regular notifications don't wake up the device or show prominently

## Changes Made

### 1. Backend - Special Handling for Incoming Calls
**File**: `backend/services/pushNotificationService.js`

Added special high-priority configuration for `incoming_call` notifications:

```javascript
// Special handling for incoming calls
if (data.type === 'incoming_call') {
  message.android = {
    priority: 'high',
    notification: {
      sound: 'default',
      channelId: 'incoming_calls',  // Dedicated channel
      priority: 'max',               // Maximum priority
      visibility: 'public',          // Show on lock screen
      defaultSound: true,
      defaultVibrateTimings: true,
    },
  };
  message.apns = {
    payload: {
      aps: {
        sound: 'default',
        badge: 1,
        'content-available': 1,
      },
    },
  };
}
```

**Key improvements:**
- Uses dedicated `incoming_calls` channel (higher priority than regular notifications)
- Sets priority to `max` for immediate delivery
- Enables sound and vibration
- Shows on lock screen (`visibility: 'public'`)
- iOS support with APNS configuration

### 2. Mobile - Create Notification Channels
**File**: `src/services/pushNotificationService.js`

Added function to create notification channels on Android:

```javascript
async createNotificationChannels() {
  if (Platform.OS !== 'android') return;

  try {
    const notifee = require('@notifee/react-native').default;

    // Create incoming calls channel (high priority, with sound)
    await notifee.createChannel({
      id: 'incoming_calls',
      name: 'Incoming Calls',
      importance: 5, // IMPORTANCE_HIGH
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 500],
    });

    // Create default notifications channel
    await notifee.createChannel({
      id: 'gss_notifications',
      name: 'General Notifications',
      importance: 4, // IMPORTANCE_DEFAULT
      sound: 'default',
    });
  } catch (error) {
    console.log('Could not create notification channels:', error?.message);
  }
}
```

**Two channels created:**
1. `incoming_calls` - High priority (5), with sound and vibration
2. `gss_notifications` - Default priority (4), for regular notifications

### 3. Initialize Channels on App Start
**File**: `src/context/PushNotificationContext.jsx`

Added channel creation before requesting permissions:

```javascript
// Create notification channels first (Android only)
await pushNotificationService.createNotificationChannels();

// Request permission (quick operation)
const granted = await pushNotificationService.requestPermission();
```

## How It Works Now

### Call Flow:
1. **Admin initiates call** → Creates call document in Firestore with status 'ringing'
2. **Backend sends push notification** → High-priority notification with sound/vibration
3. **Receiver's device** → Notification appears prominently, even if app is in background
4. **Receiver sees notification** → Can tap to open app and answer call
5. **App opens** → Global listener in App.jsx shows the VoiceCall screen

### Notification Priority Levels:
- **Incoming calls**: Priority 5 (IMPORTANCE_HIGH) - Shows heads-up, makes sound, vibrates
- **Regular notifications**: Priority 4 (IMPORTANCE_DEFAULT) - Shows in notification tray

## Testing

### Test Scenarios:
1. **App in foreground** - Call notification should appear immediately
2. **App in background** - Push notification should wake device and show notification
3. **App closed** - Push notification should appear and open app when tapped
4. **Lock screen** - Notification should appear on lock screen

### Test Steps:
1. Login as admin on one device
2. Login as client/provider on another device
3. Put client/provider app in background
4. Admin calls the client/provider
5. Verify notification appears on receiver's device
6. Tap notification to answer call

## Dependencies

The notification channel creation uses `@notifee/react-native`. If not installed:

```bash
npm install @notifee/react-native
cd android && ./gradlew clean
cd .. && npx react-native run-android
```

Or it will fail silently and use default FCM notifications (which still work but with lower priority).

## Files Modified
- `backend/services/pushNotificationService.js` - Added special handling for incoming_call notifications
- `src/services/pushNotificationService.js` - Added createNotificationChannels function
- `src/context/PushNotificationContext.jsx` - Initialize channels on app start

## Next Steps
1. Rebuild the mobile app: `cd android && ./gradlew assembleRelease`
2. Test incoming calls with app in different states (foreground, background, closed)
3. Verify notifications appear prominently with sound and vibration
4. Test on both Android and iOS devices

## Notes
- iOS doesn't need notification channels (handled automatically by APNS)
- Android 13+ requires POST_NOTIFICATIONS permission (already handled)
- Notifee is optional - if not installed, falls back to default FCM channels
