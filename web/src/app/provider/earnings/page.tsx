'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import { DollarSign, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';

interface EarningRecord {
  id: string;
  serviceCategory: string;
  clientName: string;
  amount: number;
  date: Date;
}

export default function EarningsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role?.toUpperCase() !== 'PROVIDER') {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.uid) {
      fetchEarnings();
    }
  }, [user]);

  const fetchEarnings = async () => {
    if (!user?.uid) return;
    try {
      const jobsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', user.uid)
      );
      const snapshot = await getDocs(jobsQuery);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      let todayEarnings = 0;
      let weekEarnings = 0;
      let monthEarnings = 0;
      let totalEarnings = 0;
      const earningsList: EarningRecord[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Include completed jobs and Pay First confirmed jobs
        if (data.status === 'completed' || (data.status === 'payment_received' && data.isPaidUpfront)) {
          const amount = data.finalAmount || data.providerPrice || data.totalAmount || 0;
          const earnedDate = data.completedAt?.toDate() || data.clientConfirmedAt?.toDate() || new Date();
          
          totalEarnings += amount;
          
          if (earnedDate >= today) todayEarnings += amount;
          if (earnedDate >= weekAgo) weekEarnings += amount;
          if (earnedDate >= monthAgo) monthEarnings += amount;

          earningsList.push({
            id: doc.id,
            serviceCategory: data.serviceCategory || '',
            clientName: data.clientName || 'Client',
            amount,
            date: earnedDate,
          });
        }
      });

      earningsList.sort((a, b) => b.date.getTime() - a.date.getTime());
      setEarnings(earningsList);
      setStats({
        today: todayEarnings,
        week: weekEarnings,
        month: monthEarnings,
        total: totalEarnings,
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (isLoading || loadingData) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Earnings</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-[#00B14F] to-[#009940] rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100 text-sm">Today</span>
              <DollarSign className="w-5 h-5 text-green-200" />
            </div>
            <p className="text-2xl font-bold">₱{stats.today.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">This Week</span>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">₱{stats.week.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">This Month</span>
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">₱{stats.month.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Total</span>
              <ArrowUpRight className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">₱{stats.total.toLocaleString()}</p>
          </div>
        </div>

        {/* Earnings History */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Earnings History</h2>
          {earnings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No earnings yet</p>
              <p className="text-sm text-gray-400 mt-1">Complete jobs to start earning</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {earnings.map((earning, index) => (
                <div
                  key={earning.id}
                  className={`p-4 flex items-center justify-between ${
                    index !== earnings.length - 1 ? 'border-b' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{earning.serviceCategory}</p>
                    <p className="text-sm text-gray-500">{earning.clientName}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {earning.date.toLocaleDateString()} at {earning.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <p className="font-semibold text-[#00B14F]">+₱{earning.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProviderLayout>
  );
}
