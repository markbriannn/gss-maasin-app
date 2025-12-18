'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import Image from 'next/image';
import { 
  Search, Star, MapPin, CheckCircle, Zap, Droplets, Hammer, Sparkles, 
  Grid3X3, Heart, MessageCircle, Clock, Award, TrendingUp,
  ChevronDown, X, Flame, Crown, ArrowRight, Shield, Users,
  Eye, Navigation, Wifi, WifiOff, SlidersHorizontal, LayoutGrid, List,
  BadgeCheck, Timer, Verified
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
  completedJobs: number;
  barangay?: string;
  fixedPrice?: number;
  hourlyRate?: number;
  priceType?: string;
  providerStatus?: string;
  bio?: string;
  experience?: string;
  responseTime?: number;
  latitude?: number;
  longitude?: number;
  lastActive?: Date;
  verifiedAt?: Date;
  specialties?: string[];
  languages?: string[];
  availability?: string;
}

const categories = [
  { id: 'all', name: 'All', icon: Grid3X3, color: '#00B14F', gradient: 'from-green-400 to-emerald-600', emoji: '✨' },
  { id: 'electrician', name: 'Electrician', icon: Zap, color: '#F59E0B', gradient: 'from-amber-400 to-orange-500', emoji: '⚡' },
  { id: 'plumber', name: 'Plumber', icon: Droplets, color: '#3B82F6', gradient: 'from-blue-400 to-indigo-600', emoji: '🔧' },
  { id: 'carpenter', name: 'Carpenter', icon: Hammer, color: '#92400E', gradient: 'from-orange-400 to-amber-700', emoji: '🪚' },
  { id: 'cleaner', name: 'Cleaner', icon: Sparkles, color: '#10B981', gradient: 'from-teal-400 to-emerald-600', emoji: '🧹' },
];

const sortOptions = [
  { id: 'recommended', label: 'Recommended', icon: TrendingUp, description: 'Best match for you' },
  { id: 'rating', label: 'Top Rated', icon: Star, description: 'Highest customer ratings' },
  { id: 'fastest', label: 'Fastest Response', icon: Timer, description: 'Quick responders' },
  { id: 'nearest', label: 'Nearest', icon: Navigation, description: 'Closest to you' },
  { id: 'price_low', label: 'Budget Friendly', icon: ChevronDown, description: 'Lowest price first' },
  { id: 'most_jobs', label: 'Most Experienced', icon: Award, description: 'Most jobs completed' },
];

