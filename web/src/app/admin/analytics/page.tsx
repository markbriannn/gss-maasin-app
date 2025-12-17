'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { BarChart3, TrendingUp, Users, Briefcase, DollarSign } from 'lucide-react';

interface Analytics {
  totalUsers: number;
  totalProviders: number;
  totalClients: number;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  totalRevenue: number;
  avgJobValue: number;
  topCategories: { name: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

export default function AnalyticsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0,
    totalProviders: 0,
    totalClients: 0,
    totalJobs: 0,
    completedJobs: 0,
    cancelledJobs: 0,
    totalRevenue: 0,
    avgJobValue: 0,
    topCategories: [],
    monthlyRevenue: [],
  });
  const [loadingData, setLoadingData] = useState(true);

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
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      // Fetch users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let totalProviders = 0;
      let totalClients = 0;
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role === 'PROVIDER') totalProviders++;
        else if (data.role === 'CLIENT') totalClients++;
      });

      // Fetch bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      let totalJobs = 0;
      let completedJobs = 0;
      let cancelledJobs = 0;
      let totalRevenue = 0;
      const categoryCount: Record<string, number> = {};
      const monthlyRev: Record<string, number> = {};

      bookingsSnapshot.forEach((doc) => {
        const data = doc.data();
        totalJobs++;

        if (data.status === 'completed' || (data.status === 'payment_received' && data.isPaidUpfront)) {
          completedJobs++;
          const amount = data.finalAmount || data.totalAmount || data.price || 0;
          totalRevenue += amount;

          // Monthly revenue
          const date = data.completedAt?.toDate() || data.clientConfirmedAt?.toDate() || data.createdAt?.toDate();
          if (date) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyRev[monthKey] = (monthlyRev[monthKey] || 0) + amount;
          }
        } else if (data.status === 'cancelled') {
          cancelledJobs++;
        }

        // Category count
        if (data.serviceCategory) {
          categoryCount[data.serviceCategory] = (categoryCount[data.serviceCategory] || 0) + 1;
        }
      });

      // Top categories
      const topCategories = Object.entries(categoryCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Monthly revenue sorted
      const monthlyRevenue = Object.entries(monthlyRev)
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      setAnalytics({
        totalUsers: totalProviders + totalClients,
        totalProviders,
        totalClients,
        totalJobs,
        completedJobs,
        cancelledJobs,
        totalRevenue,
        avgJobValue: completedJobs > 0 ? totalRevenue / completedJobs : 0,
        topCategories,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (isLoading || loadingData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Platform performance overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalJobs}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.totalJobs > 0 ? ((analytics.completedJobs / analytics.totalJobs) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Avg Job Value</p>
                <p className="text-2xl font-bold text-gray-900">₱{analytics.avgJobValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Card */}
          <div className="bg-gradient-to-br from-[#00B14F] to-[#009940] rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">Total Revenue</h3>
            <p className="text-4xl font-bold mb-4">₱{analytics.totalRevenue.toLocaleString()}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-green-100 text-sm">Completed Jobs</p>
                <p className="text-xl font-semibold">{analytics.completedJobs}</p>
              </div>
              <div>
                <p className="text-green-100 text-sm">Cancelled Jobs</p>
                <p className="text-xl font-semibold">{analytics.cancelledJobs}</p>
              </div>
            </div>
          </div>

          {/* Top Categories */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Service Categories</h3>
            {analytics.topCategories.length === 0 ? (
              <p className="text-gray-500">No data available</p>
            ) : (
              <div className="space-y-4">
                {analytics.topCategories.map((cat, index) => (
                  <div key={cat.name} className="flex items-center gap-4">
                    <span className="w-6 h-6 bg-[#00B14F]/10 rounded-full flex items-center justify-center text-[#00B14F] text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-900">{cat.name}</span>
                        <span className="text-gray-500">{cat.count} jobs</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#00B14F] rounded-full"
                          style={{ width: `${(cat.count / analytics.topCategories[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Breakdown</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">Clients</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.totalClients}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-900">Providers</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.totalProviders}</span>
              </div>
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
            {analytics.monthlyRevenue.length === 0 ? (
              <p className="text-gray-500">No data available</p>
            ) : (
              <div className="space-y-3">
                {analytics.monthlyRevenue.map((item) => (
                  <div key={item.month} className="flex items-center justify-between">
                    <span className="text-gray-600">{item.month}</span>
                    <span className="font-semibold text-gray-900">₱{item.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
