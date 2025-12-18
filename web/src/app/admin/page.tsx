'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { 
  Users, Briefcase, DollarSign, Clock, Map, BarChart3, UserPlus, ClipboardList,
  Zap, CheckCircle, Wallet, ChevronRight, TrendingUp, ArrowUpRight, RefreshCw,
  Shield, Activity, Eye, Sparkles, Crown, Target, Award
} from 'lucide-react';

interface Stats {
  totalProviders: number;
  pendingProviders: number;
  totalClients: number;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  activeJobs: number;
  todayRevenue: number;
  weekRevenue: number;
  totalRevenue: number;
  todaySystemFees: number;
  weekSystemFees: number;
  totalSystemFees: number;
}

interface Activity {
  id: string;
  icon: string;
  color: string;
  message: string;
  time: string;
  type: string;
}

export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalProviders: 0, pendingProviders: 0, totalClients: 0, totalJobs: 0,
    completedJobs: 0, pendingJobs: 0, activeJobs: 0, todayRevenue: 0,
    weekRevenue: 0, totalRevenue: 0, todaySystemFees: 0, weekSystemFees: 0, totalSystemFees: 0,
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (user?.role?.toUpperCase() !== 'ADMIN') router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role?.toUpperCase() === 'ADMIN') {
      fetchStats();
      // Real-time listener for live updates
      const unsubUsers = onSnapshot(collection(db, 'users'), () => fetchStats());
      const unsubBookings = onSnapshot(collection(db, 'bookings'), () => fetchStats());
      return () => { unsubUsers(); unsubBookings(); };
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let totalProviders = 0, pendingProviders = 0, totalClients = 0;
      const pendingProvidersList: { id: string; firstName?: string; lastName?: string; email?: string }[] = [];

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role === 'PROVIDER') {
          totalProviders++;
          if (data.status === 'pending' || data.providerStatus === 'pending' || !data.status) {
            pendingProviders++;
            pendingProvidersList.push({ id: doc.id, ...data });
          }
        } else if (data.role === 'CLIENT') totalClients++;
      });

      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      let totalJobs = 0, completedJobs = 0, pendingJobs = 0, activeJobs = 0;
      let todayRevenue = 0, weekRevenue = 0, totalRevenue = 0;
      let todaySystemFees = 0, weekSystemFees = 0, totalSystemFees = 0;

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const allJobs: { id: string; [key: string]: unknown }[] = [];
      const completedJobsList: { id: string; [key: string]: unknown }[] = [];
      const pendingJobsList: { id: string; [key: string]: unknown }[] = [];

      bookingsSnapshot.forEach((doc) => {
        const data = doc.data();
        const job = { id: doc.id, ...data };
        allJobs.push(job);
        totalJobs++;
        if (data.status === 'completed') { completedJobs++; completedJobsList.push(job); }
        else if (data.status === 'pending') { pendingJobs++; pendingJobsList.push(job); }
        else if (data.status === 'in_progress' || data.status === 'accepted') activeJobs++;
      });

      // Calculate revenue
      completedJobsList.forEach((job) => {
        let amount = job.finalAmount as number;
        if (!amount) {
          const baseAmount = (job.totalAmount || job.amount || job.price || 0) as number;
          const additionalCharges = job.additionalCharges as { status: string; total?: number; amount?: number }[] | undefined;
          const approvedAdditionalCharges = additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.total || c.amount || 0), 0) || 0;
          amount = baseAmount + approvedAdditionalCharges;
        }
        const systemFee = (job.systemFee as number) || (amount * 0.05 / 1.05);
        totalRevenue += amount; totalSystemFees += systemFee;
        
        let completedDate: Date | null = null;
        const completedAt = job.completedAt as { toDate?: () => Date } | string | undefined;
        if (completedAt && typeof completedAt === 'object' && 'toDate' in completedAt) completedDate = completedAt.toDate?.() || null;
        else if (completedAt) completedDate = new Date(completedAt as string);
        
        if (completedDate) {
          if (completedDate >= today) { todayRevenue += amount; todaySystemFees += systemFee; }
          if (completedDate >= weekAgo) { weekRevenue += amount; weekSystemFees += systemFee; }
        }
      });

      // Pay First confirmed jobs
      const payFirstConfirmedJobs = allJobs.filter(j => j.status === 'payment_received' && j.isPaidUpfront === true);
      payFirstConfirmedJobs.forEach((job) => {
        let amount = job.finalAmount as number;
        if (!amount) {
          const baseAmount = (job.totalAmount || job.amount || job.price || 0) as number;
          const additionalCharges = job.additionalCharges as { status: string; total?: number; amount?: number }[] | undefined;
          const approvedAdditionalCharges = additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.total || c.amount || 0), 0) || 0;
          amount = baseAmount + approvedAdditionalCharges;
        }
        const systemFee = (job.systemFee as number) || (amount * 0.05 / 1.05);
        totalRevenue += amount; totalSystemFees += systemFee;
        
        let confirmedDate: Date | null = null;
        const clientConfirmedAt = job.clientConfirmedAt as { toDate?: () => Date } | string | undefined;
        if (clientConfirmedAt && typeof clientConfirmedAt === 'object' && 'toDate' in clientConfirmedAt) confirmedDate = clientConfirmedAt.toDate?.() || null;
        else if (clientConfirmedAt) confirmedDate = new Date(clientConfirmedAt as string);
        
        if (confirmedDate) {
          if (confirmedDate >= today) { todayRevenue += amount; todaySystemFees += systemFee; }
          if (confirmedDate >= weekAgo) { weekRevenue += amount; weekSystemFees += systemFee; }
        }
      });

      setStats({ totalProviders, pendingProviders, totalClients, totalJobs, completedJobs, pendingJobs, activeJobs, todayRevenue, weekRevenue, totalRevenue, todaySystemFees, weekSystemFees, totalSystemFees });

      // Create recent activity
      const activities: Activity[] = [];
      pendingProvidersList.slice(0, 2).forEach(p => {
        activities.push({ id: `provider_${p.id}`, icon: 'person-add', color: '#8B5CF6', message: `New provider: ${p.firstName || ''} ${p.lastName || p.email?.split('@')[0] || 'Unknown'}`, time: 'Pending approval', type: 'provider' });
      });
      completedJobsList.slice(0, 2).forEach(j => {
        const completedAt = j.completedAt as { toDate?: () => Date } | undefined;
        activities.push({ id: `job_${j.id}`, icon: 'checkmark-circle', color: '#10B981', message: `Job ${(j.title as string) || j.id} completed`, time: completedAt?.toDate?.()?.toLocaleDateString() || 'Recently', type: 'completed' });
      });
      pendingJobsList.slice(0, 2).forEach(j => {
        activities.push({ id: `pending_${j.id}`, icon: 'time', color: '#F59E0B', message: `New job request: ${(j.title as string) || (j.category as string) || 'Service'}`, time: 'Needs review', type: 'pending' });
      });
      setRecentActivity(activities.slice(0, 5));
    } catch (error) { console.error('Error fetching stats:', error); }
    finally { setLoadingStats(false); setRefreshing(false); }
  };

  const handleRefresh = () => { setRefreshing(true); fetchStats(); };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'provider': return <UserPlus className="w-5 h-5" />;
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'pending': return <Clock className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  if (isLoading || loadingStats) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-purple-200 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const quickActions = [
    { id: 1, icon: Users, title: 'Providers', subtitle: 'Manage team', color: 'from-violet-500 to-purple-600', path: '/admin/providers', badge: stats.pendingProviders },
    { id: 2, icon: Briefcase, title: 'Jobs', subtitle: 'Review requests', color: 'from-blue-500 to-indigo-600', path: '/admin/jobs', badge: stats.pendingJobs },
    { id: 3, icon: Map, title: 'Live Map', subtitle: 'Track activity', color: 'from-emerald-500 to-teal-600', path: '/admin/map' },
    { id: 4, icon: BarChart3, title: 'Analytics', subtitle: 'View reports', color: 'from-amber-500 to-orange-600', path: '/admin/analytics' },
  ];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        {/* Premium Header with Gradient */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-purple-200 text-sm font-medium">Welcome back,</p>
                  <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleRefresh} disabled={refreshing}
                  className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/25 transition-all disabled:opacity-50 shadow-lg">
                  <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 backdrop-blur-sm rounded-xl">
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-emerald-200 text-sm font-semibold">Live</span>
                </div>
              </div>
            </div>

            {/* Main Revenue Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-purple-200" />
                    <span className="text-purple-200 text-sm font-medium">Today&apos;s Revenue</span>
                  </div>
                  <p className="text-5xl font-bold text-white tracking-tight">
                    ₱{stats.todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-full ${stats.todayRevenue > 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  <span className={`text-sm font-bold ${stats.todayRevenue > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {stats.todayRevenue > 0 ? '● Active' : '○ No sales'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-purple-200 text-xs font-medium mb-1">This Week</p>
                  <p className="text-2xl font-bold text-white">₱{stats.weekRevenue.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 text-xs font-semibold">+12%</span>
                  </div>
                </div>
                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-purple-200 text-xs font-medium mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-white">₱{stats.totalRevenue.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Award className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400 text-xs font-semibold">All time</span>
                  </div>
                </div>
                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-purple-200 text-xs font-medium mb-1">Completed Jobs</p>
                  <p className="text-2xl font-bold text-white">{stats.completedJobs}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 text-xs font-semibold">Success</span>
                  </div>
                </div>
                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-purple-200 text-xs font-medium mb-1">Active Jobs</p>
                  <p className="text-2xl font-bold text-white">{stats.activeJobs}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Zap className="w-3 h-3 text-blue-400" />
                    <span className="text-blue-400 text-xs font-semibold">In progress</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 -mt-6 relative z-10">
          {/* System Earnings Card */}
          <button onClick={() => router.push('/admin/earnings')}
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-5 mb-6 text-left hover:shadow-2xl hover:scale-[1.01] transition-all group shadow-xl shadow-amber-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">System Earnings (5% Fee)</h3>
                  <p className="text-amber-100 text-sm">Your platform commission</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
                <p className="text-amber-100 text-xs font-medium mb-1">Today</p>
                <p className="text-2xl font-bold text-white">₱{stats.todaySystemFees.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
                <p className="text-amber-100 text-xs font-medium mb-1">This Week</p>
                <p className="text-2xl font-bold text-white">₱{stats.weekSystemFees.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
                <p className="text-amber-100 text-xs font-medium mb-1">All Time</p>
                <p className="text-2xl font-bold text-white">₱{stats.totalSystemFees.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white font-semibold text-sm">Tap to withdraw earnings</span>
            </div>
          </button>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all border border-gray-100 group cursor-pointer" onClick={() => router.push('/admin/providers')}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                {stats.pendingProviders > 0 && (
                  <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold animate-pulse">Action needed</span>
                )}
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1">{stats.pendingProviders}</p>
              <p className="text-gray-500 text-sm font-medium">Pending Providers</p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1 text-violet-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-4 h-4" /> Review now
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all border border-gray-100 group cursor-pointer" onClick={() => router.push('/admin/jobs')}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <ClipboardList className="w-7 h-7 text-white" />
                </div>
                {stats.pendingJobs > 0 && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-xs font-bold">New</span>
                )}
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1">{stats.pendingJobs}</p>
              <p className="text-gray-500 text-sm font-medium">Pending Jobs</p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1 text-violet-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-4 h-4" /> Review now
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all border border-gray-100">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1">{stats.activeJobs}</p>
              <p className="text-gray-500 text-sm font-medium">Active Jobs</p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1 text-blue-600 text-sm font-semibold">
                <Activity className="w-4 h-4" /> In progress
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all border border-gray-100">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1">{stats.totalProviders}</p>
              <p className="text-gray-500 text-sm font-medium">Total Providers</p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                <Target className="w-4 h-4" /> {stats.totalClients} clients
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" /> Quick Actions
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <button key={action.id} onClick={() => router.push(action.path)}
                  className="group relative bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all border border-gray-100 text-left overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />
                  <div className={`w-14 h-14 bg-gradient-to-br ${action.color} rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{action.title}</h3>
                  <p className="text-gray-500 text-sm">{action.subtitle}</p>
                  {action.badge && action.badge > 0 && (
                    <span className="absolute top-4 right-4 min-w-[24px] h-6 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center px-2 shadow-lg">
                      {action.badge}
                    </span>
                  )}
                  <div className="absolute bottom-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="w-4 h-4 text-gray-600" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Needs Attention */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" /> Needs Attention
              </h2>
              <div className="space-y-3">
                <button onClick={() => router.push('/admin/providers')}
                  className="w-full bg-white rounded-2xl p-4 flex items-center shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-violet-500/30">
                    <UserPlus className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-900">Pending Provider Approvals</p>
                    <p className="text-gray-500 text-sm">{stats.pendingProviders} providers waiting for review</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg">
                      {stats.pendingProviders}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-500 transition-colors" />
                  </div>
                </button>
                
                <button onClick={() => router.push('/admin/jobs')}
                  className="w-full bg-white rounded-2xl p-4 flex items-center shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-blue-500/30">
                    <ClipboardList className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-900">Pending Job Requests</p>
                    <p className="text-gray-500 text-sm">{stats.pendingJobs} jobs awaiting approval</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg">
                      {stats.pendingJobs}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-500 transition-colors" />
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-violet-500" /> Recent Activity
              </h2>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={activity.id}
                      className={`flex items-center p-4 hover:bg-gray-50 transition-colors ${index < recentActivity.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-4"
                        style={{ backgroundColor: `${activity.color}15` }}>
                        <span style={{ color: activity.color }}>{getActivityIcon(activity.type)}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{activity.message}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{activity.time}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}