export default function ProvidersPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [showFilters, setShowFilters] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [quickViewProvider, setQuickViewProvider] = useState<Provider | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches] = useState(['Electrician near me', 'Plumber', 'House cleaning']);
  const [featuredProvider, setFeaturedProvider] = useState<Provider | null>(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 10.1335, lng: 124.8513 }) // Default Maasin
      );
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    fetchProviders();
    loadFavorites();
  }, [user]);

  const loadFavorites = async () => {
    if (!user?.uid) return;
    try {
      const favQuery = query(collection(db, 'favorites'), where('userId', '==', user.uid));
      const snapshot = await getDocs(favQuery);
      setFavorites(snapshot.docs.map(d => d.data().providerId));
    } catch (e) { console.error(e); }
  };

  const toggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid) return;
    const isFav = favorites.includes(id);
    const docId = `${user.uid}_${id}`;
    try {
      if (isFav) {
        await deleteDoc(doc(db, 'favorites', docId));
        setFavorites(prev => prev.filter(f => f !== id));
      } else {
        await setDoc(doc(db, 'favorites', docId), { userId: user.uid, providerId: id, createdAt: new Date() });
        setFavorites(prev => [...prev, id]);
      }
    } catch (e) { console.error(e); }
  };

  const fetchProviders = async () => {
    try {
      const providersQuery = query(collection(db, 'users'), where('role', '==', 'PROVIDER'));
      const snapshot = await getDocs(providersQuery);
      const list: Provider[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.providerStatus === 'approved' || data.status === 'approved') {
          list.push({
            id: docSnap.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            serviceCategory: data.serviceCategory || '',
            rating: data.rating || data.averageRating || 0,
            reviewCount: data.reviewCount || 0,
            profilePhoto: data.profilePhoto,
            isOnline: data.isOnline || false,
            completedJobs: data.completedJobs || 0,
            barangay: data.barangay || '',
            fixedPrice: data.fixedPrice || 0,
            hourlyRate: data.hourlyRate || 0,
            priceType: data.priceType || 'per_job',
            providerStatus: data.providerStatus || data.status,
            bio: data.bio || '',
            experience: data.experience || '',
            responseTime: data.responseTime || Math.floor(Math.random() * 15) + 1,
            latitude: data.latitude,
            longitude: data.longitude,
            lastActive: data.lastActive?.toDate?.() || new Date(),
            specialties: data.specialties || [],
            languages: data.languages || ['Filipino', 'English'],
            availability: data.availability || 'Available today',
          });
        }
      });
      setProviders(list);
      // Set featured provider (highest rated online)
      const featured = list.filter(p => p.isOnline).sort((a, b) => b.rating - a.rating)[0];
      if (featured) setFeaturedProvider(featured);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Calculate distance
  const getDistance = useCallback((provider: Provider) => {
    if (!userLocation || !provider.latitude || !provider.longitude) return null;
    const R = 6371;
    const dLat = (provider.latitude - userLocation.lat) * Math.PI / 180;
    const dLon = (provider.longitude - userLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(provider.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, [userLocation]);

  const filteredAndSortedProviders = useMemo(() => {
    let filtered = [...providers];
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.serviceCategory.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.firstName.toLowerCase().includes(q) || p.lastName.toLowerCase().includes(q) ||
        p.serviceCategory.toLowerCase().includes(q) || p.barangay?.toLowerCase().includes(q) ||
        p.bio?.toLowerCase().includes(q)
      );
    }
    if (onlineOnly) filtered = filtered.filter(p => p.isOnline);
    
    switch (sortBy) {
      case 'rating': filtered.sort((a, b) => b.rating - a.rating); break;
      case 'fastest': filtered.sort((a, b) => (a.responseTime || 99) - (b.responseTime || 99)); break;
      case 'nearest':
        filtered.sort((a, b) => (getDistance(a) || 999) - (getDistance(b) || 999));
        break;
      case 'price_low': filtered.sort((a, b) => (a.fixedPrice || a.hourlyRate || 0) - (b.fixedPrice || b.hourlyRate || 0)); break;
      case 'most_jobs': filtered.sort((a, b) => b.completedJobs - a.completedJobs); break;
      default:
        filtered.sort((a, b) => {
          if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
          const scoreA = (a.rating * 2) + (a.completedJobs * 0.1) - ((a.responseTime || 10) * 0.05);
          const scoreB = (b.rating * 2) + (b.completedJobs * 0.1) - ((b.responseTime || 10) * 0.05);
          return scoreB - scoreA;
        });
    }
    return filtered;
  }, [providers, selectedCategory, searchQuery, sortBy, onlineOnly, getDistance]);

  const toggleCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareList(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const getProviderBadge = (provider: Provider) => {
    if (provider.completedJobs >= 100) return { icon: Crown, label: 'Elite Master', color: 'text-amber-500', bg: 'bg-gradient-to-r from-amber-100 to-yellow-100', border: 'border-amber-300' };
    if (provider.completedJobs >= 50) return { icon: Award, label: 'Top Pro', color: 'text-purple-600', bg: 'bg-gradient-to-r from-purple-100 to-pink-100', border: 'border-purple-300' };
    if (provider.rating >= 4.8 && provider.reviewCount >= 10) return { icon: Verified, label: 'Highly Rated', color: 'text-blue-600', bg: 'bg-gradient-to-r from-blue-100 to-cyan-100', border: 'border-blue-300' };
    if (provider.completedJobs >= 20) return { icon: Shield, label: 'Trusted', color: 'text-green-600', bg: 'bg-gradient-to-r from-green-100 to-emerald-100', border: 'border-green-300' };
    if (provider.rating >= 4.5) return { icon: Flame, label: 'Rising Star', color: 'text-orange-500', bg: 'bg-gradient-to-r from-orange-100 to-red-100', border: 'border-orange-300' };
    return null;
  };

  const onlineCount = providers.filter(p => p.isOnline).length;
  const currentSort = sortOptions.find(s => s.id === sortBy);

  if (isLoading || loadingData) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-16 bg-gradient-to-r from-gray-200 to-gray-100 rounded-2xl w-full max-w-2xl" />
              <div className="flex gap-3 overflow-hidden">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-14 w-36 bg-gray-200 rounded-2xl flex-shrink-0" />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-lg">
                    <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-100" />
                    <div className="p-5 space-y-3">
                      <div className="flex gap-3">
                        <div className="w-16 h-16 bg-gray-200 rounded-2xl" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-gray-200 rounded w-3/4" />
                          <div className="h-4 bg-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="h-10 bg-gray-100 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40">
        {/* Premium Hero Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00B14F] via-emerald-500 to-teal-600" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-300/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-200 text-sm font-medium">📍 Maasin City</span>
                  <ChevronDown className="w-4 h-4 text-emerald-200" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  Find Your Perfect Pro
                </h1>
                <p className="text-emerald-100 mt-2 text-lg">
                  {providers.length} verified experts ready to help
                </p>
              </div>
              
              {/* Live Status Pill */}
              <div className="hidden md:flex items-center gap-3 bg-white/15 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
                <div className="relative">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping" />
                </div>
                <div>
                  <p className="text-white font-semibold">{onlineCount} Online Now</p>
                  <p className="text-emerald-200 text-xs">Average response: 5 min</p>
                </div>
              </div>
            </div>

            {/* Premium Search Bar */}
            <div className="relative max-w-3xl">
              <div className={`relative bg-white rounded-2xl shadow-2xl shadow-black/20 transition-all duration-300 ${isSearchFocused ? 'ring-4 ring-white/30 scale-[1.02]' : ''}`}>
                <div className="flex items-center">
                  <div className="pl-5">
                    <Search className={`w-6 h-6 transition-colors ${isSearchFocused ? 'text-[#00B14F]' : 'text-gray-400'}`} />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="What service do you need today?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    className="w-full px-4 py-5 text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none text-lg"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="p-2 mr-2 hover:bg-gray-100 rounded-full transition-colors">
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  )}
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-5 py-3 mr-2 rounded-xl font-medium transition-all ${showFilters ? 'bg-[#00B14F] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">Filters</span>
                  </button>
                </div>
                
                {/* Search Suggestions Dropdown */}
                {isSearchFocused && !searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Searches</p>
                    <div className="space-y-1">
                      {recentSearches.map((search, i) => (
                        <button
                          key={i}
                          onClick={() => setSearchQuery(search)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors text-left"
                        >
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{search}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 mt-3 pt-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Popular Services</p>
                      <div className="flex flex-wrap gap-2">
                        {categories.slice(1).map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => { setSelectedCategory(cat.id); setIsSearchFocused(false); }}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                          >
                            <span>{cat.emoji}</span>
                            <span className="text-sm text-gray-700">{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 pb-12">
          {/* Category Pills Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Browse by Category</h2>
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-[#00B14F]' : 'text-gray-500 hover:text-gray-700'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-[#00B14F]' : 'text-gray-500 hover:text-gray-700'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                const count = cat.id === 'all' ? providers.length : providers.filter(p => p.serviceCategory.toLowerCase() === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`group flex items-center gap-3 px-5 py-3.5 rounded-2xl whitespace-nowrap font-medium transition-all duration-300 ${
                      isActive
                        ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg shadow-${cat.color}/30 scale-105`
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:scale-[1.02]'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} style={{ color: isActive ? undefined : cat.color }} />
                    </div>
                    <div className="text-left">
                      <p className={`font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>{cat.name}</p>
                      <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>{count} available</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Filters & Sorting</h3>
                  <p className="text-gray-500 text-sm">Customize your search results</p>
                </div>
                <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sort Options */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">Sort By</label>
                  <div className="grid grid-cols-2 gap-2">
                    {sortOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setSortBy(opt.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                            sortBy === opt.id
                              ? 'bg-[#00B14F] text-white shadow-lg shadow-green-200'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${sortBy === opt.id ? 'text-white' : 'text-gray-400'}`} />
                          <div>
                            <p className="font-medium text-sm">{opt.label}</p>
                            <p className={`text-xs ${sortBy === opt.id ? 'text-white/70' : 'text-gray-400'}`}>{opt.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Quick Filters */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">Quick Filters</label>
                  <div className="space-y-3">
                    <button
                      onClick={() => setOnlineOnly(!onlineOnly)}
                      className={`flex items-center justify-between w-full p-4 rounded-xl transition-all ${
                        onlineOnly ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {onlineOnly ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-gray-400" />}
                        <div className="text-left">
                          <p className={`font-medium ${onlineOnly ? 'text-green-700' : 'text-gray-700'}`}>Online Now</p>
                          <p className="text-xs text-gray-500">{onlineCount} providers available</p>
                        </div>
                      </div>
                      <div className={`w-12 h-7 rounded-full transition-colors ${onlineOnly ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform mt-1 ${onlineOnly ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <p className="text-gray-600">
                <span className="font-bold text-gray-900 text-xl">{filteredAndSortedProviders.length}</span>
                <span className="ml-2">professionals found</span>
              </p>
              {(selectedCategory !== 'all' || onlineOnly || searchQuery) && (
                <button
                  onClick={() => { setSelectedCategory('all'); setOnlineOnly(false); setSearchQuery(''); }}
                  className="text-sm text-[#00B14F] hover:text-[#009940] font-medium flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear filters
                </button>
              )}
            </div>
            
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
              >
                {currentSort && <currentSort.icon className="w-4 h-4 text-gray-500" />}
                <span className="text-sm font-medium text-gray-700">{currentSort?.label}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {sortOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => { setSortBy(opt.id); setShowSortDropdown(false); }}
                        className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors ${sortBy === opt.id ? 'bg-green-50' : ''}`}
                      >
                        <Icon className={`w-5 h-5 ${sortBy === opt.id ? 'text-[#00B14F]' : 'text-gray-400'}`} />
                        <div className="text-left">
                          <p className={`font-medium text-sm ${sortBy === opt.id ? 'text-[#00B14F]' : 'text-gray-700'}`}>{opt.label}</p>
                          <p className="text-xs text-gray-400">{opt.description}</p>
                        </div>
                        {sortBy === opt.id && <CheckCircle className="w-4 h-4 text-[#00B14F] ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Featured Provider Banner */}
          {featuredProvider && selectedCategory === 'all' && !searchQuery && (
            <div className="mb-8 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 rounded-3xl p-6 border border-amber-200/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-200/30 to-transparent rounded-full blur-2xl" />
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="text-amber-700 font-bold text-sm uppercase tracking-wider">Featured Pro of the Day</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {featuredProvider.profilePhoto ? (
                    <Image src={featuredProvider.profilePhoto} alt="" width={80} height={80} className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border-4 border-white shadow-lg flex items-center justify-center">
                      <span className="text-2xl font-bold text-amber-600">{featuredProvider.firstName[0]}</span>
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{featuredProvider.firstName} {featuredProvider.lastName}</h3>
                  <p className="text-amber-700 font-medium">{featuredProvider.serviceCategory}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-semibold">{featuredProvider.rating.toFixed(1)}</span>
                      <span className="text-gray-500 text-sm">({featuredProvider.reviewCount})</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Award className="w-4 h-4" />
                      <span className="text-sm">{featuredProvider.completedJobs} jobs</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/client/book?providerId=${featuredProvider.id}`)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-200 flex items-center gap-2"
                >
                  <span>Book Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Provider Cards */}
          {filteredAndSortedProviders.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-16 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No providers found</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">We couldn&apos;t find any providers matching your criteria. Try adjusting your filters or search terms.</p>
              <button
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setOnlineOnly(false); }}
                className="px-8 py-4 bg-[#00B14F] text-white rounded-2xl font-semibold hover:bg-[#009940] transition-all shadow-lg shadow-green-200"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {filteredAndSortedProviders.map((provider, index) => {
                const price = provider.fixedPrice || provider.hourlyRate || 0;
                const badge = getProviderBadge(provider);
                const isHovered = hoveredCard === provider.id;
                const isFavorite = favorites.includes(provider.id);
                const isComparing = compareList.includes(provider.id);
                const categoryData = categories.find(c => c.id === provider.serviceCategory.toLowerCase()) || categories[0];
                const distance = getDistance(provider);
                
                if (viewMode === 'list') {
                  return (
                    <div
                      key={provider.id}
                      className="group bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-100 hover:border-[#00B14F]/30"
                      onClick={() => router.push(`/client/providers/${provider.id}`)}
                    >
                      <div className="flex items-center gap-5">
                        <div className="relative flex-shrink-0">
                          {provider.profilePhoto ? (
                            <Image src={provider.profilePhoto} alt="" width={72} height={72} className="w-18 h-18 rounded-2xl object-cover" />
                          ) : (
                            <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                              <span className="text-xl font-bold text-gray-400">{provider.firstName[0]}{provider.lastName[0]}</span>
                            </div>
                          )}
                          {provider.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 truncate">{provider.firstName} {provider.lastName}</h3>
                            {badge && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.color} ${badge.border} border`}>
                                <badge.icon className="w-3 h-3" />
                                {badge.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold" style={{ backgroundColor: `${categoryData.color}15`, color: categoryData.color }}>
                              <categoryData.icon className="w-3 h-3" />
                              {provider.serviceCategory || 'Service Provider'}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-500">{provider.barangay ? `Brgy. ${provider.barangay}` : 'Maasin City'}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                              <span className="font-semibold">{provider.rating > 0 ? provider.rating.toFixed(1) : 'New'}</span>
                              {provider.reviewCount > 0 && <span className="text-gray-400">({provider.reviewCount})</span>}
                            </div>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500">{provider.completedJobs} jobs</span>
                            {distance && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-500">{distance.toFixed(1)} km</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">₱{price.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">per {provider.priceType === 'per_hire' ? 'hire' : 'job'}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/client/book?providerId=${provider.id}`); }}
                            className="px-5 py-3 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] transition-all"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Grid View Card
                return (
                  <div
                    key={provider.id}
                    className={`group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform ${isHovered ? 'scale-[1.02] -translate-y-1' : ''} ${isComparing ? 'ring-2 ring-[#00B14F]' : ''}`}
                    onMouseEnter={() => setHoveredCard(provider.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => router.push(`/client/providers/${provider.id}`)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Card Header */}
                    <div className={`relative h-32 bg-gradient-to-br ${categoryData.gradient} p-4`}>
                      {/* Decorative Elements */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                      
                      {/* Badge */}
                      {badge && (
                        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 ${badge.bg} rounded-full border ${badge.border} shadow-sm`}>
                          <badge.icon className={`w-4 h-4 ${badge.color}`} />
                          <span className={`text-xs font-bold ${badge.color}`}>{badge.label}</span>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <button
                          onClick={(e) => toggleCompare(provider.id, e)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isComparing ? 'bg-[#00B14F] text-white' : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/40'}`}
                          title="Compare"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => toggleFavorite(provider.id, e)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/40'}`}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
                        </button>
                      </div>

                      {/* Online Status */}
                      <div className={`absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm ${provider.isOnline ? 'bg-green-500/90 text-white' : 'bg-gray-900/50 text-gray-200'}`}>
                        <div className={`w-2 h-2 rounded-full ${provider.isOnline ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
                        <span className="text-xs font-medium">{provider.isOnline ? 'Online' : 'Offline'}</span>
                      </div>

                      {/* Profile Photo */}
                      <div className="absolute -bottom-12 left-5">
                        <div className="relative">
                          {provider.profilePhoto ? (
                            <Image
                              src={provider.profilePhoto}
                              alt={provider.firstName}
                              width={88}
                              height={88}
                              className="w-22 h-22 rounded-2xl object-cover border-4 border-white shadow-xl"
                            />
                          ) : (
                            <div className="w-22 h-22 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-white shadow-xl flex items-center justify-center">
                              <span className="text-2xl font-bold text-gray-400">{provider.firstName[0]}{provider.lastName[0]}</span>
                            </div>
                          )}
                          {provider.providerStatus === 'approved' && (
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                              <BadgeCheck className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="pt-16 px-5 pb-5">
                      {/* Name & Category */}
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#00B14F] transition-colors flex items-center gap-2">
                          {provider.firstName} {provider.lastName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold`} style={{ backgroundColor: `${categoryData.color}15`, color: categoryData.color }}>
                            <categoryData.icon className="w-3.5 h-3.5" />
                            {provider.serviceCategory || 'Service Provider'}
                          </span>
                          {provider.isOnline && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-medium">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                              Available
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Star className={`w-4 h-4 ${provider.rating > 0 ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                            <span className="font-bold text-gray-900">{provider.rating > 0 ? provider.rating.toFixed(1) : '-'}</span>
                          </div>
                          <p className="text-xs text-gray-500">{provider.reviewCount} reviews</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Award className="w-4 h-4 text-purple-500" />
                            <span className="font-bold text-gray-900">{provider.completedJobs}</span>
                          </div>
                          <p className="text-xs text-gray-500">jobs done</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Timer className="w-4 h-4 text-blue-500" />
                            <span className="font-bold text-gray-900">~{provider.responseTime || 5}</span>
                          </div>
                          <p className="text-xs text-gray-500">min reply</p>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                        <MapPin className="w-4 h-4 text-[#00B14F]" />
                        <span>
                          {provider.barangay ? `Brgy. ${provider.barangay}` : 'Maasin City'}
                          {typeof distance === 'number' ? ` • ${distance.toFixed(1)} km` : ''}
                        </span>
                      </div>

                      {/* Price & CTA */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-gray-900">₱{price.toLocaleString()}</span>
                            <span className="text-gray-400 text-sm">/{provider.priceType === 'per_hire' ? 'hire' : 'job'}</span>
                          </div>
                          {provider.isOnline && (
                            <p className="text-xs text-green-600 font-medium mt-0.5">Available now</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/client/book?providerId=${provider.id}`); }}
                          className="flex items-center gap-2 px-5 py-3 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] transition-all hover:gap-3 hover:shadow-lg hover:shadow-green-200"
                        >
                          <span>Book</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Hover Quick Actions */}
                    <div className={`absolute bottom-28 left-5 right-5 flex gap-2 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/chat/new?providerId=${provider.id}`); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl text-gray-700 font-medium hover:bg-white transition-colors shadow-lg border border-gray-100"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Message</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setQuickViewProvider(provider); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl text-gray-700 font-medium hover:bg-white transition-colors shadow-lg border border-gray-100"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Quick View</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Compare Bar */}
          {compareList.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00B14F]" />
                <span className="font-medium">{compareList.length} selected</span>
              </div>
              <div className="w-px h-6 bg-gray-700" />
              <div className="flex -space-x-2">
                {compareList.map(id => {
                  const p = providers.find(pr => pr.id === id);
                  return p?.profilePhoto ? (
                    <Image key={id} src={p.profilePhoto} alt="" width={32} height={32} className="w-8 h-8 rounded-full border-2 border-gray-900 object-cover" />
                  ) : (
                    <div key={id} className="w-8 h-8 rounded-full border-2 border-gray-900 bg-gray-700 flex items-center justify-center text-xs font-bold">
                      {p?.firstName[0]}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => router.push(`/client/compare?ids=${compareList.join(',')}`)}
                className="px-4 py-2 bg-[#00B14F] rounded-xl font-semibold hover:bg-[#009940] transition-colors"
              >
                Compare Now
              </button>
              <button onClick={() => setCompareList([])} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Quick View Modal */}
        {quickViewProvider && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setQuickViewProvider(null)}>
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className={`relative h-40 bg-gradient-to-br ${categories.find(c => c.id === quickViewProvider.serviceCategory.toLowerCase())?.gradient || 'from-green-400 to-emerald-600'}`}>
                <button onClick={() => setQuickViewProvider(null)} className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/40 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="absolute -bottom-12 left-6">
                  {quickViewProvider.profilePhoto ? (
                    <Image src={quickViewProvider.profilePhoto} alt="" width={96} height={96} className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-xl" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gray-100 border-4 border-white shadow-xl flex items-center justify-center">
                      <span className="text-3xl font-bold text-gray-400">{quickViewProvider.firstName[0]}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-16 px-6 pb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{quickViewProvider.firstName} {quickViewProvider.lastName}</h2>
                    <p className="text-[#00B14F] font-medium">{quickViewProvider.serviceCategory}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-amber-700">{quickViewProvider.rating.toFixed(1)}</span>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-6">{quickViewProvider.bio || `Professional ${quickViewProvider.serviceCategory?.toLowerCase()} serving Maasin City with quality service and customer satisfaction.`}</p>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{quickViewProvider.completedJobs}</p>
                    <p className="text-sm text-gray-500">Jobs Done</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{quickViewProvider.reviewCount}</p>
                    <p className="text-sm text-gray-500">Reviews</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">~{quickViewProvider.responseTime || 5}m</p>
                    <p className="text-sm text-gray-500">Response</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Service Price</p>
                    <p className="text-3xl font-bold text-gray-900">₱{(quickViewProvider.fixedPrice || quickViewProvider.hourlyRate || 0).toLocaleString()}</p>
                  </div>
                  <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-600">per {quickViewProvider.priceType === 'per_hire' ? 'hire' : 'job'}</span>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => { setQuickViewProvider(null); router.push(`/client/providers/${quickViewProvider.id}`); }}
                    className="flex-1 py-3.5 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    View Full Profile
                  </button>
                  <button
                    onClick={() => { setQuickViewProvider(null); router.push(`/client/book?providerId=${quickViewProvider.id}`); }}
                    className="flex-1 py-3.5 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] transition-colors"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
