'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import dynamic from 'next/dynamic';
import {
  Search, Star, Heart, Zap, Droplets, Hammer, Sparkles, X,
  Navigation, User, Loader2, MapPin, DollarSign,
  ChevronRight, Clock, MessageCircle
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
  avgJobDurationMinutes?: number;
  estimatedJobTime?: string | null;
  tier?: string;
}

interface ActiveBooking {
  id: string;
  status: string;
  serviceCategory: string;
  totalAmount: number;
  createdAt: Date;
  adminApproved: boolean;
}

const SERVICE_CATEGORIES = [
  { id: 'electrician', name: 'Electrician', icon: Zap, color: '#F59E0B', emoji: '⚡' },
  { id: 'plumber', name: 'Plumber', icon: Droplets, color: '#3B82F6', emoji: '🔧' },
  { id: 'carpenter', name: 'Carpenter', icon: Hammer, color: '#8B4513', emoji: '🪚' },
  { id: 'cleaner', name: 'Cleaner', icon: Sparkles, color: '#10B981', emoji: '🧹' },
];

type FilterType = 'recommended' | 'nearest' | 'top_rated';

const FILTERS: { id: FilterType; label: string; icon: React.ReactNode }[] = [
  { id: 'recommended', label: 'Recommended', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'nearest', label: 'Nearest', icon: <Navigation className="w-4 h-4" /> },
  { id: 'top_rated', label: 'Top Rated', icon: <Star className="w-4 h-4" /> },
];

