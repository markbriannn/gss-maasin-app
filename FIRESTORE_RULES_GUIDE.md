# Firestore Security Rules Deployment Guide

## 📋 Overview

The `firestore.rules` file contains comprehensive security rules that protect your Firestore database from unauthorized access and data manipulation.

## 🔐 Rule Summary

### Collections Protected:
- **users** — Role-based access (clients, providers, admins)
- **bookings** — Participants only (client/provider)
- **reviews** — Anti-fraud (verified jobs only, no duplicates)
- **messages** — Conversation participants only
- **conversations** — Participant-based access
- **notifications** — Owner-based access
- **transactions** — User/admin access
- **adminLogs** — Admin-only (immutable audit log)

### Key Security Features:
✅ Users cannot edit other users' data  
✅ Users cannot change their own role  
✅ Users cannot manually edit ratings  
✅ Providers cannot delete their own profile  
✅ Admins have full audit access  
✅ Default-deny for all unmapped paths  
✅ Timestamp verification on creates  

---

## 🚀 Deployment Steps

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Authenticate with Firebase
```bash
firebase login
```
This opens a browser to authenticate with your Google account.

### Step 3: Initialize Firebase (if not already done)
```bash
firebase init firestore
```

### Step 4: Deploy Rules to Production
```bash
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/gss-maasincity/...
Firestore Rules: https://console.firebase.google.com/project/gss-maasincity/firestore/rules
```

### Step 5: Verify Deployment
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `gss-maasincity`
3. Navigate to **Firestore > Rules**
4. Confirm rules are deployed (should show timestamp of deployment)

---

## 🧪 Testing Rules Locally (Optional)

### Start Firestore Emulator
```bash
firebase emulators:start --only firestore
```

### Run Tests
```bash
# In a new terminal
firebase emulators:exec "npm test" --only firestore
```

---

## 📝 Common Issues & Fixes

### Issue: "Permission denied" when reading user profiles
**Cause:** Rules check for `approved: true` on provider profiles  
**Fix:** Ensure providers have `approved: true` in their user document (set by admin)

### Issue: "Missing or insufficient permissions" on booking creation
**Cause:** Client role not set correctly  
**Fix:** Verify `users/{userId}.role == 'CLIENT'` is set

### Issue: Cannot update own messages
**Cause:** Rules only allow updating `read` status  
**Fix:** Don't edit message text after sending (expected behavior)

---

## 🔄 Updating Rules

To update rules in the future:

1. Edit `firestore.rules`
2. Run: `firebase deploy --only firestore:rules`
3. Changes take effect immediately (no cache delay)

---

## 📊 Rule Explanation by Collection

### **users**
```
- Read: Own profile OR Public provider profile (approved) OR Admin
- Create: Own profile during registration
- Update: Own profile (except role, rating, approval status)
- Delete: Admin only
```

### **bookings**
```
- Read: Involved parties (client/provider) OR Admin
- Create: Client only (status: pending)
- Update: Provider accepts/rejects OR Client modifies pending OR Admin
- Delete: Admin only (audit trail)
```

### **reviews**
```
- Read: Active reviews for all OR Admin OR Owner
- Create: Client only (status: active)
- Update: Reviewer can edit, Admin can flag/delete
- Delete: Admin only
```

### **messages**
```
- Read: Conversation participants OR Admin
- Create: Any authenticated user
- Update: Recipient can mark read
- Delete: Admin only
```

### **notifications**
```
- Read: Owner only
- Create: Admin/System
- Update: Owner can mark read
- Delete: Owner can delete
```

---

## ⚠️ Important Notes

1. **Default Deny:** All unmapped paths return `false` (secure by default)
2. **Immutable Logs:** Admin logs cannot be deleted (audit trail)
3. **Timestamp Validation:** Creation timestamps must equal request time (prevents backdating)
4. **Role-Based Access:** Rules check `users/{uid}.role` field on every request
5. **No Client-Side Role Modification:** Rules prevent role changes from clients

---

## 🔍 Verify Your Data Matches Rules

Before deploying, ensure your Firestore documents have these fields:

### users documents
```json
{
  "uid": "...",
  "email": "...",
  "role": "CLIENT" | "PROVIDER" | "ADMIN",
  "approved": true | false,
  "createdAt": timestamp,
  "averageRating": number (optional),
  "reviewCount": number (optional)
}
```

### bookings documents
```json
{
  "clientId": "...",
  "providerId": "..." (optional),
  "status": "pending" | "accepted" | "in_progress" | "completed",
  "amount": number,
  "createdAt": timestamp
}
```

### reviews documents
```json
{
  "jobId": "...",
  "providerId": "...",
  "reviewerId": "...",
  "rating": number,
  "status": "active" | "deleted" | "under_review",
  "createdAt": timestamp
}
```

---

## ✅ Deployment Checklist

Before going to production:

- [ ] Firebase CLI installed and authenticated
- [ ] All user documents have `role` field
- [ ] All provider users have `approved` field
- [ ] Run `firebase deploy --only firestore:rules`
- [ ] Test in Firebase Console (read a user doc, create a booking, etc.)
- [ ] Verify no permission errors in console
- [ ] Document any custom rules for your team

---

## 🆘 Rollback (if needed)

If something breaks, you can revert to previous rules:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Firestore > Rules
3. Click **Edit Rules** and restore previous version
4. Or run: `git checkout HEAD~1 firestore.rules && firebase deploy --only firestore:rules`

---

## 📞 Support

If you encounter issues:
1. Check browser console (DevTools) for exact error
2. Review rule logic for edge cases
3. Test with Firebase Console's "Test Rules" button
4. Check `adminLogs` collection for system errors

**Ready to deploy?** Run:
```bash
firebase deploy --only firestore:rules
```
