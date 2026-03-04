'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, where, doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { pushNotifications } from '@/lib/pushNotifications';
import dynamic from 'next/dynamic';
import {
  Briefcase, Search, Clock, MapPin, CheckCircle, XCircle, CreditCard, RefreshCw,
  ChevronRight, DollarSign, User, Wrench, Calendar, Eye, AlertCircle, Zap,
  TrendingUp, Users, ArrowUpRight, Activity,
} from 'lucide-react';

const AdminMapView = dynamic(() => import('@/components/AdminMapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-gray-400 text-xs">Loading map...</p>
      </div>
    </div>
  )
});

interface MapProvider {
  id: string;
  firstName: string;
  lastName: string;
  serviceCategory: string;
  latitude?: number;
  longitude?: number;
  currentLocation?: { latitude: number; longitude: number };
  isOnline: boolean;
  profilePhoto?: string;
  phone?: string;
  email?: string;
  status: 'available' | 'offline' | 'traveling' | 'arrived' | 'working' | 'pending';
  currentJobId?: string;
  jobStatus?: string;
  isApproved: boolean;
}

const DEFAULT_CENTER = { lat: 10.1311, lng: 124.8334 };

interface ClientInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photo?: string;
}

interface ProviderInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photo?: string;
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
  if (cat.includes('electric')) return { bg: 'from-amber-500 to-yellow-600', icon: '⚡', color: '#F59E0B', label: 'Electrical' };
  if (cat.includes('plumb')) return { bg: 'from-blue-500 to-cyan-600', icon: '🔧', color: '#3B82F6', label: 'Plumbing' };
  if (cat.includes('carpent')) return { bg: 'from-orange-500 to-amber-600', icon: '🪚', color: '#F97316', label: 'Carpentry' };
  if (cat.includes('clean')) return { bg: 'from-emerald-500 to-teal-600', icon: '🧹', color: '#10B981', label: 'Cleaning' };
  if (cat.includes('paint')) return { bg: 'from-pink-500 to-rose-600', icon: '🎨', color: '#EC4899', label: 'Painting' };
  if (cat.includes('aircon') || cat.includes('hvac')) return { bg: 'from-sky-500 to-blue-600', icon: '❄️', color: '#0EA5E9', label: 'Aircon/HVAC' };
  return { bg: 'from-violet-500 to-purple-600', icon: '🛠️', color: '#8B5CF6', label: 'General' };
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
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [mapProviders, setMapProviders] = useState<MapProvider[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'approve' | 'reject';
    job: Job | null;
  }>({ show: false, type: 'approve', job: null });

  const filters = [
    { id: 'all', label: 'All', color: 'violet' },
    { id: 'pending', label: 'Pending', color: 'amber' },
    { id: 'awaiting_payment', label: 'Awaiting Pay', color: 'yellow' },
    { id: 'pending_negotiation', label: 'Nego', color: 'yellow' },
    { id: 'accepted', label: 'Accepted', color: 'blue' },
    { id: 'traveling', label: 'Traveling', color: 'blue' },
    { id: 'arrived', label: 'Arrived', color: 'indigo' },
    { id: 'in_progress', label: 'Active', color: 'indigo' },
    { id: 'pending_completion', label: 'Pending Done', color: 'amber' },
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

  // Fetch providers for the map
  useEffect(() => {
    if (user?.role?.toUpperCase() !== 'ADMIN') return;
    const providersQuery = query(collection(db, 'users'), where('role', '==', 'PROVIDER'));
    const unsub = onSnapshot(providersQuery, (snapshot) => {
      const list: MapProvider[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isApproved = data.status === 'approved' || data.providerStatus === 'approved';
        const isSuspended = data.status === 'suspended' || data.providerStatus === 'suspended';
        if (isSuspended) return;
        let activityStatus: MapProvider['status'] = 'offline';
        if (!isApproved) activityStatus = 'pending';
        else if (data.currentJobId && data.jobStatus === 'in_progress') activityStatus = 'working';
        else if (data.currentJobId && data.jobStatus === 'traveling') activityStatus = 'traveling';
        else if (data.currentJobId && data.jobStatus === 'arrived') activityStatus = 'arrived';
        else if (data.isOnline) activityStatus = 'available';
        list.push({
          id: docSnap.id, firstName: data.firstName || '', lastName: data.lastName || '',
          serviceCategory: data.serviceCategory || 'Service Provider',
          latitude: data.latitude, longitude: data.longitude,
          currentLocation: data.currentLocation, isOnline: data.isOnline || false,
          profilePhoto: data.profilePhoto, phone: data.phone, email: data.email,
          status: activityStatus, currentJobId: data.currentJobId,
          jobStatus: data.jobStatus, isApproved,
        });
      });
      setMapProviders(list);
    });
    return () => unsub();
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
                clientInfo = {
                  id: data.clientId,
                  name: `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Unknown',
                  phone: clientData.phone || clientData.phoneNumber || 'Not provided',
                  email: clientData.email,
                  photo: clientData.profilePhoto || clientData.photoURL,
                };
              }
            } catch (e) { }
          }

          let providerInfo: ProviderInfo = { id: data.providerId || '', name: data.providerName || 'Not Assigned', phone: 'N/A' };
          if (data.providerId) {
            try {
              const providerDoc = await getDoc(doc(db, 'users', data.providerId));
              if (providerDoc.exists()) {
                const providerData = providerDoc.data();
                providerInfo = {
                  id: data.providerId,
                  name: `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim() || 'Unknown',
                  phone: providerData.phone || providerData.phoneNumber || 'Not provided',
                  email: providerData.email,
                  photo: providerData.profilePhoto || providerData.photoURL,
                };
              }
            } catch (e) { }
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
            paymentPreference: data.paymentPreference || 'pay_first',
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
      case 'pending': return adminApproved ? { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Confirmed' } : { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' };
      case 'awaiting_payment': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Awaiting Payment' };
      case 'pending_negotiation': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Negotiating' };
      case 'counter_offer': return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Counter Offer' };
      case 'accepted': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Accepted' };
      case 'traveling': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Traveling' };
      case 'arrived': return { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Arrived' };
      case 'in_progress': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' };
      case 'pending_completion': return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Completion' };
      case 'completed': return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Confirmed' };
      case 'cancelled': case 'rejected': return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelled' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', label: status?.replace(/_/g, ' ') };
    }
  };

  const getStatusLabel = (status: string, adminApproved: boolean) => {
    switch (status) {
      case 'pending': return adminApproved ? 'Awaiting Provider' : 'Pending Approval';
      case 'awaiting_payment': return 'Awaiting Payment';
      case 'pending_negotiation': return 'Negotiating';
      case 'counter_offer': return 'Counter Offer';
      case 'accepted': return 'Accepted';
      case 'traveling': return 'Traveling';
      case 'arrived': return 'Arrived';
      case 'in_progress': return 'In Progress';
      case 'pending_completion': return 'Pending Completion';
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

      if (job.client?.id) {
        pushNotifications.jobApprovedToClient(job.client.id, job.id, job.category || 'service')
          .catch(err => console.log('FCM push to client failed:', err));
      }
      if (job.provider?.id) {
        pushNotifications.newJobToProvider(job.provider.id, job.id, job.category || 'service')
          .catch(err => console.log('FCM push to provider failed:', err));
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';
      const capitalize = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

      if (job.client?.phone) {
        const clientName = capitalize(job.client.name || 'Client');
        fetch(`${API_URL}/sms/booking-approved-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: job.client.phone,
            clientName,
            serviceCategory: job.category,
          }),
        }).catch(err => console.error('SMS notification failed:', err));
      }

      if (job.client?.email) {
        fetch(`${API_URL}/email/booking-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: job.client.email,
            clientName: job.client.name,
            booking: {
              id: job.id,
              serviceCategory: job.category,
              scheduledDate: job.scheduledDate,
              scheduledTime: job.scheduledTime,
              address: job.location,
              totalAmount: job.amount,
            },
            provider: { name: job.provider?.name },
          }),
        }).catch(err => console.error('Email notification failed:', err));
      }
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

      if (job.client?.id) {
        pushNotifications.jobRejectedToClient(job.client.id, job.id, job.category || 'service')
          .catch(err => console.log('FCM push to client failed:', err));
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';
      const capitalize = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

      if (job.client?.phone) {
        const clientName = capitalize(job.client.name || 'Client');
        fetch(`${API_URL}/sms/booking-rejected`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: job.client.phone,
            clientName,
            serviceCategory: job.category,
          }),
        }).catch(err => console.error('SMS notification failed:', err));
      }

      if (job.client?.email) {
        fetch(`${API_URL}/email/booking-rejection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: job.client.email,
            clientName: job.client.name,
            serviceCategory: job.category,
            reason: 'Your booking request was not approved.',
          }),
        }).catch(err => console.error('Email notification failed:', err));
      }
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
    activeProviders: new Set(allJobs.filter(j => ['in_progress', 'traveling', 'arrived', 'accepted'].includes(j.status)).map(j => j.provider?.id)).size,
    monthlyRevenue: allJobs.filter(j => j.status === 'completed').reduce((sum, j) => sum + j.amount, 0),
  });

  // Compute booking trends (last 7 days)
  const weeklyTrends = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);
    const now = new Date();
    allJobs.forEach(j => {
      const diff = Math.floor((now.getTime() - j.createdAtRaw.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < 7) {
        const dayIndex = j.createdAtRaw.getDay();
        counts[dayIndex]++;
      }
    });
    const maxCount = Math.max(...counts, 1);
    return days.map((day, i) => ({ day, count: counts[i], pct: (counts[i] / maxCount) * 100 }));
  }, [allJobs]);

  // Service type breakdown
  const serviceBreakdown = useMemo(() => {
    const catCounts: Record<string, number> = {};
    allJobs.forEach(j => {
      const style = getCategoryStyle(j.category);
      const label = style.label;
      catCounts[label] = (catCounts[label] || 0) + 1;
    });
    const total = allJobs.length || 1;
    const colors: Record<string, string> = {
      'Electrical': '#F59E0B', 'Plumbing': '#3B82F6', 'Carpentry': '#F97316',
      'Cleaning': '#10B981', 'Painting': '#EC4899', 'Aircon/HVAC': '#0EA5E9', 'General': '#8B5CF6'
    };
    return Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100), color: colors[label] || '#6B7280' }));
  }, [allJobs]);

  // Build conic-gradient for donut chart
  const conicGradient = useMemo(() => {
    if (serviceBreakdown.length === 0) return 'conic-gradient(#e5e7eb 0% 100%)';
    let acc = 0;
    const stops = serviceBreakdown.map(s => {
      const start = acc;
      acc += s.pct;
      return `${s.color} ${start}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [serviceBreakdown]);

  const stats = getStats();
  const displayedJobs = showAllBookings ? jobs : jobs.slice(0, 5);


  if (isLoading || loadingData) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Loading bookings...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* ─── Top Bar ─── */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Bookings Management</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-64"
                />
              </div>
              <button onClick={handleRefresh} disabled={refreshing}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* ─── Stat Cards ─── */}
          <div className="grid grid-cols-4 gap-5 mb-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-600 text-xs font-semibold">+{stats.completed > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
                <span className="text-gray-400 text-xs ml-1">completed</span>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Active Service Providers</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeProviders}</p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-600 text-xs font-semibold">+{stats.inProgress}</span>
                <span className="text-gray-400 text-xs ml-1">in progress</span>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Monthly Revenue</p>
              <p className="text-3xl font-bold text-gray-900">₱{stats.monthlyRevenue.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-600 text-xs font-semibold">+12%</span>
                <span className="text-gray-400 text-xs ml-1">vs last month</span>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Pending Requests</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
              {stats.pending > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-600 text-xs font-semibold">Needs review</span>
                </div>
              )}
              {stats.pending === 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600 text-xs font-semibold">All clear</span>
                </div>
              )}
            </div>
          </div>

          {/* ─── Filters ─── */}
          <div className="flex gap-2 flex-wrap mb-6">
            {filters.map((filter) => {
              const isActive = activeFilter === filter.id;
              const count = filter.id === 'all' ? allJobs.length : allJobs.filter(j => j.status === filter.id).length;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${isActive
                    ? 'bg-green-600 text-white shadow-md shadow-green-500/25'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {filter.label}
                  <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center ${isActive ? 'bg-white/25' : 'bg-gray-100'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ─── Two-Column: Recent Bookings + Map ─── */}
          <div className="grid grid-cols-5 gap-6 mb-6">
            {/* Left: Recent Bookings */}
            <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-sm">Recent Bookings</h2>
                <button
                  onClick={() => setShowAllBookings(!showAllBookings)}
                  className="text-green-600 text-xs font-semibold hover:text-green-700 transition-colors"
                >
                  {showAllBookings ? 'Show less' : 'View all'}
                </button>
              </div>
              <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
                {displayedJobs.length === 0 ? (
                  <div className="p-8 text-center">
                    <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No bookings found</p>
                  </div>
                ) : (
                  displayedJobs.map((job) => {
                    const catStyle = getCategoryStyle(job.category);
                    const statusStyle = getStatusStyle(job.status, job.adminApproved);
                    return (
                      <div
                        key={job.id}
                        onClick={() => { setSelectedJob(job); setShowModal(true); }}
                        className="flex items-start gap-3.5 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                      >
                        {/* Category Icon */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: `${catStyle.color}15` }}>
                          {catStyle.icon}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{job.category}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <User className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-500 text-xs">{job.client.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-400 text-xs">{job.createdAt}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-gray-400 text-xs">Status</span>
                            <span className={`${statusStyle.bg} ${statusStyle.text} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                              {statusStyle.label}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-gray-300 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Provider Locations Map */}
            <div className="col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-sm">Provider Locations Map</h2>
                <button
                  onClick={() => router.push('/admin/map')}
                  className="text-green-600 text-xs font-semibold hover:text-green-700 transition-colors flex items-center gap-1"
                >
                  Open Map <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              <div className="h-[440px]">
                <AdminMapView
                  providers={mapProviders}
                  activeJobs={[]}
                  center={DEFAULT_CENTER}
                  onProviderClick={() => { }}
                />
              </div>
            </div>
          </div>

          {/* ─── Bottom: Charts ─── */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Booking Trends (Weekly) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 text-sm mb-4">Booking Trends (Weekly)</h2>
              <div className="flex items-end gap-3 h-40">
                {weeklyTrends.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-400 font-medium">{d.count}</span>
                    <div className="w-full rounded-t-md bg-green-500 transition-all duration-500"
                      style={{ height: `${Math.max(d.pct, 4)}%`, opacity: d.count > 0 ? 1 : 0.3 }}
                    />
                    <span className="text-[10px] text-gray-500 font-medium mt-1">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Type Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 text-sm mb-4">Service Type Breakdown</h2>
              <div className="flex items-center gap-6">
                {/* Donut chart */}
                <div className="relative w-32 h-32 flex-shrink-0">
                  <div className="w-full h-full rounded-full" style={{ background: conicGradient }} />
                  <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900">{allJobs.length}</span>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex-1 space-y-2">
                  {serviceBreakdown.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-gray-600">{s.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-900">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Detail Modal ─── */}
        {showModal && selectedJob && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="bg-green-600 p-6 relative overflow-hidden">
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
                  className="w-full py-3 bg-gray-100 text-green-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors mb-6 flex items-center justify-center gap-2">
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
                          {selectedJob.isPaidUpfront ? 'PAID' : 'PENDING PAYMENT'}
                        </p>
                        <p className={`text-sm ${selectedJob.paymentPreference === 'pay_first' ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {'Client pays before service'}
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
                      {selectedJob.client.photo ? (
                        <img
                          src={selectedJob.client.photo}
                          alt={selectedJob.client.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-blue-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center ${selectedJob.client.photo ? 'hidden' : ''}`}>
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
                      {selectedJob.provider.photo ? (
                        <img
                          src={selectedJob.provider.photo}
                          alt={selectedJob.provider.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-emerald-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center ${selectedJob.provider.photo ? 'hidden' : ''}`}>
                        <Wrench className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h4 className="font-bold text-gray-900">Provider</h4>
                    </div>
                    <p className="font-semibold text-gray-900">{selectedJob.provider.name}</p>
                    <p className="text-sm text-gray-500">{selectedJob.provider.phone}</p>
                    {selectedJob.provider.email && <p className="text-sm text-gray-500">{selectedJob.provider.email}</p>}
                  </div>
                </div>

                {/* Booking Info & Location */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Booking Submitted</p>
                      <p className="font-semibold text-gray-900">{selectedJob.createdAt}</p>
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
                </div>

                {/* Media */}
                {selectedJob.media && selectedJob.media.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 mb-3">Attached Photos/Videos</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {selectedJob.media.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                          <img src={url} alt={`Attachment ${idx + 1}`}
                            className="w-28 h-28 rounded-xl object-cover border-2 border-gray-200 hover:border-green-500 transition-colors cursor-pointer shadow-lg"
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
                      className="flex items-center justify-center gap-2 bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 hover:shadow-lg transition-all disabled:opacity-50">
                      <CheckCircle className="w-5 h-5" /> Approve
                    </button>
                    <button onClick={() => handleRejectJob(selectedJob)} disabled={updating}
                      className="flex items-center justify-center gap-2 bg-red-500 text-white py-3.5 rounded-xl font-bold hover:bg-red-600 hover:shadow-lg transition-all disabled:opacity-50">
                      <XCircle className="w-5 h-5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Confirmation Modal ─── */}
        {confirmModal.show && confirmModal.job && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
              {/* Header */}
              <div className={`p-6 ${confirmModal.type === 'approve' ? 'bg-green-600' : 'bg-red-500'}`}>
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
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-green-600" />
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
                    className={`flex-1 py-3.5 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${confirmModal.type === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
                      : 'bg-red-500 hover:bg-red-600 hover:shadow-lg'
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
