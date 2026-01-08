'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import {
  DollarSign, TrendingUp, Calendar, ArrowUpRight, Clock, Filter, ChevronDown,
  Wallet, RefreshCw, Sparkles, CheckCircle, Zap
} from 'lucide-react';

interface EarningRecord {
  id: string;
  serviceCategory: string;
  clientName: string;
  amount: number;
  baseAmount: number;
  additionalCharges: number;
  date: Date;
  status: string;
  isPaidUpfront: boolean;
}

const getCategoryStyle = (category: string) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('electric')) return { bg: 'bg-amber-100', text: 'text-amber-700', icon: '⚡' };
  if (cat.includes('plumb')) return { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🔧' };
  if (cat.includes('carp')) return { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🪚' };
  if (cat.includes('clean')) return { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '🧹' };
  return { bg: 'bg-gray-100', text: 'text-gray-700', icon: '🔨' };
};

export default function EarningsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, total: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const periods = [
    { key: 'all' as const, label: 'All Time', icon: '📊' },
    { key: 'week' as const, label: 'This Week', icon: '📅' },
    { key: 'month' as const, label: 'This Month', icon: '🗓️' },
    { key: 'year' as const, label: 'This Year', icon: '📆' },
  ];

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (user?.role?.toUpperCase() !== 'PROVIDER') router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.uid) fetchEarnings();
  }, [user, selectedPeriod]);

  const fetchEarnings = async () => {
    if (!user?.uid) return;
    setLoadingData(true);
    try {
      const jobsQuery = query(collection(db, 'bookings'), where('providerId', '==', user.uid));
      const snapshot = await getDocs(jobsQuery);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
      const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);

      let periodStart: Date | null = null;
      if (selectedPeriod === 'week') periodStart = weekAgo;
      else if (selectedPeriod === 'month') periodStart = monthAgo;
      else if (selectedPeriod === 'year') periodStart = yearAgo;

      let todayEarnings = 0, weekEarnings = 0, monthEarnings = 0, totalEarnings = 0;
      const earningsList: EarningRecord[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const isCompleted = data.status === 'completed';
        const isPayFirstConfirmed = data.status === 'payment_received' && data.isPaidUpfront === true;

        if (isCompleted || isPayFirstConfirmed) {
          const baseAmount = data.finalAmount || data.providerPrice || data.totalAmount || 0;
          const additionalCharges = data.approvedAdditionalCharges?.reduce((sum: number, c: { amount: number }) => sum + (c.amount || 0), 0) || 0;
          const amount = baseAmount + additionalCharges;
          // Deduct the 5% service fee to show actual provider earnings
          const providerEarnings = amount / 1.05;
          const earnedDate = isPayFirstConfirmed ? data.clientConfirmedAt?.toDate() || data.updatedAt?.toDate() || new Date() : data.completedAt?.toDate() || new Date();

          totalEarnings += providerEarnings;
          if (earnedDate >= today) todayEarnings += providerEarnings;
          if (earnedDate >= weekAgo) weekEarnings += providerEarnings;
          if (earnedDate >= monthAgo) monthEarnings += providerEarnings;

          if (periodStart && earnedDate < periodStart) continue;

          let clientName = data.clientName || 'Client';
          if (!data.clientName && data.clientId) {
            try {
              const clientDoc = await getDoc(doc(db, 'users', data.clientId));
              if (clientDoc.exists()) {
                const cd = clientDoc.data();
                clientName = `${cd.firstName || ''} ${cd.lastName || ''}`.trim() || 'Client';
              }
            } catch (e) {}
          }

          earningsList.push({
            id: docSnap.id, serviceCategory: data.serviceCategory || 'Service', clientName, amount: providerEarnings, baseAmount: baseAmount / 1.05, additionalCharges: additionalCharges / 1.05,
            date: earnedDate, status: data.status, isPaidUpfront: data.isPaidUpfront || false,
          });
        }
      }

      earningsList.sort((a, b) => b.date.getTime() - a.date.getTime());
      setEarnings(earningsList);
      setStats({ today: todayEarnings, week: weekEarnings, month: monthEarnings, total: totalEarnings });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); fetchEarnings(); };

  const groupedEarnings = earnings.reduce((groups, item) => {
    const monthYear = item.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!groups[monthYear]) groups[monthYear] = [];
    groups[monthYear].push(item);
    return groups;
  }, {} as Record<string, EarningRecord[]>);

  if (isLoading || loadingData) {
    return (
      <ProviderLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Earnings</h1>
                <p className="text-blue-100 text-sm">Track your income and payment history</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleRefresh} disabled={refreshing}
                  className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/25 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                {/* Period Selector */}
                <div className="relative">
                  <button onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                    className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition-colors">
                    <Filter className="w-4 h-4" />
                    {periods.find((p) => p.key === selectedPeriod)?.label}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showPeriodDropdown && (
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden">
                      {periods.map((period) => (
                        <button key={period.key} onClick={() => { setSelectedPeriod(period.key); setShowPeriodDropdown(false); }}
                          className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors ${
                            selectedPeriod === period.key ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'
                          }`}>
                          <span>{period.icon}</span> {period.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Earnings Card */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Total Earnings</p>
                  <p className="text-4xl font-bold text-white">₱{stats.total.toLocaleString()}</p>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Wallet className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 rounded-full">
                  <TrendingUp className="w-4 h-4 text-green-300" />
                  <span className="text-green-300 text-sm font-semibold">+₱{stats.today.toLocaleString()} today</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-4 relative z-10">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-100 text-xs font-medium">Today</span>
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold">₱{stats.today.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-xs font-medium">This Week</span>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">₱{stats.week.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-xs font-medium">This Month</span>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">₱{stats.month.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-xs font-medium">All Time</span>
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">₱{stats.total.toLocaleString()}</p>
            </div>
          </div>

          {/* Earnings History */}
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">Earnings History</h2>
            {earnings.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">No Earnings Yet</h3>
                <p className="text-gray-500 text-sm">Complete jobs to start earning money</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedEarnings).map(([monthYear, items]) => (
                  <div key={monthYear}>
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> {monthYear}
                    </h3>
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                      {items.map((earning, index) => {
                        const catStyle = getCategoryStyle(earning.serviceCategory);
                        return (
                          <div key={earning.id} onClick={() => router.push(`/provider/jobs/${earning.id}`)}
                            className={`p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors ${index !== items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 ${catStyle.bg} rounded-xl flex items-center justify-center text-xl`}>
                                {catStyle.icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="font-semibold text-gray-900">{earning.serviceCategory}</p>
                                  {earning.isPaidUpfront && (
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" /> PAID
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">{earning.clientName}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <p className="text-xs text-gray-400">
                                    {earning.date.toLocaleDateString()} at {earning.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                {earning.additionalCharges > 0 && (
                                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> +₱{earning.additionalCharges.toLocaleString()} additional
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-600 text-xl">+₱{earning.amount.toLocaleString()}</p>
                              {earning.additionalCharges > 0 && (
                                <p className="text-xs text-gray-400">Base: ₱{earning.baseAmount.toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
}
