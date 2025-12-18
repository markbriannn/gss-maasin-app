'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Star, MapPin, Briefcase, Clock, CheckCircle, User, Tag, Home, Navigation, Building, Flag,
  Zap, Heart, Share2, Calendar, Sparkles
} from 'lucide-react';

interface Review {
  id: string;
  clientName: string;
  clientPhoto?: string;
  rating: number;
  comment: string;
  createdAt: Date;
  serviceCategory: string;
  images?: string[];
}

interface ProviderData {
  id: string;
  firstName: string;
  lastName: string;
  serviceCategory: string;
  rating: number;
  reviewCount: number;
  profilePhoto?: string;
  phone?: string;
  email?: string;
  bio?: string;
  about?: string;
  experience?: string;
  completedJobs: number;
  barangay?: string;
  streetAddress?: string;
  houseNumber?: string;
  landmark?: string;
  fixedPrice?: number;
  hourlyRate?: number;
  priceType?: string;
  isOnline?: boolean;
  createdAt?: Date;
  status?: string;
  providerStatus?: string;
  services?: string[];
}

const PROVIDER_TIERS = [
  { name: 'Bronze', minPoints: 0, color: '#CD7F32', gradient: 'from-amber-600 to-amber-800', icon: '🥉' },
  { name: 'Silver', minPoints: 100, color: '#9CA3AF', gradient: 'from-gray-400 to-gray-600', icon: '🥈' },
  { name: 'Gold', minPoints: 300, color: '#F59E0B', gradient: 'from-yellow-400 to-amber-500', icon: '🥇' },
  { name: 'Platinum', minPoints: 600, color: '#06B6D4', gradient: 'from-cyan-400 to-blue-500', icon: '💠' },
  { name: 'Diamond', minPoints: 1000, color: '#8B5CF6', gradient: 'from-purple-400 to-pink-500', icon: '💎' },
];

const SERVICE_CATEGORIES: Record<string, { color: string; gradient: string; icon: string }> = {
  electrician: { color: '#F59E0B', gradient: 'from-amber-400 to-orange-500', icon: '⚡' },
  plumber: { color: '#3B82F6', gradient: 'from-blue-400 to-indigo-600', icon: '🔧' },
  carpenter: { color: '#92400E', gradient: 'from-orange-400 to-amber-700', icon: '🪚' },
  cleaner: { color: '#10B981', gradient: 'from-teal-400 to-emerald-600', icon: '🧹' },
};

function getProviderTier(points: number) {
  for (let i = PROVIDER_TIERS.length - 1; i >= 0; i--) {
    if (points >= PROVIDER_TIERS[i].minPoints) return PROVIDER_TIERS[i];
  }
  return PROVIDER_TIERS[0];
}

