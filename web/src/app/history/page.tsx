'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface HistoryItem {
  id: string;
  service: string;
  status: string;
  date: Date;
  dateString: string;
  otherParty: { name: string; photo?: string };
  location: string;
  amount: number;
}

export default function ServiceHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');

  const isProvider = user?.role === 'PROVIDER';

  useEffect(() => {
    if (user?.uid) fetchHistory();
  }, [user, filter, period]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const fieldName = isProvider ? 'providerId' : 'clientId';
      const q = query(collection(db, 'bookings'), where(fieldName, '==', user?.uid));
      const snapshot = await getDocs(q);

      let statuses = filter === 'all' 
        ? ['completed', 'payment_received', 'cancelled', 'rejected']
        : filter === 'completed' 
          ? ['completed', 'payment_received'] 
          : ['cancelled', 'rejected'];

      const now = new Date();
      let periodStart: Date | null = null;
      if (period === 'week') periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (period === 'month') periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (period === 'year') periodStart = new Date(now.getFullYear(), 0, 1);

      const items: HistoryItem[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (!statuses.includes(data.status)) continue;

        const completedDate = data.completedAt?.toDate?.() || data.updatedAt?.toDate?.() || new Date();
        if (periodStart && completedDate < periodStart) continue;

        const otherPartyId = isProvider ? data.clientId : data.providerId;
        let otherParty = { name: 'Unknown', photo: undefined as string | undefined };
        if (otherPartyId) {
          const userDoc = await getDoc(doc(db, 'users', otherPartyId));
          if (userDoc.exists()) {
            const u = userDoc.data();
            otherParty = { name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User', photo: u.profilePhoto };
          }
        }

        const baseAmount = data.providerPrice || data.offeredPrice || data.totalAmount || data.price || 0;
        const additionalCharges = data.additionalCharges?.filter((c: any) => c.status === 'approved').reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
        const finalAmount = data.finalAmount || (baseAmount + additionalCharges);

        items.push({
          id: docSnap.id,
          service: data.serviceCategory || 'Service',
          status: data.status,
          date: completedDate,
          dateString: completedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          otherParty,
          location: data.streetAddress ? `${data.streetAddress}, ${data.barangay || ''}` : data.location || 'N/A',
          amount: finalAmount,
        });
      }

      items.sort((a, b) => b.date.getTime() - a.date.getTime());
      setHistory(items);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = search.trim()
    ? history.filter(h => h.service.toLowerCase().includes(search.toLowerCase()) || h.otherParty.name.toLowerCase().includes(search.toLowerCase()))
    : history;

  const totalAmount = filteredHistory.filter(h => ['completed', 'payment_received'].includes(h.status)).reduce((sum, h) => sum + h.amount, 0);

  const getStatusColor = (status: string) => {
    if (['completed', 'payment_received'].includes(status)) return 'bg-green-100 text-green-700';
    if (['cancelled', 'rejected'].includes(status)) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 ml-4">Service History</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', 'completed', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${filter === f ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Period */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {[{ key: 'all', label: 'All Time' }, { key: 'week', label: 'This Week' }, { key: 'month', label: 'This Month' }, { key: 'year', label: 'This Year' }].map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${period === p.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl p-4 mb-6 flex justify-around border border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{filteredHistory.filter(h => ['completed', 'payment_received'].includes(h.status)).length}</p>
            <p className="text-sm text-gray-500">Jobs</p>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">₱{totalAmount.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{isProvider ? 'Earned' : 'Spent'}</p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">No history found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map(item => (
              <Link key={item.id} href={isProvider ? `/provider/jobs/${item.id}` : `/client/bookings/${item.id}`}
                className="block bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{item.service}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status === 'payment_received' ? 'Completed' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {item.otherParty.photo ? (
                      <img src={item.otherParty.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium text-gray-500">{item.otherParty.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-600">{item.otherParty.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{item.dateString}</span>
                  <span className="font-semibold text-green-600">₱{item.amount.toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
