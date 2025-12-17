'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { MapPin, Users, Briefcase, RefreshCw } from 'lucide-react';

interface ActiveJob {
  id: string;
  serviceCategory: string;
  status: string;
  clientName: string;
  providerName?: string;
  streetAddress?: string;
  latitude?: number;
  longitude?: number;
}

interface OnlineProvider {
  id: string;
  firstName: string;
  lastName: string;
  serviceCategory: string;
  latitude?: number;
  longitude?: number;
  isOnline: boolean;
}

export default function AdminMapPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [onlineProviders, setOnlineProviders] = useState<OnlineProvider[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role?.toUpperCase() !== 'ADMIN') {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role?.toUpperCase() === 'ADMIN') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      // Fetch active jobs
      const jobsQuery = query(
        collection(db, 'bookings'),
        where('status', 'in', ['in_progress', 'accepted', 'pending'])
      );
      const jobsSnapshot = await getDocs(jobsQuery);
      const jobs: ActiveJob[] = [];
      jobsSnapshot.forEach((doc) => {
        const data = doc.data();
        jobs.push({
          id: doc.id,
          serviceCategory: data.serviceCategory || '',
          status: data.status,
          clientName: data.clientName || 'Client',
          providerName: data.providerName,
          streetAddress: data.streetAddress,
          latitude: data.latitude,
          longitude: data.longitude,
        });
      });
      setActiveJobs(jobs);

      // Fetch online providers
      const providersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'PROVIDER'),
        where('isOnline', '==', true)
      );
      const providersSnapshot = await getDocs(providersQuery);
      const providers: OnlineProvider[] = [];
      providersSnapshot.forEach((doc) => {
        const data = doc.data();
        providers.push({
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          serviceCategory: data.serviceCategory || '',
          latitude: data.currentLocation?.latitude,
          longitude: data.currentLocation?.longitude,
          isOnline: true,
        });
      });
      setOnlineProviders(providers);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'accepted': return 'bg-purple-100 text-purple-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading || loadingData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Map</h1>
            <p className="text-gray-600 mt-1">Track active jobs and online providers</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-[#00B14F] text-white rounded-lg hover:bg-[#009940]"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{activeJobs.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Online Providers</p>
                <p className="text-2xl font-bold text-gray-900">{onlineProviders.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="h-96 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Map integration coming soon</p>
              <p className="text-sm text-gray-400 mt-1">
                Google Maps will be integrated here to show real-time locations
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Jobs List */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Jobs</h2>
            {activeJobs.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center">
                <p className="text-gray-500">No active jobs</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {activeJobs.map((job, index) => (
                  <div
                    key={job.id}
                    className={`p-4 ${index !== activeJobs.length - 1 ? 'border-b' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{job.serviceCategory}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Client: {job.clientName}</p>
                    {job.providerName && (
                      <p className="text-sm text-gray-600">Provider: {job.providerName}</p>
                    )}
                    {job.streetAddress && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{job.streetAddress}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Online Providers List */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Online Providers</h2>
            {onlineProviders.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center">
                <p className="text-gray-500">No providers online</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {onlineProviders.map((provider, index) => (
                  <div
                    key={provider.id}
                    className={`p-4 flex items-center gap-4 ${index !== onlineProviders.length - 1 ? 'border-b' : ''}`}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-semibold">{provider.firstName[0]}</span>
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{provider.firstName} {provider.lastName}</p>
                      <p className="text-sm text-gray-500">{provider.serviceCategory}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
