'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendProviderApprovalEmail, sendNotificationEmail } from '@/lib/email';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Users, Search, CheckCircle, XCircle, Star, Mail, Phone, Calendar, MapPin, Eye,
  PauseCircle, PlayCircle, Home, Navigation, Building, Flag, RefreshCw,
  Shield, ChevronRight, Clock,
} from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  status: string;
  rating: number;
  completedJobs: number;
  registeredDate: string;
  registeredDateRaw: Date;
  location: string;
  streetAddress: string;
  houseNumber: string;
  barangay: string;
  landmark: string;
  profilePhoto?: string;
  documents: {
    governmentId: { submitted: boolean; url?: string };
    selfie: { submitted: boolean; url?: string };
    barangayClearance: { submitted: boolean; url?: string };
    policeClearance: { submitted: boolean; url?: string };
    certificates: { submitted: boolean; urls?: string[] };
  };
  suspensionReason?: string;
  suspendedAt?: string;
}

const SUSPENSION_REASONS = [
  { id: 'policy_violation', label: 'Policy Violation' },
  { id: 'fraudulent_activity', label: 'Fraudulent Activity' },
  { id: 'customer_complaints', label: 'Multiple Customer Complaints' },
  { id: 'incomplete_documentation', label: 'Incomplete Documentation' },
  { id: 'unprofessional_conduct', label: 'Unprofessional Conduct' },
  { id: 'safety_concerns', label: 'Safety Concerns' },
  { id: 'other', label: 'Other' },
];


const getCategoryStyle = (category: string) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('electric')) return { bg: 'from-amber-500 to-yellow-600', icon: '⚡', shadow: 'shadow-amber-500/30' };
  if (cat.includes('plumb')) return { bg: 'from-blue-500 to-cyan-600', icon: '🔧', shadow: 'shadow-blue-500/30' };
  if (cat.includes('carpent')) return { bg: 'from-orange-500 to-amber-600', icon: '🪚', shadow: 'shadow-orange-500/30' };
  if (cat.includes('clean')) return { bg: 'from-emerald-500 to-teal-600', icon: '🧹', shadow: 'shadow-emerald-500/30' };
  if (cat.includes('paint')) return { bg: 'from-pink-500 to-rose-600', icon: '🎨', shadow: 'shadow-pink-500/30' };
  if (cat.includes('aircon') || cat.includes('hvac')) return { bg: 'from-sky-500 to-blue-600', icon: '❄️', shadow: 'shadow-sky-500/30' };
  return { bg: 'from-violet-500 to-purple-600', icon: '🛠️', shadow: 'shadow-violet-500/30' };
};

