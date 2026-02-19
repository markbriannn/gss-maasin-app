# In-App Voice Calling Implementation (Agora.io)

## Overview

Implement WhatsApp/Messenger-style voice calling inside the app using Agora.io.

**Cost**: FREE for first 10,000 minutes/month (~166 hours)  
**After free tier**: $0.99 per 1,000 minutes (~$0.06 per hour)

---

## Why Agora.io?

| Feature | Agora.io | WebRTC (DIY) |
|---------|----------|--------------|
| **Cost** | FREE (10k min/mo) | FREE |
| **Implementation Time** | 1-2 days | 5-7 days |
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Audio Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Network Handling** | Excellent | Good |
| **Elderly-Friendly** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Support** | Professional | DIY |

---

## Setup Steps

### 1. Create Agora Account (5 minutes)

1. Go to https://www.agora.io/
2. Sign up for free account
3. Create a new project
4. Get your **App ID** (looks like: `a1b2c3d4e5f6g7h8i9j0`)
5. Enable **App Certificate** for security

### 2. Install Dependencies

#### Web:
```bash
cd web
npm install agora-rtc-sdk-ng
```

#### Mobile:
```bash
cd ..
npm install react-native-agora
cd ios && pod install && cd ..
```

### 3. Add Environment Variables

**web/.env.local**:
```env
NEXT_PUBLIC_AGORA_APP_ID=your_app_id_here
```

**backend/.env**:
```env
AGORA_APP_ID=your_app_id_here
AGORA_APP_CERTIFICATE=your_app_certificate_here
```

---

## Architecture

```
┌─────────────┐                    ┌─────────────┐
│   Client    │                    │  Provider   │
│             │                    │             │
│  [Call Btn] │──────────────────▶│ [Incoming]  │
│             │   Firebase         │             │
│             │   (signaling)      │             │
│             │                    │             │
│  ┌────────┐ │                    │ ┌────────┐  │
│  │ Agora  │◀├────────────────────┤▶│ Agora  │  │
│  │  SDK   │ │   Voice Stream     │ │  SDK   │  │
│  └────────┘ │   (Agora Cloud)    │ └────────┘  │
└─────────────┘                    └─────────────┘
```

**Flow:**
1. User A clicks "Call" button
2. Create call document in Firebase with call ID
3. Send push notification to User B
4. Both users join Agora channel with same call ID
5. Voice streams through Agora cloud
6. Either user can end call
7. Update call document (duration, status)

---

## Database Structure

### Firestore Collection: `calls`

```javascript
{
  id: "call_123",
  callerId: "user_abc",
  callerName: "John Doe",
  receiverId: "user_xyz",
  receiverName: "Jane Smith",
  bookingId: "booking_456", // Optional: link to booking
  status: "ringing" | "active" | "ended" | "missed" | "declined",
  channelName: "call_123", // Agora channel name
  startedAt: Timestamp,
  endedAt: Timestamp,
  duration: 0, // seconds
  adminApproved: true, // Only allow if booking is approved
}
```

---

## Implementation Files

### 1. Web Voice Call Component

**File**: `web/src/components/VoiceCall.tsx`

**Features**:
- Large "Call" button
- Incoming call modal (full screen)
- Active call UI (timer, mute, end call)
- Ringing sound
- Call ended summary

### 2. Mobile Voice Call Component

**File**: `src/components/common/VoiceCall.jsx`

**Features**:
- Same as web
- Native ringtone
- Background call support
- Lock screen controls

### 3. Call Service

**File**: `src/services/callService.js` (shared)

**Functions**:
```javascript
// Initiate call
initiateCall(callerId, receiverId, bookingId)

// Answer call
answerCall(callId)

// Decline call
declineCall(callId)

// End call
endCall(callId)

// Get active call
getActiveCall(userId)
```

### 4. Backend Token Generator

**File**: `backend/routes/agora.js`

**Endpoint**: `POST /api/agora/token`

**Purpose**: Generate secure Agora tokens for each call

---

## UI Design (Elderly-Friendly)

### Call Button
```
┌─────────────────────────────────────┐
│  🎤  CALL PROVIDER                  │
│                                     │
│  John Doe                           │
│  Tap to start voice call            │
└─────────────────────────────────────┘
```
- Height: 80px
- Font: 20px
- Green background
- Large microphone icon

