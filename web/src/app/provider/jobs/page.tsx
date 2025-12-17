'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import { Briefcase, Clock, MapPin, ChevronRight, CheckCircle } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  serviceCategory: string;
  status: string;
  clientName?: string;
  streetAddress?: string;
  totalAmount: number;
  createdAt: Date;
}

export default function JobsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'my'>('available');
  const [loadingData, setLoadingData] = useState(true);

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
      fetchJobs();
    }
  }, [user]);

  const fetchJobs = async () => {
    if (!user?.uid) return;
    try {
      // Fetch my jobs
      const myJobsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const myJobsSnapshot = await getDocs(myJobsQuery);
      const myJobsList: Job[] = [];
      myJobsSnapshot.forEach((doc) => {
        const data = doc.data();
        myJobsList.push({
          id: doc.id,
          title: data.title || data.serviceCategory,
          serviceCategory: data.serviceCategory,
          status: data.status,
          clientName: data.clientName,
          streetAddress: data.streetAddress,
          totalAmount: data.totalAmount || data.price || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setJobs(myJobsList);

      // Fetch available jobs
      const availableQuery = query(
        collection(db, 'bookings'),
        where('status', 'in', ['pending', 'pending_negotiation'])
      );
      const availableSnapshot = await getDocs(availableQuery);
      const availableList: Job[] = [];
      availableSnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.providerId && data.adminApproved) {
          availableList.push({
            id: doc.id,
            title: data.title || data.serviceCategory,
            serviceCategory: data.serviceCategory,
            status: data.status,
            clientName: data.clientName,
            streetAddress: data.streetAddress,
            totalAmount: data.totalAmount || data.price || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        }
      });
      setAvailableJobs(availableList);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'accepted': return 'bg-purple-100 text-purple-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'payment_received': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const displayedJobs = activeTab === 'available' ? availableJobs : jobs;

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Jobs</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('available')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'available'
                ? 'text-[#00B14F] border-b-2 border-[#00B14F]'
                : 'text-gray-500'
            }`}
          >
            Available ({availableJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'my'
                ? 'text-[#00B14F] border-b-2 border-[#00B14F]'
                : 'text-gray-500'
            }`}
          >
            My Jobs ({jobs.length})
          </button>
        </div>

        {/* Jobs List */}
        {displayedJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {activeTab === 'available' ? 'No available jobs' : 'No jobs yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => router.push(`/provider/job/${job.id}`)}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{job.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {formatStatus(job.status)}
                      </span>
                    </div>
                    {job.clientName && (
                      <p className="text-sm text-gray-600 mb-2">{job.clientName}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {job.streetAddress && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">{job.streetAddress}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{job.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-[#00B14F]">₱{job.totalAmount.toLocaleString()}</p>
                    <ChevronRight className="w-5 h-5 text-gray-400 mt-2 ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
