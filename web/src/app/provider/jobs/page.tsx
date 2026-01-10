'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import {
  Briefcase, Clock, MapPin, ChevronRight, User, Calendar, Image as ImageIcon,
  Tag, RefreshCw, Sparkles, ArrowUpRight, CheckCircle, Navigation, Phone
} from 'lucide-react';

interface ClientInfo {
  name: string;
  phone: string;
  tier?: { name: string; color: string; icon: string } | null;
}

interface Job {
  id: string;
  title: string;
  category: string;
  status: string;
  client: ClientInfo;
  amount: number;
  providerPrice: number;
  scheduledDate: string;
  scheduledTime: string;
  location: string;
  description: string;
  createdAt: string;
  createdAtRaw: Date;
  mediaFiles: string[];
  hasMedia: boolean;
  isNegotiable: boolean;
  offeredPrice: number;
  providerFixedPrice: number;
  adminApproved: boolean;
  paymentPreference: string;
  paymentMethod?: string;
  isPaidUpfront: boolean;
  completedAt?: string;
  completedAtRaw?: Date;
}

const formatDateTime = (date: Date) => {
  if (!date) return 'Unknown';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

const getClientTier = (points: number) => {
  if (points >= 5000) return { name: 'Platinum', color: '#6366F1', icon: '💎' };
  if (points >= 2000) return { name: 'Gold', color: '#F59E0B', icon: '🥇' };
  if (points >= 500) return { name: 'Silver', color: '#9CA3AF', icon: '🥈' };
  if (points >= 100) return { name: 'Bronze', color: '#CD7F32', icon: '🥉' };
  return { name: 'Regular', color: '#6B7280', icon: '' };
};

const getCategoryStyle = (category: string) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('electric')) return { bg: 'bg-amber-100', text: 'text-amber-700', icon: '⚡' };
  if (cat.includes('plumb')) return { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🔧' };
  if (cat.includes('carp')) return { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🪚' };
  if (cat.includes('clean')) return { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '🧹' };
  return { bg: 'bg-gray-100', text: 'text-gray-700', icon: '🔨' };
};

export default function JobsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'my_jobs' | 'completed'>('available');
  const [loadingData, setLoadingData] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = [
    { key: 'available' as const, label: 'Available', count: 0 },
    { key: 'my_jobs' as const, label: 'My Jobs', count: 0 },
    { key: 'completed' as const, label: 'Completed', count: 0 },
  ];

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (user?.role?.toUpperCase() !== 'PROVIDER') router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.uid) fetchJobs();
  }, [user, activeTab]);

  const fetchJobs = async () => {
    if (!user?.uid) return;
    setLoadingData(true);
    try {
      const userId = user.uid;
      const jobsList: Job[] = [];

      if (activeTab === 'available') {
        // Query jobs assigned to this provider that are pending
        // Provider can SEE all jobs assigned to them, but can only ACCEPT after admin approves
        const jobsQuery = query(
          collection(db, 'bookings'), 
          where('providerId', '==', userId),
          where('status', 'in', ['pending', 'pending_negotiation'])
        );
        const snapshot = await getDocs(jobsQuery);
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          // Show all jobs assigned to this provider (not rejected)
          if (!data.adminRejected) {
            let clientInfo: ClientInfo = { name: 'Unknown Client', phone: 'N/A', tier: null };
            if (data.clientId) {
              try {
                const clientDoc = await getDoc(doc(db, 'users', data.clientId));
                if (clientDoc.exists()) {
                  const cd = clientDoc.data();
                  clientInfo = { name: `${cd.firstName || ''} ${cd.lastName || ''}`.trim() || 'Client', phone: cd.phone || 'N/A' };
                }
                const gamDoc = await getDoc(doc(db, 'gamification', data.clientId));
                if (gamDoc.exists()) clientInfo.tier = getClientTier(gamDoc.data().points || 0);
              } catch (e) {}
            }
            let fullLocation = '';
            if (data.houseNumber) fullLocation += data.houseNumber + ', ';
            if (data.streetAddress) fullLocation += data.streetAddress + ', ';
            if (data.barangay) fullLocation += 'Brgy. ' + data.barangay + ', ';
            fullLocation += 'Maasin City';
            if (!data.streetAddress && !data.barangay) fullLocation = data.location || data.address || 'Not specified';

            jobsList.push({
              id: docSnap.id, title: data.title || data.serviceTitle || 'Service Request', category: data.category || data.serviceCategory || 'General',
              status: data.status, client: clientInfo, amount: data.totalAmount || data.amount || data.price || 0, providerPrice: data.providerPrice || data.offeredPrice || 0,
              scheduledDate: data.scheduledDate || 'TBD', scheduledTime: data.scheduledTime || 'TBD', location: fullLocation, description: data.description || '',
              createdAt: data.createdAt?.toDate?.() ? formatDateTime(data.createdAt.toDate()) : 'Unknown', createdAtRaw: data.createdAt?.toDate?.() || new Date(0),
              mediaFiles: data.mediaFiles || [], hasMedia: data.mediaFiles && data.mediaFiles.length > 0, isNegotiable: data.isNegotiable || false,
              offeredPrice: data.offeredPrice || 0, providerFixedPrice: data.providerFixedPrice || 0, adminApproved: data.adminApproved || false,
              paymentPreference: 'pay_first', paymentMethod: data.paymentMethod || 'gcash', isPaidUpfront: data.isPaidUpfront || false,
            });
          }
        }
        jobsList.sort((a, b) => b.createdAtRaw.getTime() - a.createdAtRaw.getTime());
      } else if (activeTab === 'my_jobs') {
        const jobsQuery = query(collection(db, 'bookings'), where('providerId', '==', userId), where('status', 'in', ['accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion', 'pending_payment', 'payment_received']));
        const snapshot = await getDocs(jobsQuery);
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          let clientInfo: ClientInfo = { name: 'Unknown Client', phone: 'N/A' };
          if (data.clientId) {
            try {
              const clientDoc = await getDoc(doc(db, 'users', data.clientId));
              if (clientDoc.exists()) { const cd = clientDoc.data(); clientInfo = { name: `${cd.firstName || ''} ${cd.lastName || ''}`.trim() || 'Client', phone: cd.phone || 'N/A' }; }
            } catch (e) {}
          }
          let fullLocation = '';
          if (data.houseNumber) fullLocation += data.houseNumber + ', ';
          if (data.streetAddress) fullLocation += data.streetAddress + ', ';
          if (data.barangay) fullLocation += 'Brgy. ' + data.barangay + ', ';
          fullLocation += 'Maasin City';
          if (!data.streetAddress && !data.barangay) fullLocation = data.location || data.address || 'Not specified';

          jobsList.push({
            id: docSnap.id, title: data.title || data.serviceTitle || 'Service Request', category: data.category || data.serviceCategory || 'General',
            status: data.status, client: clientInfo, amount: data.totalAmount || data.providerPrice || data.amount || data.price || 0, providerPrice: data.providerPrice || 0,
            scheduledDate: data.scheduledDate || 'TBD', scheduledTime: data.scheduledTime || 'TBD', location: fullLocation, description: data.description || '',
            createdAt: data.createdAt?.toDate?.() ? formatDateTime(data.createdAt.toDate()) : 'Unknown', createdAtRaw: data.createdAt?.toDate?.() || new Date(0),
            mediaFiles: [], hasMedia: false, isNegotiable: false, offeredPrice: 0, providerFixedPrice: 0, adminApproved: true,
            paymentPreference: 'pay_first', paymentMethod: data.paymentMethod || 'gcash', isPaidUpfront: data.isPaidUpfront || false,
          });
        }
        jobsList.sort((a, b) => b.createdAtRaw.getTime() - a.createdAtRaw.getTime());
      } else {
        const jobsQuery = query(collection(db, 'bookings'), where('providerId', '==', userId), where('status', '==', 'completed'));
        const snapshot = await getDocs(jobsQuery);
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          let clientInfo: ClientInfo = { name: 'Unknown Client', phone: 'N/A' };
          if (data.clientId) {
            try {
              const clientDoc = await getDoc(doc(db, 'users', data.clientId));
              if (clientDoc.exists()) { const cd = clientDoc.data(); clientInfo = { name: `${cd.firstName || ''} ${cd.lastName || ''}`.trim() || 'Client', phone: cd.phone || 'N/A' }; }
            } catch (e) {}
          }
          let fullLocation = '';
          if (data.houseNumber) fullLocation += data.houseNumber + ', ';
          if (data.streetAddress) fullLocation += data.streetAddress + ', ';
          if (data.barangay) fullLocation += 'Brgy. ' + data.barangay + ', ';
          fullLocation += 'Maasin City';
          if (!data.streetAddress && !data.barangay) fullLocation = data.location || data.address || 'Not specified';

          jobsList.push({
            id: docSnap.id, title: data.title || data.serviceTitle || 'Service Request', category: data.category || data.serviceCategory || 'General',
            status: data.status, client: clientInfo, amount: data.totalAmount || data.providerPrice || data.amount || data.price || 0, providerPrice: data.providerPrice || 0,
            scheduledDate: data.scheduledDate || 'TBD', scheduledTime: '', location: fullLocation, description: '',
            createdAt: '', createdAtRaw: new Date(0), mediaFiles: [], hasMedia: false, isNegotiable: false, offeredPrice: 0, providerFixedPrice: 0, adminApproved: true,
            paymentPreference: 'pay_first', paymentMethod: data.paymentMethod || 'gcash', isPaidUpfront: data.isPaidUpfront || false,
            completedAt: data.completedAt?.toDate?.()?.toLocaleDateString() || 'Unknown', completedAtRaw: data.completedAt?.toDate?.() || new Date(0),
          });
        }
        jobsList.sort((a, b) => (b.completedAtRaw?.getTime() || 0) - (a.completedAtRaw?.getTime() || 0));
      }
      setJobs(jobsList);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); fetchJobs(); };

  const handleAcceptJob = async (job: Job) => {
    if (!user?.uid) return;
    if (!confirm(`Accept "${job.title}" for ₱${job.amount?.toLocaleString() || 0}?`)) return;
    setAccepting(job.id);
    try {
      await updateDoc(doc(db, 'bookings', job.id), { providerId: user.uid, status: 'accepted', acceptedAt: new Date() });
      alert('Job accepted! Go to My Jobs to start traveling.');
      setActiveTab('my_jobs');
      fetchJobs();
    } catch (error) {
      console.error('Error accepting job:', error);
      alert('Failed to accept job');
    } finally {
      setAccepting(null);
    }
  };

  const getStatusStyle = (status: string, adminApproved: boolean) => {
    if (!adminApproved && (status === 'pending' || status === 'pending_negotiation')) {
      return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PENDING REVIEW' };
    }
    switch (status) {
      case 'pending': return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PENDING' };
      case 'pending_negotiation': return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'OFFER RECEIVED' };
      case 'counter_offer': return { bg: 'bg-violet-100', text: 'text-violet-700', label: 'COUNTER SENT' };
      case 'accepted': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'ACCEPTED' };
      case 'traveling': return { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'TRAVELING' };
      case 'arrived': return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'ARRIVED' };
      case 'in_progress': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'IN PROGRESS' };
      case 'pending_completion': return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'AWAITING CLIENT' };
      case 'pending_payment': return { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'CLIENT PAYING' };
      case 'payment_received': return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'CONFIRM PAYMENT' };
      case 'completed': return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'COMPLETED' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: status?.replace(/_/g, ' ').toUpperCase() };
    }
  };

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Jobs</h1>
                <p className="text-blue-100 text-sm">Find and manage your service jobs</p>
              </div>
              <button onClick={handleRefresh} disabled={refreshing}
                className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/25 transition-colors disabled:opacity-50">
                <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex">
              {tabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-4 text-center font-semibold text-sm transition-all relative ${
                    activeTab === tab.key ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab.label}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          {jobs.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">
                {activeTab === 'available' ? 'No Available Jobs' : activeTab === 'my_jobs' ? 'No Active Jobs' : 'No Completed Jobs'}
              </h3>
              <p className="text-gray-500 text-sm">
                {activeTab === 'available' ? 'New jobs will appear here when clients post them' : activeTab === 'my_jobs' ? 'Accept jobs to see them here' : 'Complete jobs to build your history'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => {
                const catStyle = getCategoryStyle(job.category);
                const statusStyle = getStatusStyle(job.status, job.adminApproved);
                return (
                  <div key={job.id} onClick={() => router.push(`/provider/jobs/${job.id}`)}
                    className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-gray-100 ${!job.adminApproved ? 'opacity-90' : ''}`}>
                    
                    {/* Admin Approval Banner */}
                    {!job.adminApproved && (job.status === 'pending' || job.status === 'pending_negotiation') && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2.5 flex items-center gap-2 border-b border-amber-100">
                        <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <span className="text-xs text-amber-800 font-medium">⏳ Waiting for Admin Approval - You can view but cannot accept yet</span>
                      </div>
                    )}

                    <div className="p-4">
                      {/* Category & Status Row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`${catStyle.bg} ${catStyle.text} px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1`}>
                            <span>{catStyle.icon}</span> {job.category}
                          </span>
                          {job.isNegotiable && (
                            <span className="bg-purple-100 text-purple-700 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Negotiable
                            </span>
                          )}
                        </div>
                        <span className={`${statusStyle.bg} ${statusStyle.text} px-3 py-1.5 rounded-lg text-xs font-bold`}>
                          {statusStyle.label}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-gray-900 text-lg mb-3">{job.title}</h3>

                      {/* Media Indicator */}
                      {job.hasMedia && (
                        <div className="bg-blue-50 px-3 py-2 rounded-xl mb-3 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-xs text-blue-700 font-medium">📷 {job.mediaFiles?.length} problem photo/video - tap to view</span>
                        </div>
                      )}

                      {/* Negotiation Info */}
                      {job.isNegotiable && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-2.5 rounded-xl mb-3 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-purple-600" />
                          <span className="text-xs text-purple-800 font-medium">
                            Client offers ₱{job.offeredPrice?.toLocaleString()} (Your price: ₱{job.providerFixedPrice?.toLocaleString()})
                          </span>
                        </div>
                      )}

                      {/* Info Grid */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <span className="text-sm text-gray-700 font-medium">{job.client?.name}</span>
                          {job.client?.tier && job.client.tier.name !== 'Regular' && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ backgroundColor: job.client.tier.color + '20', color: job.client.tier.color }}>
                              {job.client.tier.icon} {job.client.tier.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-gray-500" />
                          </div>
                          <span className="text-sm text-gray-600 truncate">{job.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-gray-500" />
                          </div>
                          <span className="text-sm text-gray-600">{job.scheduledDate} {job.scheduledTime && `at ${job.scheduledTime}`}</span>
                        </div>
                        {job.createdAt && (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center">
                              <Clock className="w-4 h-4 text-gray-400" />
                            </div>
                            <span className="text-xs text-gray-400">Submitted: {job.createdAt}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-blue-600">₱{job.amount?.toLocaleString() || 0}</span>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700`}>
                            {job.paymentMethod === 'maya' ? 'MAYA' : 'GCASH'}
                          </span>
                          {job.isPaidUpfront && (
                            <span className="bg-emerald-500 text-white px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> PAID
                            </span>
                          )}
                        </div>

                        {activeTab === 'available' && job.adminApproved && (
                          <button onClick={(e) => { e.stopPropagation(); handleAcceptJob(job); }} disabled={accepting === job.id}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50">
                            {accepting === job.id ? 'Accepting...' : 'Accept Job'}
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        )}
                        {activeTab === 'available' && !job.adminApproved && (
                          <span className="bg-amber-50 text-amber-700 px-4 py-2.5 rounded-xl text-xs font-semibold">Awaiting Approval</span>
                        )}
                        {activeTab === 'my_jobs' && (
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/provider/jobs/${job.id}`); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all">
                            View Details <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                        {activeTab === 'completed' && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <span className="text-xs">View Receipt</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProviderLayout>
  );
}
