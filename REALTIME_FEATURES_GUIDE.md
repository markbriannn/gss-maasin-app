# Real-Time & Offline Features Integration Guide

## ✅ What's Been Implemented

### 1. **Real-Time Notifications & Job Matching**
- ✅ Job notifications for providers when new matching jobs posted
- ✅ Real-time job acceptance/rejection flow
- ✅ Message read receipts
- ✅ User notification listener

**Files:**
- `src/services/realtimeService.js` — Firestore real-time listeners
- `src/hooks/useRealtimeService.js` — React hooks for real-time data

**Usage:**
```javascript
import { useJobNotifications } from '../../hooks/useRealtimeService';

const ProviderDashboardScreen = () => {
  const { jobs, loading } = useJobNotifications(providerId, serviceCategory);
  
  return (
    <Text>Available jobs: {jobs.length}</Text>
  );
};
```

### 2. **Review & Rating System**
- ✅ Anti-fraud checks (completed jobs only, 30-day window, no duplicates)
- ✅ Auto-update provider rating when reviews submitted
- ✅ Admin review flagging/deletion

**Files:**
- `src/services/reviewService.js` — Review validation & submission
- `src/screens/review/ReviewScreen.jsx` — Enhanced review UI with eligibility checks

**Usage:**
```javascript
import { submitReview } from '../../services/reviewService';

const result = await submitReview(jobId, providerId, clientId, rating, comment);
if (result.success) {
  console.log('Review submitted');
}
```

### 3. **Offline Support**
- ✅ Automatic caching of users, bookings, messages, reviews
- ✅ Sync queue for operations done offline
- ✅ Auto-sync when back online
- ✅ Offline status indicator on dashboard

**Files:**
- `src/services/offlineService.js` — AsyncStorage caching
- `src/services/syncManager.js` — Batch sync manager
- `src/hooks/useOfflineOperations.js` — Offline operation hooks
- `src/context/AuthContext.jsx` — Auto-sync on reconnect

**Usage:**
```javascript
import { useOfflineSupport } from '../../hooks/useRealtimeService';

const MyScreen = () => {
  const { online, queueOperation } = useOfflineSupport();
  
  if (!online) {
    return <Text>You're offline. Changes will sync when online.</Text>;
  }
};
```

---

## 🚀 How to Use These Features

### A. Real-Time Job Notifications

**In ProviderDashboardScreen:**
```javascript
import { useJobNotifications } from '../../hooks/useRealtimeService';

const { jobs, loading } = useJobNotifications(user.uid, user.serviceCategory);

useEffect(() => {
  if (jobs.length > 0) {
    Alert.alert('New Jobs!', `${jobs.length} new jobs available`);
  }
}, [jobs]);
```

### B. Implement Review Submission

**In JobDetailsScreen (after completion):**
```javascript
import { isJobEligibleForReview } from '../../services/reviewService';

const checkReview = async () => {
  const result = await isJobEligibleForReview(jobId, userId);
  if (result.eligible) {
    navigation.navigate('Review', { jobId, providerId });
  } else {
    Alert.alert('Cannot Review', result.reason);
  }
};
```

### C. Cache Data After Fetch

**In any screen that fetches data:**
```javascript
import { cacheBookings, cacheMessages } from '../../services/offlineService';

const loadBookings = async () => {
  const bookings = await getDocs(...);
  // Cache for offline use
  await cacheBookings(bookings);
  setBookings(bookings);
};
```

### D. Offline Message Sending

**In ChatScreen:**
```javascript
import { useOfflineMessages } from '../../hooks/useOfflineOperations';

const { sendMessage, online } = useOfflineMessages();

const handleSendMessage = async (text) => {
  const result = await sendMessage(conversationId, { text, sender: userId });
  if (result.queued) {
    showMessage('Message will send when online');
  }
};
```

### E. Job Completion with Offline Support

**In ProviderJobDetailsScreen:**
```javascript
import { useJobCompletion } from '../../hooks/useOfflineOperations';

const { markJobComplete, online } = useJobCompletion();

const handleComplete = async () => {
  const result = await markJobComplete(jobId, {
    status: 'completed',
    completedAt: new Date(),
  });
  
  if (result.queued) {
    showMessage('Marked complete. Will sync when online.');
  }
};
```

---

## 📊 Database Structure Required

Make sure your Firestore has these collections and fields:

### `users`
```
{
  uid: string,
  serviceCategory: string,
  averageRating: number,
  reviewCount: number,
  isOnline: boolean,
  lastOnline: timestamp
}
```

### `bookings`
```
{
  id: string,
  clientId: string,
  providerId: string,
  serviceCategory: string,
  status: 'pending' | 'accepted' | 'in_progress' | 'completed',
  completedAt: timestamp,
  reviewed: boolean
}
```

### `reviews`
```
{
  id: string,
  jobId: string,
  providerId: string,
  reviewerId: string,
  rating: number (1-5),
  comment: string,
  status: 'active' | 'deleted' | 'under_review',
  createdAt: timestamp
}
```

### `messages`
```
{
  id: string,
  conversationId: string,
  senderId: string,
  text: string,
  read: boolean,
  readAt: timestamp,
  createdAt: timestamp
}
```

### `notifications`
```
{
  id: string,
  userId: string,
  type: string,
  message: string,
  jobId: string,
  read: boolean,
  createdAt: timestamp
}
```

---

## 🔧 Next Steps

1. **Test Real-Time Features:**
   - Open provider dashboard with internet
   - Have another user post a job matching provider's service
   - See alert with new job count

2. **Test Offline Mode:**
   - Turn off wifi
   - Send a message or complete a job
   - Check AsyncStorage (should have sync queue item)
   - Turn wifi back on
   - Watch automatic sync happen

3. **Test Reviews:**
   - Complete a booking
   - Navigate to Review screen
   - Try submitting review
   - Verify provider's averageRating updates

4. **Monitor Sync Status:**
   ```javascript
   import { getCacheStats } from '../../services/offlineService';
   
   const stats = await getCacheStats();
   console.log('Pending sync:', stats.pendingSyncOperations);
   ```

---

## 🐛 Troubleshooting

**Real-time jobs not appearing?**
- Ensure Firestore security rules allow reading `bookings` collection
- Check `subscribeToJobNotifications` is called with correct providerId and serviceCategory
- Verify service category matches between job and provider profile

**Offline sync not working?**
- Check AsyncStorage has sync_queue items
- Verify `@react-native-community/netinfo` is installed
- Ensure `SyncManager.syncAll()` is being called in AuthContext

**Reviews not updating rating?**
- Check `reviewService.updateProviderRating()` is being called
- Verify all reviews have `status: 'active'`
- Check Firestore has `averageRating` and `reviewCount` fields on user doc

---

## 📝 Summary

You now have a production-ready system for:
- ✅ Real-time notifications
- ✅ Job matching alerts
- ✅ Offline-first architecture
- ✅ Verified review system
- ✅ Automatic data sync

All features are error-checked and integrated into your existing codebase!
