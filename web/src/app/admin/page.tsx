'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
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
}

export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalProviders: 0,
    pendingProviders: 0,
    totalClients: 0,
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    activeJobs: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    totalRevenue: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role?.toUpperCase() !== 'ADMIN') {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role?.toUpperCase() === 'ADMIN') {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Fetch users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let totalProviders = 0;
      let pendingProviders = 0;
      let totalClients = 0;

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role === 'PROVIDER') {
          totalProviders++;
          if (data.status === 'pending' || data.providerStatus === 'pending') {
            pendingProviders++;
          }
        } else if (data.role === 'CLIENT') {
          totalClients++;
        }
      });

      // Fetch bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      let totalJobs = 0;
      let completedJobs = 0;
      let pendingJobs = 0;
      let activeJobs = 0;
      let todayRevenue = 0;
      let weekRevenue = 0;
      let totalRevenue = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      bookingsSnapshot.forEach((doc) => {
        const data = doc.data();
        totalJobs++;

        if (data.status === 'completed') {
          completedJobs++;
          const amount = data.finalAmount || data.totalAmount || data.price || 0;
          totalRevenue += amount;

          const completedAt = data.completedAt?.toDate?.();
          if (completedAt) {
            if (completedAt >= today) todayRevenue += amount;
            if (completedAt >= weekAgo) weekRevenue += amount;
          }
        } else if (data.status === 'pending') {
          pendingJobs++;
        } else if (data.status === 'in_progress' || data.status === 'accepted') {
          activeJobs++;
        }
      });

      setStats({
        totalProviders,
        pendingProviders,
        totalClients,
        totalJobs,
        completedJobs,
        pendingJobs,
        activeJobs,
        todayRevenue,
        weekRevenue,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (isLoading || loadingStats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { 
      title: 'Total Providers', 
      value: stats.totalProviders, 
      icon: Users, 
      color: '#00B14F',
      bgColor: '#00B14F20'
    },
    { 
      title: 'Pending Approval', 
      value: stats.pendingProviders, 
      icon: Clock, 
      color: '#F59E0B',
      bgColor: '#F59E0B20'
    },
    { 
      title: 'Total Clients', 
      value: stats.totalClients, 
      icon: Users, 
      color: '#3B82F6',
      bgColor: '#3B82F620'
    },
    { 
      title: 'Completed Jobs', 
      value: stats.completedJobs, 
      icon: CheckCircle, 
      color: '#10B981',
      bgColor: '#10B98120'
    },
    { 
      title: 'Active Jobs', 
      value: stats.activeJobs, 
      icon: Briefcase, 
      color: '#8B5CF6',
      bgColor: '#8B5CF620'
    },
    { 
      title: 'Pending Jobs', 
      value: stats.pendingJobs, 
      icon: AlertCircle, 
      color: '#EF4444',
      bgColor: '#EF444420'
    },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your platform</p>
        </div>

        {/* Revenue Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-[#00B14F] to-[#009940] rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-green-100">Today&apos;s Revenue</span>
              <DollarSign className="w-6 h-6 text-green-200" />
            </div>
            <div className="text-3xl font-bold">₱{stats.todayRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-blue-100">This Week</span>
              <TrendingUp className="w-6 h-6 text-blue-200" />
            </div>
            <div className="text-3xl font-bold">₱{stats.weekRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-purple-100">Total Revenue</span>
              <DollarSign className="w-6 h-6 text-purple-200" />
            </div>
            <div className="text-3xl font-bold">₱{stats.totalRevenue.toLocaleString()}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat) => (
            <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: stat.bgColor }}
                >
                  <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <button 
              onClick={() => router.push('/admin/providers')}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <Users className="w-8 h-8 text-[#00B14F] mb-2" />
              <p className="font-semibold text-gray-900">Manage Providers</p>
              <p className="text-sm text-gray-500">View and approve providers</p>
            </button>
            <button 
              onClick={() => router.push('/admin/jobs')}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <Briefcase className="w-8 h-8 text-[#3B82F6] mb-2" />
              <p className="font-semibold text-gray-900">View Jobs</p>
              <p className="text-sm text-gray-500">Monitor all bookings</p>
            </button>
            <button 
              onClick={() => router.push('/admin/analytics')}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <TrendingUp className="w-8 h-8 text-[#8B5CF6] mb-2" />
              <p className="font-semibold text-gray-900">Analytics</p>
              <p className="text-sm text-gray-500">View detailed reports</p>
            </button>
            <button 
              onClick={() => router.push('/admin/earnings')}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <DollarSign className="w-8 h-8 text-[#F59E0B] mb-2" />
              <p className="font-semibold text-gray-900">Earnings</p>
              <p className="text-sm text-gray-500">System fee collection</p>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
