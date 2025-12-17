'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import { 
  DollarSign, 
  Briefcase, 
  Star, 
  Clock,
  CheckCircle,
  MapPin,
  User,
  ChevronRight,
  Bell,
  History,
  Trophy
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
  description?: string;
}

interface Stats {
  todayEarnings: number;
  weekEarnings: number;
  totalEarnings: number;
  jobsToday: number;
  activeJobs: number;
  rating: number;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function ProviderDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState<Stats>({
    todayEarnings: 0,
    weekEarnings: 0,
    totalEarnings: 0,
    jobsToday: 0,
    activeJobs: 0,
    rating: 0,
  });
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
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
      // Get provider's online status
      const providerDoc = await getDoc(doc(db, 'users', user.uid));
      if (providerDoc.exists()) {
        setIsOnline(providerDoc.data().isOnline || false);
      }

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

      myJobsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Count completed and Pay First confirmed jobs
        if (data.status === 'completed' || (data.status === 'payment_received' && data.isPaidUpfront)) {
          const baseAmount = data.providerPrice || data.offeredPrice || data.totalAmount || data.price || 0;
          const approvedCharges = data.additionalCharges?.filter((c: { status: string; amount: number }) => c.status === 'approved')
            .reduce((sum: number, c: { amount: number }) => sum + (c.amount || 0), 0) || 0;
          const amount = data.finalAmount || (baseAmount + approvedCharges);
          
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
      });

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
        where('status', 'in', ['pending', 'approved'])
      );
      const availableSnapshot = await getDocs(availableQuery);
      const available: Job[] = [];
      
      for (const docSnap of availableSnapshot.docs) {
        const data = docSnap.data();
        if (!data.providerId) {
          // Build location string
          let location = '';
          if (data.barangay) location = `Brgy. ${data.barangay}, `;
          location += 'Maasin City';
          if (!data.barangay && data.streetAddress) {
            location = data.streetAddress;
          }

          available.push({
            id: docSnap.id,
            title: data.title || data.serviceCategory || 'Service Request',
            serviceCategory: data.serviceCategory || 'General',
            status: data.status,
            clientName: data.clientName || 'Client',
            location,
            amount: data.totalAmount || data.price || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            description: data.description,
          });
        }
      }
      
      setAvailableJobs(available.slice(0, 5));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    
    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          isOnline: newStatus,
          lastOnline: new Date(),
        });
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      setIsOnline(!newStatus);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00B14F] to-[#009940] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-green-100 text-sm">{getGreeting()},</p>
              <h1 className="text-2xl font-bold text-white">
                {user?.firstName} {user?.lastName}
              </h1>
            </div>
            
            {/* Online Toggle */}
            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                isOnline 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/10 text-white/70'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-300' : 'bg-gray-400'}`}>
                {isOnline && <div className="w-full h-full bg-green-300 rounded-full animate-ping" />}
              </div>
              <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>

          {/* Earnings Card */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-green-100 text-sm mb-1">Today&apos;s Earnings</p>
            <p className="text-4xl font-bold text-white mb-4">₱{stats.todayEarnings.toLocaleString()}</p>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-green-100 text-xs">This Week</p>
                <p className="text-white font-semibold">₱{stats.weekEarnings.toLocaleString()}</p>
              </div>
              <button
                onClick={() => router.push('/provider/earnings')}
                className="bg-white text-[#00B14F] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-50 transition-colors"
              >
                View Earnings
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div 
            className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/provider/history')}
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3">
              <Briefcase className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.jobsToday}</p>
            <p className="text-sm text-gray-500">Jobs Today</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-3">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.activeJobs}</p>
            <p className="text-sm text-gray-500">Active Jobs</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
              <Star className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.rating.toFixed(1)}</p>
            <p className="text-sm text-gray-500">Rating</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/provider/history')}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <History className="w-5 h-5 text-green-600" />
              </div>
              <span className="font-medium text-gray-900">Service History</span>
            </button>
            <button
              onClick={() => router.push('/provider/messages')}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="font-medium text-gray-900">Messages</span>
            </button>
          </div>
        </div>

        {/* Available Jobs */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Available Jobs</h2>
            <button 
              onClick={() => router.push('/provider/jobs')}
              className="text-[#00B14F] text-sm font-medium flex items-center gap-1 hover:underline"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {availableJobs.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <Briefcase className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-900 font-medium mb-1">No available jobs right now</p>
              <p className="text-gray-500 text-sm">New jobs will appear here when clients post them</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => router.push(`/provider/job/${job.id}`)}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="inline-block bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-1 rounded mb-2">
                        {job.serviceCategory}
                      </span>
                      <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    </div>
                    <p className="text-[#00B14F] font-bold">₱{job.amount.toLocaleString()}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{job.clientName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                    </div>
                  </div>

                  {job.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{job.description}</p>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      Posted {job.createdAt.toLocaleDateString()}
                    </span>
                    <button className="bg-[#00B14F] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#009940]">
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProviderLayout>
  );
}
