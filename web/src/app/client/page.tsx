'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import { 
  Search, 
  MapPin, 
  Star, 
  Heart,
  Zap,
  Droplets,
  Hammer,
  Paintbrush,
  Car,
  Home,
  Wrench,
  X,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  serviceCategory: string;
  rating: number;
  reviewCount: number;
  profilePhoto?: string;
  isOnline: boolean;
  barangay?: string;
  bio?: string;
  providerStatus?: string;
}

const SERVICE_CATEGORIES = [
  { id: 'Electrician', name: 'Electrician', icon: Zap, color: '#F59E0B' },
  { id: 'Plumber', name: 'Plumber', icon: Droplets, color: '#3B82F6' },
  { id: 'Carpenter', name: 'Carpenter', icon: Hammer, color: '#8B5CF6' },
  { id: 'Painter', name: 'Painter', icon: Paintbrush, color: '#EF4444' },
  { id: 'Mechanic', name: 'Mechanic', icon: Car, color: '#10B981' },
  { id: 'Cleaner', name: 'Cleaner', icon: Home, color: '#EC4899' },
  { id: 'Mason', name: 'Mason', icon: Wrench, color: '#6366F1' },
];

export default function ClientDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.uid) {
      loadFavorites();
      
      // Real-time listener for providers
      const providersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'PROVIDER'),
        where('providerStatus', '==', 'approved')
      );

      const unsubscribe = onSnapshot(providersQuery, (snapshot) => {
        const providersList: Provider[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Only show online providers
          if (data.isOnline) {
            providersList.push({
              id: doc.id,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              serviceCategory: data.serviceCategory || '',
              rating: data.rating || data.averageRating || 0,
              reviewCount: data.reviewCount || 0,
              profilePhoto: data.profilePhoto,
              isOnline: data.isOnline || false,
              barangay: data.barangay,
              bio: data.bio,
              providerStatus: data.providerStatus,
            });
          }
        });
        setProviders(providersList);
        setLoadingData(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    filterProviders();
  }, [providers, searchQuery, selectedCategory]);

  const loadFavorites = async () => {
    if (!user?.uid) return;
    try {
      const favQuery = query(
        collection(db, 'favorites'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(favQuery);
      const ids = snapshot.docs.map(d => d.data().providerId);
      setFavoriteIds(ids);
    } catch (error) {
      console.log('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (providerId: string) => {
    if (!user?.uid) return;
    
    const isFavorite = favoriteIds.includes(providerId);
    const favoriteDocId = `${user.uid}_${providerId}`;
    
    try {
      if (isFavorite) {
        await deleteDoc(doc(db, 'favorites', favoriteDocId));
        setFavoriteIds(prev => prev.filter(id => id !== providerId));
      } else {
        await setDoc(doc(db, 'favorites', favoriteDocId), {
          userId: user.uid,
          providerId,
          createdAt: new Date(),
        });
        setFavoriteIds(prev => [...prev, providerId]);
      }
    } catch (error) {
      console.log('Error toggling favorite:', error);
    }
  };

  const filterProviders = () => {
    let filtered = [...providers];
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.serviceCategory === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.serviceCategory?.toLowerCase().includes(q) ||
        p.barangay?.toLowerCase().includes(q) ||
        p.bio?.toLowerCase().includes(q)
      );
    }
    
    setFilteredProviders(filtered);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Search */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Find a Provider
            </h1>
            <p className="text-gray-500 mt-1">
              {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} online
            </p>
          </div>
          
          {/* Search Toggle */}
          <div className="relative">
            {isSearchOpen ? (
              <div className="flex items-center bg-white rounded-full shadow-lg border px-4 py-2 w-72">
                <Search className="w-5 h-5 text-[#00B14F] mr-2" />
                <input
                  type="text"
                  placeholder="Search providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none text-sm"
                  autoFocus
                />
                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
              >
                <Search className="w-5 h-5 text-[#00B14F]" />
              </button>
            )}
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {SERVICE_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? 'bg-[#00B14F] text-white shadow-lg'
                  : 'bg-white text-gray-700 shadow hover:shadow-md'
              }`}
            >
              <category.icon 
                className="w-4 h-4" 
                style={{ color: selectedCategory === category.id ? 'white' : category.color }}
              />
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          ))}
        </div>

        {/* Providers Grid */}
        {filteredProviders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchQuery 
                ? `No providers found for "${searchQuery}"` 
                : selectedCategory 
                  ? `No ${selectedCategory}s online right now`
                  : 'No providers online in your area'}
            </p>
            {(searchQuery || selectedCategory) && (
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                className="mt-4 text-[#00B14F] font-medium hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Profile Photo */}
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden">
                      {provider.profilePhoto ? (
                        <img 
                          src={provider.profilePhoto} 
                          alt={provider.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-semibold">
                          {provider.firstName[0]}
                        </div>
                      )}
                    </div>
                    {/* Online Indicator */}
                    {provider.isOnline && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
                        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                      </div>
                    )}
                  </div>

                  {/* Provider Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {provider.firstName} {provider.lastName}
                      </h3>
                      {provider.providerStatus === 'approved' && (
                        <div className="bg-blue-500 rounded-md p-0.5">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Service Category Badge */}
                    <div className="mt-1">
                      <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded">
                        {provider.serviceCategory}
                      </span>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mt-2">
                      <Star className={`w-4 h-4 ${provider.rating > 0 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      <span className="text-sm text-gray-600">
                        {provider.rating > 0 
                          ? `${provider.rating.toFixed(1)} (${provider.reviewCount} ${provider.reviewCount === 1 ? 'review' : 'reviews'})`
                          : 'New Provider'}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {provider.barangay ? `Brgy. ${provider.barangay}` : 'Maasin City'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(provider.id); }}
                        className={`p-2 rounded-lg border transition-colors ${
                          favoriteIds.includes(provider.id)
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Heart 
                          className={`w-5 h-5 ${
                            favoriteIds.includes(provider.id) 
                              ? 'text-red-500 fill-red-500' 
                              : 'text-gray-400'
                          }`} 
                        />
                      </button>
                      
                      {/* View Profile Button */}
                      <button
                        onClick={() => router.push(`/client/provider/${provider.id}`)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        View Profile
                      </button>
                    </div>
                    
                    {/* Contact Button */}
                    <button
                      onClick={() => router.push(`/client/book/${provider.id}`)}
                      className="px-4 py-2 bg-[#00B14F] text-white rounded-lg text-sm font-semibold hover:bg-[#009940] transition-colors"
                    >
                      Contact Us
                    </button>
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
