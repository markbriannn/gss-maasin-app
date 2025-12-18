'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import Image from 'next/image';
import { 
  Calendar, Clock, MapPin, ChevronRight, Wrench, User, Tag, AlertCircle, Car, CheckCircle,
  Zap, Sparkles, Star, Phone, MessageCircle, Navigation, Shield, Award, Timer,
  CreditCard, Package, ArrowRight, Filter, Search, MoreHorizontal, Bell, RefreshCw
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
  isNegotiable: boolean;
  offeredPrice: number;
  counterOfferPrice: number;
  hasCounterOffer: boolean;
  adminApproved: boolean;
  hasAdditionalPending: boolean;
  provider: Provider | null;
  providerId: string;
  createdAt: string;
  createdAtRaw: Date;
}

const TABS = [
  { key: 'PENDING', label: 'Pending', icon: Clock, color: '#F59E0B' },
  { key: 'ONGOING', label: 'Ongoing', icon: Zap, color: '#3B82F6' },
  { key: 'COMPLETED', label: 'Completed', icon: CheckCircle, color: '#10B981' },
  { key: 'CANCELLED', label: 'Cancelled', icon: AlertCircle, color: '#EF4444' },
];

const SORT_OPTIONS = [
  { key: 'date_desc', label: 'Newest', icon: Clock },
  { key: 'date_asc', label: 'Oldest', icon: Timer },
  { key: 'amount_desc', label: 'Highest ₱', icon: CreditCard },
  { key: 'amount_asc', label: 'Lowest ₱', icon: Tag },
];

const STATUS_MAP: Record<string, string[]> = {
  'PENDING': ['pending', 'pending_negotiation', 'counter_offer', 'approved'],
  'ONGOING': ['accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion', 'pending_payment', 'payment_received'],
  'COMPLETED': ['completed'],
  'CANCELLED': ['cancelled', 'rejected', 'declined'],
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  'electrician': { bg: 'bg-amber-50', text: 'text-amber-700', icon: '⚡' },
  'plumber': { bg: 'bg-blue-50', text: 'text-blue-700', icon: '🔧' },
  'carpenter': { bg: 'bg-orange-50', text: 'text-orange-700', icon: '🪚' },
  'cleaner': { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '🧹' },
  'general': { bg: 'bg-purple-50', text: 'text-purple-700', icon: '🔨' },
};

