# Environment Variables for Deployment

## ✅ What You Need to Update

Yes, you need to add the Agora environment variables to both Render (backend) and Vercel (web frontend).

---

## 🌐 Vercel (Web Frontend)

### Where to Add:
1. Go to your Vercel project dashboard
2. Click on "Settings"
3. Click on "Environment Variables"
4. Add the following variable:

### Variable to Add:
```
NEXT_PUBLIC_AGORA_APP_ID=dfed04451174410bb13b5dcee9bfcb8a
```

**Important**: 
- The variable name MUST start with `NEXT_PUBLIC_` to be accessible in the browser
- After adding, you need to redeploy your app for changes to take effect

### How to Redeploy:
1. Go to "Deployments" tab
2. Click the three dots on the latest deployment
3. Click "Redeploy"
4. Or just push a new commit to trigger automatic deployment

---

## 🖥️ Render (Backend)

### Where to Add:
1. Go to your Render dashboard
2. Select your backend service
3. Click on "Environment"
4. Add the following variables:

### Variables to Add:
```
AGORA_APP_ID=dfed04451174410bb13b5dcee9bfcb8a
AGORA_APP_CERTIFICATE=22887f8618be4f549a5099a9a609892e
```

**Important**:
- These are server-side only (not exposed to browser)
- Render will automatically redeploy after you save the environment variables

---

## 📋 Complete Environment Variables Checklist

### Vercel (Web):
- [x] NEXT_PUBLIC_FIREBASE_API_KEY
- [x] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- [x] NEXT_PUBLIC_FIREBASE_PROJECT_ID
- [x] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- [x] NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- [x] NEXT_PUBLIC_FIREBASE_APP_ID
- [x] NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
- [x] NEXT_PUBLIC_API_URL
- [x] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
- [x] NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
- [x] NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
- [x] NEXT_PUBLIC_EMAILJS_SERVICE_ID
- [x] NEXT_PUBLIC_EMAILJS_OTP_TEMPLATE_ID
- [x] NEXT_PUBLIC_EMAILJS_NOTIFICATION_TEMPLATE_ID
- [x] NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
- [x] NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY
- [x] NEXT_PUBLIC_APP_URL
- [x] NEXT_PUBLIC_FIREBASE_VAPID_KEY
- [ ] **NEXT_PUBLIC_AGORA_APP_ID** ← ADD THIS

### Render (Backend):
- [x] PORT
- [x] NODE_ENV
- [x] FIREBASE_PROJECT_ID
- [x] FIREBASE_CLIENT_EMAIL
- [x] FIREBASE_PRIVATE_KEY
- [x] PAYMONGO_PUBLIC_KEY
- [x] PAYMONGO_SECRET_KEY
- [x] PAYMONGO_WEBHOOK_SECRET
- [x] FRONTEND_URL
- [x] RESEND_API_KEY
- [x] FROM_EMAIL
- [ ] **AGORA_APP_ID** ← ADD THIS
- [ ] **AGORA_APP_CERTIFICATE** ← ADD THIS

---

## 🔒 Security Notes

### Public vs Private Variables:

**Public (NEXT_PUBLIC_):**
- Exposed to browser
- Anyone can see these in the browser console
- Only use for non-sensitive data
- Example: `NEXT_PUBLIC_AGORA_APP_ID` (safe to expose)

**Private (Backend only):**
- Never exposed to browser
- Only accessible on server
- Use for sensitive data
- Example: `AGORA_APP_CERTIFICATE` (must stay secret)

### Why Agora App ID is Public:
- The App ID is needed in the browser to connect to Agora
- It's not sensitive - it just identifies your Agora project
- The App Certificate stays on the backend and is used to generate secure tokens
- Tokens expire after 24 hours, so even if someone gets a token, it's temporary

---

## 🚀 Deployment Steps

### Step 1: Add to Vercel
```bash
1. Go to https://vercel.com/dashboard
2. Select your project (gss-maasin-app)
3. Settings → Environment Variables
4. Add: NEXT_PUBLIC_AGORA_APP_ID = dfed04451174410bb13b5dcee9bfcb8a
5. Click "Save"
6. Go to Deployments → Redeploy latest
```

### Step 2: Add to Render
```bash
1. Go to https://dashboard.render.com
2. Select your backend service
3. Environment → Add Environment Variable
4. Add: AGORA_APP_ID = dfed04451174410bb13b5dcee9bfcb8a
5. Add: AGORA_APP_CERTIFICATE = 22887f8618be4f549a5099a9a609892e
6. Click "Save Changes" (auto-redeploys)
```

### Step 3: Verify
```bash
1. Wait for deployments to complete (2-5 minutes)
2. Open your web app
3. Try to make a voice call
4. Check browser console for errors
5. If you see "Failed to get token", check backend logs
```

---

## 🐛 Troubleshooting

### Error: "AGORA_APP_ID is not defined"
**Solution**: Make sure you added the variable to Vercel/Render and redeployed

### Error: "Failed to get token"
**Solution**: Check that backend has both AGORA_APP_ID and AGORA_APP_CERTIFICATE

### Error: "window is not defined"
**Solution**: Already fixed in the code - Agora SDK now loads client-side only

### Call button doesn't appear
**Solution**: Make sure booking is admin approved (`adminApproved: true`)

### Call connects but no audio
**Solution**: 
1. Check browser microphone permissions
2. Check device volume
3. Try in a different browser (Chrome recommended)

---

## 📱 Mobile App (React Native)

For the mobile app, the Agora App ID is hardcoded in the component:
```javascript
// src/components/common/VoiceCall.jsx
const engine = await RtcEngine.create('dfed04451174410bb13b5dcee9bfcb8a');
```

You can also use environment variables:
```javascript
// .env
AGORA_APP_ID=dfed04451174410bb13b5dcee9bfcb8a

// In code
const engine = await RtcEngine.create(process.env.AGORA_APP_ID);
```

---

## ✅ Final Checklist

Before going live:
- [ ] Added NEXT_PUBLIC_AGORA_APP_ID to Vercel
- [ ] Added AGORA_APP_ID to Render
- [ ] Added AGORA_APP_CERTIFICATE to Render
- [ ] Redeployed Vercel (web)
- [ ] Verified Render redeployed (backend)
- [ ] Tested voice call on production
- [ ] Checked browser console for errors
- [ ] Tested on mobile device
- [ ] Verified call duration tracking
- [ ] Tested with poor network connection

---

## 💰 Cost Reminder

- **FREE**: 10,000 minutes/month
- **Paid**: $0.99 per 1,000 minutes after free tier
- Monitor usage in Agora dashboard: https://console.agora.io

---

**Status**: Ready to deploy once environment variables are added!
