# Analytics Dashboard Implementation Guide

## Overview
Complete analytics dashboard with charts, heat maps, and business intelligence features for admin and provider dashboards.

## Components Created

### 1. RevenueOverviewCard.tsx
- Shows current month revenue
- Percentage change from last month
- Weekly change indicator
- Green/red arrows for positive/negative trends

### 2. RevenueTrendChart.tsx
- 30-day revenue line chart using Recharts
- Area chart with gradient fill
- Interactive tooltips
- Responsive design

### 3. TopServicesChart.tsx
- Horizontal bar chart showing most popular services
- Color-coded bars
- Job count display
- Legend with service breakdown

### 4. ProviderLeaderboard.tsx
- Top 5 providers table
- Medal emojis (🥇🥈🥉) for top 3
- Shows rating, jobs completed, earnings
- Provider photos/avatars
- Sortable by performance

### 5. KeyMetricsGrid.tsx
- 3-column grid of key metrics
- Total jobs with percentage change
- Active users (clients + providers)
- Average response time
- Icon indicators

### 6. BookingHeatMap.tsx
- Interactive Leaflet map
- Heat map overlay showing booking density
- Color gradient: Blue (low) → Yellow → Red (high)
- Markers for high-demand areas
- Legend for density levels
- Based on actual booking coordinates

## Installation

Already installed:
```bash
npm install recharts leaflet react-leaflet leaflet.heat @types/leaflet @types/leaflet.heat
```

## Data Structure

### For Heat Map:
```typescript
interface BookingLocation {
  lat: number;
  lng: number;
  intensity: number; // 0.0 to 1.0
}
```

### For Revenue Trend:
```typescript
interface RevenueData {
  date: string; // "Jan 1", "Jan 2", etc.
  revenue: number;
}
```

### For Top Services:
```typescript
interface ServiceData {
  service: string; // "Plumbing", "Electrical", etc.
  count: number;
}
```

### For Provider Leaderboard:
```typescript
interface Provider {
  id: string;
  name: string;
  rating: number;
  jobsCompleted: number;
  earnings: number;
  photoURL?: string;
}
```

## Usage in Admin Analytics Page

```typescript
import RevenueOverviewCard from '@/components/analytics/RevenueOverviewCard';
import RevenueTrendChart from '@/components/analytics/RevenueTrendChart';
import TopServicesChart from '@/components/analytics/TopServicesChart';
import ProviderLeaderboard from '@/components/analytics/ProviderLeaderboard';
import KeyMetricsGrid from '@/components/analytics/KeyMetricsGrid';
import BookingHeatMap from '@/components/analytics/BookingHeatMap';

// In your component:
<div className="space-y-6">
  {/* Revenue Overview */}
  <RevenueOverviewCard
    currentRevenue={45000}
    percentageChange={25}
    weeklyChange={-5}
  />

  {/* Key Metrics */}
  <KeyMetricsGrid
    totalJobs={140}
    jobsChange={12}
    activeClients={85}
    activeProviders={42}
    avgResponseTime={15}
    responseTimeChange={3}
  />

  {/* Charts Row */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <RevenueTrendChart data={revenueData} />
    <TopServicesChart data={servicesData} />
  </div>

  {/* Heat Map */}
  <BookingHeatMap bookings={bookingLocations} />

  {/* Provider Leaderboard */}
  <ProviderLeaderboard providers={topProviders} />
</div>
```

## Data Fetching Example

```typescript
// Fetch revenue trend data
const getRevenueTrendData = async () => {
  const bookingsRef = collection(db, 'bookings');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const q = query(
    bookingsRef,
    where('status', '==', 'completed'),
    where('completedAt', '>=', thirtyDaysAgo)
  );
  
  const snapshot = await getDocs(q);
  const dailyRevenue: { [key: string]: number } = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const date = data.completedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyRevenue[date] = (dailyRevenue[date] || 0) + (data.finalAmount || 0);
  });
  
  return Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue }));
};

// Fetch top services
const getTopServices = async () => {
  const bookingsRef = collection(db, 'bookings');
  const q = query(bookingsRef, where('status', '==', 'completed'));
  const snapshot = await getDocs(q);
  
  const serviceCounts: { [key: string]: number } = {};
  snapshot.forEach(doc => {
    const service = doc.data().serviceType || 'Other';
    serviceCounts[service] = (serviceCounts[service] || 0) + 1;
  });
  
  return Object.entries(serviceCounts)
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

// Fetch booking locations for heat map
const getBookingLocations = async () => {
  const bookingsRef = collection(db, 'bookings');
  const snapshot = await getDocs(bookingsRef);
  
  const locations: BookingLocation[] = [];
  const locationCounts: { [key: string]: number } = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.clientLocation?.latitude && data.clientLocation?.longitude) {
      const key = `${data.clientLocation.latitude},${data.clientLocation.longitude}`;
      locationCounts[key] = (locationCounts[key] || 0) + 1;
    }
  });
  
  // Normalize intensity (0-1 scale)
  const maxCount = Math.max(...Object.values(locationCounts));
  Object.entries(locationCounts).forEach(([key, count]) => {
    const [lat, lng] = key.split(',').map(Number);
    locations.push({
      lat,
      lng,
      intensity: count / maxCount
    });
  });
  
  return locations;
};

// Fetch top providers
const getTopProviders = async () => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'PROVIDER'));
  const snapshot = await getDocs(q);
  
  const providers: Provider[] = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.completedJobs > 0) {
      providers.push({
        id: doc.id,
        name: `${data.firstName} ${data.lastName}`,
        rating: data.rating || 0,
        jobsCompleted: data.completedJobs || 0,
        earnings: data.totalEarnings || 0,
        photoURL: data.photoURL
      });
    }
  });
  
  return providers
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);
};
```

## For Provider Dashboard

Create similar components but with personal stats:
- Personal earnings card
- Personal performance stats
- Earnings trend (personal)
- Peak hours insight
- Service breakdown pie chart

## Next Steps

1. Update `/web/src/app/admin/analytics/page.tsx` to use new components
2. Create `/web/src/app/provider/analytics/page.tsx` for provider analytics
3. Add real-time data fetching with Firestore listeners
4. Test heat map with actual booking coordinates
5. Add export functionality (PDF/CSV)

## Visual Impact for Defense

When presenting to panelists:
1. Show revenue trend going up (impressive!)
2. Show heat map with red areas (high demand visualization)
3. Show provider leaderboard (gamification working!)
4. Show key metrics with green arrows (growth!)
5. Explain business insights from data

This will make your project look professional and business-ready!
