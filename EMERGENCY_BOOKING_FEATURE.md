# 🚨 Emergency/Urgent Booking Feature Specification

## Overview
Emergency booking allows clients to get faster service response by paying an additional 30% urgency fee. Providers are incentivized to respond quickly, and the platform earns 10% commission on emergency bookings.

---

## 💰 Pricing Structure (Option A)

### Formula:
```javascript
Base Price:              ₱500
Emergency Fee (30%):     ₱150
─────────────────────────────
Subtotal:                ₱650
Platform Fee (10%):      ₱65
─────────────────────────────
Total Client Pays:       ₱715

Provider Receives:       ₱650 (includes ₱150 emergency bonus)
Platform Receives:       ₱65 (10% of ₱650)
```

### Calculation Code:
```javascript
const calculateEmergencyBooking = (basePrice) => {
  const emergencyFeeRate = 0.30; // 30%
  const platformFeeRate = 0.10; // 10%
  
  const emergencyFee = basePrice * emergencyFeeRate;
  const subtotal = basePrice + emergencyFee;
  const platformFee = subtotal * platformFeeRate;
  const totalAmount = subtotal + platformFee;
  
  const providerShare = subtotal;
  const platformShare = platformFee;
  
  return {
    basePrice,           // ₱500
    emergencyFee,        // ₱150
    subtotal,            // ₱650
    platformFee,         // ₱65
    totalAmount,         // ₱715
    providerShare,       // ₱650
    platformShare,       // ₱65
  };
};
```

### Examples:

| Base Price | Emergency Fee (30%) | Subtotal | Platform Fee (10%) | Total Client Pays | Provider Gets | Platform Gets |
|------------|---------------------|----------|-------------------|-------------------|---------------|---------------|
| ₱300       | ₱90                 | ₱390     | ₱39               | ₱429              | ₱390          | ₱39           |
| ₱500       | ₱150                | ₱650     | ₱65               | ₱715              | ₱650          | ₱65           |
| ₱1,000     | ₱300                | ₱1,300   | ₱130              | ₱1,430            | ₱1,300        | ₱130          |
| ₱2,000     | ₱600                | ₱2,600   | ₱260              | ₱2,860            | ₱2,600        | ₱260          |

---

## 🎯 Feature Requirements

### 1. Client Side

#### Booking Screen
- Toggle switch: "🚨 Emergency Booking"
- Show price comparison:
  ```
  ┌─────────────────────────────────┐
  │  📅 Standard Booking            │
  │  ₱525 • Response within 24hrs   │
  └─────────────────────────────────┘
  
  ┌─────────────────────────────────┐
  │  🚨 URGENT Booking              │
  │  ₱715 • Response within 30min   │
  │  +₱150 emergency fee            │
  │  +₱65 platform fee              │
  └─────────────────────────────────┘
  ```

#### Price Breakdown Display
```
Base Service:        ₱500
Emergency Fee:       ₱150
Platform Fee:        ₱65
─────────────────────────
Total:               ₱715

✓ Provider gets ₱650 (includes emergency bonus)
✓ Guaranteed response within 30 minutes
✓ Priority notification to all providers
```

#### After Booking
- Show countdown: "⏰ Waiting for provider response... 29:45 remaining"
- Real-time updates when providers view/accept
- Auto-convert to standard if no response in 30 min (refund emergency fee)

### 2. Provider Side

#### Notification
```
🚨 URGENT JOB AVAILABLE!

Electrician Service Needed
📍 Brgy. Abgao (2.3 km away)
💰 ₱650 (includes ₱150 emergency bonus)
⏰ Respond within 30 minutes

[ACCEPT NOW] [DECLINE]
```

