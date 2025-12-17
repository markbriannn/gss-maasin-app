'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import { 
  DollarSign, 
  Briefcase, 
  Star, 
  Clock,
  CheckCircle,
  MapPin
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  serviceCategory: string;
  status: string;
  clientName?: string;
  location?: string;
  amount: number;
  createdAt: Date;
}

interface Stats {
  todayEarnings: number;
  weekEarnings: number;
  totalEarnings: number;
  jobsToday: number;
  activeJobs: number;
  rating: number;
}

export default function ProviderDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    todayEarnings: 0,
    weekEarnings: 0,
    totalEarnings: 0,
    jobsToday: 0,
    activeJobs: 0,
    rating: 0,
  });
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
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
    if (user?.uid && user?.role?.toUpperCase() === 'PROVIDER') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user?.uid) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Fetch my jobs
      const myJobsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', user.uid)
      );
      const myJobsSnapshot = await getDocs(myJobsQuery);
      
      let todayEarnings = 0;
      let weekEarnings = 0;
      let totalEarnings = 0;
      let jobsToday = 0;
      let activeJobs = 0;
      const jobsList: Job[] = [];

      myJobsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        if (data.status === 'completed' || (data.status === 'payment_received' && data.isPaidUpfront)) {
          const amount = data.finalAmount || data.providerPrice || data.totalAmount || 0;
          totalEarnings += amount;
          
          const completedAt = data.completedAt?.toDate?.() || data.clientConfirmedAt?.toDate?.();
          if (completedAt) {
            if (completedAt >= today) {
              todayEarnings += amount;
              jobsToday++;
            }
            if (completedAt >= weekAgo) {
              weekEarnings += amount;
            }
          }
        }

        if (data.status === 'in_progress' || data.status === 'accepted') {
          activeJobs++;
        }

        jobsList.push({
          id: doc.id,
          title: data.title || data.serviceCategory,
          serviceCategory: data.serviceCategory,
          status: data.status,
          clientName: data.clientName,
          location: data.streetAddress || data.location,
          amount: data.totalAmount || data.price || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      setMyJobs(jobsList.slice(0, 5));
      setStats({
        todayEarnings,
        weekEarnings,
        totalEarnings,
        jobsToday,
        activeJobs,
        rating: user.rating || 0,
      });

      // Fetch available jobs
      const availableQuery = query(
        collection(db, 'bookings'),
        where('status', 'in', ['pending', 'pending_negotiation']),
        limit(10)
      );
      const availableSnapshot = await getDocs(availableQuery);
      const available: Job[] = [];
      
      availableSnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.providerId && data.adminApproved) {
          available.push({
            id: doc.id,
            title: data.title || data.serviceCategory,
            serviceCategory: data.serviceCategory,
            status: data.status,
            clientName: data.clientName,
            location: data.streetAddress || data.location,
            amount: data.totalAmount || data.price || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        }
      });
      
      setAvailableJobs(available);
    } catch (error) {
      console.error('Error fetching data:', error);
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
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-1">Here&apos;s your dashboard overview</p>
        </div>

        {/* Earnings Card */}
        <div className="bg-gradient-to-br from-[#00B14F] to-[#009940] rounded-2xl p-6 text-white mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-green-100">Today&apos;s Earnings</span>
            <DollarSign className="w-6 h-6 text-green-200" />
          </div>
          <div className="text-4xl font-bold mb-4">₱{stats.todayEarnings.toLocaleString()}</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-green-100 text-sm">This Week</p>
              <p className="text-xl font-semibold">₱{stats.weekEarnings.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-green-100 text-sm">Total Earnings</p>
              <p className="text-xl font-semibold">₱{stats.totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Jobs Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.jobsToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeJobs}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rating.toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Jobs */}
        {availableJobs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Jobs</h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {availableJobs.map((job, index) => (
                <div 
                  key={job.id}
                  className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                    index !== availableJobs.length - 1 ? 'border-b' : ''
                  }`}
                  onClick={() => router.push(`/provider/job/${job.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#00B14F]/10 rounded-xl flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-[#00B14F]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{job.title}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4" />
                        <span>{job.location || 'Maasin City'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#00B14F]">₱{job.amount.toLocaleString()}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Recent Jobs */}
        {myJobs.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Recent Jobs</h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {myJobs.map((job, index) => (
                <div 
                  key={job.id}
                  className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                    index !== myJobs.length - 1 ? 'border-b' : ''
                  }`}
                  onClick={() => router.push(`/provider/job/${job.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      {job.status === 'completed' ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <Clock className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{job.title}</p>
                      <p className="text-sm text-gray-500">{job.clientName || 'Client'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₱{job.amount.toLocaleString()}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
