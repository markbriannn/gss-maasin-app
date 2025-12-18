'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import {
  Clock,
  Search,
  Filter,
  MapPin,
  CheckCircle,
  XCircle,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Receipt,
  Star,
  AlertCircle,
} from 'lucide-react';

interface HistoryItem {
  id: string;
  service: string;
  description: string;
  status: string;
  date: Date;
  dateString: string;
  timeString: string;
  otherParty: {
    id: string;
    name: string;
    photo?: string;
  };
  location: string;
  amount: number;
  baseAmount: number;
  additionalCharges: number;
  cancellationReason?: string;
  cancelledBy?: string;
  reviewed: boolean;
  reviewRating?: number;
}

export default function ProviderHistoryPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [showSortModal, setShowSortModal] = useState(false);
  const [summary, setSummary] = useState({ totalJobs: 0, totalEarned: 0 });

  const filters = [
    { key: 'all' as const, label: 'All' },
    { key: 'completed' as const, label: 'Completed' },
    { key: 'cancelled' as const, label: 'Cancelled' },
  ];

  const periods = [
    { key: 'all' as const, label: 'All Time' },
    { key: 'week' as const, label: 'This Week' },
    { key: 'month' as const, label: 'This Month' },
    { key: 'year' as const, label: 'This Year' },
  ];

  const sortOptions = [
    { key: 'date_desc' as const, label: 'Newest First', icon: ArrowDown },
    { key: 'date_asc' as const, label: 'Oldest First', icon: ArrowUp },
    { key: 'amount_desc' as const, label: 'Highest Amount', icon: TrendingUp },
    { key: 'amount_asc' as const, label: 'Lowest Amount', icon: TrendingDown },
  ];

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
      loadHistory();
    }
  }, [user, activeFilter, selectedPeriod, sortBy]);

  const loadHistory = async () => {
    if (!user?.uid) return;
    setLoadingData(true);

    try {
      // Build status filter
      let statuses: string[] = [];
      if (activeFilter === 'all') {
        statuses = ['completed', 'payment_received', 'cancelled', 'rejected'];
      } else if (activeFilter === 'completed') {
        statuses = ['completed', 'payment_received'];
      } else {
        statuses = ['cancelled', 'rejected'];
      }

      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', user.uid)
      );
      const snapshot = await getDocs(bookingsQuery);

      const historyList: HistoryItem[] = [];
      let totalAmount = 0;
      let jobCount = 0;

      // Calculate period date range
      const now = new Date();
      let periodStart: Date | null = null;
      if (selectedPeriod === 'week') {
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (selectedPeriod === 'month') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (selectedPeriod === 'year') {
        periodStart = new Date(now.getFullYear(), 0, 1);
      }

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        // Filter by status
        if (!statuses.includes(data.status)) continue;

        // Filter by period
        const completedDate = data.completedAt?.toDate?.() || data.updatedAt?.toDate?.() || new Date();
        if (periodStart && completedDate < periodStart) continue;

        // Get client info
        let otherParty = { id: '', name: 'Unknown', photo: undefined as string | undefined };
        if (data.clientId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.clientId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              otherParty = {
                id: userDoc.id,
                name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Client',
                photo: userData.profilePhoto,
              };
            }
          } catch (err) {}
        }

        // Calculate amounts
        const baseAmount = data.providerPrice || data.offeredPrice || data.totalAmount || data.price || 0;
        const additionalCharges = data.additionalCharges?.reduce(
          (sum: number, c: { amount: number }) => sum + (c.amount || 0),
          0
        ) || 0;
        const finalAmount = baseAmount + additionalCharges;

        // Include completed jobs AND Pay First confirmed jobs for earnings
        const isPayFirstConfirmed = data.status === 'payment_received' && data.isPaidUpfront === true;
        if (data.status === 'completed' || isPayFirstConfirmed) {
          totalAmount += finalAmount;
          jobCount++;
        }

        historyList.push({
          id: docSnap.id,
          service: data.serviceCategory || 'Service',
          description: data.description || '',
          status: data.status,
          date: completedDate,
          dateString: completedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          timeString: completedDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          otherParty,
          location: data.streetAddress
            ? `${data.streetAddress}, ${data.barangay || ''}`
            : data.location || 'N/A',
          amount: finalAmount,
          baseAmount,
          additionalCharges,
          cancellationReason: data.cancellationReason || data.declineReason,
          cancelledBy: data.cancelledBy || data.declinedBy,
          reviewed: data.reviewed || false,
          reviewRating: data.reviewRating,
        });
      }

      // Sort
      switch (sortBy) {
        case 'date_asc':
          historyList.sort((a, b) => a.date.getTime() - b.date.getTime());
          break;
        case 'amount_desc':
          historyList.sort((a, b) => b.amount - a.amount);
          break;
        case 'amount_asc':
          historyList.sort((a, b) => a.amount - b.amount);
          break;
        default:
          historyList.sort((a, b) => b.date.getTime() - a.date.getTime());
      }

      // Apply search filter
      let filteredList = historyList;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filteredList = historyList.filter(
          (item) =>
            item.service.toLowerCase().includes(q) ||
            item.otherParty.name.toLowerCase().includes(q) ||
            item.location.toLowerCase().includes(q)
        );
      }

      setHistory(filteredList);
      setSummary({ totalJobs: jobCount, totalEarned: totalAmount });
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'payment_received':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'payment_received':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  // Group history by month
  const groupedHistory = history.reduce((groups, item) => {
    const monthYear = item.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(item);
    return groups;
  }, {} as Record<string, HistoryItem[]>);

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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white p-4 border-b">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Service History</h1>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === filter.key
                    ? 'bg-[#00B14F] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2 p-4 bg-gray-50">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by service, name, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadHistory()}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F] bg-white"
            />
          </div>
          <button
            onClick={() => setShowSortModal(true)}
            className="w-12 h-12 bg-white border border-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-50"
          >
            <Filter className="w-5 h-5 text-[#00B14F]" />
          </button>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 px-4 pb-4 bg-gray-50 overflow-x-auto">
          {periods.map((period) => (
            <button
              key={period.key}
              onClick={() => setSelectedPeriod(period.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedPeriod === period.key
                  ? 'bg-[#00B14F] text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Summary Card */}
        <div className="mx-4 mb-4 bg-white rounded-xl p-4 shadow-sm flex">
          <div className="flex-1 text-center border-r border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{summary.totalJobs}</p>
            <p className="text-sm text-gray-500">Total Jobs</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-gray-900">₱{summary.totalEarned.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total Earned</p>
          </div>
        </div>

        {/* History List */}
        <div className="px-4 pb-8">
          {history.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No History Found</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? 'Try a different search term'
                  : `Your ${activeFilter === 'all' ? '' : activeFilter} service history will appear here`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedHistory).map(([monthYear, items]) => (
                <div key={monthYear}>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">{monthYear}</h3>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push(`/provider/job/${item.id}`)}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-[#00B14F]/10 rounded-xl flex items-center justify-center">
                              {item.status === 'completed' || item.status === 'payment_received' ? (
                                <CheckCircle className="w-6 h-6 text-[#00B14F]" />
                              ) : (
                                <XCircle className="w-6 h-6 text-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{item.service}</p>
                              <p className="text-sm text-gray-500">
                                {item.dateString} at {item.timeString}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>

                        {/* Client Info */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center">
                            {item.otherParty.photo ? (
                              <img src={item.otherParty.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-medium text-gray-600">
                                {item.otherParty.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">{item.otherParty.name}</span>
                          <span className="text-xs text-gray-400">(Client)</span>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500 truncate">{item.location}</span>
                        </div>

                        {/* Cancellation Reason */}
                        {(item.status === 'cancelled' || item.status === 'rejected') && item.cancellationReason && (
                          <div className="bg-red-50 rounded-lg p-3 mb-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-red-600">
                                Cancelled by {item.cancelledBy === 'client' ? 'Client' : 'Provider'}
                              </p>
                              <p className="text-xs text-red-700">{item.cancellationReason}</p>
                            </div>
                          </div>
                        )}

                        {/* Review Badge */}
                        {(item.status === 'completed' || item.status === 'payment_received') && item.reviewed && (
                          <div className="flex items-center gap-1 mb-3">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-yellow-700">Rated {item.reviewRating}/5</span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div>
                            <span className="text-xs text-gray-500">Earned:</span>
                            <span className="ml-2 font-semibold text-gray-900">₱{item.amount.toLocaleString()}</span>
                          </div>
                          <button className="flex items-center gap-1 bg-[#00B14F] text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                            <Receipt className="w-4 h-4" />
                            Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sort Modal */}
        {showSortModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowSortModal(false)}>
            <div className="bg-white rounded-t-3xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-4">Sort By</h3>
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => {
                    setSortBy(option.key);
                    setShowSortModal(false);
                  }}
                  className="w-full flex items-center gap-3 py-3 border-b border-gray-100"
                >
                  <option.icon className={`w-5 h-5 ${sortBy === option.key ? 'text-[#00B14F]' : 'text-gray-400'}`} />
                  <span className={`flex-1 text-left ${sortBy === option.key ? 'text-[#00B14F] font-medium' : 'text-gray-700'}`}>
                    {option.label}
                  </span>
                  {sortBy === option.key && <CheckCircle className="w-5 h-5 text-[#00B14F]" />}
                </button>
              ))}
              <button
                onClick={() => setShowSortModal(false)}
                className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl mt-4 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