#### Features:
- Loud notification sound (different from standard)
- Full-screen alert (can't be dismissed easily)
- Shows distance and estimated travel time
- Highlights emergency bonus amount
- Shows countdown timer

#### Job List
- Emergency jobs appear at the top
- Red/orange highlight
- "🚨 URGENT" badge
- Countdown timer visible

### 3. Admin Side

#### Jobs List
- Emergency bookings have special indicator
- Filter: "Emergency Bookings"
- Shows response time
- Auto-approved (skip manual approval)

#### Analytics
- Track emergency booking conversion rate
- Average response time for emergency bookings
- Revenue from emergency fees
- Provider acceptance rate for urgent jobs

---

## 🔧 Technical Implementation

### Database Schema

#### Firestore `bookings` collection:
```javascript
{
  // Existing fields...
  isEmergency: boolean,
  emergencyFee: number,
  emergencyDeadline: timestamp, // 30 min from creation
  emergencyResponseTime: number, // seconds until accepted
  emergencyStatus: 'pending' | 'accepted' | 'expired' | 'converted',
  
  // Pricing breakdown
  basePrice: 500,
  emergencyFee: 150,
  subtotal: 650,
  platformFee: 65,
  totalAmount: 715,
  providerShare: 650,
  platformShare: 65,
  
  // Standard fields
  systemFeePercentage: 10, // 10% for emergency
  createdAt: timestamp,
  acceptedAt: timestamp,
}
```

### Backend Routes

#### Create Emergency Booking
```javascript
// POST /api/bookings/emergency
router.post('/emergency', async (req, res) => {
  const { basePrice, ...bookingData } = req.body;
  
  // Calculate emergency pricing
  const pricing = calculateEmergencyBooking(basePrice);
  
  // Create booking
  const booking = await db.collection('bookings').add({
    ...bookingData,
    isEmergency: true,
    ...pricing,
    emergencyDeadline: new Date(Date.now() + 30 * 60 * 1000), // 30 min
    emergencyStatus: 'pending',
    status: 'pending', // Auto-approved
    adminApproved: true, // Skip admin approval
    createdAt: new Date(),
  });
  
  // Broadcast to all available providers
  await broadcastEmergencyJob(booking.id);
  
  // Start 30-minute timer
  scheduleEmergencyExpiration(booking.id);
  
  return res.json({ success: true, bookingId: booking.id });
});
```

#### Broadcast to Providers
```javascript
const broadcastEmergencyJob = async (bookingId) => {
  const booking = await getBooking(bookingId);
  
  // Get all available providers in the area
  const providers = await db.collection('users')
    .where('role', '==', 'PROVIDER')
    .where('isOnline', '==', true)
    .where('serviceCategory', '==', booking.serviceCategory)
    .get();
  
  // Send FCM push notification to all
  const notifications = providers.docs.map(provider => {
    return sendPushNotification(provider.id, {
      title: '🚨 URGENT JOB AVAILABLE!',
      body: `${booking.serviceCategory} - ₱${booking.providerShare} (includes emergency bonus)`,
      data: {
        type: 'emergency_job',
        bookingId,
        priority: 'high',
        sound: 'emergency_alert.mp3',
      },
    });
  });
  
  await Promise.all(notifications);
};
```

#### Handle Emergency Expiration
```javascript
const scheduleEmergencyExpiration = (bookingId) => {
  setTimeout(async () => {
    const booking = await getBooking(bookingId);
    
    if (booking.emergencyStatus === 'pending') {
      // No provider accepted within 30 min
      await db.collection('bookings').doc(bookingId).update({
        emergencyStatus: 'expired',
        isEmergency: false,
        // Revert to standard pricing
        totalAmount: booking.basePrice * 1.05,
        platformFee: booking.basePrice * 0.05,
        systemFeePercentage: 5,
      });
      
      // Refund emergency fee to client
      await refundEmergencyFee(booking.clientId, booking.emergencyFee);
      
      // Notify client
      await sendPushNotification(booking.clientId, {
        title: 'Booking Converted to Standard',
        body: 'No urgent response available. Your booking is now standard priority. Emergency fee refunded.',
      });
    }
  }, 30 * 60 * 1000); // 30 minutes
};
```

### Frontend Components

#### Emergency Toggle Component
```jsx
// src/components/booking/EmergencyToggle.jsx
const EmergencyToggle = ({ basePrice, isEmergency, onToggle }) => {
  const pricing = calculateEmergencyBooking(basePrice);
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.option, !isEmergency && styles.selected]}
        onPress={() => onToggle(false)}
      >
        <Icon name="calendar" size={24} color="#3B82F6" />
        <Text style={styles.title}>Standard Booking</Text>
        <Text style={styles.price}>₱{(basePrice * 1.05).toFixed(2)}</Text>
        <Text style={styles.subtitle}>Response within 24hrs</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.option, isEmergency && styles.selected, styles.emergency]}
        onPress={() => onToggle(true)}
      >
        <Icon name="alert-circle" size={24} color="#EF4444" />
        <Text style={styles.title}>🚨 URGENT Booking</Text>
        <Text style={styles.price}>₱{pricing.totalAmount.toFixed(2)}</Text>
        <Text style={styles.subtitle}>Response within 30min</Text>
        <Text style={styles.bonus}>+₱{pricing.emergencyFee} emergency fee</Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## 📊 Analytics & Metrics

### Track:
1. Emergency booking conversion rate
2. Average provider response time
3. Emergency booking acceptance rate
4. Revenue from emergency fees
5. Client satisfaction with emergency service
6. Provider earnings from emergency jobs

### Reports:
- Daily emergency booking volume
- Peak emergency booking hours
- Most common emergency service types
- Provider performance on urgent jobs

---

## 🎨 UI/UX Design

### Colors:
- Emergency: `#EF4444` (Red)
- Warning: `#F59E0B` (Amber)
- Success: `#10B981` (Green)
- Urgent Badge: Red with pulse animation

### Sounds:
- Emergency notification: Loud, urgent tone
- Standard notification: Normal tone
- Acceptance: Success chime

### Animations:
- Pulse effect on emergency badge
- Countdown timer with color change (green → yellow → red)
- Confetti when provider accepts urgent job

---

## ✅ Testing Checklist

- [ ] Emergency pricing calculation correct
- [ ] 30-minute timer works
- [ ] Broadcast notification to all providers
- [ ] First provider to accept gets the job
- [ ] Other providers notified when job is taken
- [ ] Auto-convert to standard after 30 min
- [ ] Emergency fee refund works
- [ ] Provider receives correct amount (₱650)
- [ ] Platform receives correct fee (₱65)
- [ ] Emergency jobs skip admin approval
- [ ] Emergency jobs appear at top of list
- [ ] Analytics tracking works

---

## 🚀 Deployment Plan

### Phase 1: Backend (Week 1)
- Implement emergency pricing calculation
- Create emergency booking endpoints
- Set up broadcast notification system
- Implement 30-minute expiration logic

### Phase 2: Mobile App (Week 2)
- Add emergency toggle to booking screen
- Implement emergency notification UI
- Add countdown timer
- Test provider acceptance flow

### Phase 3: Web App (Week 3)
- Add emergency toggle to web booking
- Update admin dashboard
- Add emergency analytics

### Phase 4: Testing & Launch (Week 4)
- Beta test with select users
- Monitor performance
- Gather feedback
- Full launch

---

## 💡 Future Enhancements

1. **Dynamic Pricing**: Adjust emergency fee based on demand
2. **Provider Ratings**: Prioritize high-rated providers for urgent jobs
3. **Scheduled Emergency**: Book urgent service for specific time
4. **Emergency Subscription**: Monthly plan for unlimited emergency bookings
5. **Emergency History**: Track client's emergency booking patterns

---

## 📝 Notes

- Emergency bookings are 100% pay-first (no pay-later option)
- Providers can opt-out of emergency notifications in settings
- Emergency jobs have higher priority in provider queue
- Platform monitors for abuse (too many emergency bookings)
- Refund policy: Full emergency fee refund if no response in 30 min

---

**Status**: Ready for Implementation
**Priority**: High
**Estimated Development Time**: 4 weeks
**Expected Revenue Impact**: +15-20% from emergency fees
