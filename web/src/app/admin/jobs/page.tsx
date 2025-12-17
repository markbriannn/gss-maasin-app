'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Briefcase, Search, Clock, MapPin, ChevronRight } from 'lucide-react';

interface Job {
  id: string;
  serviceCategory: string;
  status: string;
  clientName: string;
  providerName?: string;
  streetAddress?: string;
  totalAmount: number;
  createdAt: Date;
}

export default function AdminJobsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
      fetchJobs();
    }
  }, [user]);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, statusFilter]);

  const fetchJobs = async () => {
    try {
      const jobsQuery = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(jobsQuery);
      const list: Job[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          serviceCategory: data.serviceCategory || '',
          status: data.status || '',
          clientName: data.clientName || 'Client',
          providerName: data.providerName,
          streetAddress: data.streetAddress,
          totalAmount: data.totalAmount || data.price || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setJobs(list);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const filterJobs = () => {
    let filtered = [...jobs];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(j => j.status === statusFilter);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(j =>
        j.serviceCategory.toLowerCase().includes(q) ||
        j.clientName.toLowerCase().includes(q) ||
        j.providerName?.toLowerCase().includes(q)
      );
    }
    
    setFilteredJobs(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'accepted': return 'bg-purple-100 text-purple-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'payment_received': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const statuses = ['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'];

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600 mt-1">{jobs.length} total jobs</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-medium capitalize ${
                statusFilter === status
                  ? 'bg-[#00B14F] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : formatStatus(status)}
            </button>
          ))}
        </div>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No jobs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => router.push(`/admin/job/${job.id}`)}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{job.serviceCategory}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {formatStatus(job.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span>Client: {job.clientName}</span>
                      {job.providerName && <span>Provider: {job.providerName}</span>}
                    </div>
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
    </AdminLayout>
  );
}
