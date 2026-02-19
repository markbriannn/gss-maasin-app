'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import { TrendingUp, DollarSign, Briefcase, Star, Clock, Users, Target, Calendar } from 'lucide-react';
import dynamic from 'next/dynamic';

const RevenueTrendChart = dynamic(() => import('@/components/analytics/RevenueTrendChart'), { ssr: false });

interface ProviderAnalytics {
  monthEarnings: number;
  weekEarnings: number;
  todayEarnings: number;
  totalEarnings: number;
  completedJobs: number;
  monthJobs: number;
  weekJobs: number;
  todayJobs: number;
  avgRating: number;
  totalReviews: number;
  completionRate: number;
  avgResponseTime: number;
  repeatClients: number;
  peakDay: string;
  peakTime: string;
}

export default function ProviderAnalyticsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<ProviderAnalytics>({
    monthEarnings: 0, weekEarnings: 0, todayEarnings: 0, totalEarnings: 0,
    completedJobs: 0, monthJobs: 0, weekJobs: 0, todayJobs: 0,
    avgRating: 0, totalReviews: 0, completionRate: 0, avgResponseTime: 0,
    repeatClients: 0, peakDay: 'N/A', peakTime: 'N/A'
  });
  const [loadingData, setLoadingData] = useState(true);
  const [earningsTrend, setEarningsTrend] = useState<Array<{ date: string; revenue: number }>>([]);
  const [dayStats, setDayStats] = useState<{ [key: string]: number }>({});
  const [hourStats, setHourStats] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (user?.role?.toUpperCase() !== 'PROVIDER') router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role?.toUpperCase() !== 'PROVIDER' || !user.uid) return;

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(todayStart);
      monthStart.setMonth(monthStart.getMonth() - 1);
      const thirtyDaysAgo = new Date(todayStart);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let monthEarnings = 0, weekEarnings = 0, todayEarnings = 0, totalEarnings = 0;
      let completedJobs = 0, monthJobs = 0, weekJobs = 0, todayJobs = 0;
      let totalRating = 0, totalReviews = 0, cancelledJobs = 0;
      let totalResponseTime = 0, responseCount = 0;
      const clientSet = new Set<string>();
      const clientCounts: { [key: string]: number } = {};
      const dailyEarnings: { [key: string]: number } = {};
      const dayBookings: { [key: string]: number } = {};
      const hourBookings: { [key: string]: number } = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        const isCompleted = data.status === 'completed';
        const isPayFirstConfirmed = data.status === 'payment_received' && data.isPaidUpfront === true;

        if (isCompleted || isPayFirstConfirmed) {
          completedJobs++;
          const systemFee = data.systemFee || 0;
          const amount = data.finalAmount || data.totalAmount || 0;
          const earnings = data.providerEarnings || (amount - systemFee);
          totalEarnings += earnings;

          const completedDate = isPayFirstConfirmed 
            ? (data.clientConfirmedAt?.toDate?.() || data.updatedAt?.toDate?.() || new Date())
            : (data.completedAt?.toDate?.() || new Date());

          if (completedDate >= todayStart) { todayEarnings += earnings; todayJobs++; }
          if (completedDate >= weekStart) { weekEarnings += earnings; weekJobs++; }
          if (completedDate >= monthStart) { monthEarnings += earnings; monthJobs++; }

          // Trend data
          if (completedDate >= thirtyDaysAgo) {
            const dateKey = completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailyEarnings[dateKey] = (dailyEarnings[dateKey] || 0) + earnings;
          }

          // Day and hour stats
          const dayName = completedDate.toLocaleDateString('en-US', { weekday: 'long' });
          const hour = completedDate.getHours();
          dayBookings[dayName] = (dayBookings[dayName] || 0) + 1;
          hourBookings[hour] = (hourBookings[hour] || 0) + 1;

          // Client tracking
          if (data.clientId) {
            clientSet.add(data.clientId);
            clientCounts[data.clientId] = (clientCounts[data.clientId] || 0) + 1;
          }

          // Rating
          if (data.rating || data.reviewRating) {
            const rating = data.rating || data.reviewRating;
            totalRating += rating;
            totalReviews++;
          }

          // Response time
          if (data.acceptedAt && data.createdAt) {
            const created = data.createdAt.toDate?.() || new Date(data.createdAt);
            const accepted = data.acceptedAt.toDate?.() || new Date(data.acceptedAt);
            const responseMinutes = (accepted.getTime() - created.getTime()) / (1000 * 60);
            totalResponseTime += responseMinutes;
            responseCount++;
          }
        } else if (['cancelled', 'rejected'].includes(data.status)) {
          cancelledJobs++;
        }
      });

      // Calculate metrics
      const repeatClients = Object.values(clientCounts).filter(count => count > 1).length;
      const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;
      const finishedJobs = completedJobs + cancelledJobs;
      const completionRate = finishedJobs > 0 ? (completedJobs / finishedJobs) * 100 : 0;

      // Peak day and time
      const peakDay = Object.entries(dayBookings).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      const peakHour = Object.entries(hourBookings).sort((a, b) => b[1] - a[1])[0]?.[0];
      const peakTime = peakHour ? `${peakHour}:00 - ${parseInt(peakHour) + 1}:00` : 'N/A';

      setAnalytics({
        monthEarnings, weekEarnings, todayEarnings, totalEarnings,
        completedJobs, monthJobs, weekJobs, todayJobs,
        avgRating: totalReviews > 0 ? totalRating / totalReviews : 0,
        totalReviews, completionRate, avgResponseTime, repeatClients,
        peakDay, peakTime
      });

      // Set trend data
      const trendData = Object.entries(dailyEarnings)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEarningsTrend(trendData);

      setDayStats(dayBookings);
      setHourStats(hourBookings);
      setLoadingData(false);
    });

    return () => unsubscribe();
  }, [user]);

  const formatCurrency = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const monthGoal = 15000;
  const goalProgress = (analytics.monthEarnings / monthGoal) * 100;

  if (isLoading || loadingData) {
    return (
      <ProviderLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-purple-200 font-medium">Loading analytics...</p>
          </div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Your Performance Analytics</h1>
            <p className="text-gray-600">Track your earnings, jobs, and performance metrics</p>
          </div>

          {/* Personal Earnings Card */}
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-8 mb-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-8 h-8 text-white" />
              <h2 className="text-2xl font-bold text-white">💵 Your Earnings This Month</h2>
            </div>
            <p className="text-5xl font-bold text-white mb-4">{formatCurrency(analytics.monthEarnings)}</p>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold">
                  {analytics.weekEarnings > 0 && analytics.monthEarnings > analytics.weekEarnings
                    ? `+${(((analytics.weekEarnings / (analytics.monthEarnings - analytics.weekEarnings)) * 100).toFixed(1))}%`
                    : '+0%'} from last week
                </span>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">🎯 Monthly Goal: {formatCurrency(monthGoal)}</span>
                <span className="text-white font-bold">{goalProgress.toFixed(0)}% reached</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-4">
                <div 
                  className="bg-white h-4 rounded-full transition-all"
                  style={{ width: `${Math.min(goalProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Today</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.todayEarnings)}</p>
                </div>
              </div>
              <p className="text-emerald-600 text-sm font-medium">{analytics.todayJobs} jobs</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.weekEarnings)}</p>
                </div>
              </div>
              <p className="text-blue-600 text-sm font-medium">{analytics.weekJobs} jobs</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">All Time</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.totalEarnings)}</p>
                </div>
              </div>
              <p className="text-purple-600 text-sm font-medium">{analytics.completedJobs} jobs</p>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Target className="w-6 h-6 text-emerald-500" /> 📊 Your Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                  <p className="text-gray-500 text-sm">Jobs Completed</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.completedJobs}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-amber-400" />
                  <p className="text-gray-500 text-sm">Average Rating</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.avgRating.toFixed(1)} ⭐</p>
                <p className="text-gray-500 text-xs">{analytics.totalReviews} reviews</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <p className="text-gray-500 text-sm">Response Time</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.avgResponseTime}</p>
                <p className="text-gray-500 text-xs">minutes</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  <p className="text-gray-500 text-sm">Completion Rate</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.completionRate.toFixed(0)}%</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <p className="text-gray-500 text-sm">Repeat Clients</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.repeatClients}</p>
                <p className="text-gray-500 text-xs">
                  {analytics.completedJobs > 0 ? `${((analytics.repeatClients / analytics.completedJobs) * 100).toFixed(0)}%` : '0%'}
                </p>
              </div>
            </div>
          </div>

          {/* Earnings Trend */}
          {earningsTrend.length > 0 && (
            <div className="mb-6">
              <RevenueTrendChart data={earningsTrend} />
            </div>
          )}

          {/* Peak Hours Insight */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-emerald-500" /> ⏰ When You Get Most Bookings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-600 font-semibold mb-3">By Day:</p>
                {Object.entries(dayStats)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([day, count]) => (
                    <div key={day} className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-700">{day}</span>
                        <span className="text-gray-900 font-semibold">{count} jobs</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${(count / Math.max(...Object.values(dayStats))) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
              <div>
                <p className="text-gray-600 font-semibold mb-3">Peak Times:</p>
                <div className="space-y-3">
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <p className="text-emerald-700 font-semibold">Best Day: {analytics.peakDay}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-blue-700 font-semibold">Best Time: {analytics.peakTime}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-purple-700 text-sm">💡 Tip: Stay online during peak hours for more bookings!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
}
