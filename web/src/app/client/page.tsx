'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import dynamic from 'next/dynamic';
import { 
  Search, Star, Heart, Zap, Droplets, Hammer, Sparkles, Wrench, X,
  CheckCircle, Navigation, User, Loader2, Clock, MapPin, DollarSign,
  Filter, ChevronRight, Award, Shield
} from 'lucide-react';

const ClientMapView = dynamic(
  () => import('@/components/ClientMapView'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading map...</p>
        </div>
      </div>
    )
  }
);

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
  latitude?: number;
  longitude?: number;
  distance?: number | null;
  completedJobs?: number;
  fixedPrice?: number;
  hourlyRate?: number;
  responseTime?: number;
  estimatedArrival?: string;
  tier?: string;
}

const SERVICE_CATEGORIES = [
  { id: 'electrician', name: 'Electrician', icon: Zap, color: '#F59E0B', emoji: '⚡' },
  { id: 'plumber', name: 'Plumber', icon: Droplets, color: '#3B82F6', emoji: '🔧' },
  { id: 'carpenter', name: 'Carpenter', icon: Hammer, color: '#8B4513', emoji: '🪚' },
  { id: 'cleaner', name: 'Cleaner', icon: Sparkles, color: '#10B981', emoji: '🧹' },
];

type FilterType = 'recommended' | 'cheapest' | 'nearest' | 'top_rated';

const FILTERS: { id: FilterType; label: string; icon: React.ReactNode }[] = [
  { id: 'recommended', label: 'Recommended', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'cheapest', label: 'Cheapest', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'nearest', label: 'Nearest', icon: <Navigation className="w-4 h-4" /> },
  { id: 'top_rated', label: 'Top Rated', icon: <Star className="w-4 h-4" /> },
];

