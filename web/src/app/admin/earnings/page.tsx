'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { DollarSign, TrendingUp, Calendar, Percent } from 'lucide-react';

interface EarningRecord {
  id: string;
  serviceCategory: string;
  clientName: string;
  providerName: string;
  totalAmount: number;
  systemFee: number;
  date: Date;
}

const SYSTEM_FEE_PERCENTAGE = 0.10; // 10% system fee

export default function AdminEarningsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    totalTransactions: 0,
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
      fetchEarnings();
    }
  }, [user]);

  const fetchEarnings = async () => {
    try {
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      let todayFees = 0;
      let weekFees = 0;
      let monthFees = 0;
      let totalFees = 0;
      let totalTransactions = 0;
      const earningsList: EarningRecord[] = [];

      bookingsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        if (data.status === 'completed' || (data.status === 'payment_received' && data.isPaidUpfront)) {
          const totalAmount = data.finalAmount || data.totalAmount || data.price || 0;
          const systemFee = data.systemFee || totalAmount * SYSTEM_FEE_PERCENTAGE;
          const earnedDate = data.completedAt?.toDate() || data.clientConfirmedAt?.toDate() || new Date();
          
          totalFees += systemFee;
          totalTransactions++;
          
          if (earnedDate >= today) todayFees += systemFee;
          if (earnedDate >= weekAgo) weekFees += systemFee;
          if (earnedDate >= monthAgo) monthFees += systemFee;

          earningsList.push({
            id: doc.id,
            serviceCategory: data.serviceCategory || '',
            clientName: data.clientName || 'Client',
            providerName: data.providerName || 'Provider',
            totalAmount,
            systemFee,
            date: earnedDate,
          });
        }
      });

      earningsList.sort((a, b) => b.date.getTime() - a.date.getTime());
      setEarnings(earningsList);
      setStats({
        today: todayFees,
        week: weekFees,
        month: monthFees,
        total: totalFees,
        totalTransactions,
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">System Earnings</h1>
          <p className="text-gray-600 mt-1">Platform fee collection ({(SYSTEM_FEE_PERCENTAGE * 100).toFixed(0)}% per transaction)</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-[#00B14F] to-[#009940] rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100 text-sm">Today</span>
              <DollarSign className="w-5 h-5 text-green-200" />
            </div>
            <p className="text-2xl font-bold">₱{stats.today.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">This Week</span>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">₱{stats.week.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">This Month</span>
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">₱{stats.month.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Total Earnings</span>
              <Percent className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">₱{stats.total.toLocaleString()}</p>
          </div>
        </div>

        {/* Transactions Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Transactions</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalTransactions}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500">Average Fee per Transaction</p>
              <p className="text-3xl font-bold text-[#00B14F]">
                ₱{stats.totalTransactions > 0 ? (stats.total / stats.totalTransactions).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
              </p>
            </div>
          </div>
        </div>

        {/* Earnings History */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h2>
          {earnings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">System Fee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {earnings.slice(0, 20).map((earning) => (
                      <tr key={earning.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{earning.serviceCategory}</td>
                        <td className="px-6 py-4 text-gray-600">{earning.clientName}</td>
                        <td className="px-6 py-4 text-gray-600">{earning.providerName}</td>
                        <td className="px-6 py-4 text-gray-900">₱{earning.totalAmount.toLocaleString()}</td>
                        <td className="px-6 py-4 font-semibold text-[#00B14F]">₱{earning.systemFee.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-500">{earning.date.toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