export default function ProviderDetailsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const providerId = params.id as string;

  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [gamificationData, setGamificationData] = useState<{ points: number; tier: typeof PROVIDER_TIERS[0] } | null>(null);
  const [stats, setStats] = useState({ completedJobs: 0, rating: 0, reviewCount: 0, responseTime: '' });
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!providerId) return;
    fetchProvider();
    fetchReviews();
    fetchProviderStats();
    fetchGamificationData();
  }, [providerId]);

  const fetchProvider = async () => {
    try {
      const providerDoc = await getDoc(doc(db, 'users', providerId));
      if (providerDoc.exists()) {
        const data = providerDoc.data();
        // Format years experience - check both yearsExperience and experience fields
        const yearsExp = data.yearsExperience || data.experience || '';
        let formattedExperience = '';
        if (yearsExp) {
          const numYears = parseInt(yearsExp);
          if (!isNaN(numYears)) {
            formattedExperience = numYears === 1 ? '1 year' : `${numYears}+ yrs`;
          } else {
            formattedExperience = yearsExp;
          }
        }
        
        setProvider({
          id: providerDoc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          serviceCategory: data.serviceCategory || '',
          rating: data.rating || data.averageRating || 0,
          reviewCount: data.reviewCount || 0,
          profilePhoto: data.profilePhoto,
          phone: data.phone || data.phoneNumber,
          email: data.email,
          bio: data.bio || data.aboutService,
          about: data.about || data.aboutService,
          experience: formattedExperience || 'New',
          completedJobs: data.completedJobs || 0,
          barangay: data.barangay,
          streetAddress: data.streetAddress,
          houseNumber: data.houseNumber,
          landmark: data.landmark,
          fixedPrice: data.fixedPrice || 0,
          hourlyRate: data.hourlyRate || 0,
          priceType: data.priceType || 'per_job',
          isOnline: data.isOnline,
          createdAt: data.createdAt?.toDate(),
          status: data.status,
          providerStatus: data.providerStatus,
          services: data.services || (data.serviceCategory ? [data.serviceCategory] : []),
        });
      }
    } catch (error) {
      console.error('Error fetching provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGamificationData = async () => {
    try {
      const gamDoc = await getDoc(doc(db, 'gamification', providerId));
      if (gamDoc.exists()) {
        const data = gamDoc.data();
        const points = data.points || 0;
        setGamificationData({ points, tier: getProviderTier(points) });
      }
    } catch {}
  };

  const fetchProviderStats = async () => {
    try {
      const bookingsQuery = query(collection(db, 'bookings'), where('providerId', '==', providerId));
      const bookingsSnap = await getDocs(bookingsQuery);
      let completed = 0;
      const responseDurations: number[] = [];

      bookingsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const status = (data.status || '').toLowerCase();
        if (status === 'completed' || (status === 'payment_received' && data.isPaidUpfront)) completed++;
        const createdAt = data.createdAt?.toDate?.();
        const acceptedAt = data.acceptedAt?.toDate?.();
        if (createdAt && acceptedAt) {
          const diffMs = acceptedAt.getTime() - createdAt.getTime();
          if (diffMs >= 0) responseDurations.push(diffMs / 60000);
        }
      });

      const avgMin = responseDurations.length > 0 ? responseDurations.reduce((s, v) => s + v, 0) / responseDurations.length : null;
      const responseTime = avgMin !== null
        ? avgMin >= 60 ? `${Math.round(avgMin / 60)} hr${Math.round(avgMin / 60) !== 1 ? 's' : ''}` : `${Math.max(1, Math.round(avgMin))} min`
        : '~5 min';

      setStats((prev) => ({ ...prev, completedJobs: completed, responseTime }));
    } catch {}
  };

  const fetchReviews = async () => {
    try {
      let reviewsList: Review[] = [];
      try {
        const reviewsQuery = query(collection(db, 'reviews'), where('providerId', '==', providerId), orderBy('createdAt', 'desc'), limit(10));
        const snapshot = await getDocs(reviewsQuery);
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (['deleted', 'hidden', 'removed'].includes(data.status)) return;
          reviewsList.push({
            id: docSnap.id, clientName: data.clientName || data.reviewerName || 'Client', clientPhoto: data.clientPhoto,
            rating: data.rating || data.stars || 0, comment: data.comment || data.review || data.text || '',
            createdAt: data.createdAt?.toDate() || new Date(), serviceCategory: data.serviceCategory || '', images: data.images || [],
          });
        });
      } catch {
        const reviewsQuery = query(collection(db, 'reviews'), where('providerId', '==', providerId));
        const snapshot = await getDocs(reviewsQuery);
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (['deleted', 'hidden', 'removed'].includes(data.status)) return;
          reviewsList.push({
            id: docSnap.id, clientName: data.clientName || data.reviewerName || 'Client', clientPhoto: data.clientPhoto,
            rating: data.rating || data.stars || 0, comment: data.comment || data.review || data.text || '',
            createdAt: data.createdAt?.toDate() || new Date(), serviceCategory: data.serviceCategory || '', images: data.images || [],
          });
        });
        reviewsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        reviewsList = reviewsList.slice(0, 10);
      }
      setReviews(reviewsList);
      if (reviewsList.length > 0) {
        const avg = reviewsList.reduce((s, r) => s + r.rating, 0) / reviewsList.length;
        setStats((prev) => ({ ...prev, rating: Number(avg.toFixed(1)), reviewCount: reviewsList.length }));
      }
    } catch {}
  };

  const isVerified = provider?.status === 'approved' || provider?.providerStatus === 'approved';
  const categoryData = SERVICE_CATEGORIES[provider?.serviceCategory?.toLowerCase() || ''] || { color: '#00B14F', gradient: 'from-green-400 to-emerald-600', icon: '✨' };
  const displayRating = stats.rating || provider?.rating || 0;
  const displayReviewCount = stats.reviewCount || provider?.reviewCount || 0;

  if (authLoading || loading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
          <div className="animate-pulse">
            <div className="h-64 bg-gradient-to-r from-gray-200 to-gray-100" />
            <div className="max-w-3xl mx-auto px-4 -mt-20">
              <div className="bg-white rounded-3xl p-6 shadow-xl">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-200 rounded-2xl" />
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (!provider) {
    return (
      <ClientLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-12 h-12 text-gray-300" />
            </div>
            <p className="text-gray-500 mb-4">Provider not found</p>
            <button onClick={() => router.back()} className="px-6 py-3 bg-[#00B14F] text-white rounded-xl font-semibold">Go Back</button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 pb-28">
        {/* Hero Header */}
        <div className={`relative h-56 bg-gradient-to-br ${categoryData.gradient}`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between px-4 py-4">
            <button onClick={() => router.back()} className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsFavorite(!isFavorite)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isFavorite ? 'bg-red-500' : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'}`}>
                <Heart className={`w-5 h-5 ${isFavorite ? 'text-white fill-white' : 'text-white'}`} />
              </button>
              <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                <Share2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

        </div>

        {/* Profile Card */}
        <div className="max-w-3xl mx-auto px-4 -mt-24 relative z-10">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-5">
                {/* Photo */}
                <div className="relative mx-auto sm:mx-0">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-white shadow-xl">
                    {provider.profilePhoto ? (
                      <Image src={provider.profilePhoto} alt="" width={112} height={112} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <User className="w-14 h-14 text-gray-400" />
                      </div>
                    )}
                  </div>
                  {isVerified && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center border-2 border-white shadow-md">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">{provider.firstName} {provider.lastName}</h1>
                    {isVerified && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">Verified</span>
                    )}
                    {provider.isOnline && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Online
                      </span>
                    )}
                  </div>

                  {/* Service Badge */}
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: `${categoryData.color}15`, color: categoryData.color }}>
                      <span>{categoryData.icon}</span>
                      {provider.serviceCategory || 'Service Provider'}
                    </span>
                  </div>

                  {/* Tier & Points */}
                  {gamificationData && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold bg-gradient-to-r ${gamificationData.tier.gradient} text-white shadow-md`}>
                        <span>{gamificationData.tier.icon}</span>
                        {gamificationData.tier.name}
                      </span>
                      <span className="px-3 py-1.5 bg-gray-100 rounded-xl text-sm font-semibold text-gray-700">
                        {gamificationData.points.toLocaleString()} pts
                      </span>
                    </div>
                  )}

                  {/* Rating */}
                  <div className="flex items-center justify-center sm:justify-start gap-3">
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 rounded-xl">
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      <span className="font-bold text-gray-900">{displayRating.toFixed(1)}</span>
                      <span className="text-gray-500 text-sm">({displayReviewCount})</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm">{provider.barangay ? `Brgy. ${provider.barangay}` : 'Maasin City'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 border-t border-gray-100">
              <div className="p-4 text-center border-r border-gray-100">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Briefcase className="w-4 h-4 text-emerald-500" />
                  <span className="text-xl font-bold text-gray-900">{stats.completedJobs || provider.completedJobs || 0}</span>
                </div>
                <p className="text-xs text-gray-500">Jobs Done</p>
              </div>
              <div className="p-4 text-center border-r border-gray-100">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-xl font-bold text-gray-900">{stats.responseTime || '~5 min'}</span>
                </div>
                <p className="text-xs text-gray-500">Response</p>
              </div>
              <div className="p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <span className="text-xl font-bold text-gray-900">{provider.experience || '3+ yrs'}</span>
                </div>
                <p className="text-xs text-gray-500">Experience</p>
              </div>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="mt-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Tag className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-emerald-100 text-sm">Service Price</p>
                  {(provider.fixedPrice || provider.hourlyRate) ? (
                    <>
                      <p className="text-3xl font-bold text-white">₱{(provider.fixedPrice || provider.hourlyRate || 0).toLocaleString()}</p>
                      <p className="text-emerald-100 text-xs">{provider.priceType === 'per_hire' ? 'Per Hire' : 'Per Job'}</p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-white">Contact for pricing</p>
                  )}
                </div>
              </div>
              {(provider.fixedPrice || provider.hourlyRate) ? (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                  <p className="text-white text-xs font-medium">+ 5% service fee</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Location Card */}
          {(provider.streetAddress || provider.barangay || provider.houseNumber) && (
            <div className="mt-4 bg-white rounded-2xl p-5 shadow-lg">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-500" />
                Service Location
              </h3>
              <div className="space-y-3">
                {provider.houseNumber && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><Home className="w-4 h-4 text-gray-400" /></div>
                    <span>House/Bldg: {provider.houseNumber}</span>
                  </div>
                )}
                {provider.streetAddress && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><Navigation className="w-4 h-4 text-gray-400" /></div>
                    <span>{provider.streetAddress}</span>
                  </div>
                )}
                {provider.barangay && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><Building className="w-4 h-4 text-gray-400" /></div>
                    <span>Barangay {provider.barangay}</span>
                  </div>
                )}
                {provider.landmark && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><Flag className="w-4 h-4 text-gray-400" /></div>
                    <span>Near {provider.landmark}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* About Card */}
          <div className="mt-4 bg-white rounded-2xl p-5 shadow-lg">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              About
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {provider.bio || provider.about || `Experienced ${provider.serviceCategory?.toLowerCase() || 'service provider'} serving the Maasin City area. Committed to quality work and customer satisfaction.`}
            </p>
          </div>

          {/* Services Card */}
          <div className="mt-4 bg-white rounded-2xl p-5 shadow-lg">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              Services Offered
            </h3>
            <div className="flex flex-wrap gap-2">
              {(provider.services && provider.services.length > 0 ? provider.services : provider.serviceCategory ? [provider.serviceCategory] : []).map((service, index) => (
                <span key={index} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100">
                  {service}
                </span>
              ))}
            </div>
          </div>

          {/* Reviews Card */}
          <div className="mt-4 bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Reviews ({reviews.length})
              </h3>
              {reviews.length > 0 && (
                <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 rounded-lg">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-amber-700">{displayRating.toFixed(1)}</span>
                </div>
              )}
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        <span className="font-medium text-gray-700">{review.clientName}</span>
                      </div>
                      <span className="text-xs text-gray-400">{review.createdAt.toLocaleDateString()}</span>
                    </div>
                    {review.comment && <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>}
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {review.images.map((imgUrl, idx) => (
                          <Image key={idx} src={imgUrl} alt="" width={80} height={80} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 p-4 z-50">
          <div className="max-w-3xl mx-auto">
            <Link
              href={`/client/book?providerId=${provider.id}`}
              className="block w-full py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-bold text-center text-lg shadow-lg shadow-green-200 hover:shadow-xl transition-all"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