### Incoming Call Screen
```
┌─────────────────────────────────────┐
│                                     │
│         📞                          │
│                                     │
│    John Doe is calling...           │
│                                     │
│    About: Plumbing Service          │
│                                     │
│                                     │
│  ┌─────────┐      ┌─────────┐      │
│  │ Decline │      │ Answer  │      │
│  │   ❌    │      │   ✅    │      │
│  └─────────┘      └─────────┘      │
│                                     │
└─────────────────────────────────────┘
```
- Full screen modal
- Large buttons (100px height)
- Ringing sound
- Auto-dismiss after 30 seconds

### Active Call Screen
```
┌─────────────────────────────────────┐
│                                     │
│         🎤                          │
│                                     │
│    Talking to John Doe              │
│                                     │
│         02:35                       │
│                                     │
│                                     │
│  ┌─────────┐      ┌─────────┐      │
│  │  Mute   │      │ End Call│      │
│  │   🔇    │      │   📞    │      │
│  └─────────┘      └─────────┘      │
│                                     │
└─────────────────────────────────────┘
```
- Timer showing call duration
- Large mute button
- Large red "End Call" button
- Simple, clean interface

---

## Call Permissions (Same as Before)

| From → To | Admin | Provider | Client |
|-----------|-------|----------|--------|
| **Admin** | ❌ | ✅ ALWAYS | ✅ ALWAYS |
| **Provider** | ❌ | ❌ | ✅ if approved |
| **Client** | ❌ | ✅ if approved | ❌ |

**Condition**: Client ↔ Provider calls only work if `booking.adminApproved === true`

---

## Implementation Checklist

### Phase 1: Setup (1 hour)
- [ ] Create Agora account
- [ ] Get App ID and Certificate
- [ ] Install dependencies (web + mobile)
- [ ] Add environment variables
- [ ] Create backend token endpoint

### Phase 2: Core Components (4 hours)
- [ ] Create VoiceCall component (web)
- [ ] Create VoiceCall component (mobile)
- [ ] Create call service
- [ ] Add Firebase call collection
- [ ] Implement call signaling

### Phase 3: UI Integration (3 hours)
- [ ] Add call button to provider job details
- [ ] Add call button to client booking details
- [ ] Add call button to admin pages
- [ ] Add admin approval check
- [ ] Test call flow

### Phase 4: Polish (2 hours)
- [ ] Add ringtone sounds
- [ ] Add call history
- [ ] Add missed call notifications
- [ ] Test on real devices
- [ ] Handle edge cases (poor network, etc.)

**Total Time**: 10 hours (~1.5 days)

---

## Cost Estimation

### Free Tier: 10,000 minutes/month

**Example Usage:**
- 100 calls/day × 5 minutes average = 500 minutes/day
- 500 minutes/day × 30 days = 15,000 minutes/month
- **Cost**: First 10,000 FREE, then 5,000 × $0.99/1000 = $4.95/month

**For small scale** (< 50 calls/day): **100% FREE**

---

## Advantages Over Regular Phone Calls

1. ✅ **Privacy**: Phone numbers stay hidden
2. ✅ **Call History**: Track all calls in app
3. ✅ **Call Recording**: Can record calls (optional)
4. ✅ **Analytics**: See call duration, quality
5. ✅ **Control**: Admin can monitor/restrict calls
6. ✅ **FREE**: No user phone plan charges
7. ✅ **Professional**: Looks more professional

---

## Disadvantages

1. ❌ **Requires Internet**: Won't work offline
2. ❌ **Data Usage**: Uses ~1MB per minute
3. ❌ **Learning Curve**: Elderly users need to learn
4. ❌ **Implementation Time**: Takes 1-2 days

---

## Recommendation

**Start with Agora.io** because:
- FREE for your scale
- Easy to implement
- Professional quality
- Better for elderly users than DIY WebRTC
- Privacy protection (no phone numbers exposed)

**Fallback**: Keep the regular phone call button as backup for users without internet.

---

## Next Steps

1. **Create Agora account** (5 minutes)
2. **Get App ID** and add to environment variables
3. **I'll implement the voice calling feature** (1-2 days)
4. **Test on real devices**
5. **Deploy**

Ready to proceed? I can start implementing once you create the Agora account and provide the App ID!

---

## Support & Documentation

- Agora Docs: https://docs.agora.io/
- React Native SDK: https://docs.agora.io/en/voice-calling/get-started/get-started-sdk?platform=react-native
- Web SDK: https://docs.agora.io/en/voice-calling/get-started/get-started-sdk?platform=web

---

**Status**: Ready to implement  
**ETA**: 1-2 days  
**Cost**: FREE (10k minutes/month)
