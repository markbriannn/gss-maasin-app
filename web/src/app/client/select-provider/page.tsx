'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import dynamic from 'next/dynamic';
import { 
  X, ArrowRight, Star, Clock, MapPin, User, Filter, 
  Zap, DollarSign, Navigation, CheckCircle, Sparkles,
  ChevronRight, Shield, Award
} from 'lucide-react';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), { ssr: false });

interface Provider {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  serviceCategory: string;
  profilePhoto?: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  fixedPrice: number;
  priceType: string;
  distance: number;
  estimatedArrival: string;
  isOnline: boolean;
  latitude?: number;
  longitude?: number;
  tier?: string;
  responseTime?: number;
}

type FilterType = 'recommended' | 'cheapest' | 'nearest' | 'highest_rated';

function SelectProviderContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const serviceCategory = searchParams.get('category') || '';
  const clientLat = parseFloat(searchParams.get('lat') || '0');
  const clientLng = parseFloat(searchParams.get('lng') || '0');
  const clientAddress = searchParams.get('address') || 'Your Location';

  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('recommended');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (serviceCategory) {
      const unsubscribe = fetchProviders();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [serviceCategory, clientLat, clientLng]);

  useEffect(() => {
    applyFilter();
  }, [providers, activeFilter]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getEstimatedArrival = (distance: number): string => {
    const avgSpeed = 30;
    const minutes = Math.round((distance / avgSpeed) * 60);
    if (minutes < 5) return '< 5 mins';
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // Real-time listener for providers
  const fetchProviders = () => {
    const providersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'PROVIDER'),
      where('serviceCategory', '==', serviceCategory),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(providersQuery, (snapshot) => {
      const providersList: Provider[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const distance = calculateDistance(
          clientLat, clientLng,
          data.latitude || 0, data.longitude || 0
        );

        providersList.push({
          id: doc.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          serviceCategory: data.serviceCategory || '',
          profilePhoto: data.profilePhoto,
          rating: data.rating || data.averageRating || 0,
          reviewCount: data.reviewCount || data.totalReviews || 0,
          completedJobs: data.completedJobs || data.jobsCompleted || 0,
          fixedPrice: data.fixedPrice || data.hourlyRate || 0,
          priceType: data.priceType || 'per_job',
          distance: distance,
          estimatedArrival: getEstimatedArrival(distance),
          isOnline: data.isOnline || false,
          latitude: data.latitude,
          longitude: data.longitude,
          tier: data.tier || 'bronze',
          responseTime: data.responseTime || data.avgResponseTime || data.averageResponseTime || 5,
        });
      });

      setProviders(providersList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching providers:', error);
      setLoading(false);
    });

    return unsubscribe;
  };

  const applyFilter = () => {
    let sorted = [...providers];
    
    switch (activeFilter) {
      case 'cheapest':
        sorted.sort((a, b) => a.fixedPrice - b.fixedPrice);
        break;
      case 'nearest':
        sorted.sort((a, b) => a.distance - b.distance);
        break;
      case 'highest_rated':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'recommended':
      default:
        sorted.sort((a, b) => {
          const scoreA = (a.rating * 2) + (a.completedJobs * 0.1) - (a.distance * 0.5);
          const scoreB = (b.rating * 2) + (b.completedJobs * 0.1) - (b.distance * 0.5);
          return scoreB - scoreA;
        });
        break;
    }
    
    setFilteredProviders(sorted);
  };

  const handleSelectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
  };

  const handleBookProvider = () => {
    if (selectedProvider) {
      router.push(`/client/book?providerId=${selectedProvider.id}`);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('electric')) return '⚡';
    if (cat.includes('plumb')) return '🔧';
    if (cat.includes('carpent')) return '🪚';
    if (cat.includes('clean')) return '🧹';
    if (cat.includes('paint')) return '🎨';
    if (cat.includes('aircon')) return '❄️';
    return '🛠️';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'diamond': return 'from-cyan-400 to-blue-500';
      case 'platinum': return 'from-indigo-400 to-purple-500';
      case 'gold': return 'from-amber-400 to-yellow-500';
      case 'silver': return 'from-gray-400 to-slate-500';
      default: return 'from-amber-600 to-orange-700';
    }
  };

  const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'recommended', label: 'Recommended', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'cheapest', label: 'Cheapest', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'nearest', label: 'Nearest', icon: <Navigation className="w-4 h-4" /> },
    { id: 'highest_rated', label: 'Top Rated', icon: <Star className="w-4 h-4" /> },
  ];

  if (authLoading || loading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Finding providers...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Map Section */}
        <div className="h-[35vh] relative">
          <LeafletMap
            center={{ lat: clientLat || 10.1332, lng: clientLng || 124.8358 }}
            zoom={14}
            markers={[
              { id: 'user', lat: clientLat || 10.1332, lng: clientLng || 124.8358, color: '#10B981', popup: 'You' },
              ...(selectedProvider?.latitude && selectedProvider?.longitude ? [{
                id: selectedProvider.id,
                lat: selectedProvider.latitude,
                lng: selectedProvider.longitude,
                color: '#3B82F6',
                popup: selectedProvider.name
              }] : [])
            ]}
          />
          
          {/* Location Bar */}
          <div className="absolute top-4 left-4 right-4 z-[1000]">
            <div className="bg-white rounded-2xl shadow-lg p-3 flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 truncate">{clientAddress}</span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{selectedProvider?.name || 'Select Provider'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sheet */}
        <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-10 shadow-2xl flex flex-col">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
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
          </div>

          {/* Provider List */}
          <div className="flex-1 overflow-y-auto px-4 pb-32">
            {filteredProviders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No providers available</h3>
                <p className="text-gray-500">No {serviceCategory} providers are currently available in your area</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProviders.map((provider, index) => {
                  const isSelected = selectedProvider?.id === provider.id;
                  const isTopPick = index === 0 && activeFilter === 'recommended';
                  
                  return (
                    <div
                      key={provider.id}
                      onClick={() => handleSelectProvider(provider)}
                      className={`rounded-2xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/20'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                      }`}
                    >
                      {isTopPick && (
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-3 py-1 rounded-t-xl flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> TOP PICK
                        </div>
                      )}
                      
                      <div className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Provider Photo */}
                          <div className="relative">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100">
                              {provider.profilePhoto ? (
                                <img src={provider.profilePhoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                  {getCategoryIcon(provider.serviceCategory)}
                                </div>
                              )}
                            </div>
                            {provider.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>

                          {/* Provider Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 truncate">{provider.name}</h3>
                              {provider.tier && provider.tier !== 'bronze' && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${getTierColor(provider.tier)}`}>
                                  {provider.tier.toUpperCase()}
                                </span>
                              )}
                            </div>

                            {/* Service Category */}
                            <p className="text-sm text-emerald-600 font-medium mb-1">
                              {getCategoryIcon(provider.serviceCategory)} {provider.serviceCategory}
                            </p>
                            
                            <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="font-semibold text-gray-700">{provider.rating.toFixed(1)}</span>
                                <span>({provider.reviewCount})</span>
                              </div>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span>{provider.completedJobs} jobs</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>{provider.estimatedArrival}</span>
                              </div>
                              <span className="text-gray-300">•</span>
                              <div className="flex items-center gap-1 text-gray-500">
                                <MapPin className="w-4 h-4" />
                                <span>{provider.distance.toFixed(1)} km</span>
                              </div>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">₱{provider.fixedPrice.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">
                              {provider.priceType === 'per_hour' ? 'per hour' : 'fixed'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Book Button */}
          {selectedProvider && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-2xl">
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100">
                    {selectedProvider.profilePhoto ? (
                      <img src={selectedProvider.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {getCategoryIcon(selectedProvider.serviceCategory)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedProvider.name}</p>
                    <p className="text-sm text-gray-500">{selectedProvider.estimatedArrival} away</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-emerald-600">₱{selectedProvider.fixedPrice.toLocaleString()}</p>
                </div>
              </div>
              
              <button
                onClick={handleBookProvider}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all flex items-center justify-center gap-2"
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

export default function SelectProviderPage() {
  return (
    <Suspense fallback={
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      </ClientLayout>
    }>
      <SelectProviderContent />
    </Suspense>
  );
}
