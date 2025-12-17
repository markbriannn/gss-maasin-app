'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import { Search, Star, MapPin, Filter } from 'lucide-react';

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  serviceCategory: string;
  rating: number;
  reviewCount: number;
  profilePhoto?: string;
  isOnline: boolean;
  completedJobs: number;
}

const categories = [
  'All', 'Electrician', 'Plumber', 'Carpenter', 'Painter', 'Mechanic', 'Cleaner'
];

export default function ProvidersPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'All');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    filterProviders();
  }, [providers, searchQuery, selectedCategory]);

  const fetchProviders = async () => {
    try {
      const providersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'PROVIDER'),
        where('providerStatus', '==', 'approved')
      );
      const snapshot = await getDocs(providersQuery);
      const list: Provider[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          serviceCategory: data.serviceCategory || '',
          rating: data.rating || data.averageRating || 0,
          reviewCount: data.reviewCount || 0,
          profilePhoto: data.profilePhoto,
          isOnline: data.isOnline || false,
          completedJobs: data.completedJobs || 0,
        });
      });
      setProviders(list);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const filterProviders = () => {
    let filtered = [...providers];
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => 
        p.serviceCategory.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query) ||
        p.serviceCategory.toLowerCase().includes(query)
      );
    }
    
    setFilteredProviders(filtered);
  };

  if (isLoading || loadingData) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Find Providers</h1>

        {/* Search and Filter */}
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
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#00B14F] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Providers Grid */}
        {filteredProviders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No providers found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                onClick={() => router.push(`/client/provider/${provider.id}`)}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
                      {provider.profilePhoto ? (
                        <img src={provider.profilePhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl font-semibold">
                          {provider.firstName[0]}
                        </div>
                      )}
                    </div>
                    {provider.isOnline && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {provider.firstName} {provider.lastName}
                    </h3>
                    <p className="text-sm text-[#00B14F] font-medium">{provider.serviceCategory}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
                      <span className="text-sm text-gray-400">({provider.reviewCount})</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {provider.completedJobs} jobs completed
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
