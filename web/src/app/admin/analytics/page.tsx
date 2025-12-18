'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { 
  Users, Briefcase, TrendingUp, Star, AlertCircle, CheckCircle, Clock, Ban, 
  PlayCircle, XCircle, DollarSign, ChevronRight, BarChart3, RefreshCw, Wallet,
  Target,
} from 'lucide-react';

interface Analytics {
  totalProviders: number;
  activeProviders: number;
  pendingProviders: number;
  suspendedProviders: number;
  totalClients: number;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  inProgressJobs: number;
  cancelledJobs: number;
  awaitingApproval: number;
  totalRevenue: number;
  totalSystemFee: number;
  providerEarnings: number;
  avgJobValue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  todayJobs: number;
  weekJobs: number;
  monthJobs: number;
  completionRate: number;
  avgRating: number;
  totalReviews: number;
}


export default function AnalyticsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [analytics, setAnalytics] = useState<Analytics>({
    totalProviders: 0, activeProviders: 0, pendingProviders: 0, suspendedProviders: 0, totalClients: 0,
    totalJobs: 0, completedJobs: 0, pendingJobs: 0, inProgressJobs: 0, cancelledJobs: 0, awaitingApproval: 0,
    totalRevenue: 0, totalSystemFee: 0, providerEarnings: 0, avgJobValue: 0,
    todayRevenue: 0, weekRevenue: 0, monthRevenue: 0, todayJobs: 0, weekJobs: 0, monthJobs: 0,
    completionRate: 0, avgRating: 0, totalReviews: 0,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (user?.role?.toUpperCase() !== 'ADMIN') router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role?.toUpperCase() !== 'ADMIN') return;

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      let totalProviders = 0, activeProviders = 0, pendingProviders = 0, suspendedProviders = 0, totalClients = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role === 'PROVIDER') {
          totalProviders++;
          if (data.providerStatus === 'approved' || data.status === 'approved') activeProviders++;
          else if (data.providerStatus === 'pending' || data.status === 'pending') pendingProviders++;
          else if (data.providerStatus === 'suspended' || data.status === 'suspended') suspendedProviders++;
        } else if (data.role === 'CLIENT') totalClients++;
      });
      setAnalytics(prev => ({ ...prev, totalProviders, activeProviders, pendingProviders, suspendedProviders, totalClients }));
    });

    const unsubscribeJobs = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(todayStart); monthStart.setMonth(monthStart.getMonth() - 1);

      let totalJobs = 0, completedJobs = 0, pendingJobs = 0, inProgressJobs = 0, cancelledJobs = 0, awaitingApproval = 0;
      let totalRevenue = 0, totalSystemFee = 0, providerEarnings = 0;
      let todayRevenue = 0, weekRevenue = 0, monthRevenue = 0, todayJobs = 0, weekJobs = 0, monthJobs = 0;
      let totalRating = 0, totalReviews = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        totalJobs++;
        if (!data.adminApproved && data.status !== 'cancelled') awaitingApproval++;

        const isCompleted = data.status === 'completed';
        const isPayFirstConfirmed = data.status === 'payment_received' && data.isPaidUpfront === true;

        if (isCompleted || isPayFirstConfirmed) {
          completedJobs++;
          let amount = data.finalAmount;
          if (!amount) {
            const baseAmount = data.totalAmount || data.fixedPrice || data.price || 0;
            const approvedAdditionalCharges = (data.additionalCharges || []).filter((c: { status: string }) => c.status === 'approved').reduce((sum: number, c: { total?: number; amount?: number }) => sum + (c.total || c.amount || 0), 0);
            amount = baseAmount + approvedAdditionalCharges;
          }
          totalRevenue += amount;
          const systemFee = data.systemFee || (amount * 0.05);
          totalSystemFee += systemFee;
          providerEarnings += data.providerEarnings || (amount - systemFee);

          const earningDate = isPayFirstConfirmed ? (data.clientConfirmedAt?.toDate?.() || data.updatedAt?.toDate?.() || new Date()) : (data.completedAt?.toDate?.() || new Date());
          if (earningDate >= todayStart) { todayRevenue += amount; todayJobs++; }
          if (earningDate >= weekStart) { weekRevenue += amount; weekJobs++; }
          if (earningDate >= monthStart) { monthRevenue += amount; monthJobs++; }
          if (data.rating) { totalRating += data.rating; totalReviews++; }
        } else if (['pending', 'pending_negotiation', 'counter_offer'].includes(data.status)) pendingJobs++;
        else if (['in_progress', 'accepted'].includes(data.status)) inProgressJobs++;
        else if (['cancelled', 'rejected'].includes(data.status)) cancelledJobs++;
      });

      const finishedJobs = completedJobs + cancelledJobs;
      setAnalytics(prev => ({
        ...prev, totalJobs, completedJobs, pendingJobs, inProgressJobs, cancelledJobs, awaitingApproval,
        totalRevenue, totalSystemFee, providerEarnings, avgJobValue: completedJobs > 0 ? totalRevenue / completedJobs : 0,
        todayRevenue, weekRevenue, monthRevenue, todayJobs, weekJobs, monthJobs,
        completionRate: finishedJobs > 0 ? (completedJobs / finishedJobs) * 100 : 0,
        avgRating: totalReviews > 0 ? totalRating / totalReviews : 0, totalReviews,
      }));
      setLoadingData(false);
      setRefreshing(false);
    });

    return () => { unsubscribeUsers(); unsubscribeJobs(); };
  }, [user]);


  const getPeriodData = () => {
    switch (selectedPeriod) {
      case 'today': return { revenue: analytics.todayRevenue, jobs: analytics.todayJobs, label: 'Today', systemFee: analytics.todayRevenue * 0.05 };
      case 'week': return { revenue: analytics.weekRevenue, jobs: analytics.weekJobs, label: 'This Week', systemFee: analytics.weekRevenue * 0.05 };
      case 'month': return { revenue: analytics.monthRevenue, jobs: analytics.monthJobs, label: 'This Month', systemFee: analytics.monthRevenue * 0.05 };
      default: return { revenue: analytics.totalRevenue, jobs: analytics.completedJobs, label: 'All Time', systemFee: analytics.totalSystemFee };
    }
  };

  const formatCurrency = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const periodData = getPeriodData();

  if (isLoading || loadingData) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-purple-200 font-medium">Loading analytics...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-purple-200 text-sm font-medium">Platform</p>
                  <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setRefreshing(true)} disabled={refreshing}
                  className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/25 transition-all disabled:opacity-50 shadow-lg">
                  <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 backdrop-blur-sm rounded-xl">
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-emerald-200 text-sm font-semibold">Live</span>
                </div>
              </div>
            </div>

            {/* Period Filter */}
            <div className="flex gap-2 mb-6">
              {(['all', 'today', 'week', 'month'] as const).map((period) => (
                <button key={period} onClick={() => setSelectedPeriod(period)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    selectedPeriod === period
                      ? 'bg-white text-violet-600 shadow-lg'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}>
                  {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>

            {/* Revenue Card in Header */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-purple-200" />
                    <span className="text-purple-200 text-sm font-medium">{periodData.label} Revenue</span>
                  </div>
                  <p className="text-5xl font-bold text-white tracking-tight">{formatCurrency(periodData.revenue)}</p>
                  <p className="text-purple-200 text-sm mt-2">From {periodData.jobs} completed jobs</p>
                </div>
                <div className="text-right">
                  <div className="bg-white/10 rounded-2xl p-4">
                    <p className="text-purple-200 text-xs font-medium mb-1">Avg Job Value</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(analytics.avgJobValue)}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-purple-200 text-xs font-medium mb-1">Today</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(analytics.todayRevenue)}</p>
                  <p className="text-emerald-300 text-xs mt-1">{analytics.todayJobs} jobs</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-purple-200 text-xs font-medium mb-1">This Week</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(analytics.weekRevenue)}</p>
                  <p className="text-emerald-300 text-xs mt-1">{analytics.weekJobs} jobs</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-purple-200 text-xs font-medium mb-1">This Month</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(analytics.monthRevenue)}</p>
                  <p className="text-emerald-300 text-xs mt-1">{analytics.monthJobs} jobs</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Awaiting Approval Alert */}
          {analytics.awaitingApproval > 0 && (
            <button onClick={() => router.push('/admin/jobs')}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 mb-6 flex items-center gap-4 hover:shadow-xl hover:scale-[1.01] transition-all shadow-lg shadow-amber-500/20 text-left">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-lg">{analytics.awaitingApproval} Jobs Awaiting Approval</p>
                <p className="text-amber-100">Tap to review pending requests</p>
              </div>
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* System Fee Earnings Card */}
          <button onClick={() => router.push('/admin/earnings')}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-6 mb-6 text-left hover:shadow-2xl hover:scale-[1.01] transition-all shadow-xl shadow-amber-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Wallet className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">System Fee Earnings (5%)</h3>
                  <p className="text-amber-100">Your platform commission</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
                <p className="text-amber-100 text-sm font-medium mb-1">Total System Fee</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(analytics.totalSystemFee)}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
                <p className="text-amber-100 text-sm font-medium mb-1">Provider Earnings</p>
                <p className="text-3xl font-bold text-emerald-300">{formatCurrency(analytics.providerEarnings)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-center gap-2">
              <DollarSign className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">Tap to withdraw your earnings</span>
            </div>
          </button>

          {/* Users Overview */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" /> Users Overview
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30 mb-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalProviders}</p>
                <p className="text-gray-500 text-sm font-medium">Total Providers</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-3">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.activeProviders}</p>
                <p className="text-gray-500 text-sm font-medium">Active</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30 mb-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.pendingProviders}</p>
                <p className="text-gray-500 text-sm font-medium">Pending</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30 mb-3">
                  <Ban className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.suspendedProviders}</p>
                <p className="text-gray-500 text-sm font-medium">Suspended</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalClients}</p>
                <p className="text-gray-500 text-sm font-medium">Clients</p>
              </div>
            </div>
          </div>

          {/* Jobs Overview */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-violet-500" /> Jobs Overview
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30 mb-3">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalJobs}</p>
                <p className="text-gray-500 text-sm font-medium">Total Jobs</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-3">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.completedJobs}</p>
                <p className="text-gray-500 text-sm font-medium">Completed</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30 mb-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.pendingJobs}</p>
                <p className="text-gray-500 text-sm font-medium">Pending</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3">
                  <PlayCircle className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.inProgressJobs}</p>
                <p className="text-gray-500 text-sm font-medium">In Progress</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30 mb-3">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.cancelledJobs}</p>
                <p className="text-gray-500 text-sm font-medium">Cancelled</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/30 mb-3">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.awaitingApproval}</p>
                <p className="text-gray-500 text-sm font-medium">Awaiting Approval</p>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Completion Rate */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Completion Rate</h3>
                  <p className="text-gray-500 text-sm">Job success ratio</p>
                </div>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <p className="text-4xl font-bold text-gray-900">{analytics.completionRate.toFixed(1)}%</p>
                <span className="text-emerald-500 text-sm font-semibold mb-1">
                  {analytics.completionRate >= 80 ? '● Excellent' : analytics.completionRate >= 60 ? '● Good' : '● Needs Improvement'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all" 
                  style={{ width: `${Math.min(analytics.completionRate, 100)}%` }} />
              </div>
            </div>

            {/* Average Rating */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Average Rating</h3>
                  <p className="text-gray-500 text-sm">From {analytics.totalReviews} reviews</p>
                </div>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <p className="text-4xl font-bold text-gray-900">{analytics.avgRating.toFixed(1)}</p>
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`w-5 h-5 ${star <= Math.round(analytics.avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                  ))}
                </div>
              </div>
              <p className="text-gray-500 text-sm">
                {analytics.avgRating >= 4.5 ? '⭐ Outstanding service quality' : 
                 analytics.avgRating >= 4 ? '👍 Great customer satisfaction' : 
                 analytics.avgRating >= 3 ? '📈 Room for improvement' : 'Needs attention'}
              </p>
            </div>

            {/* Platform Growth */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Platform Growth</h3>
                  <p className="text-gray-500 text-sm">Total users & jobs</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Total Users</span>
                  <span className="font-bold text-gray-900">{analytics.totalProviders + analytics.totalClients}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Total Jobs</span>
                  <span className="font-bold text-gray-900">{analytics.totalJobs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Total Revenue</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(analytics.totalRevenue)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
