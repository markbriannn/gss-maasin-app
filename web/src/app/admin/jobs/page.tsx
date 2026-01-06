'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Briefcase, Search, Clock, MapPin, CheckCircle, XCircle, CreditCard, RefreshCw,
  ChevronRight, DollarSign, User, Wrench, Calendar, Eye, AlertCircle, Zap,
} from 'lucide-react';

interface ClientInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface ProviderInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Job {
  id: string;
  title: string;
  category: string;
  status: string;
  client: ClientInfo;
  provider: ProviderInfo;
  amount: number;
  providerPrice: number;
  systemFee: number;
  scheduledDate: string;
  scheduledTime: string;
  location: string;
  description: string;
  createdAt: string;
  createdAtRaw: Date;
  media: string[];
  isNegotiable: boolean;
  offeredPrice: number;
  providerFixedPrice: number;
  counterOfferPrice: number;
  adminApproved: boolean;
  paymentPreference: string;
  isPaidUpfront: boolean;
  upfrontPaidAmount: number;
}


const getCategoryStyle = (category: string) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('electric')) return { bg: 'from-amber-500 to-yellow-600', icon: '⚡', color: 'amber' };
  if (cat.includes('plumb')) return { bg: 'from-blue-500 to-cyan-600', icon: '🔧', color: 'blue' };
  if (cat.includes('carpent')) return { bg: 'from-orange-500 to-amber-600', icon: '🪚', color: 'orange' };
  if (cat.includes('clean')) return { bg: 'from-emerald-500 to-teal-600', icon: '🧹', color: 'emerald' };
  if (cat.includes('paint')) return { bg: 'from-pink-500 to-rose-600', icon: '🎨', color: 'pink' };
  if (cat.includes('aircon') || cat.includes('hvac')) return { bg: 'from-sky-500 to-blue-600', icon: '❄️', color: 'sky' };
  return { bg: 'from-violet-500 to-purple-600', icon: '🛠️', color: 'violet' };
};

