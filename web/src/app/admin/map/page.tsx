"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "@/components/layouts/AdminLayout";
import dynamic from "next/dynamic";
import { MapPin, Users, Briefcase, Navigation, Phone, MessageCircle, X, Loader2, Map, RefreshCw, Eye, Zap, Clock, CheckCircle, AlertCircle } from "lucide-react";

const AdminMapView = dynamic(() => import("@/components/AdminMapView"), { 
  ssr: false, 
  loading: () => (
    <div className="h-full w-full bg-gradient-to-br from-slate-100 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-violet-600 font-medium">Loading map...</p>
      </div>
    </div>
  )
});

interface ActiveJob {
  id: string;
  serviceCategory: string;
  status: string;
  clientName: string;
  providerName?: string;
  streetAddress?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  location?: { latitude: number; longitude: number };
  providerLocation?: { latitude: number; longitude: number };
}

interface Provider {
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

const STATUS_CONFIG = {
  available: { color: '#10B981', bg: 'from-emerald-500 to-teal-600', label: 'Available', icon: CheckCircle },
  traveling: { color: '#3B82F6', bg: 'from-blue-500 to-indigo-600', label: 'Traveling', icon: Navigation },
  arrived: { color: '#8B5CF6', bg: 'from-violet-500 to-purple-600', label: 'Arrived', icon: MapPin },
  working: { color: '#F59E0B', bg: 'from-amber-500 to-orange-600', label: 'Working', icon: Zap },
  offline: { color: '#6B7280', bg: 'from-gray-500 to-slate-600', label: 'Offline', icon: Clock },
  pending: { color: '#EF4444', bg: 'from-red-500 to-rose-600', label: 'Pending', icon: AlertCircle },
};


export default function AdminMapPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push("/login");
      else if (user?.role?.toUpperCase() !== "ADMIN") router.push("/");
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role?.toUpperCase() !== "ADMIN") return;
    setLoadingData(true);

    const jobsQuery = query(collection(db, "bookings"), where("status", "in", ["in_progress", "accepted", "traveling", "arrived", "pending"]));
    const unsubJobs = onSnapshot(jobsQuery, (snapshot) => {
      const jobs: ActiveJob[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        jobs.push({
          id: doc.id, serviceCategory: data.serviceCategory || data.category || "", status: data.status,
          clientName: data.clientName || "Client", providerName: data.providerName,
          streetAddress: data.streetAddress, address: data.address, latitude: data.latitude, longitude: data.longitude,
          location: data.location, providerLocation: data.providerLocation,
        });
      });
      setActiveJobs(jobs);
      setLoadingData(false);
      setRefreshing(false);
    });

    const providersQuery = query(collection(db, "users"), where("role", "==", "PROVIDER"));
    const unsubProviders = onSnapshot(providersQuery, (snapshot) => {
      const providersList: Provider[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isApproved = data.status === 'approved' || data.providerStatus === 'approved';
        const isSuspended = data.status === 'suspended' || data.providerStatus === 'suspended';
        if (isSuspended) return;
        
        let activityStatus: Provider['status'] = 'offline';
        if (!isApproved) activityStatus = 'pending';
        else if (data.currentJobId && data.jobStatus === 'in_progress') activityStatus = 'working';
        else if (data.currentJobId && data.jobStatus === 'traveling') activityStatus = 'traveling';
        else if (data.currentJobId && data.jobStatus === 'arrived') activityStatus = 'arrived';
        else if (data.isOnline) activityStatus = 'available';
        
        providersList.push({
          id: docSnap.id, firstName: data.firstName || "", lastName: data.lastName || "",
          serviceCategory: data.serviceCategory || "Service Provider", latitude: data.latitude, longitude: data.longitude,
          currentLocation: data.currentLocation, isOnline: data.isOnline || false, profilePhoto: data.profilePhoto,
          phone: data.phone, email: data.email, status: activityStatus, currentJobId: data.currentJobId,
          jobStatus: data.jobStatus, isApproved,
        });
      });
      setProviders(providersList);
    });

    return () => { unsubJobs(); unsubProviders(); };
  }, [user]);

  const getStatusColor = (status: string) => STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || '#6B7280';
  const getStatusConfig = (status: string) => STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.offline;

  const getJobStatusStyle = (status: string) => {
    switch (status) {
      case "in_progress": return "bg-gradient-to-r from-blue-500 to-indigo-600 text-white";
      case "traveling": return "bg-gradient-to-r from-indigo-500 to-violet-600 text-white";
      case "arrived": return "bg-gradient-to-r from-violet-500 to-purple-600 text-white";
      case "accepted": return "bg-gradient-to-r from-emerald-500 to-teal-600 text-white";
      case "pending": return "bg-gradient-to-r from-amber-500 to-orange-600 text-white";
      default: return "bg-gray-200 text-gray-700";
    }
  };

  const stats = {
    approved: providers.filter(p => p.isApproved).length,
    traveling: providers.filter(p => p.status === 'traveling').length,
    arrived: providers.filter(p => p.status === 'arrived').length,
    working: providers.filter(p => p.status === 'working').length,
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-purple-200 font-medium">Loading map...</p>
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
                  <Map className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-purple-200 text-sm font-medium">Real-time Tracking</p>
                  <h1 className="text-3xl font-bold text-white">Live Map</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setRefreshing(true)} disabled={refreshing}
                  className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/25 transition-all disabled:opacity-50 shadow-lg">
                  <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 backdrop-blur-sm rounded-xl">
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-emerald-200 text-sm font-semibold">Live</span>
                </div>
              </div>
            </div>

            {/* Status Legend in Header */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="flex flex-wrap items-center gap-6">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                    <span className="text-white/80 text-sm">{config.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/20 text-sm">
                <span className="text-purple-200">{stats.approved} approved</span>
                <span className="text-blue-300">• {stats.traveling} traveling</span>
                <span className="text-violet-300">• {stats.arrived} arrived</span>
                <span className="text-amber-300">• {stats.working} working</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Map Container */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6 border border-gray-100">
            <div className="h-[500px]">
              <AdminMapView
                providers={providers}
                activeJobs={activeJobs}
                center={DEFAULT_CENTER}
                onProviderClick={(provider) => { 
                  const fullProvider = providers.find(p => p.id === provider.id);
                  if (fullProvider) { setSelectedProvider(fullProvider); setShowDetailModal(true); }
                }}
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{activeJobs.length}</p>
                  <p className="text-gray-500 text-sm font-medium">Active Jobs</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{providers.filter(p => p.status === 'available').length}</p>
                  <p className="text-gray-500 text-sm font-medium">Available</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stats.working}</p>
                  <p className="text-gray-500 text-sm font-medium">Working</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{providers.length}</p>
                  <p className="text-gray-500 text-sm font-medium">Total Providers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Jobs and Providers Lists */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Active Jobs */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-red-500" /> Active Jobs
                <span className="ml-2 px-2.5 py-1 bg-red-100 text-red-600 rounded-full text-sm font-bold">{activeJobs.length}</span>
              </h2>
              {loadingData ? (
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                </div>
              ) : activeJobs.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="font-bold text-gray-900">No Active Jobs</p>
                  <p className="text-gray-500 text-sm mt-1">All jobs are completed</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden max-h-96 overflow-y-auto">
                  {activeJobs.map((job, index) => (
                    <div key={job.id} className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${index !== activeJobs.length - 1 ? "border-b border-gray-100" : ""}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900">{job.serviceCategory}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getJobStatusStyle(job.status)}`}>
                          {job.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Client: {job.clientName}</p>
                      {job.providerName && <p className="text-sm text-gray-600">Provider: {job.providerName}</p>}
                      {(job.streetAddress || job.address) && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-2">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{job.streetAddress || job.address}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Providers */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-500" /> All Providers
                <span className="ml-2 px-2.5 py-1 bg-violet-100 text-violet-600 rounded-full text-sm font-bold">{providers.length}</span>
              </h2>
              {providers.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="font-bold text-gray-900">No Providers</p>
                  <p className="text-gray-500 text-sm mt-1">No providers registered yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden max-h-96 overflow-y-auto">
                  {providers.map((provider, index) => {
                    const config = getStatusConfig(provider.status);
                    return (
                      <div key={provider.id}
                        className={`p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer ${index !== providers.length - 1 ? "border-b border-gray-100" : ""}`}
                        onClick={() => { setSelectedProvider(provider); setShowDetailModal(true); }}>
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.bg} flex items-center justify-center shadow-lg overflow-hidden`}>
                          {provider.profilePhoto ? (
                            <img src={provider.profilePhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-bold text-lg">{provider.firstName[0]}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{provider.firstName} {provider.lastName}</p>
                          <p className="text-sm text-gray-500 truncate">{provider.serviceCategory}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                            {config.label}
                          </span>
                          <button className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Premium Provider Detail Modal */}
      {showDetailModal && selectedProvider && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header with Gradient */}
            <div className={`bg-gradient-to-br ${getStatusConfig(selectedProvider.status).bg} p-6 text-center relative`}>
              <button onClick={() => setShowDetailModal(false)} 
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
              
              <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-xl">
                {selectedProvider.profilePhoto ? (
                  <img src={selectedProvider.profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-12 h-12 text-white" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-white">{selectedProvider.firstName} {selectedProvider.lastName}</h3>
              <p className="text-white/80 mt-1">{selectedProvider.serviceCategory}</p>
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                {(() => { const Icon = getStatusConfig(selectedProvider.status).icon; return <Icon className="w-4 h-4 text-white" />; })()}
                <span className="text-white font-semibold">{getStatusConfig(selectedProvider.status).label}</span>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                {selectedProvider.phone && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-semibold text-gray-900">{selectedProvider.phone}</p>
                    </div>
                  </div>
                )}
                {selectedProvider.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-semibold text-gray-900 text-sm">{selectedProvider.email}</p>
                    </div>
                  </div>
                )}
                {selectedProvider.currentJobId && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-600">Current Job</p>
                      <p className="font-semibold text-amber-700">{selectedProvider.currentJobId.slice(0, 8)}...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {selectedProvider.phone && (
                  <a href={`tel:${selectedProvider.phone}`}
                    className="py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all">
                    <Phone className="w-5 h-5" /> Call
                  </a>
                )}
                <a href={`/chat/new?recipientId=${selectedProvider.id}`}
                  className="py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all">
                  <MessageCircle className="w-5 h-5" /> Message
                </a>
              </div>

              <button onClick={() => router.push(`/admin/providers/${selectedProvider.id}`)}
                className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                <Eye className="w-5 h-5" /> View Full Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