const DEFAULT_CENTER = { lat: 10.1335, lng: 124.8513 };

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const getEstimatedArrival = (distance: number | null): string => {
  if (!distance) return '~15 mins';
  const avgSpeed = 30;
  const minutes = Math.round((distance / avgSpeed) * 60);
  if (minutes < 5) return '< 5 mins';
  if (minutes < 60) return `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
};

const getTierStyle = (tier?: string) => {
  switch (tier) {
    case 'diamond': return { bg: 'from-cyan-400 to-blue-500', label: 'DIAMOND' };
    case 'platinum': return { bg: 'from-indigo-400 to-purple-500', label: 'PLATINUM' };
    case 'gold': return { bg: 'from-amber-400 to-yellow-500', label: 'GOLD' };
    case 'silver': return { bg: 'from-gray-400 to-slate-500', label: 'SILVER' };
    default: return null;
  }
};

const PANEL_MIN = 180;
const PANEL_MID = 400;
const PANEL_MAX = typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600;

export default function ClientDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('recommended');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  
  const [panelHeight, setPanelHeight] = useState(PANEL_MID);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(PANEL_MID);

  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    dragStartY.current = clientY;
    dragStartHeight.current = panelHeight;
  }, [panelHeight]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    const delta = dragStartY.current - clientY;
    const newHeight = Math.max(PANEL_MIN, Math.min(PANEL_MAX, dragStartHeight.current + delta));
    setPanelHeight(newHeight);
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    const distToMin = Math.abs(panelHeight - PANEL_MIN);
    const distToMid = Math.abs(panelHeight - PANEL_MID);
    const distToMax = Math.abs(panelHeight - PANEL_MAX);
    
    if (distToMin <= distToMid && distToMin <= distToMax) setPanelHeight(PANEL_MIN);
    else if (distToMid <= distToMax) setPanelHeight(PANEL_MID);
    else setPanelHeight(PANEL_MAX);
  }, [panelHeight]);

  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); handleDragStart(e.clientY); };
  const handleTouchStart = (e: React.TouchEvent) => { handleDragStart(e.touches[0].clientY); };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const handleMouseUp = () => handleDragEnd();
    const handleTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientY);
    const handleTouchEnd = () => handleDragEnd();

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
          setMapCenter(loc);
        },
        () => console.log('Geolocation denied'),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.uid) {
      loadFavorites();
      const providersQuery = query(collection(db, 'users'), where('role', '==', 'PROVIDER'));

      const unsubscribe = onSnapshot(providersQuery, (snapshot) => {
        const providersList: Provider[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const isApproved = data.providerStatus === 'approved' || data.status === 'approved';
          if (!isApproved || !data.isOnline) return;
          
          let distance: number | null = null;
          if (userLocation && data.latitude && data.longitude) {
            distance = calculateDistance(userLocation.lat, userLocation.lng, data.latitude, data.longitude);
          }
          
          providersList.push({
            id: docSnap.id,
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
            latitude: data.latitude,
            longitude: data.longitude,
            distance: distance !== null ? parseFloat(distance.toFixed(1)) : null,
            completedJobs: data.completedJobs || 0,
            fixedPrice: data.fixedPrice || data.hourlyRate || 0,
            hourlyRate: data.hourlyRate || data.fixedPrice || 0,
            responseTime: data.responseTime || Math.floor(Math.random() * 10) + 2,
            estimatedArrival: getEstimatedArrival(distance),
            tier: data.tier || 'bronze',
          });
        });
        
        setProviders(providersList);
        setLoadingData(false);
      });

      return () => unsubscribe();
    }
  }, [user, userLocation]);

  useEffect(() => {
    filterAndSortProviders();
  }, [providers, searchQuery, selectedCategory, activeFilter]);

  const loadFavorites = async () => {
    if (!user?.uid) return;
    try {
      const favQuery = query(collection(db, 'favorites'), where('userId', '==', user.uid));
      const snapshot = await getDocs(favQuery);
      setFavoriteIds(snapshot.docs.map(d => d.data().providerId));
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
        await setDoc(doc(db, 'favorites', favoriteDocId), { userId: user.uid, providerId, createdAt: new Date() });
        setFavoriteIds(prev => [...prev, providerId]);
      }
    } catch (error) {
      console.log('Error toggling favorite:', error);
    }
  };

  const filterAndSortProviders = () => {
    let filtered = [...providers];
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.serviceCategory?.toLowerCase() === selectedCategory.toLowerCase());
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.serviceCategory?.toLowerCase().includes(q) ||
        p.barangay?.toLowerCase().includes(q)
      );
    }

    // Apply sorting based on active filter
    switch (activeFilter) {
      case 'cheapest':
        filtered.sort((a, b) => (a.fixedPrice || 0) - (b.fixedPrice || 0));
        break;
      case 'nearest':
        filtered.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
        break;
      case 'top_rated':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'recommended':
      default:
        filtered.sort((a, b) => {
          const scoreA = (a.rating * 2) + ((a.completedJobs || 0) * 0.1) - ((a.distance ?? 10) * 0.3);
          const scoreB = (b.rating * 2) + ((b.completedJobs || 0) * 0.1) - ((b.distance ?? 10) * 0.3);
          return scoreB - scoreA;
        });
        break;
    }
    
    setFilteredProviders(filtered);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
  };

  const handleMyLocation = () => {
    if (userLocation) { setMapCenter(userLocation); return; }
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(newLocation);
        setMapCenter(newLocation);
      },
      () => alert('Could not get your location'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
    if (provider.latitude && provider.longitude) {
      setMapCenter({ lat: provider.latitude, lng: provider.longitude });
    }
  };

  const handleBookProvider = () => {
    if (selectedProvider) {
      router.push(`/client/book?providerId=${selectedProvider.id}`);
    }
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="relative h-[calc(100vh-64px)] overflow-hidden">
        {/* Map */}
        <div className="absolute inset-0 z-0">
          <ClientMapView
            providers={filteredProviders}
            userLocation={userLocation}
            center={mapCenter}
            onProviderClick={(providerId) => {
              const provider = filteredProviders.find(p => p.id === providerId);
              if (provider) handleProviderSelect(provider);
            }}
          />
        </div>

        {/* Search Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-md">
          <div className="flex items-center bg-white rounded-2xl shadow-lg px-4 py-3">
            <Search className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-sm bg-transparent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Category Chips */}
        <div className="absolute top-20 left-0 right-0 z-10 px-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {SERVICE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all shadow-md ${
                  selectedCategory === category.id
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-white text-gray-700 hover:shadow-lg'
                }`}
              >
                <span className="text-lg">{category.emoji}</span>
                <span className="text-sm font-semibold">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* My Location Button */}
        <button
          onClick={handleMyLocation}
          style={{ bottom: panelHeight + 16 }}
          className="absolute right-4 z-10 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center hover:shadow-xl transition-all"
        >
          <Navigation className="w-5 h-5 text-emerald-500" />
        </button>

        {/* Bottom Panel */}
        <div 
          ref={panelRef}
          style={{ height: panelHeight }}
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-20 ${isDragging ? '' : 'transition-[height] duration-300'}`}
        >
          {/* Drag Handle */}
          <div 
            className="w-full flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none select-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          <div className="px-4 pb-4 overflow-hidden" style={{ height: panelHeight - 50 }}>
            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-3">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    activeFilter === filter.id
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.icon}
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Provider Count */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Available Providers</h2>
              <span className="text-sm text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full">
                {filteredProviders.length} online
              </span>
            </div>

            {loadingData ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-gray-100 rounded-2xl h-24 animate-pulse" />
                ))}
              </div>
            ) : filteredProviders.length > 0 ? (
              <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: panelHeight - 160 }}>
                {filteredProviders.map((provider, index) => {
                  const isSelected = selectedProvider?.id === provider.id;
                  const isTopPick = index === 0 && activeFilter === 'recommended';
                  const tierStyle = getTierStyle(provider.tier);
                  const categoryData = SERVICE_CATEGORIES.find(c => c.id === provider.serviceCategory?.toLowerCase());
                  
                  return (
                    <div
                      key={provider.id}
                      onClick={() => handleProviderSelect(provider)}
                      className={`rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/20'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                      }`}
                    >
                      {isTopPick && (
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> TOP PICK FOR YOU
                        </div>
                      )}
                      
                      <div className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Photo */}
                          <div className="relative flex-shrink-0">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100">
                              {provider.profilePhoto ? (
                                <img src={provider.profilePhoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                  {categoryData?.emoji || '🛠️'}
                                </div>
                              )}
                            </div>
                            {provider.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 truncate">{provider.firstName} {provider.lastName}</h3>
                              {tierStyle && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${tierStyle.bg}`}>
                                  {tierStyle.label}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm text-gray-500 mb-1.5">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="font-semibold text-gray-700">{provider.rating > 0 ? provider.rating.toFixed(1) : 'New'}</span>
                                {provider.reviewCount > 0 && <span>({provider.reviewCount})</span>}
                              </div>
                              <span className="text-gray-300">•</span>
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span>{provider.completedJobs || 0} jobs</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{provider.estimatedArrival}</span>
                              </div>
                              {provider.distance && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{provider.distance} km</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Price & Favorite */}
                          <div className="text-right flex flex-col items-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(provider.id); }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Heart className={`w-5 h-5 ${favoriteIds.includes(provider.id) ? 'fill-red-500 text-red-500' : 'text-gray-300'}`} />
                            </button>
                            {provider.fixedPrice && provider.fixedPrice > 0 ? (
                              <div>
                                <p className="text-xl font-bold text-gray-900">₱{provider.fixedPrice.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">fixed price</p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">Price varies</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No providers available</h3>
                <p className="text-gray-500">
                  {searchQuery ? `No results for "${searchQuery}"` : 'No providers online in your area'}
                </p>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="mt-3 text-emerald-500 font-semibold">
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Book Button */}
          {selectedProvider && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-2xl">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {selectedProvider.profilePhoto ? (
                    <img src={selectedProvider.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">
                      {SERVICE_CATEGORIES.find(c => c.id === selectedProvider.serviceCategory?.toLowerCase())?.emoji || '🛠️'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{selectedProvider.firstName} {selectedProvider.lastName}</p>
                  <p className="text-sm text-gray-500">{selectedProvider.estimatedArrival} away • {selectedProvider.serviceCategory}</p>
                </div>
                <div className="text-right">
                  {selectedProvider.fixedPrice && selectedProvider.fixedPrice > 0 && (
                    <p className="text-xl font-bold text-emerald-600">₱{selectedProvider.fixedPrice.toLocaleString()}</p>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleBookProvider}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                Book {selectedProvider.firstName}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