export default function ProvidersPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'suspended'>('all');
  const [loadingData, setLoadingData] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'reactivate' | null>(null);
  const [confirmProvider, setConfirmProvider] = useState<Provider | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filters = [
    { id: 'all' as const, label: 'All', icon: Users, color: 'violet' },
    { id: 'pending' as const, label: 'Pending', icon: Clock, color: 'amber' },
    { id: 'approved' as const, label: 'Approved', icon: CheckCircle, color: 'emerald' },
    { id: 'suspended' as const, label: 'Suspended', icon: PauseCircle, color: 'red' },
  ];

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (user?.role?.toUpperCase() !== 'ADMIN') router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);


  useEffect(() => {
    if (user?.role?.toUpperCase() !== 'ADMIN') return;
    setLoadingData(true);

    const providersQuery = query(collection(db, 'users'), where('role', '==', 'PROVIDER'));

    const unsubscribe = onSnapshot(providersQuery, async (snapshot) => {
      const providersList: Provider[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();

          let fullAddress = '';
          if (data.houseNumber) fullAddress += data.houseNumber + ', ';
          if (data.streetAddress) fullAddress += data.streetAddress + ', ';
          if (data.barangay) fullAddress += 'Brgy. ' + data.barangay + ', ';
          fullAddress += 'Maasin City';
          if (!data.streetAddress && !data.barangay) {
            fullAddress = data.address || data.location || 'Maasin City';
          }

          let completedJobsCount = data.completedJobs || 0;
          try {
            const bookingsQuery = query(
              collection(db, 'bookings'),
              where('providerId', '==', docSnap.id),
              where('status', '==', 'completed')
            );
            const bookingsSnap = await getDocs(bookingsQuery);
            completedJobsCount = bookingsSnap.size;
          } catch (e) {}

          return {
            id: docSnap.id,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email?.split('@')[0] || 'Unknown',
            email: data.email || '',
            phone: data.phone || data.phoneNumber || 'Not provided',
            service: data.serviceCategory || data.service || 'General Services',
            status: data.status || data.providerStatus || 'pending',
            rating: data.rating || data.averageRating || 0,
            completedJobs: completedJobsCount,
            registeredDate: data.createdAt?.toDate?.()
              ? `${data.createdAt.toDate().toLocaleDateString()} at ${data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Unknown',
            registeredDateRaw: data.createdAt?.toDate?.() || new Date(0),
            location: fullAddress,
            streetAddress: data.streetAddress || '',
            houseNumber: data.houseNumber || '',
            barangay: data.barangay || '',
            landmark: data.landmark || '',
            profilePhoto: data.profilePhoto,
            documents: {
              governmentId: { submitted: !!data.documents?.governmentIdUrl, url: data.documents?.governmentIdUrl },
              selfie: { submitted: !!data.documents?.selfieUrl, url: data.documents?.selfieUrl },
              barangayClearance: { submitted: !!data.documents?.barangayClearanceUrl, url: data.documents?.barangayClearanceUrl },
              policeClearance: { submitted: !!data.documents?.policeClearanceUrl, url: data.documents?.policeClearanceUrl },
              certificates: { submitted: !!(data.documents?.certificateUrls?.length > 0), urls: data.documents?.certificateUrls || [] },
            },
            suspensionReason: data.suspensionReason,
            suspendedAt: data.suspendedAt?.toDate?.()?.toLocaleDateString(),
          };
        })
      );

      providersList.sort((a, b) => b.registeredDateRaw.getTime() - a.registeredDateRaw.getTime());
      setAllProviders(providersList);
      setProviders(providersList);
      setLoadingData(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    filterProviders();
  }, [allProviders, searchQuery, activeFilter]);


  const filterProviders = () => {
    let filtered = [...allProviders];
    if (activeFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === activeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || p.service.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
      );
    }
    setProviders(filtered);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { bg: 'bg-gradient-to-r from-amber-500 to-yellow-500', text: 'text-white', dot: 'bg-amber-300' };
      case 'approved': return { bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', text: 'text-white', dot: 'bg-emerald-300' };
      case 'suspended': return { bg: 'bg-gradient-to-r from-red-500 to-rose-500', text: 'text-white', dot: 'bg-red-300' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
    }
  };

  const updateProviderStatus = async (providerId: string, newStatus: string, additionalData = {}) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'users', providerId), {
        status: newStatus,
        providerStatus: newStatus,
        updatedAt: new Date(),
        ...additionalData,
      });
      return true;
    } catch (error) {
      console.error('Error updating provider:', error);
      alert('Failed to update provider status');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const openConfirmModal = (action: 'approve' | 'reject' | 'reactivate', provider: Provider) => {
    setConfirmAction(action);
    setConfirmProvider(provider);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmProvider || !confirmAction) return;
    
    if (confirmAction === 'approve') {
      const success = await updateProviderStatus(confirmProvider.id, 'approved', { isOnline: true });
      if (success) {
        setShowModal(false);
        setShowConfirmModal(false);
        try { await sendProviderApprovalEmail(confirmProvider.email, confirmProvider.name, true); } catch (e) {}
      }
    } else if (confirmAction === 'reject') {
      const success = await updateProviderStatus(confirmProvider.id, 'rejected');
      if (success) {
        setShowModal(false);
        setShowConfirmModal(false);
        try { await sendProviderApprovalEmail(confirmProvider.email, confirmProvider.name, false); } catch (e) {}
      }
    } else if (confirmAction === 'reactivate') {
      const success = await updateProviderStatus(confirmProvider.id, 'approved', { isOnline: true, suspensionReason: null, suspendedAt: null });
      if (success) {
        setShowModal(false);
        setShowConfirmModal(false);
        try {
          await sendNotificationEmail(confirmProvider.email, confirmProvider.name, 'Account Reactivated',
            'Great news! Your provider account has been reactivated. You can now start receiving job requests again.',
            'Open the GSS Maasin app to view available jobs.');
        } catch (e) {}
      }
    }
    setConfirmAction(null);
    setConfirmProvider(null);
  };

  const handleApprove = (provider: Provider) => openConfirmModal('approve', provider);
  const handleReject = (provider: Provider) => openConfirmModal('reject', provider);
  const handleReactivate = (provider: Provider) => openConfirmModal('reactivate', provider);


  const handleSuspend = async () => {
    if (!selectedProvider) return;
    if (!suspendReason) { alert('Please select a suspension reason.'); return; }
    if (suspendReason === 'other' && !customReason.trim()) { alert('Please provide a custom reason.'); return; }

    const reasonText = suspendReason === 'other' ? customReason : SUSPENSION_REASONS.find((r) => r.id === suspendReason)?.label;
    const success = await updateProviderStatus(selectedProvider.id, 'suspended', { isOnline: false, suspensionReason: reasonText, suspendedAt: new Date() });
    if (success) {
      setShowSuspendModal(false);
      setShowModal(false);
      setSuspendReason('');
      setCustomReason('');
      try {
        await sendNotificationEmail(selectedProvider.email, selectedProvider.name, 'Account Suspended',
          `Your provider account has been suspended. Reason: ${reasonText}`, 'Please contact support if you believe this is an error.');
      } catch (e) {}
    }
  };

  const handleRefresh = () => { setRefreshing(true); };

  const getStats = () => ({
    all: allProviders.length,
    pending: allProviders.filter((p) => p.status === 'pending').length,
    approved: allProviders.filter((p) => p.status === 'approved').length,
    suspended: allProviders.filter((p) => p.status === 'suspended').length,
  });

  const stats = getStats();

  if (isLoading || loadingData) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-purple-200 font-medium">Loading providers...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-purple-200 text-sm font-medium">Manage</p>
                  <h1 className="text-3xl font-bold text-white">Service Providers</h1>
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

            {/* Stats Cards in Header */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-purple-200 text-sm font-medium">Total</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.all}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-amber-500/30 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-300" />
                  </div>
                  <span className="text-amber-200 text-sm font-medium">Pending</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.pending}</p>
                {stats.pending > 0 && <p className="text-amber-300 text-xs mt-1 font-semibold">⚠️ Needs review</p>}
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-500/30 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-300" />
                  </div>
                  <span className="text-emerald-200 text-sm font-medium">Approved</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.approved}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-red-500/30 rounded-xl flex items-center justify-center">
                    <PauseCircle className="w-5 h-5 text-red-300" />
                  </div>
                  <span className="text-red-200 text-sm font-medium">Suspended</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.suspended}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Search & Filters */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 placeholder-gray-400"
                />
              </div>
              <div className="flex gap-2">
                {filters.map((filter) => {
                  const isActive = activeFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label}
                      {filter.id !== 'all' && (
                        <span className={`min-w-[20px] h-5 rounded-full text-xs flex items-center justify-center ${
                          isActive ? 'bg-white/20' : 'bg-gray-200'
                        }`}>
                          {stats[filter.id]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Providers Grid */}
          {providers.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No providers found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((provider) => {
                const catStyle = getCategoryStyle(provider.service);
                const statusStyle = getStatusStyle(provider.status);
                return (
                  <div
                    key={provider.id}
                    onClick={() => { setSelectedProvider(provider); setShowModal(true); }}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group flex flex-col"
                  >
                    {/* Card Header with Gradient */}
                    <div className={`bg-gradient-to-r ${catStyle.bg} p-4 relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                      <div className="relative flex items-center gap-3">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                          {provider.profilePhoto ? (
                            <img src={provider.profilePhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-bold text-gray-700">
                              {provider.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-lg truncate">{provider.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{catStyle.icon}</span>
                            <span className="text-white/90 text-sm font-medium truncate">{provider.service}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex flex-col flex-1">
                      {/* Status Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`${statusStyle.bg} ${statusStyle.text} px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5`}>
                          <span className={`w-2 h-2 ${statusStyle.dot} rounded-full animate-pulse`}></span>
                          {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                        </span>
                        {provider.rating > 0 && (
                          <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="text-amber-700 font-bold text-sm">{provider.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats Row - Always show for consistent height */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                          <p className="text-emerald-600 font-bold text-lg">{provider.completedJobs}</p>
                          <p className="text-emerald-600/70 text-xs font-medium">Jobs Done</p>
                        </div>
                        <div className="bg-violet-50 rounded-xl p-2.5 text-center">
                          <p className="text-violet-600 font-bold text-lg">{provider.rating > 0 ? provider.rating.toFixed(1) : '-'}</p>
                          <p className="text-violet-600/70 text-xs font-medium">Rating</p>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2 text-sm flex-1">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{provider.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{provider.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-xs">{provider.registeredDate}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
                        {provider.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApprove(provider); }}
                              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                            >
                              <CheckCircle className="w-4 h-4" /> Approve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReject(provider); }}
                              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-500 to-rose-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-red-500/30 transition-all"
                            >
                              <XCircle className="w-4 h-4" /> Reject
                            </button>
                          </>
                        )}
                        {provider.status === 'approved' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedProvider(provider); setShowModal(true); }}
                              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/30 transition-all"
                            >
                              <Eye className="w-4 h-4" /> View
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedProvider(provider); setShowSuspendModal(true); }}
                              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                            >
                              <PauseCircle className="w-4 h-4" /> Suspend
                            </button>
                          </>
                        )}
                        {provider.status === 'suspended' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReactivate(provider); }}
                            className="col-span-2 w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                          >
                            <PlayCircle className="w-4 h-4" /> Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showModal && selectedProvider && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header with Gradient */}
              <div className={`bg-gradient-to-r ${getCategoryStyle(selectedProvider.service).bg} p-6 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10">
                  ✕
                </button>
                <div className="relative flex items-center gap-4">
                  <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden">
                    {selectedProvider.profilePhoto ? (
                      <img src={selectedProvider.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-gray-700">
                        {selectedProvider.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{selectedProvider.name}</h2>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getCategoryStyle(selectedProvider.service).icon}</span>
                      <span className="text-white/90 font-medium">{selectedProvider.service}</span>
                    </div>
                    <span className={`${getStatusStyle(selectedProvider.status).bg} ${getStatusStyle(selectedProvider.status).text} px-3 py-1 rounded-full text-xs font-bold`}>
                      {selectedProvider.status.charAt(0).toUpperCase() + selectedProvider.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Stats for Approved */}
                {selectedProvider.status === 'approved' && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 text-center border border-amber-100">
                      <Star className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-gray-900">{selectedProvider.rating.toFixed(1)}</p>
                      <p className="text-amber-600 text-sm font-medium">Rating</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 text-center border border-emerald-100">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-gray-900">{selectedProvider.completedJobs}</p>
                      <p className="text-emerald-600 text-sm font-medium">Jobs Completed</p>
                    </div>
                  </div>
                )}

                {/* Suspension Info */}
                {selectedProvider.status === 'suspended' && selectedProvider.suspensionReason && (
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 mb-6 border border-red-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-red-500" />
                      <h4 className="font-bold text-red-700">Suspension Details</h4>
                    </div>
                    <p className="text-red-600">{selectedProvider.suspensionReason}</p>
                    {selectedProvider.suspendedAt && <p className="text-red-500 text-sm mt-1">Suspended on: {selectedProvider.suspendedAt}</p>}
                  </div>
                )}

                {/* Contact Info */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-violet-500" /> Contact Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-white rounded-xl p-3">
                      <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{selectedProvider.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white rounded-xl p-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="font-medium text-gray-900">{selectedProvider.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-violet-500" /> Address
                  </h4>
                  <div className="space-y-2">
                    {selectedProvider.houseNumber && (
                      <div className="flex items-center gap-3 bg-white rounded-xl p-3">
                        <Home className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-700">House/Bldg: {selectedProvider.houseNumber}</span>
                      </div>
                    )}
                    {selectedProvider.streetAddress && (
                      <div className="flex items-center gap-3 bg-white rounded-xl p-3">
                        <Navigation className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-700">Street: {selectedProvider.streetAddress}</span>
                      </div>
                    )}
                    {selectedProvider.barangay && (
                      <div className="flex items-center gap-3 bg-white rounded-xl p-3">
                        <Building className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-700">Barangay: {selectedProvider.barangay}</span>
                      </div>
                    )}
                    {selectedProvider.landmark && (
                      <div className="flex items-center gap-3 bg-white rounded-xl p-3">
                        <Flag className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-700">Landmark: {selectedProvider.landmark}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 bg-white rounded-xl p-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{selectedProvider.location}</span>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-violet-500" /> Verification Documents
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Government ID */}
                    <div className={`rounded-xl overflow-hidden border-2 ${selectedProvider.documents.governmentId.url ? 'border-emerald-400' : 'border-red-300'}`}>
                      <div className={`px-3 py-2 flex items-center justify-between ${selectedProvider.documents.governmentId.url ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <p className="text-sm font-semibold text-gray-700">🪪 Government ID</p>
                        {selectedProvider.documents.governmentId.url ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      {selectedProvider.documents.governmentId.url ? (
                        <a href={selectedProvider.documents.governmentId.url} target="_blank" rel="noopener noreferrer">
                          <img src={selectedProvider.documents.governmentId.url} alt="Government ID" className="w-full h-28 object-cover hover:opacity-90 transition-opacity" />
                        </a>
                      ) : (
                        <div className="h-28 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Not submitted</div>
                      )}
                    </div>

                    {/* Selfie with ID */}
                    <div className={`rounded-xl overflow-hidden border-2 ${selectedProvider.documents.selfie.url ? 'border-emerald-400' : 'border-red-300'}`}>
                      <div className={`px-3 py-2 flex items-center justify-between ${selectedProvider.documents.selfie.url ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <p className="text-sm font-semibold text-gray-700">🤳 Selfie with ID</p>
                        {selectedProvider.documents.selfie.url ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      {selectedProvider.documents.selfie.url ? (
                        <a href={selectedProvider.documents.selfie.url} target="_blank" rel="noopener noreferrer">
                          <img src={selectedProvider.documents.selfie.url} alt="Selfie" className="w-full h-28 object-cover hover:opacity-90 transition-opacity" />
                        </a>
                      ) : (
                        <div className="h-28 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Not submitted</div>
                      )}
                    </div>

                    {/* Barangay Clearance */}
                    <div className={`rounded-xl overflow-hidden border-2 ${selectedProvider.documents.barangayClearance.url ? 'border-emerald-400' : 'border-red-300'}`}>
                      <div className={`px-3 py-2 flex items-center justify-between ${selectedProvider.documents.barangayClearance.url ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <p className="text-sm font-semibold text-gray-700">📜 Brgy Clearance</p>
                        {selectedProvider.documents.barangayClearance.url ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      {selectedProvider.documents.barangayClearance.url ? (
                        <a href={selectedProvider.documents.barangayClearance.url} target="_blank" rel="noopener noreferrer">
                          <img src={selectedProvider.documents.barangayClearance.url} alt="Barangay Clearance" className="w-full h-28 object-cover hover:opacity-90 transition-opacity" />
                        </a>
                      ) : (
                        <div className="h-28 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Not submitted</div>
                      )}
                    </div>

                    {/* Police Clearance */}
                    <div className={`rounded-xl overflow-hidden border-2 ${selectedProvider.documents.policeClearance.url ? 'border-emerald-400' : 'border-red-300'}`}>
                      <div className={`px-3 py-2 flex items-center justify-between ${selectedProvider.documents.policeClearance.url ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <p className="text-sm font-semibold text-gray-700">👮 Police Clearance</p>
                        {selectedProvider.documents.policeClearance.url ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      {selectedProvider.documents.policeClearance.url ? (
                        <a href={selectedProvider.documents.policeClearance.url} target="_blank" rel="noopener noreferrer">
                          <img src={selectedProvider.documents.policeClearance.url} alt="Police Clearance" className="w-full h-28 object-cover hover:opacity-90 transition-opacity" />
                        </a>
                      ) : (
                        <div className="h-28 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Not submitted</div>
                      )}
                    </div>

                    {/* Certificate */}
                    <div className={`col-span-2 rounded-xl overflow-hidden border-2 ${selectedProvider.documents.certificates.urls?.length ? 'border-emerald-400' : 'border-red-300'}`}>
                      <div className={`px-3 py-2 flex items-center justify-between ${selectedProvider.documents.certificates.urls?.length ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <p className="text-sm font-semibold text-gray-700">🎓 Certificate (TESDA/Skills)</p>
                        {selectedProvider.documents.certificates.urls?.length ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      {selectedProvider.documents.certificates.urls?.length ? (
                        <a href={selectedProvider.documents.certificates.urls[0]} target="_blank" rel="noopener noreferrer">
                          <img src={selectedProvider.documents.certificates.urls[0]} alt="Certificate" className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                        </a>
                      ) : (
                        <div className="h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Not submitted</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* View Full Details */}
                <button
                  onClick={() => router.push(`/admin/providers/${selectedProvider.id}`)}
                  className="w-full py-3 bg-gray-100 text-violet-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors mb-4 flex items-center justify-center gap-2"
                >
                  View Full Details <ChevronRight className="w-5 h-5" />
                </button>

                {/* Actions */}
                <div className="flex gap-3">
                  {selectedProvider.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(selectedProvider)} disabled={updating}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50">
                        <CheckCircle className="w-5 h-5" /> Approve
                      </button>
                      <button onClick={() => handleReject(selectedProvider)} disabled={updating}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50">
                        <XCircle className="w-5 h-5" /> Reject
                      </button>
                    </>
                  )}
                  {selectedProvider.status === 'approved' && (
                    <button onClick={() => { setShowModal(false); setShowSuspendModal(true); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all">
                      <PauseCircle className="w-5 h-5" /> Suspend Provider
                    </button>
                  )}
                  {selectedProvider.status === 'suspended' && (
                    <button onClick={() => handleReactivate(selectedProvider)} disabled={updating}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50">
                      <PlayCircle className="w-5 h-5" /> Reactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suspend Modal */}
        {showSuspendModal && selectedProvider && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSuspendModal(false)}>
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                <PauseCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-center text-gray-900 mb-2">Suspend Provider</h2>
              <p className="text-center text-gray-500 mb-6">Select a reason for suspending <span className="font-semibold text-gray-900">{selectedProvider.name}</span></p>
              
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {SUSPENSION_REASONS.map((reason) => (
                  <label key={reason.id} className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                    suspendReason === reason.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                    <input type="radio" name="suspendReason" value={reason.id} checked={suspendReason === reason.id}
                      onChange={(e) => setSuspendReason(e.target.value)} className="w-4 h-4 text-orange-500 focus:ring-orange-500" />
                    <span className="font-medium text-gray-700">{reason.label}</span>
                  </label>
                ))}
              </div>
              
              {suspendReason === 'other' && (
                <textarea placeholder="Please specify the reason..." value={customReason} onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full p-3.5 border-2 border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none" rows={3} />
              )}
              
              <div className="flex gap-3">
                <button onClick={() => { setShowSuspendModal(false); setSuspendReason(''); setCustomReason(''); }}
                  className="flex-1 py-3.5 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSuspend} disabled={updating}
                  className="flex-1 py-3.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50">
                  {updating ? 'Suspending...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && confirmProvider && confirmAction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConfirmModal(false)}>
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
                confirmAction === 'approve' ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30' :
                confirmAction === 'reject' ? 'bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/30' :
                'bg-gradient-to-br from-blue-500 to-indigo-500 shadow-blue-500/30'
              }`}>
                {confirmAction === 'approve' && <CheckCircle className="w-8 h-8 text-white" />}
                {confirmAction === 'reject' && <XCircle className="w-8 h-8 text-white" />}
                {confirmAction === 'reactivate' && <PlayCircle className="w-8 h-8 text-white" />}
              </div>

              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
                {confirmAction === 'approve' && 'Approve Provider'}
                {confirmAction === 'reject' && 'Reject Provider'}
                {confirmAction === 'reactivate' && 'Reactivate Provider'}
              </h3>

              <p className="text-center text-gray-500 mb-6">
                {confirmAction === 'approve' && <>Are you sure you want to approve <span className="font-semibold text-gray-900">{confirmProvider.name}</span>?</>}
                {confirmAction === 'reject' && <>Are you sure you want to reject <span className="font-semibold text-gray-900">{confirmProvider.name}</span>?</>}
                {confirmAction === 'reactivate' && <>Are you sure you want to reactivate <span className="font-semibold text-gray-900">{confirmProvider.name}</span>&apos;s account?</>}
              </p>

              <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 bg-gradient-to-br ${getCategoryStyle(confirmProvider.service).bg} rounded-xl flex items-center justify-center text-white font-bold text-lg overflow-hidden`}>
                    {confirmProvider.profilePhoto ? (
                      <img src={confirmProvider.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      confirmProvider.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{confirmProvider.name}</p>
                    <p className="text-sm text-violet-600 font-medium">{confirmProvider.service}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setShowConfirmModal(false); setConfirmAction(null); setConfirmProvider(null); }}
                  className="flex-1 py-3.5 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleConfirmAction} disabled={updating}
                  className={`flex-1 py-3.5 text-white rounded-xl font-bold transition-all disabled:opacity-50 ${
                    confirmAction === 'approve' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/30' :
                    confirmAction === 'reject' ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/30' :
                    'bg-gradient-to-r from-blue-500 to-indigo-500 hover:shadow-lg hover:shadow-blue-500/30'
                  }`}>
                  {updating ? 'Processing...' : (
                    confirmAction === 'approve' ? 'Yes, Approve' :
                    confirmAction === 'reject' ? 'Yes, Reject' : 'Yes, Reactivate'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