const formatDateTime = (date: Date) => {
  if (!date) return 'Unknown';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function AdminJobsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loadingData, setLoadingData] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'approve' | 'reject';
    job: Job | null;
  }>({ show: false, type: 'approve', job: null });

  const filters = [
    { id: 'all', label: 'All', color: 'violet' },
    { id: 'pending', label: 'Pending', color: 'amber' },
    { id: 'pending_negotiation', label: 'Nego', color: 'yellow' },
    { id: 'accepted', label: 'Accepted', color: 'blue' },
    { id: 'in_progress', label: 'Active', color: 'indigo' },
    { id: 'completed', label: 'Done', color: 'emerald' },
    { id: 'cancelled', label: 'Cancel', color: 'gray' },
  ];

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (user?.role?.toUpperCase() !== 'ADMIN') router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role?.toUpperCase() === 'ADMIN') {
      fetchJobs();
      const unsubscribe = onSnapshot(collection(db, 'bookings'), () => fetchJobs());
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    filterJobs();
  }, [allJobs, searchQuery, activeFilter]);


  const fetchJobs = async () => {
    try {
      const jobsQuery = query(collection(db, 'bookings'));
      const snapshot = await getDocs(jobsQuery);

      const jobsList: Job[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();

          let clientInfo: ClientInfo = { id: data.clientId || '', name: data.clientName || 'Unknown Client', phone: 'Not provided' };
          if (data.clientId) {
            try {
              const clientDoc = await getDoc(doc(db, 'users', data.clientId));
              if (clientDoc.exists()) {
                const clientData = clientDoc.data();
                clientInfo = { id: data.clientId, name: `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Unknown', phone: clientData.phone || clientData.phoneNumber || 'Not provided', email: clientData.email };
              }
            } catch (e) {}
          }

          let providerInfo: ProviderInfo = { id: data.providerId || '', name: data.providerName || 'Not Assigned', phone: 'N/A' };
          if (data.providerId) {
            try {
              const providerDoc = await getDoc(doc(db, 'users', data.providerId));
              if (providerDoc.exists()) {
                const providerData = providerDoc.data();
                providerInfo = { id: data.providerId, name: `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim() || 'Unknown', phone: providerData.phone || providerData.phoneNumber || 'Not provided', email: providerData.email };
              }
            } catch (e) {}
          }

          return {
            id: docSnap.id,
            title: data.title || data.serviceTitle || 'Service Request',
            category: data.category || data.serviceCategory || 'General',
            status: data.status || 'pending',
            client: clientInfo,
            provider: providerInfo,
            amount: data.totalAmount || data.amount || data.price || 0,
            providerPrice: data.providerPrice || data.offeredPrice || 0,
            systemFee: data.systemFee || 0,
            scheduledDate: data.scheduledDate || 'TBD',
            scheduledTime: data.scheduledTime || 'TBD',
            location: data.location || data.address || 'Not specified',
            description: data.description || '',
            createdAt: data.createdAt?.toDate?.() ? formatDateTime(data.createdAt.toDate()) : 'Unknown',
            createdAtRaw: data.createdAt?.toDate?.() || new Date(0),
            media: (data.mediaFiles || data.media || []).map((m: string | { url?: string; uri?: string }) => typeof m === 'string' ? m : (m.url || m.uri || '')).filter((url: string) => url),
            isNegotiable: data.isNegotiable || false,
            offeredPrice: data.offeredPrice || 0,
            providerFixedPrice: data.providerFixedPrice || 0,
            counterOfferPrice: data.counterOfferPrice || 0,
            adminApproved: data.adminApproved || false,
            paymentPreference: data.paymentPreference || 'pay_later',
            isPaidUpfront: data.isPaidUpfront || false,
            upfrontPaidAmount: data.upfrontPaidAmount || 0,
          };
        })
      );

      jobsList.sort((a, b) => b.createdAtRaw.getTime() - a.createdAtRaw.getTime());
      setAllJobs(jobsList);
      setJobs(jobsList);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  const filterJobs = () => {
    let filtered = [...allJobs];
    if (activeFilter !== 'all') filtered = filtered.filter((j) => j.status === activeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((j) => j.title.toLowerCase().includes(q) || j.id.toLowerCase().includes(q) || j.client?.name?.toLowerCase().includes(q) || j.provider?.name?.toLowerCase().includes(q) || j.category?.toLowerCase().includes(q));
    }
    setJobs(filtered);
  };


  const getStatusStyle = (status: string, adminApproved: boolean) => {
    switch (status) {
      case 'pending': return adminApproved ? { bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', text: 'text-white' } : { bg: 'bg-gradient-to-r from-amber-500 to-yellow-500', text: 'text-white' };
      case 'pending_negotiation': return { bg: 'bg-gradient-to-r from-yellow-500 to-amber-500', text: 'text-white' };
      case 'counter_offer': return { bg: 'bg-gradient-to-r from-purple-500 to-violet-500', text: 'text-white' };
      case 'accepted': case 'traveling': return { bg: 'bg-gradient-to-r from-blue-500 to-indigo-500', text: 'text-white' };
      case 'in_progress': return { bg: 'bg-gradient-to-r from-indigo-500 to-purple-500', text: 'text-white' };
      case 'completed': return { bg: 'bg-gradient-to-r from-emerald-500 to-green-500', text: 'text-white' };
      case 'cancelled': case 'rejected': return { bg: 'bg-gradient-to-r from-gray-500 to-slate-500', text: 'text-white' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  };

  const getStatusLabel = (status: string, adminApproved: boolean) => {
    switch (status) {
      case 'pending': return adminApproved ? 'Awaiting Provider' : 'Pending Approval';
      case 'pending_negotiation': return 'Negotiating';
      case 'counter_offer': return 'Counter Offer';
      case 'accepted': return 'Accepted';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'rejected': return 'Rejected';
      default: return status?.replace(/_/g, ' ');
    }
  };

  const handleApproveJob = async (job: Job) => {
    setConfirmModal({ show: true, type: 'approve', job });
  };

  const handleRejectJob = async (job: Job) => {
    setConfirmModal({ show: true, type: 'reject', job });
  };

  const executeApprove = async () => {
    if (!confirmModal.job) return;
    const job = confirmModal.job;
    setUpdating(true);
    setConfirmModal({ show: false, type: 'approve', job: null });
    try {
      await updateDoc(doc(db, 'bookings', job.id), { adminApproved: true, approvedAt: new Date(), approvedBy: 'admin', updatedAt: new Date() });
      setAllJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, adminApproved: true } : j)));
      setShowModal(false);
    } catch (error) {
      console.error('Error approving job:', error);
    } finally {
      setUpdating(false);
    }
  };

  const executeReject = async () => {
    if (!confirmModal.job) return;
    const job = confirmModal.job;
    setUpdating(true);
    setConfirmModal({ show: false, type: 'reject', job: null });
    try {
      await updateDoc(doc(db, 'bookings', job.id), { status: 'rejected', rejectedAt: new Date(), rejectedBy: 'admin', adminRejected: true, updatedAt: new Date() });
      setAllJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'rejected' } : j)));
      setShowModal(false);
    } catch (error) {
      console.error('Error rejecting job:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); fetchJobs(); };

  const getStats = () => ({
    pending: allJobs.filter((j) => j.status === 'pending' && !j.adminApproved).length,
    inProgress: allJobs.filter((j) => j.status === 'in_progress').length,
    completed: allJobs.filter((j) => j.status === 'completed').length,
    total: allJobs.length,
  });

  const stats = getStats();


  if (isLoading || loadingData) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-purple-200 font-medium">Loading jobs...</p>
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
                  <Briefcase className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-purple-200 text-sm font-medium">Manage</p>
                  <h1 className="text-3xl font-bold text-white">Jobs & Bookings</h1>
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
                  <div className="w-10 h-10 bg-amber-500/30 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-300" />
                  </div>
                  <span className="text-amber-200 text-sm font-medium">Pending</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.pending}</p>
                {stats.pending > 0 && <p className="text-amber-300 text-xs mt-1 font-semibold">⚠️ Needs review</p>}
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-300" />
                  </div>
                  <span className="text-blue-200 text-sm font-medium">In Progress</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.inProgress}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-500/30 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-300" />
                  </div>
                  <span className="text-emerald-200 text-sm font-medium">Completed</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.completed}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-violet-500/30 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-violet-300" />
                  </div>
                  <span className="text-violet-200 text-sm font-medium">Total</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
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
                  placeholder="Search by job ID, title, client, or provider..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 placeholder-gray-400"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {filters.map((filter) => {
                  const isActive = activeFilter === filter.id;
                  const count = filter.id === 'all' ? allJobs.length : allJobs.filter(j => j.status === filter.id).length;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label}
                      <span className={`min-w-[20px] h-5 rounded-full text-xs flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-gray-200'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Jobs List */}
          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => {
                const catStyle = getCategoryStyle(job.category);
                const statusStyle = getStatusStyle(job.status, job.adminApproved);
                return (
                  <div
                    key={job.id}
                    onClick={() => { setSelectedJob(job); setShowModal(true); }}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group"
                  >
                    <div className="flex">
                      {/* Category Color Bar */}
                      <div className={`w-2 bg-gradient-to-b ${catStyle.bg}`}></div>
                      
                      <div className="flex-1 p-5">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-12 h-12 bg-gradient-to-br ${catStyle.bg} rounded-xl flex items-center justify-center shadow-lg text-xl`}>
                              {catStyle.icon}
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-mono">{job.id.slice(0, 12)}...</p>
                              <h3 className="font-bold text-gray-900 text-lg">{job.title}</h3>
                              <p className="text-sm text-violet-600 font-medium">{job.category}</p>
                            </div>
                          </div>
                          <span className={`${statusStyle.bg} ${statusStyle.text} px-3 py-1.5 rounded-full text-xs font-bold`}>
                            {getStatusLabel(job.status, job.adminApproved)}
                          </span>
                        </div>

                        {/* Parties */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Client</p>
                              <p className="font-semibold text-gray-900">{job.client.name}</p>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                              <Wrench className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Provider</p>
                              <p className="font-semibold text-gray-900">{job.provider.name}</p>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-5 h-5 text-emerald-500" />
                              <span className="text-xl font-bold text-emerald-600">₱{job.amount.toLocaleString()}</span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              job.paymentPreference === 'pay_first' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {job.paymentPreference === 'pay_first' ? 'PAY FIRST' : 'PAY LATER'}
                            </span>
                            {job.isPaidUpfront && (
                              <span className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-xs font-bold">✓ PAID</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                              <Calendar className="w-4 h-4" />
                              <span>{job.scheduledDate} • {job.scheduledTime}</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-violet-500 transition-colors" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showModal && selectedJob && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className={`bg-gradient-to-r ${getCategoryStyle(selectedJob.category).bg} p-6 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10">
                  ✕
                </button>
                <div className="relative">
                  <p className="text-white/70 text-sm font-mono mb-1">{selectedJob.id}</p>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedJob.title}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{getCategoryStyle(selectedJob.category).icon}</span>
                    <span className="text-white/90 font-medium">{selectedJob.category}</span>
                  </div>
                  <span className={`inline-block mt-3 ${getStatusStyle(selectedJob.status, selectedJob.adminApproved).bg} ${getStatusStyle(selectedJob.status, selectedJob.adminApproved).text} px-4 py-1.5 rounded-full text-sm font-bold`}>
                    {getStatusLabel(selectedJob.status, selectedJob.adminApproved)}
                  </span>
                </div>
              </div>

              <div className="p-6">
                {/* View Full Details */}
                <button onClick={() => router.push(`/admin/jobs/${selectedJob.id}`)}
                  className="w-full py-3 bg-gray-100 text-violet-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors mb-6 flex items-center justify-center gap-2">
                  <Eye className="w-5 h-5" /> View Full Details <ChevronRight className="w-5 h-5" />
                </button>

                {/* Amount */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 mb-6 border border-emerald-100">
                  <div className="text-center">
                    <p className="text-emerald-600 text-sm font-medium mb-1">Total Amount</p>
                    <p className="text-4xl font-bold text-emerald-700">₱{selectedJob.amount.toLocaleString()}</p>
                    {selectedJob.systemFee > 0 && (
                      <p className="text-emerald-600/70 text-sm mt-2">
                        Provider: ₱{selectedJob.providerPrice.toLocaleString()} + Fee: ₱{selectedJob.systemFee.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment Preference */}
                <div className={`p-4 rounded-2xl mb-6 ${selectedJob.paymentPreference === 'pay_first' ? 'bg-emerald-50 border border-emerald-100' : 'bg-blue-50 border border-blue-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedJob.paymentPreference === 'pay_first' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                        <CreditCard className={`w-6 h-6 ${selectedJob.paymentPreference === 'pay_first' ? 'text-emerald-600' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <p className={`font-bold ${selectedJob.paymentPreference === 'pay_first' ? 'text-emerald-700' : 'text-blue-700'}`}>
                          {selectedJob.paymentPreference === 'pay_first' ? 'Pay First' : 'Pay Later'}
                        </p>
                        <p className={`text-sm ${selectedJob.paymentPreference === 'pay_first' ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {selectedJob.paymentPreference === 'pay_first' ? 'Client pays before service' : 'Client pays after completion'}
                        </p>
                      </div>
                    </div>
                    {selectedJob.isPaidUpfront && (
                      <span className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg">
                        ✓ PAID ₱{selectedJob.upfrontPaidAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Negotiation Info */}
                {selectedJob.isNegotiable && (
                  <div className="bg-amber-50 p-4 rounded-2xl mb-6 border border-amber-100">
                    <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" /> Price Negotiation
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between bg-white rounded-xl p-3">
                        <span className="text-amber-700">Provider&apos;s Fixed Price:</span>
                        <span className="font-bold text-amber-800">₱{selectedJob.providerFixedPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between bg-white rounded-xl p-3">
                        <span className="text-amber-700">Client&apos;s Offer:</span>
                        <span className="font-bold text-amber-600">₱{selectedJob.offeredPrice.toLocaleString()}</span>
                      </div>
                      {selectedJob.counterOfferPrice > 0 && (
                        <div className="flex justify-between bg-white rounded-xl p-3">
                          <span className="text-amber-700">Provider&apos;s Counter:</span>
                          <span className="font-bold text-purple-600">₱{selectedJob.counterOfferPrice.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Client & Provider */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <h4 className="font-bold text-gray-900">Client</h4>
                    </div>
                    <p className="font-semibold text-gray-900">{selectedJob.client.name}</p>
                    <p className="text-sm text-gray-500">{selectedJob.client.phone}</p>
                    {selectedJob.client.email && <p className="text-sm text-gray-500">{selectedJob.client.email}</p>}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Wrench className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h4 className="font-bold text-gray-900">Provider</h4>
                    </div>
                    <p className="font-semibold text-gray-900">{selectedJob.provider.name}</p>
                    <p className="text-sm text-gray-500">{selectedJob.provider.phone}</p>
                    {selectedJob.provider.email && <p className="text-sm text-gray-500">{selectedJob.provider.email}</p>}
                  </div>
                </div>

                {/* Schedule & Location */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Schedule</p>
                      <p className="font-semibold text-gray-900">{selectedJob.scheduledDate} at {selectedJob.scheduledTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="font-semibold text-gray-900">{selectedJob.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Submitted</p>
                      <p className="font-semibold text-gray-900">{selectedJob.createdAt}</p>
                    </div>
                  </div>
                </div>

                {/* Media */}
                {selectedJob.media && selectedJob.media.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 mb-3">Attached Photos/Videos</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {selectedJob.media.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                          <img src={url} alt={`Attachment ${idx + 1}`}
                            className="w-28 h-28 rounded-xl object-cover border-2 border-gray-200 hover:border-violet-500 transition-colors cursor-pointer shadow-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112"><rect fill="%23f3f4f6" width="112" height="112" rx="12"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="24">📷</text><text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="10">No Image</text></svg>';
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedJob.status === 'pending' && !selectedJob.adminApproved && (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleApproveJob(selectedJob)} disabled={updating}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50">
                      <CheckCircle className="w-5 h-5" /> Approve
                    </button>
                    <button onClick={() => handleRejectJob(selectedJob)} disabled={updating}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50">
                      <XCircle className="w-5 h-5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal */}
        {confirmModal.show && confirmModal.job && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
              {/* Header */}
              <div className={`p-6 ${confirmModal.type === 'approve' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    {confirmModal.type === 'approve' ? (
                      <CheckCircle className="w-8 h-8 text-white" />
                    ) : (
                      <XCircle className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {confirmModal.type === 'approve' ? 'Approve Job?' : 'Reject Job?'}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {confirmModal.job.title || confirmModal.job.category}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Client</p>
                      <p className="font-semibold text-gray-900">{confirmModal.job.client?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Provider</p>
                      <p className="font-semibold text-gray-900">{confirmModal.job.provider?.name || 'Not assigned'}</p>
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 text-center mb-6">
                  {confirmModal.type === 'approve' 
                    ? `This will send the job to ${confirmModal.job.provider?.name || 'the provider'} for review.`
                    : 'This action cannot be undone. The client will be notified.'}
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmModal({ show: false, type: 'approve', job: null })}
                    className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmModal.type === 'approve' ? executeApprove : executeReject}
                    disabled={updating}
                    className={`flex-1 py-3.5 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                      confirmModal.type === 'approve'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/30'
                        : 'bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg hover:shadow-red-500/30'
                    }`}
                  >
                    {updating ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : confirmModal.type === 'approve' ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Approve
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        Reject
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <style jsx>{`
              @keyframes scale-in {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
              .animate-scale-in {
                animation: scale-in 0.2s ease-out forwards;
              }
            `}</style>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
