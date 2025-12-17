'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Users, Search, CheckCircle, XCircle, Clock, Star } from 'lucide-react';

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  serviceCategory: string;
  providerStatus: string;
  rating: number;
  completedJobs: number;
  profilePhoto?: string;
  createdAt: Date;
}

export default function ProvidersPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loadingData, setLoadingData] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

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
      fetchProviders();
    }
  }, [user]);

  useEffect(() => {
    filterProviders();
  }, [providers, searchQuery, statusFilter]);

  const fetchProviders = async () => {
    try {
      const providersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'PROVIDER')
      );
      const snapshot = await getDocs(providersQuery);
      const list: Provider[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phoneNumber: data.phoneNumber || '',
          serviceCategory: data.serviceCategory || '',
          providerStatus: data.providerStatus || 'pending',
          rating: data.rating || 0,
          completedJobs: data.completedJobs || 0,
          profilePhoto: data.profilePhoto,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setProviders(list);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const filterProviders = () => {
    let filtered = [...providers];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.providerStatus === statusFilter);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.serviceCategory.toLowerCase().includes(q)
      );
    }
    
    setFilteredProviders(filtered);
  };

  const updateProviderStatus = async (providerId: string, status: 'approved' | 'rejected') => {
    setUpdating(providerId);
    try {
      await updateDoc(doc(db, 'users', providerId), {
        providerStatus: status,
      });
      setProviders(prev => prev.map(p => 
        p.id === providerId ? { ...p, providerStatus: status } : p
      ));
    } catch (error) {
      console.error('Error updating provider:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Rejected</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pending</span>;
    }
  };

  const pendingCount = providers.filter(p => p.providerStatus === 'pending').length;

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
            <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
            <p className="text-gray-600 mt-1">{providers.length} total providers</p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg font-medium">
              {pendingCount} pending approval
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium capitalize ${
                  statusFilter === status
                    ? 'bg-[#00B14F] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Providers List */}
        {filteredProviders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No providers found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jobs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProviders.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                            {provider.profilePhoto ? (
                              <img src={provider.profilePhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold">
                                {provider.firstName[0]}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{provider.firstName} {provider.lastName}</p>
                            <p className="text-sm text-gray-500">{provider.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{provider.serviceCategory}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span>{provider.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{provider.completedJobs}</td>
                      <td className="px-6 py-4">{getStatusBadge(provider.providerStatus)}</td>
                      <td className="px-6 py-4">
                        {provider.providerStatus === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateProviderStatus(provider.id, 'approved')}
                              disabled={updating === provider.id}
                              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateProviderStatus(provider.id, 'rejected')}
                              disabled={updating === provider.id}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
