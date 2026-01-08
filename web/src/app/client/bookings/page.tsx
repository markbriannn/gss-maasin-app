'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import Image from 'next/image';
import { 
  Calendar, Clock, MapPin, ChevronRight, User, AlertCircle, Car, CheckCircle,
  Zap, Star, Phone, MessageCircle, Navigation, CreditCard, Package, 
  ArrowRight, Search, RefreshCw, Sparkles
} from 'lucide-react';

interface Provider {
  name: string;
  phone: string;
  rating: number;
  profilePhoto?: string;
}

interface Booking {
  id: string;
  title: string;
  serviceCategory: string;
  status: string;
  description: string;
  amount: number;
  totalAmount: number;
  scheduledDate: string;
  scheduledTime: string;
  location: string;
  adminApproved: boolean;
  hasAdditionalPending: boolean;
  provider: Provider | null;
  providerId: string;
  createdAt: string;
  createdAtRaw: Date;
}

const TABS = [
  { key: 'PENDING', label: 'Pending', icon: Clock, color: '#F59E0B', gradient: 'from-amber-500 to-orange-500' },
  { key: 'ONGOING', label: 'Active', icon: Zap, color: '#3B82F6', gradient: 'from-blue-500 to-cyan-500' },
  { key: 'COMPLETED', label: 'Completed', icon: CheckCircle, color: '#10B981', gradient: 'from-emerald-500 to-teal-500' },
  { key: 'CANCELLED', label: 'Cancelled', icon: AlertCircle, color: '#EF4444', gradient: 'from-red-500 to-rose-500' },
];

const STATUS_MAP: Record<string, string[]> = {
  'PENDING': ['pending', 'approved'],
  'ONGOING': ['accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion', 'pending_payment', 'payment_received'],
  'COMPLETED': ['completed'],
  'CANCELLED': ['cancelled', 'rejected', 'declined'],
};

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  'electrician': { icon: '⚡', color: 'text-amber-600', bg: 'bg-amber-50' },
  'plumber': { icon: '🔧', color: 'text-blue-600', bg: 'bg-blue-50' },
  'carpenter': { icon: '🪚', color: 'text-orange-600', bg: 'bg-orange-50' },
  'cleaner': { icon: '✨', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  'general': { icon: '🔨', color: 'text-purple-600', bg: 'bg-purple-50' },
};

