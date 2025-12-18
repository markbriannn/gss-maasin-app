'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import dynamic from 'next/dynamic';
import { 
  Search, 
  Star, 
  Heart,
  Zap,
  Droplets,
  Hammer,
  Sparkles,
  Wrench,
  X,
  CheckCircle,
  Navigation,
  User,
  Loader2
} from 'lucide-react';

// Dynamically import the Leaflet map component (client-side only)
const ClientMapView = dynamic(
  () => import('@/components/ClientMapView'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#00B14F] animate-spin mx-auto mb-3" />
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
}

const SERVICE_CATEGORIES = [
  { id: 'electrician', name: 'Electrician', icon: Zap, color: '#F59E0B' },
  { id: 'plumber', name: 'Plumber', icon: Droplets, color: '#3B82F6' },
  { id: 'carpenter', name: 'Carpenter', icon: Hammer, color: '#8B4513' },
  { id: 'cleaner', name: 'Cleaner', icon: Sparkles, color: '#10B981' },
];

// Default location: Maasin City
const DEFAULT_CENTER = { lat: 10.1335, lng: 124.8513 };

// Calculate distance between two coordinates in km (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Panel heights
const PANEL_MIN = 140;
const PANEL_MID = 320;
const PANEL_MAX = typeof window !== 'undefined' ? window.innerHeight * 0.75 : 500;

export default function ClientDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  
  // Draggable panel state
  const [panelHeight, setPanelHeight] = useState(PANEL_MID);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(PANEL_MID);

  // Handle drag start
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    dragStartY.current = clientY;
    dragStartHeight.current = panelHeight;
  }, [panelHeight]);

  // Handle drag move
  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    const delta = dragStartY.current - clientY;
    const newHeight = Math.max(PANEL_MIN, Math.min(PANEL_MAX, dragStartHeight.current + delta));
    setPanelHeight(newHeight);
  }, [isDragging]);

  // Handle drag end - snap to nearest position
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    
    // Determine which snap point is closest
    const distToMin = Math.abs(panelHeight - PANEL_MIN);
    const distToMid = Math.abs(panelHeight - PANEL_MID);
    const distToMax = Math.abs(panelHeight - PANEL_MAX);
    
    if (distToMin <= distToMid && distToMin <= distToMax) {
      setPanelHeight(PANEL_MIN);
    } else if (distToMid <= distToMax) {
      setPanelHeight(PANEL_MID);
    } else {
      setPanelHeight(PANEL_MAX);
    }
  }, [panelHeight]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientY);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  };

  // Global mouse/touch move and up handlers
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

  // Get user location on mount
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
        where('role', '==', 'PROVIDER')
      );

      const unsubscribe = onSnapshot(providersQuery, (snapshot) => {
        const providersList: Provider[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const isApproved = data.providerStatus === 'approved' || data.status === 'approved';
          if (!isApproved || !data.isOnline) return;
          
          // Calculate distance if user location and provider location are available
          let distance: number | null = null;
          const providerLat = data.latitude;
          const providerLng = data.longitude;
          
          if (userLocation && providerLat && providerLng) {
            distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              providerLat,
              providerLng
            );
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
            fixedPrice: data.fixedPrice || 0,
            hourlyRate: data.hourlyRate || data.fixedPrice || 200,
            responseTime: data.responseTime || Math.floor(Math.random() * 10) + 2,
          });
        });
        
        // Sort by recommended score (like mobile)
        providersList.sort((a, b) => {
          const scoreA = (a.rating * 2) + ((a.completedJobs || 0) * 0.1) - ((a.responseTime || 10) * 0.05);
          const scoreB = (b.rating * 2) + ((b.completedJobs || 0) * 0.1) - ((b.responseTime || 10) * 0.05);
          return scoreB - scoreA;
        });
        
        // Secondary sort by distance (closest first)
        providersList.sort((a, b) => {
          const distA = a.distance ?? null;
          const distB = b.distance ?? null;
          if (distA === null && distB === null) return 0;
          if (distA === null) return 1;
          if (distB === null) return -1;
          return distA - distB;
        });
        
        setProviders(providersList);
        setLoadingData(false);
      });

      return () => unsubscribe();
    }
  }, [user, userLocation]);

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
      // Case-insensitive category comparison
      filtered = filtered.filter(p => p.serviceCategory?.toLowerCase() === selectedCategory.toLowerCase());
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

  const handleMyLocation = () => {
    // If we already have user location, just center the map
    if (userLocation) {
      setMapCenter(userLocation);
      return;
    }
    
    // Otherwise, try to get the user's location
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        setUserLocation(newLocation);
        setMapCenter(newLocation);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please enable location services.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B14F]"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="relative h-[calc(100vh-64px)] overflow-hidden">
        {/* Map Container - Leaflet */}
        <div className="absolute inset-0 z-0">
          <ClientMapView
            providers={filteredProviders}
            userLocation={userLocation}
            center={mapCenter}
            onProviderClick={(providerId) => router.push(`/client/providers/${providerId}`)}
          />
        </div>

        {/* Search Bar - Top Center */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-md">
          <div className="flex items-center bg-white rounded-full shadow-lg px-4 py-2">
            <Search className="w-5 h-5 text-[#00B14F] mr-2 flex-shrink-0" />
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
        <div className="absolute top-16 left-0 right-0 z-10 px-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {SERVICE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all shadow ${
                  selectedCategory === category.id
                    ? 'bg-[#00B14F] text-white'
                    : 'bg-white text-gray-700 hover:shadow-md'
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
        </div>

        {/* My Location Button */}
        <button
          onClick={handleMyLocation}
          style={{ bottom: panelHeight + 16 }}
          className="absolute right-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all"
        >
          <Navigation className="w-5 h-5 text-[#00B14F]" />
        </button>



        {/* Draggable Bottom Panel */}
        <div 
          ref={panelRef}
          style={{ height: panelHeight }}
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-20 ${
            isDragging ? '' : 'transition-[height] duration-300'
          }`}
        >
          {/* Drag Handle */}
          <div 
            className="w-full flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none select-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
          </div>

          <div className="px-4 pb-4 overflow-hidden" style={{ height: panelHeight - 40 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Find a Provider</h2>
              <span className="text-sm text-gray-500">
                {filteredProviders.length} online
              </span>
            </div>

            {loadingData ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-gray-100 rounded-xl h-20 animate-pulse" />
                ))}
              </div>
            ) : filteredProviders.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto pr-1" style={{ maxHeight: panelHeight - 100 }}>
                {filteredProviders.map((provider) => {
                  const categoryData = SERVICE_CATEGORIES.find(c => c.id === provider.serviceCategory?.toLowerCase());
                  const CategoryIcon = categoryData?.icon || Wrench;
                  const categoryColor = categoryData?.color || '#6B7280';
                  
                  return (
                    <div
                      key={provider.id}
                      className="bg-white rounded-xl p-3 hover:shadow-md transition-all cursor-pointer border border-gray-100"
                      onClick={() => router.push(`/client/providers/${provider.id}`)}
                    >
                      {/* Photo + Name Row */}
                      <div className="flex items-start gap-2 mb-2">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden">
                            {provider.profilePhoto ? (
                              <img 
                                src={provider.profilePhoto} 
                                alt={provider.firstName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          {provider.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-gray-900 text-sm truncate">
                              {provider.firstName} {provider.lastName}
                            </span>
                            {provider.providerStatus === 'approved' && (
                              <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          {/* Service Category Badge */}
                          <div 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold mt-0.5"
                            style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                          >
                            <CategoryIcon className="w-2.5 h-2.5" />
                            <span>{provider.serviceCategory || 'Service Provider'}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(provider.id); }}
                          className="p-1 flex-shrink-0 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${favoriteIds.includes(provider.id) ? 'fill-red-500 text-red-500' : 'text-gray-300 hover:text-gray-400'}`} />
                        </button>
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <div className="flex items-center gap-0.5">
                          <Star className={`w-3 h-3 ${provider.rating > 0 ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                          <span className="font-medium text-gray-700">{provider.rating > 0 ? provider.rating.toFixed(1) : 'New'}</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <span className="truncate">
                          {typeof provider.distance === 'number'
                            ? `${provider.distance} km` 
                            : provider.barangay 
                              ? `Brgy. ${provider.barangay}` 
                              : 'Nearby'}
                        </span>
                      </div>

                      {/* Contact Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/client/book?providerId=${provider.id}`); }}
                        className="w-full py-2 bg-[#00B14F] text-white rounded-lg text-xs font-semibold hover:bg-[#009940] transition-colors"
                      >
                        Contact Us
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500">
                  {searchQuery 
                    ? `No providers found for "${searchQuery}"` 
                    : 'No providers online in your area'}
                </p>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-[#00B14F] font-medium text-sm"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
