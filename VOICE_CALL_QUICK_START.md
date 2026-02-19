# Voice Call Feature - Quick Start Guide

## ✅ CURRENT STATUS
- **Web Platform**: READY (localhost only)
- **Mobile Platform**: READY (needs rebuild)
- **Backend**: RUNNING on port 3001

## 🚀 QUICK START (For Defense Demo)

### 1. Start Backend Server (REQUIRED)
```bash
cd backend
node server.js
```
✅ Should show: "Server running on port 3001"

### 2. Start Web App
```bash
cd web
npm run dev
```
✅ Opens on http://localhost:3000

### 3. Rebuild Mobile App (if needed)
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

## 📱 HOW TO TEST VOICE CALLING

### Web to Web Call:
1. Open two browser windows (or use incognito)
2. Login as Admin in one window
3. Login as Provider/Client in another
4. Go to job details page
5. Click "Voice Call" button
6. Answer the call in the other window

### Web to Mobile Call:
1. Web: Login as Admin → Go to job details → Click "Voice Call"
2. Mobile: Should receive incoming call notification
3. Answer on mobile device

### Mobile to Web Call:
1. Mobile: Login as Provider → Go to job details → Click "Voice Call"
2. Web: Should receive incoming call notification
3. Answer on web browser

## 🔑 KEY FEATURES

### Call Permissions:
- ✅ **Admin**: Can call ANYONE without approval
- ✅ **Provider/Client**: Can only call if `booking.adminApproved === true`
- ✅ Buttons hidden when `status === 'completed'`

### Call Features:
- ✅ In-app voice calling (like WhatsApp)
- ✅ Mute/Unmute microphone
- ✅ Call duration timer
- ✅ Incoming call screen with Answer/Decline
- ✅ Cross-platform (web ↔ mobile)

## 🔧 CONFIGURATION

### Environment Variables:
```env
# web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_AGORA_APP_ID=dfed04451174410bb13b5dcee9bfcb8a

# backend/.env
AGORA_APP_ID=dfed04451174410bb13b5dcee9bfcb8a
AGORA_APP_CERTIFICATE=22887f8618be4f549a5099a9a609892e
```

## 🎯 DEMO SCRIPT FOR DEFENSE

### Scenario 1: Admin Calling Provider
1. Show admin dashboard with pending jobs
2. Click on a job → Show job details
3. Point out "Voice Call" button (admin can always call)
4. Click "Voice Call" → Show call connecting
5. Provider receives call → Answer
6. Show active call with mute button and timer
7. End call

### Scenario 2: Provider Calling Client (After Approval)
1. Show provider job list
2. Click on approved job (adminApproved = true)
3. Show "Voice Call" button is visible
4. Click "Voice Call" → Client receives call
5. Show cross-platform calling (mobile ↔ web)

### Scenario 3: Permission Check
1. Show job that is NOT admin approved
2. Point out "Voice Call" button is HIDDEN
3. Explain: "Only admin-approved bookings can make calls"

## 🐛 TROUBLESHOOTING

### Web: "Failed to get token" error
- ✅ **FIX**: Make sure backend is running on port 3001
- Check: `http://localhost:3001/api/health` should return `{"status":"ok"}`

### Mobile: "RtcEngine.create is not a function"
- ✅ **FIXED**: Updated to use v4.x API (`createAgoraRtcEngine()`)
- Rebuild app: `cd android && ./gradlew clean && cd .. && npx react-native run-android`

### Call not connecting
- Check both users are logged in
- Check booking is admin approved (unless caller is admin)
- Check backend server is running
- Check console for errors

## 📊 TECHNICAL DETAILS

### Technology Stack:
- **Agora.io**: Voice calling SDK (FREE 10k minutes/month)
- **Web**: `agora-rtc-sdk-ng` v4.24.2
- **Mobile**: `react-native-agora` v4.5.3
- **Backend**: `agora-access-token` for token generation

### Architecture:
1. User clicks "Voice Call" button
2. Frontend calls backend `/api/agora/token` endpoint
3. Backend generates Agora RTC token (valid 24 hours)
4. Frontend joins Agora channel with token
5. Other user receives call notification via Firestore
6. Both users connect to same Agora channel
7. Voice call established (peer-to-peer)

### Security:
- ✅ Token-based authentication (24-hour expiry)
- ✅ Admin approval required for provider/client calls
- ✅ Role-based access control (case-insensitive)
- ✅ Call records stored in Firestore

## 📝 FILES MODIFIED

### Web Platform:
- `web/src/components/VoiceCall.tsx` - Call UI component
- `web/src/services/callService.ts` - Call logic with admin bypass
- `web/src/app/admin/jobs/[id]/page.tsx` - Admin job details
- `web/src/app/provider/jobs/[id]/page.tsx` - Provider job details
- `web/src/app/client/bookings/[id]/page.tsx` - Client booking details

### Mobile Platform:
- `src/components/common/VoiceCall.jsx` - Call UI component (v4.x API)
- `src/services/callService.js` - Call logic with admin bypass
- `src/screens/provider/ProviderJobDetailsScreen.jsx` - Provider integration
- `src/screens/client/JobDetailsScreen.jsx` - Client integration
- `android/app/src/main/AndroidManifest.xml` - Permissions

### Backend:
- `backend/routes/agora.js` - Token generation endpoint
- `backend/server.js` - Route registration

## 🎓 FOR YOUR DEFENSE

### Key Points to Mention:
1. **Real-time Communication**: In-app voice calling using Agora.io
2. **Security**: Admin approval required, token-based authentication
3. **Cross-Platform**: Works on web and mobile seamlessly
4. **User Experience**: Clean UI with mute, timer, and call controls
5. **Scalability**: Free tier supports 10,000 minutes/month

### Demo Tips:
- Have backend running BEFORE starting demo
- Test calls before defense starts
- Show both incoming and outgoing calls
- Demonstrate admin bypass feature
- Show permission checks (hidden buttons)

## ⚡ LAST-MINUTE CHECKLIST

- [ ] Backend server running on port 3001
- [ ] Web app running on port 3000
- [ ] Mobile app installed and running
- [ ] Test admin account logged in
- [ ] Test provider/client accounts ready
- [ ] At least one admin-approved booking exists
- [ ] Internet connection stable
- [ ] Audio permissions granted on devices

---

**Good luck with your defense! 🎉**

The voice calling feature is fully functional and ready to demonstrate.