const DEFAULT_CENTER = { lat: 10.1335, lng: 124.8513 };

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getEstimatedJobTime = (avgMinutes?: number): string | null => {
  if (!avgMinutes || avgMinutes <= 0) return null;
  if (avgMinutes >= 60) {
    const hrs = (avgMinutes / 60).toFixed(1);
    return `Est. ~${hrs} hr/job`;
  }
  return `Est. ~${Math.round(avgMinutes)} min/job`;
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
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [activeBookingsMap, setActiveBookingsMap] = useState<Map<string, ActiveBooking>>(new Map());
  const [showProviderModal, setShowProviderModal] = useState(false);

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

  // Load active bookings in real-time
  useEffect(() => {
    if (!user?.uid) return;

    const activeStatuses = ['pending', 'approved', 'accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion', 'pending_payment', 'payment_received'];
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clientId', '==', user.uid),
      where('status', 'in', activeStatuses)
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const bookingsMap = new Map<string, ActiveBooking>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.providerId) {
          bookingsMap.set(data.providerId, {
            id: docSnap.id,
            status: data.status,
            serviceCategory: data.serviceCategory,
            totalAmount: data.totalAmount || data.amount || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            adminApproved: data.adminApproved || false,
          });
        }
      });
      setActiveBookingsMap(bookingsMap);
    });

    return () => unsubscribe();
  }, [user?.uid]);

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
            // Fallback to Maasin City center with small random offset so providers without coordinates still show on map
            latitude: data.latitude || (10.1335 + (Math.random() - 0.5) * 0.008),
            longitude: data.longitude || (124.8513 + (Math.random() - 0.5) * 0.008),
            distance: distance !== null ? parseFloat(distance.toFixed(1)) : null,
            completedJobs: data.completedJobs || 0,
            fixedPrice: data.fixedPrice || data.hourlyRate || 0,
            hourlyRate: data.hourlyRate || data.fixedPrice || 0,
            avgJobDurationMinutes: data.avgJobDurationMinutes || null,
            estimatedJobTime: getEstimatedJobTime(data.avgJobDurationMinutes),
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

    // Check if client has an active booking with this provider from preloaded map
    const booking = activeBookingsMap.get(provider.id);
    setActiveBooking(booking || null);

    // Show modal when clicking from map marker
    setShowProviderModal(true);
  };

  const handleProviderSelectFromList = (provider: Provider) => {
    // If clicking the same provider, deselect (toggle off)
    if (selectedProvider?.id === provider.id) {
      setSelectedProvider(null);
      setActiveBooking(null);
      return;
    }

    setSelectedProvider(provider);
    if (provider.latitude && provider.longitude) {
      setMapCenter({ lat: provider.latitude, lng: provider.longitude });
    }

    // Check if client has an active booking with this provider from preloaded map
    const booking = activeBookingsMap.get(provider.id);
    setActiveBooking(booking || null);

    // Don't show modal when selecting from list, just highlight
    setShowProviderModal(false);
  };

  const getStatusDisplay = (status: string, adminApproved: boolean) => {
    const statusMap: Record<string, { label: string; color: string; bg: string }> = {
      'pending': { label: adminApproved ? 'Pending Provider' : 'Awaiting Admin Review', color: '#F59E0B', bg: 'bg-amber-50' },
      'approved': { label: 'Approved', color: '#10B981', bg: 'bg-green-50' },
      'accepted': { label: 'Provider Accepted', color: '#3B82F6', bg: 'bg-blue-50' },
      'traveling': { label: 'Provider On The Way', color: '#3B82F6', bg: 'bg-blue-50' },
      'arrived': { label: 'Provider Arrived', color: '#8B5CF6', bg: 'bg-purple-50' },
      'in_progress': { label: 'Work In Progress', color: '#00B14F', bg: 'bg-green-50' },
      'pending_completion': { label: 'Awaiting Confirmation', color: '#F59E0B', bg: 'bg-amber-50' },
      'pending_payment': { label: 'Awaiting Payment', color: '#3B82F6', bg: 'bg-blue-50' },
      'payment_received': { label: 'Payment Received', color: '#10B981', bg: 'bg-green-50' },
    };
    return statusMap[status] || { label: status, color: '#6B7280', bg: 'bg-gray-50' };
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
            selectedProviderId={selectedProvider?.id}
            onProviderClick={(providerId) => {
              const provider = filteredProviders.find(p => p.id === providerId);
              if (provider) handleProviderSelect(provider);
            }}
          />
        </div>

        {/* Search Bar - Frosted Glass */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-md">
          <div className="glass-strong flex items-center rounded-2xl shadow-lg shadow-black/5 border border-white/60 px-4 py-3.5 transition-all focus-within:shadow-xl focus-within:shadow-emerald-500/10 focus-within:border-emerald-200">
            <Search className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0 transition-transform group-focus-within:scale-110" />
            <input
              type="text"
              placeholder="Search providers, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-sm bg-transparent text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Category Chips - Gradient + Micro-interactions */}
        <div className="absolute top-20 left-0 right-0 z-10 px-4">
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
            {SERVICE_CATEGORIES.map((category) => {
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`tap-bounce flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all duration-200 ${isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]'
                    : 'glass-strong text-gray-700 dark:text-gray-200 shadow-md shadow-black/5 border border-white/60 dark:border-gray-600/60 hover:shadow-lg hover:scale-[1.02]'
                    }`}
                >
                  <span className="text-lg">{category.emoji}</span>
                  <span className="text-sm font-semibold">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* My Location Button */}
        <button
          onClick={handleMyLocation}
          style={{ bottom: panelHeight + 16 }}
          className="absolute right-4 z-10 w-12 h-12 glass-strong rounded-2xl shadow-lg shadow-black/5 border border-white/60 flex items-center justify-center hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <Navigation className="w-5 h-5 text-emerald-500" />
        </button>

        {/* Bottom Panel - Frosted Glass */}
        <div
          ref={panelRef}
          style={{ height: panelHeight }}
          className={`absolute bottom-0 left-0 right-0 glass-strong rounded-t-3xl shadow-2xl shadow-black/10 border-t border-white/60 z-20 ${isDragging ? '' : 'transition-[height] duration-300'}`}
        >
          {/* Drag Handle */}
          <div
            className="w-full flex justify-center py-3.5 cursor-grab active:cursor-grabbing touch-none select-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className="w-14 h-1.5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full" />
          </div>

          <div className="px-4 pb-4 overflow-hidden" style={{ height: panelHeight - 50 }}>
            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-3">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`tap-bounce flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeFilter === filter.id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'
                    }`}
                >
                  {filter.icon}
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Provider Count */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Available Providers</h2>
              <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-semibold bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 rounded-full border border-emerald-100">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-ring" />
                {filteredProviders.length} online
              </div>
            </div>

            {loadingData ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="rounded-2xl overflow-hidden border border-gray-100">
                    <div className="p-3">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-12 h-12 rounded-xl skeleton-shimmer" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-20 rounded-full skeleton-shimmer" />
                          <div className="h-3 w-14 rounded-full skeleton-shimmer" />
                        </div>
                      </div>
                      <div className="h-3 w-full rounded-full skeleton-shimmer mb-2" />
                      <div className="h-4 w-16 rounded-full skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProviders.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 overflow-y-auto pr-1" style={{ maxHeight: panelHeight - 160 }}>
                {filteredProviders.map((provider, index) => {
                  const isSelected = selectedProvider?.id === provider.id;
                  const isTopPick = index === 0 && activeFilter === 'recommended';
                  const tierStyle = getTierStyle(provider.tier);
                  const categoryData = SERVICE_CATEGORIES.find(c => c.id === provider.serviceCategory?.toLowerCase());

                  return (
                    <div
                      key={provider.id}
                      onClick={() => handleProviderSelectFromList(provider)}
                      className={`group rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden animate-fade-in ${isSelected
                        ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-400/30'
                        : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-md hover:-translate-y-0.5'
                        }`}
                    >
                      {isTopPick && (
                        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white text-[9px] font-bold px-3 py-1 flex items-center justify-center gap-1">
                          <Sparkles className="w-3 h-3" /> TOP PICK
                        </div>
                      )}

                      <div className="p-3">
                        {/* Photo Row */}
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="relative flex-shrink-0">
                            <div className={`w-12 h-12 rounded-xl overflow-hidden ${provider.isOnline ? 'gradient-ring' : 'bg-gray-100 p-0'}`}>
                              <div className="w-full h-full rounded-[10px] overflow-hidden bg-gray-100">
                                {provider.profilePhoto ? (
                                  <img src={provider.profilePhoto} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-emerald-50 to-teal-50">
                                    {categoryData?.emoji || '🛠️'}
                                  </div>
                                )}
                              </div>
                            </div>
                            {provider.isOnline && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse-ring" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-white text-xs truncate">{provider.firstName} {provider.lastName}</h3>
                            <p className="text-[11px] text-emerald-600 font-medium truncate">
                              {categoryData?.emoji} {provider.serviceCategory || 'Service'}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(provider.id); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-all duration-200 group/fav"
                          >
                            <Heart className={`w-4 h-4 transition-transform duration-200 group-hover/fav:scale-110 ${favoriteIds.includes(provider.id) ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-300'}`} />
                          </button>
                        </div>

                        {/* Rating + Est. Time */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-[11px] font-semibold text-amber-700">{provider.rating > 0 ? provider.rating.toFixed(1) : 'New'}</span>
                          </div>
                          {provider.estimatedJobTime && (
                            <span className="text-[11px] text-blue-500 font-medium">{provider.estimatedJobTime}</span>
                          )}
                        </div>

                        {/* Completed Jobs */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-400">{provider.completedJobs || 0} jobs</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-5 animate-float">
                  <User className="w-12 h-12 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No providers available</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                  {searchQuery ? `No results for "${searchQuery}"` : 'No providers online in your area right now'}
                </p>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="mt-4 text-emerald-500 font-semibold bg-emerald-50 px-5 py-2 rounded-xl hover:bg-emerald-100 transition-colors">
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Contact Button - Simple bottom bar when provider selected from list */}
          {selectedProvider && !showProviderModal && (
            <div className="absolute bottom-0 left-0 right-0 p-4 glass-strong border-t border-white/60 shadow-2xl animate-fade-in">
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
                  <p className="font-bold text-gray-900 dark:text-white truncate">{selectedProvider.firstName} {selectedProvider.lastName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedProvider.estimatedJobTime ? `${selectedProvider.estimatedJobTime} • ` : ''}{selectedProvider.serviceCategory}</p>
                </div>

              </div>

              {activeBooking ? (
                <button
                  onClick={() => router.push(`/client/bookings/${activeBooking.id}`)}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-amber-500/30 hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Clock className="w-5 h-5" />
                  {activeBooking.status === 'pending' ? 'Pending Approval' : 'View Booking'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => router.push(`/client/book?providerId=${selectedProvider.id}`)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Contact Us
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Provider Modal - Shows when clicking provider marker on map */}
      {showProviderModal && selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowProviderModal(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-6 animate-scale-up shadow-2xl shadow-black/20 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            {/* Close Button */}
            <button
              onClick={() => setShowProviderModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            {activeBooking ? (
              // BOOKED - Show booking status
              <>
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${getStatusDisplay(activeBooking.status, activeBooking.adminApproved).bg}`}>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: getStatusDisplay(activeBooking.status, activeBooking.adminApproved).color }} />
                    <span className="text-sm font-bold" style={{ color: getStatusDisplay(activeBooking.status, activeBooking.adminApproved).color }}>
                      {getStatusDisplay(activeBooking.status, activeBooking.adminApproved).label}
                    </span>
                  </div>

                  {/* Provider Info */}
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                      {selectedProvider.profilePhoto ? (
                        <img src={selectedProvider.profilePhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-emerald-50 to-teal-50">
                          {SERVICE_CATEGORIES.find(c => c.id === selectedProvider.serviceCategory?.toLowerCase())?.emoji || '🛠️'}
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedProvider.firstName} {selectedProvider.lastName}</h3>
                  <div className="flex items-center justify-center gap-2 text-gray-500 mt-1">
                    <span>{selectedProvider.serviceCategory}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>{selectedProvider.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">Total Amount</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">₱{activeBooking.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Service</span>
                    <span className="font-medium text-gray-700">{activeBooking.serviceCategory}</span>
                  </div>
                </div>

                <p className="text-center text-sm text-gray-500 mb-4">
                  {activeBooking.adminApproved
                    ? 'Waiting for provider to accept your booking...'
                    : 'Your booking is being reviewed by admin...'}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowProviderModal(false);
                      router.push(`/client/providers/${selectedProvider.id}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowProviderModal(false);
                      router.push(`/client/bookings/${activeBooking.id}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all"
                  >
                    View Booking
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              // NOT BOOKED - Show provider info and Contact Us
              <>
                {/* Provider Photo - Clickable */}
                <div className="text-center mb-4">
                  <button
                    onClick={() => {
                      setShowProviderModal(false);
                      router.push(`/client/providers/${selectedProvider.id}`);
                    }}
                    className="relative inline-block group"
                  >
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-transparent bg-gradient-to-br from-emerald-400 to-teal-400 p-[3px] shadow-xl shadow-emerald-500/20 mx-auto">
                      <div className="w-full h-full rounded-full overflow-hidden bg-white">
                        {selectedProvider.profilePhoto ? (
                          <img src={selectedProvider.profilePhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-emerald-50 to-teal-50">
                            {SERVICE_CATEGORIES.find(c => c.id === selectedProvider.serviceCategory?.toLowerCase())?.emoji || '🛠️'}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedProvider.isOnline && (
                      <div className="absolute bottom-1 right-1/2 translate-x-8 w-5 h-5 bg-emerald-500 rounded-full border-3 border-white animate-pulse-ring" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-medium">View Profile</span>
                    </div>
                  </button>
                </div>

                {/* Name */}
                <button
                  onClick={() => {
                    setShowProviderModal(false);
                    router.push(`/client/providers/${selectedProvider.id}`);
                  }}
                  className="block w-full text-center hover:text-emerald-600 transition-colors"
                >
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedProvider.firstName} {selectedProvider.lastName}</h3>
                </button>

                {/* Service & Rating */}
                <div className="flex items-center justify-center gap-3 mt-2 mb-4">
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <span className="text-lg">{SERVICE_CATEGORIES.find(c => c.id === selectedProvider.serviceCategory?.toLowerCase())?.emoji}</span>
                    <span className="font-medium">{selectedProvider.serviceCategory}</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedProvider.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-gray-500 text-sm">({selectedProvider.reviewCount || 0})</span>
                  </div>
                </div>

                {/* Location */}
                {selectedProvider.barangay && (
                  <p className="text-center text-gray-500 text-sm mb-4">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    {selectedProvider.barangay}
                  </p>
                )}

                {/* Estimated Job Time - Pill badge */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  {selectedProvider.estimatedJobTime && (
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedProvider.estimatedJobTime}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-xl">
                    <Star className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{selectedProvider.completedJobs || 0} jobs done</span>
                  </div>
                </div>



                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowProviderModal(false);
                      router.push(`/client/providers/${selectedProvider.id}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-50 text-gray-700 rounded-2xl font-semibold hover:bg-gray-100 transition-all border border-gray-100"
                  >
                    <User className="w-5 h-5" />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowProviderModal(false);
                      router.push(`/client/book?providerId=${selectedProvider.id}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Contact Us
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </ClientLayout>
  );
}