export default function BookingsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [sortBy, setSortBy] = useState('date_desc');
  const [loadingData, setLoadingData] = useState(true);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  // Real-time listener for bookings
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
        
        // Count for each tab
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
          } catch (e) { console.log('Error fetching provider:', e); }
        }

        let fullLocation = '';
        if (data.houseNumber) fullLocation += data.houseNumber + ', ';
        if (data.streetAddress) fullLocation += data.streetAddress + ', ';
        if (data.barangay) fullLocation += 'Brgy. ' + data.barangay + ', ';
        fullLocation += 'Maasin City';
        if (!data.streetAddress && !data.barangay) fullLocation = data.location || data.address || 'Maasin City';
        
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
          isNegotiable: data.isNegotiable || false,
          offeredPrice: data.offeredPrice || 0,
          counterOfferPrice: data.counterOfferPrice || 0,
          hasCounterOffer: data.hasCounterOffer || false,
          adminApproved: data.adminApproved || false,
          hasAdditionalPending: data.hasAdditionalPending || false,
          provider: providerInfo,
          providerId: data.providerId || '',
          createdAt: data.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'Unknown',
          createdAtRaw: data.createdAt?.toDate?.() || new Date(0),
        });
      }

      setTabCounts(counts);

      // Filter by active tab
      const statuses = STATUS_MAP[activeTab] || ['pending'];
      let filtered = allBookings.filter(b => statuses.includes(b.status));

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(b => 
          b.title.toLowerCase().includes(q) || 
          b.serviceCategory.toLowerCase().includes(q) ||
          b.provider?.name.toLowerCase().includes(q)
        );
      }

      // Sort
      switch (sortBy) {
        case 'date_asc': filtered.sort((a, b) => a.createdAtRaw.getTime() - b.createdAtRaw.getTime()); break;
        case 'amount_desc': filtered.sort((a, b) => b.totalAmount - a.totalAmount); break;
        case 'amount_asc': filtered.sort((a, b) => a.totalAmount - b.totalAmount); break;
        default: filtered.sort((a, b) => b.createdAtRaw.getTime() - a.createdAtRaw.getTime());
      }

      setBookings(filtered);
      setLoadingData(false);
    }, (error) => { console.log('Error:', error); setLoadingData(false); });

    return () => unsubscribe();
  }, [user, activeTab, sortBy, searchQuery]);

  const getStatusConfig = (status: string, job: Booking) => {
    const s = status?.toLowerCase();
    const configs: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
      'pending': { label: job.adminApproved ? 'Pending Provider' : 'Awaiting Review', color: '#F59E0B', bg: 'bg-amber-50', icon: Clock },
      'pending_negotiation': { label: 'Offer Sent', color: '#8B5CF6', bg: 'bg-purple-50', icon: Tag },
      'counter_offer': { label: 'Counter Offer', color: '#EC4899', bg: 'bg-pink-50', icon: Tag },
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
    return configs[s] || { label: status?.replace(/_/g, ' ') || 'Unknown', color: '#6B7280', bg: 'bg-gray-50', icon: Clock };
  };

  const getCategoryStyle = (category: string) => {
    const key = category?.toLowerCase() || 'general';
    return CATEGORY_COLORS[key] || CATEGORY_COLORS['general'];
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
        <div className="bg-gradient-to-r from-[#00B14F] via-emerald-500 to-teal-500">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">My Bookings</h1>
                <p className="text-emerald-100 text-sm mt-1">Track and manage your service requests</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors">
                  <Bell className="w-5 h-5 text-white" />
                </button>
                <button onClick={() => window.location.reload()} className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors">
                  <RefreshCw className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                const count = tabCounts[tab.key] || 0;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative p-4 rounded-2xl transition-all ${
                      isActive 
                        ? 'bg-white shadow-lg shadow-black/10 scale-105' 
                        : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${isActive ? '' : 'bg-white/20'}`} style={{ backgroundColor: isActive ? `${tab.color}20` : undefined }}>
                      <Icon className="w-5 h-5" style={{ color: isActive ? tab.color : 'white' }} />
                    </div>
                    <p className={`text-2xl font-bold ${isActive ? 'text-gray-900' : 'text-white'}`}>{count}</p>
                    <p className={`text-sm ${isActive ? 'text-gray-500' : 'text-white/80'}`}>{tab.label}</p>
                    {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#00B14F] rounded-full" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="max-w-5xl mx-auto px-4 -mt-4 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-4 flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-100 focus:outline-none transition-all"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{SORT_OPTIONS.find(s => s.key === sortBy)?.label}</span>
              </button>
              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50">
                  {SORT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => { setSortBy(opt.key); setShowSortDropdown(false); }}
                        className={`flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 transition-colors ${sortBy === opt.key ? 'bg-green-50' : ''}`}
                      >
                        <Icon className={`w-4 h-4 ${sortBy === opt.key ? 'text-[#00B14F]' : 'text-gray-400'}`} />
                        <span className={`text-sm ${sortBy === opt.key ? 'text-[#00B14F] font-medium' : 'text-gray-700'}`}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          {loadingData ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-1/3" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No {activeTab.toLowerCase()} bookings</h3>
              <p className="text-gray-500 mb-6">Your {activeTab.toLowerCase()} service requests will appear here</p>
              <button
                onClick={() => router.push('/client/providers')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] transition-colors"
              >
                <span>Find a Provider</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((job, index) => {
                const statusConfig = getStatusConfig(job.status, job);
                const StatusIcon = statusConfig.icon;
                const categoryStyle = getCategoryStyle(job.serviceCategory);
                
                return (
                  <div
                    key={job.id}
                    onClick={() => router.push(`/client/bookings/${job.id}`)}
                    className="group bg-white rounded-2xl shadow-lg shadow-gray-100 hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-gray-100 hover:border-[#00B14F]/30"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Status Bar */}
                    <div className="h-1.5" style={{ backgroundColor: statusConfig.color }} />
                    
                    <div className="p-5">
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {/* Category Badge */}
                          <div className={`px-3 py-1.5 rounded-lg ${categoryStyle.bg} flex items-center gap-2`}>
                            <span>{categoryStyle.icon}</span>
                            <span className={`text-sm font-semibold ${categoryStyle.text}`}>{job.serviceCategory}</span>
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bg}`} style={{ color: statusConfig.color }}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm font-bold">{statusConfig.label}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-[#00B14F] transition-colors">{job.title}</h3>

                      {/* Alert Banners */}
                      {job.status === 'counter_offer' && (
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl mb-4 border border-pink-200">
                          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                            <Tag className="w-5 h-5 text-pink-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-pink-700">Counter Offer Received</p>
                            <p className="text-xs text-pink-600">Provider offered ₱{job.counterOfferPrice?.toLocaleString()}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-pink-400" />
                        </div>
                      )}

                      {job.status === 'traveling' && (
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl mb-4 border border-blue-200">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center animate-pulse">
                            <Car className="w-5 h-5 text-blue-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-700">Provider is on the way!</p>
                            <p className="text-xs text-blue-600">Tap to track live location</p>
                          </div>
                          <Navigation className="w-5 h-5 text-blue-400" />
                        </div>
                      )}

                      {job.status === 'arrived' && (
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl mb-4 border border-purple-200">
                          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-purple-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-purple-700">Provider has arrived!</p>
                            <p className="text-xs text-purple-600">They&apos;re at your location</p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-purple-400" />
                        </div>
                      )}

                      {job.hasAdditionalPending && (
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl mb-4 border border-amber-200">
                          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-700">Action Required</p>
                            <p className="text-xs text-amber-600">Additional charge needs approval</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-amber-400" />
                        </div>
                      )}

                      {/* Provider & Details */}
                      <div className="flex items-center gap-4">
                        {/* Provider Photo */}
                        <div className="relative">
                          {job.provider?.profilePhoto ? (
                            <Image src={job.provider.profilePhoto} alt="" width={56} height={56} className="w-14 h-14 rounded-xl object-cover" />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                              <User className="w-7 h-7 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">{job.provider?.name || 'Awaiting provider'}</span>
                            {job.provider?.rating && job.provider.rating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span className="text-xs text-gray-500">{job.provider.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{job.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>{job.createdAt}</span>
                          </div>
                        </div>

                        {/* Price & Action */}
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">₱{(job.totalAmount || job.amount).toLocaleString()}</p>
                          <p className="text-xs text-gray-400 mb-3">Total amount</p>
                          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] transition-all group-hover:shadow-lg group-hover:shadow-green-200">
                            <span>View</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>

                      {/* Quick Actions for Ongoing */}
                      {['traveling', 'arrived', 'in_progress'].includes(job.status) && job.provider?.phone && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${job.provider?.phone}`; }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                            <span>Call</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/chat/${job.providerId}`); }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Message</span>
                          </button>
                          {job.status === 'traveling' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/client/bookings/${job.id}/tracking`); }}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 rounded-xl text-blue-600 font-medium hover:bg-blue-100 transition-colors"
                            >
                              <Navigation className="w-4 h-4" />
                              <span>Track</span>
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