export default function BookingsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const userId = user?.uid;
    if (!userId) { setBookings([]); setLoadingData(false); return; }
    setLoadingData(true);

    const bookingsQuery = query(collection(db, 'bookings'), where('clientId', '==', userId));

    const unsubscribe = onSnapshot(bookingsQuery, async (snapshot) => {
      const allBookings: Booking[] = [];
      const counts: Record<string, number> = { PENDING: 0, ONGOING: 0, COMPLETED: 0, CANCELLED: 0 };

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        Object.entries(STATUS_MAP).forEach(([tab, statuses]) => {
          if (statuses.includes(data.status)) counts[tab]++;
        });

        let providerInfo: Provider | null = null;
        if (data.providerId) {
          try {
            const providerDoc = await getDoc(doc(db, 'users', data.providerId));
            if (providerDoc.exists()) {
              const pd = providerDoc.data();
              providerInfo = {
                name: `${pd.firstName || ''} ${pd.lastName || ''}`.trim() || 'Provider',
                phone: pd.phone || pd.phoneNumber || '',
                rating: pd.rating || pd.averageRating || 0,
                profilePhoto: pd.profilePhoto,
              };
            }
          } catch (e) { console.log('Error:', e); }
        }

        let fullLocation = '';
        if (data.houseNumber) fullLocation += data.houseNumber + ', ';
        if (data.streetAddress) fullLocation += data.streetAddress + ', ';
        if (data.barangay) fullLocation += 'Brgy. ' + data.barangay;
        if (!fullLocation) fullLocation = data.location || data.address || 'Maasin City';
        
        allBookings.push({
          id: docSnap.id,
          title: data.title || data.serviceTitle || 'Service Request',
          serviceCategory: data.category || data.serviceCategory || 'General',
          status: data.status?.toLowerCase() || 'pending',
          description: data.description || '',
          amount: data.providerPrice || data.amount || data.price || 0,
          totalAmount: data.totalAmount || data.amount || 0,
          scheduledDate: data.scheduledDate || '',
          scheduledTime: data.scheduledTime || '',
          location: fullLocation,
          hasAdditionalPending: data.hasAdditionalPending || false,
          adminApproved: data.adminApproved || false,
          provider: providerInfo,
          providerId: data.providerId || '',
          createdAt: data.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || '',
          createdAtRaw: data.createdAt?.toDate?.() || new Date(0),
        });
      }

      setTabCounts(counts);

      const statuses = STATUS_MAP[activeTab] || ['pending'];
      let filtered = allBookings.filter(b => statuses.includes(b.status));

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(b => 
          b.title.toLowerCase().includes(q) || 
          b.serviceCategory.toLowerCase().includes(q) ||
          b.provider?.name.toLowerCase().includes(q)
        );
      }

      filtered.sort((a, b) => b.createdAtRaw.getTime() - a.createdAtRaw.getTime());
      setBookings(filtered);
      setLoadingData(false);
    }, (error) => { console.log('Error:', error); setLoadingData(false); });

    return () => unsubscribe();
  }, [user, activeTab, searchQuery]);

  const getStatusConfig = (status: string, job: Booking) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
      'pending': { label: job.adminApproved ? 'Pending' : 'In Review', color: '#F59E0B', bg: 'bg-amber-50', icon: Clock },
      'approved': { label: 'Approved', color: '#10B981', bg: 'bg-green-50', icon: CheckCircle },
      'accepted': { label: 'Accepted', color: '#3B82F6', bg: 'bg-blue-50', icon: CheckCircle },
      'traveling': { label: 'On The Way', color: '#3B82F6', bg: 'bg-blue-50', icon: Car },
      'arrived': { label: 'Arrived', color: '#8B5CF6', bg: 'bg-purple-50', icon: MapPin },
      'in_progress': { label: job.hasAdditionalPending ? 'Action Needed' : 'In Progress', color: '#00B14F', bg: 'bg-green-50', icon: Zap },
      'pending_completion': { label: 'Confirm Work', color: '#F59E0B', bg: 'bg-amber-50', icon: CheckCircle },
      'pending_payment': { label: 'Pay Now', color: '#3B82F6', bg: 'bg-blue-50', icon: CreditCard },
      'payment_received': { label: 'Payment Sent', color: '#10B981', bg: 'bg-green-50', icon: CheckCircle },
      'completed': { label: 'Completed', color: '#10B981', bg: 'bg-green-50', icon: CheckCircle },
      'cancelled': { label: 'Cancelled', color: '#EF4444', bg: 'bg-red-50', icon: AlertCircle },
      'rejected': { label: 'Rejected', color: '#EF4444', bg: 'bg-red-50', icon: AlertCircle },
      'declined': { label: 'Declined', color: '#EF4444', bg: 'bg-red-50', icon: AlertCircle },
    };
    return configs[status] || { label: status?.replace(/_/g, ' ') || 'Unknown', color: '#6B7280', bg: 'bg-gray-50', icon: Clock };
  };

  const getCategoryConfig = (category: string) => {
    const key = category?.toLowerCase() || 'general';
    return CATEGORY_CONFIG[key] || CATEGORY_CONFIG['general'];
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#00B14F] border-t-transparent rounded-full animate-spin" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-[#00B14F] via-emerald-500 to-teal-500 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          
          <div className="max-w-6xl mx-auto px-4 py-8 relative">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-white">My Bookings</h1>
                </div>
                <p className="text-emerald-100 text-sm ml-15">Track and manage all your service requests</p>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="p-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all hover:scale-105"
              >
                <RefreshCw className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                const count = tabCounts[tab.key] || 0;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative p-5 rounded-2xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-white shadow-2xl shadow-black/10 scale-[1.02]' 
                        : 'bg-white/15 backdrop-blur-sm hover:bg-white/25'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                      isActive ? `bg-gradient-to-br ${tab.gradient}` : 'bg-white/20'
                    }`}>
                      <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-white'}`} />
                    </div>
                    <p className={`text-3xl font-bold ${isActive ? 'text-gray-900' : 'text-white'}`}>{count}</p>
                    <p className={`text-sm font-medium ${isActive ? 'text-gray-500' : 'text-white/80'}`}>{tab.label}</p>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gradient-to-r from-[#00B14F] to-emerald-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-6xl mx-auto px-4 -mt-6 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-2 flex items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, category, or provider..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-100 focus:outline-none transition-all text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          {loadingData ? (
            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse shadow-lg">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-gray-200 rounded-lg w-1/3" />
                      <div className="h-4 bg-gray-100 rounded-lg w-1/2" />
                      <div className="h-4 bg-gray-100 rounded-lg w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-16 text-center">
              <div className="w-28 h-28 bg-gradient-to-br from-gray-100 to-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Package className="w-14 h-14 text-gray-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No {activeTab.toLowerCase()} bookings</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">Your {activeTab.toLowerCase()} service requests will appear here once you book a service</p>
              <button
                onClick={() => router.push('/client/providers')}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#00B14F] to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-200 transition-all hover:scale-105"
              >
                <Sparkles className="w-5 h-5" />
                <span>Find a Provider</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {bookings.map((job, index) => {
                const statusConfig = getStatusConfig(job.status, job);
                const StatusIcon = statusConfig.icon;
                const categoryConfig = getCategoryConfig(job.serviceCategory);
                
                return (
                  <div
                    key={job.id}
                    onClick={() => router.push(`/client/bookings/${job.id}`)}
                    className="group bg-white rounded-2xl shadow-lg shadow-gray-100/50 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-[#00B14F]/30"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Status Color Bar */}
                    <div className="h-1.5 transition-all group-hover:h-2" style={{ backgroundColor: statusConfig.color }} />
                    
                    <div className="p-6">
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`px-4 py-2 rounded-xl ${categoryConfig.bg} flex items-center gap-2`}>
                            <span className="text-lg">{categoryConfig.icon}</span>
                            <span className={`text-sm font-bold ${categoryConfig.color}`}>{job.serviceCategory}</span>
                          </div>
                        </div>
                        
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${statusConfig.bg}`} style={{ color: statusConfig.color }}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm font-bold">{statusConfig.label}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-[#00B14F] transition-colors">{job.title}</h3>

                      {/* Alert Banners */}
                      {job.status === 'traveling' && (
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl mb-4 border border-blue-200">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse">
                            <Car className="w-6 h-6 text-blue-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-blue-700">Provider is on the way!</p>
                            <p className="text-sm text-blue-600">Tap to track live location</p>
                          </div>
                          <Navigation className="w-5 h-5 text-blue-400" />
                        </div>
                      )}

                      {job.status === 'arrived' && (
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl mb-4 border border-purple-200">
                          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-6 h-6 text-purple-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-purple-700">Provider has arrived!</p>
                            <p className="text-sm text-purple-600">They&apos;re at your location</p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-purple-400" />
                        </div>
                      )}

                      {job.hasAdditionalPending && (
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl mb-4 border border-amber-200">
                          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-amber-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-amber-700">Action Required</p>
                            <p className="text-sm text-amber-600">Additional charge needs your approval</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-amber-400" />
                        </div>
                      )}

                      {/* Provider & Details Row */}
                      <div className="flex items-center gap-5">
                        {/* Provider Photo */}
                        <div className="relative flex-shrink-0">
                          {job.provider?.profilePhoto ? (
                            <Image src={job.provider.profilePhoto} alt="" width={64} height={64} className="w-16 h-16 rounded-xl object-cover shadow-md" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-inner">
                              <User className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          {job.provider?.rating && job.provider.rating >= 4.5 && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                              <Star className="w-3.5 h-3.5 text-white fill-white" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-base font-bold text-gray-900">{job.provider?.name || 'Awaiting provider'}</span>
                            {job.provider?.rating && job.provider.rating > 0 && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full">
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span className="text-xs font-semibold text-amber-600">{job.provider.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{job.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>{job.createdAt}</span>
                          </div>
                        </div>

                        {/* Price & Action */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-3xl font-bold text-gray-900">₱{(job.totalAmount || job.amount).toLocaleString()}</p>
                          <p className="text-xs text-gray-400 mb-4">Total amount</p>
                          <button className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#00B14F] to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-200 transition-all group-hover:scale-105">
                            <span>View Details</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>

                      {/* Quick Actions for Active Jobs */}
                      {['traveling', 'arrived', 'in_progress'].includes(job.status) && job.provider?.phone && (
                        <div className="flex items-center gap-3 mt-5 pt-5 border-t border-gray-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${job.provider?.phone}`; }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                          >
                            <Phone className="w-5 h-5" />
                            <span>Call Provider</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/chat/${job.providerId}`); }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                          >
                            <MessageCircle className="w-5 h-5" />
                            <span>Message</span>
                          </button>
                          {job.status === 'traveling' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/client/bookings/${job.id}/tracking`); }}
                              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 rounded-xl text-blue-600 font-semibold hover:bg-blue-100 transition-colors"
                            >
                              <Navigation className="w-5 h-5" />
                              <span>Track Live</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
