'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import {
  Shield, MapPin, Clock, Wrench, Zap, Droplets, Hammer, Search, Star, Grid, Sparkles,
  ArrowRight, CheckCircle, DollarSign, Users, Award, ChevronRight, TrendingUp
} from 'lucide-react';

const SERVICE_CATEGORIES = [
  { id: 'electrician', name: 'Electrician', icon: Zap, color: '#F59E0B', emoji: '⚡' },
  { id: 'plumber', name: 'Plumber', icon: Droplets, color: '#3B82F6', emoji: '🔧' },
  { id: 'carpenter', name: 'Carpenter', icon: Hammer, color: '#92400E', emoji: '🪚' },
  { id: 'cleaner', name: 'Cleaner', icon: Sparkles, color: '#10B981', emoji: '🧹' },
];

const FEATURES = [
  { icon: Shield, title: 'Verified Providers', desc: 'All providers are vetted and approved', color: 'emerald' },
  { icon: MapPin, title: 'Local Services', desc: 'Find skilled workers nearby', color: 'blue' },
  { icon: Clock, title: 'Fast Booking', desc: 'Book services in minutes', color: 'purple' },
  { icon: DollarSign, title: 'Fair Pricing', desc: 'Transparent rates, no hidden fees', color: 'amber' },
];

interface Provider {
  id: string;
  name: string;
  serviceCategory: string;
  rating?: number;
  reviewCount?: number;
  isOnline?: boolean;
  fixedPrice?: number;
  priceType?: string;
  barangay?: string;
  providerStatus?: string;
  profilePhoto?: string;
}

export default function GuestHomePage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const role = user.role?.toUpperCase();
      if (role === 'ADMIN') router.push('/admin');
      else if (role === 'PROVIDER') router.push('/provider');
      else router.push('/client');
    }
  }, [isAuthenticated, user, authLoading, router]);

  // Real-time listener for providers
  useEffect(() => {
    setIsLoading(true);
    const providersQuery = query(collection(db, 'users'), where('role', '==', 'PROVIDER'));
    
    const unsubscribe = onSnapshot(providersQuery, (querySnapshot) => {
      const providersList: Provider[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const isApproved = data.providerStatus === 'approved' || data.status === 'approved';
        if (!isApproved) return;
        if (selectedCategory && data.serviceCategory?.toLowerCase() !== selectedCategory.toLowerCase()) return;
        providersList.push({
          id: doc.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Provider',
          serviceCategory: data.serviceCategory,
          rating: data.rating || data.averageRating || 0,
          reviewCount: data.reviewCount || 0,
          isOnline: data.isOnline || false,
          fixedPrice: data.fixedPrice || data.hourlyRate || 0,
          priceType: data.priceType || 'per_job',
          barangay: data.barangay,
          providerStatus: data.providerStatus,
          profilePhoto: data.profilePhoto,
        });
      });
      setProviders(providersList);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading providers:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedCategory]);

  const getCategoryConfig = (categoryId: string) => SERVICE_CATEGORIES.find(c => c.id === categoryId?.toLowerCase()) || SERVICE_CATEGORIES[0];

  const filteredProviders = providers.filter(provider => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return provider.name.toLowerCase().includes(q) || provider.serviceCategory?.toLowerCase().includes(q);
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 to-green-600">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-20 right-20 opacity-20">
          <Wrench className="w-16 h-16 text-white animate-bounce" style={{ animationDuration: '3s' }} />
        </div>
        <div className="absolute bottom-10 right-32 opacity-20">
          <Zap className="w-12 h-12 text-white animate-pulse" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Wrench className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">GSS Maasin</h1>
                <p className="text-emerald-100 text-xs">General Service System</p>
              </div>
            </div>
            <Link href="/login" className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white font-medium hover:bg-white/30 transition-colors">
              Sign In
            </Link>
          </div>

          {/* Hero Content */}
          <div className="max-w-2xl mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Find Trusted Service Providers in Maasin City
            </h2>
            <p className="text-emerald-100 text-lg mb-6">
              Connect with verified electricians, plumbers, carpenters, and cleaners near you.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 max-w-lg">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="w-4 h-4 text-white/80" />
                <span className="text-xl font-bold text-white">{providers.length}+</span>
              </div>
              <p className="text-xs text-white/70">Providers</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Award className="w-4 h-4 text-white/80" />
                <span className="text-xl font-bold text-white">100%</span>
              </div>
              <p className="text-xs text-white/70">Verified</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-4 h-4 text-white/80" />
                <span className="text-xl font-bold text-white">4.8</span>
              </div>
              <p className="text-xs text-white/70">Avg Rating</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-xl p-2 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search for services or providers..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900" />
          </div>
        </div>

        {/* Service Categories */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Browse by Category</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {SERVICE_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;
              return (
                <button key={category.id} onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                  className={`flex flex-col items-center min-w-[90px] p-4 rounded-2xl transition-all ${
                    isSelected ? 'bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg scale-105' : 'bg-white shadow-md hover:shadow-lg'
                  }`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 ${
                    isSelected ? 'bg-white/20' : ''
                  }`} style={{ backgroundColor: isSelected ? undefined : `${category.color}15` }}>
                    <Icon className="w-7 h-7" style={{ color: isSelected ? 'white' : category.color }} />
                  </div>
                  <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-700'}`}>{category.name}</span>
                </button>
              );
            })}
            <button onClick={() => setSelectedCategory(null)}
              className={`flex flex-col items-center min-w-[90px] p-4 rounded-2xl transition-all ${
                !selectedCategory ? 'bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg scale-105' : 'bg-white shadow-md hover:shadow-lg'
              }`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 ${!selectedCategory ? 'bg-white/20' : 'bg-emerald-50'}`}>
                <Grid className="w-7 h-7" style={{ color: !selectedCategory ? 'white' : '#10B981' }} />
              </div>
              <span className={`text-sm font-semibold ${!selectedCategory ? 'text-white' : 'text-gray-700'}`}>All</span>
            </button>
          </div>
        </div>

        {/* Providers Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Service Providers</h3>
            <span className="text-sm text-gray-500">{filteredProviders.length} available</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProviders.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProviders.map((provider) => {
                const categoryConfig = getCategoryConfig(provider.serviceCategory);
                const CategoryIcon = categoryConfig.icon;
                return (
                  <div key={provider.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden border border-gray-100 group">
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${categoryConfig.color}15` }}>
                          {provider.profilePhoto ? (
                            <Image src={provider.profilePhoto} alt="" width={48} height={48} className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            <CategoryIcon className="w-6 h-6" style={{ color: categoryConfig.color }} />
                          )}
                        </div>
                        {provider.isOnline && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Online
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex items-center gap-1 mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">{provider.name}</h4>
                        {provider.providerStatus === 'approved' && (
                          <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>

                      {/* Category Badge */}
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold mb-2"
                        style={{ backgroundColor: `${categoryConfig.color}15`, color: categoryConfig.color }}>
                        <span>{categoryConfig.emoji}</span>
                        {categoryConfig.name}
                      </div>

                      {/* Rating & Price */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <Star className={`w-4 h-4 ${provider.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                          <span className="text-sm font-medium text-gray-700">{provider.rating ? provider.rating.toFixed(1) : 'New'}</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-600">
                          {provider.fixedPrice ? `₱${provider.fixedPrice}` : 'Contact'}
                        </span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{provider.barangay ? `Brgy. ${provider.barangay}` : 'Maasin City'}</span>
                      </div>

                      {/* CTA */}
                      <Link href="/login"
                        className="block w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-center rounded-xl text-sm font-semibold hover:shadow-lg transition-all">
                        Contact Us
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-gray-300" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">No providers found</h4>
              <p className="text-gray-500">Try a different category or search term</p>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Why Choose GSS Maasin?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-5 text-center hover:shadow-xl transition-all">
                <div className={`w-14 h-14 bg-${feature.color}-100 rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                  <feature.icon className={`w-7 h-7 text-${feature.color}-500`} />
                </div>
                <h4 className="font-bold text-gray-900 mb-1">{feature.title}</h4>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-3xl p-8 text-center mb-8">
          <h3 className="text-2xl font-bold text-white mb-2">Ready to get started?</h3>
          <p className="text-emerald-100 mb-6">Join thousands of satisfied customers in Maasin City</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register"
              className="px-8 py-3 bg-white text-emerald-600 rounded-xl font-bold hover:shadow-lg transition-all">
              Create Account
            </Link>
            <Link href="/login"
              className="px-8 py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30 transition-all">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-4 z-50">
        <div className="max-w-7xl mx-auto flex gap-3">
          <Link href="/register"
            className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-center rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
            Sign Up Free
          </Link>
          <Link href="/login"
            className="flex-1 py-3.5 bg-gray-100 text-gray-700 text-center rounded-xl font-bold hover:bg-gray-200 transition-all">
            Log In
          </Link>
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">
          Need help? <Link href="/help" className="text-emerald-600 font-semibold">Visit Help Centre</Link>
        </p>
      </div>

      <div className="h-36"></div>
    </div>
  );
}
