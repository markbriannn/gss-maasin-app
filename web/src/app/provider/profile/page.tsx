'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import Image from 'next/image';
import {
  Briefcase, Star, Camera, MapPin, Clock, CheckCircle, Edit, Trophy, Home, Navigation, Building, Tag,
  Zap, Shield
} from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: Date;
  images?: string[];
}

interface GamificationData {
  tier: { name: string; color: string; icon: string; gradient: string };
  points: number;
  badges: { id: string; name: string; icon: string }[];
}

const getProviderTier = (points: number) => {
  if (points >= 10000) return { name: 'Master', color: '#8B5CF6', icon: '👑', gradient: 'from-purple-400 to-pink-500' };
  if (points >= 5000) return { name: 'Expert', color: '#6366F1', icon: '💎', gradient: 'from-indigo-400 to-purple-500' };
  if (points >= 2000) return { name: 'Professional', color: '#F59E0B', icon: '🥇', gradient: 'from-amber-400 to-orange-500' };
  if (points >= 500) return { name: 'Skilled', color: '#9CA3AF', icon: '🥈', gradient: 'from-gray-400 to-gray-600' };
  if (points >= 100) return { name: 'Apprentice', color: '#CD7F32', icon: '🥉', gradient: 'from-amber-600 to-amber-800' };
  return { name: 'Newcomer', color: '#6B7280', icon: '🌱', gradient: 'from-green-400 to-emerald-600' };
};

export default function ProviderProfilePage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ rating: 0, reviewCount: 0, jobsCompleted: 0, responseTime: 'Not enough data' });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [gamificationData, setGamificationData] = useState<GamificationData | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (user?.role?.toUpperCase() !== 'PROVIDER') router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.uid) {
      fetchReviews();
      fetchProviderStats();
      fetchGamificationData();
    }
  }, [user]);

  const fetchGamificationData = async () => {
    if (!user?.uid) return;
    try {
      const gamDoc = await getDoc(doc(db, 'gamification', user.uid));
      if (gamDoc.exists()) {
        const data = gamDoc.data();
        setGamificationData({
          tier: getProviderTier(data.points || 0),
          points: data.points || 0,
          badges: data.badges || [],
        });
      }
    } catch {}
  };

  const fetchReviews = async () => {
    if (!user?.uid) return;
    setReviewsLoading(true);
    try {
      const q = query(collection(db, 'reviews'), where('providerId', '==', user.uid));
      const snap = await getDocs(q);
      const items: Review[] = [];
      
      for (const d of snap.docs) {
        const data = d.data();
        if (['deleted', 'hidden', 'removed'].includes(data.status)) continue;

        let reviewerName = 'Anonymous';
        if (data.reviewerId) {
          try {
            const reviewerDoc = await getDoc(doc(db, 'users', data.reviewerId));
            if (reviewerDoc.exists()) {
              const reviewer = reviewerDoc.data();
              reviewerName = `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() || 'Client';
            }
          } catch {}
        }

        items.push({
          id: d.id,
          rating: data.rating || data.stars || 0,
          comment: data.comment || data.text || '',
          reviewerName,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          images: data.images || [],
        });
      }

      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setReviews(items);

      if (items.length > 0) {
        const avg = items.reduce((sum, r) => sum + r.rating, 0) / items.length;
        setStats((prev) => ({ ...prev, rating: Number(avg.toFixed(1)), reviewCount: items.length }));
      }
    } catch {} finally {
      setReviewsLoading(false);
    }
  };

  const fetchProviderStats = async () => {
    if (!user?.uid) return;
    try {
      const bookingsSnap = await getDocs(query(collection(db, 'bookings'), where('providerId', '==', user.uid)));
      let completed = 0;
      const responseDurations: number[] = [];

      bookingsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const status = (data.status || '').toLowerCase();
        if (status === 'completed' || (status === 'payment_received' && data.isPaidUpfront)) completed += 1;

        const createdAt = data.createdAt?.toDate?.();
        const acceptedAt = data.acceptedAt?.toDate?.();
        if (createdAt && acceptedAt) {
          const diffMs = acceptedAt.getTime() - createdAt.getTime();
          if (diffMs >= 0) responseDurations.push(diffMs / 60000);
        }
      });

      const avgResponseMinutes = responseDurations.length > 0
        ? responseDurations.reduce((sum, val) => sum + val, 0) / responseDurations.length
        : null;

      const formattedResponse = avgResponseMinutes !== null
        ? avgResponseMinutes >= 60 ? `${Math.round(avgResponseMinutes / 60)} hr${Math.round(avgResponseMinutes / 60) !== 1 ? 's' : ''}` : `${Math.max(1, Math.round(avgResponseMinutes))} min`
        : 'Not enough data';

      setStats((prev) => ({ ...prev, jobsCompleted: completed, responseTime: formattedResponse }));
    } catch {}
  };

  if (isLoading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-24">
        {/* Premium Profile Header */}
        <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-3xl mx-auto px-4 pt-6 pb-8">
            <div className="flex items-start gap-5">
              {/* Profile Photo */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white shadow-2xl">
                  {user?.profilePhoto ? (
                    <Image src={user.profilePhoto} alt="" width={96} height={96} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center">
                      <span className="text-white text-3xl font-bold">{user?.firstName?.[0] || 'P'}</span>
                    </div>
                  )}
                </div>
                <button className="absolute -bottom-2 -right-2 w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 text-white">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-2xl font-bold">{user?.firstName} {user?.lastName}</h2>
                  {user?.providerStatus === 'approved' && (
                    <span className="bg-blue-400/30 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-blue-100 mb-2">{user?.serviceCategory}</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span className="font-semibold">{stats.rating || '0.0'}</span>
                    {stats.reviewCount > 0 && <span className="text-blue-200 text-sm">({stats.reviewCount})</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Gamification */}
            {gamificationData && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${gamificationData.tier.gradient} shadow-lg`}>
                  <span className="text-lg">{gamificationData.tier.icon}</span>
                  <span className="text-white font-bold">{gamificationData.tier.name}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span className="text-white font-bold">{gamificationData.points.toLocaleString()} pts</span>
                </div>
              </div>
            )}

            {/* Badges */}
            {gamificationData?.badges && gamificationData.badges.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                {gamificationData.badges.slice(0, 4).map((badge) => (
                  <span key={badge.id} className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-xs font-medium" title={badge.name}>
                    {badge.icon} {badge.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${user?.providerStatus === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span className="text-gray-600">Account Status</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${user?.providerStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {user?.providerStatus === 'approved' ? 'Approved' : 'Pending Approval'}
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-lg text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Briefcase className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.jobsCompleted}</p>
              <p className="text-xs text-gray-500">Jobs Done</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg text-center">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Star className="w-6 h-6 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.rating || '0.0'}</p>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.responseTime}</p>
              <p className="text-xs text-gray-500">Response</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Tag className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-emerald-100 text-sm">Service Price</p>
                  <p className="text-3xl font-bold text-white">₱{user?.fixedPrice || user?.hourlyRate || 0}</p>
                  <p className="text-emerald-100 text-xs">{user?.priceType === 'per_hire' ? 'Per Hire' : 'Per Job'}</p>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <p className="text-white text-xs">+ 5% service fee</p>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        {(user?.streetAddress || user?.barangay) && (
          <div className="max-w-3xl mx-auto px-4 mt-4">
            <div className="bg-white rounded-2xl p-5 shadow-lg">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" />
                Service Location
              </h3>
              <div className="space-y-2">
                {user?.houseNumber && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Home className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">House/Bldg: {user.houseNumber}</span>
                  </div>
                )}
                {user?.streetAddress && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Navigation className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{user.streetAddress}</span>
                  </div>
                )}
                {user?.barangay && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">Barangay {user.barangay}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Maasin City</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* About */}
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <h3 className="font-bold text-gray-900 mb-3">About</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {user?.bio || user?.about || `Experienced ${user?.serviceCategory?.toLowerCase() || 'service provider'} serving the Maasin City area. Committed to quality work and customer satisfaction.`}
            </p>
          </div>
        </div>

        {/* Reviews */}
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Reviews ({reviews.length})
              </h3>
            </div>
            {reviewsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.slice(0, 5).map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        <span className="text-gray-600 text-sm">{review.reviewerName}</span>
                      </div>
                      <span className="text-xs text-gray-400">{review.createdAt.toLocaleDateString()}</span>
                    </div>
                    {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto">
                        {review.images.map((img, idx) => (
                          <button key={idx} onClick={() => setSelectedImage(img)} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                            <Image src={img} alt="" width={80} height={80} className="w-20 h-20 rounded-xl object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button
            onClick={() => router.push('/leaderboard')}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Trophy className="w-5 h-5" />
            Leaderboard
          </button>
          <button
            onClick={() => router.push('/settings/profile')}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Edit className="w-5 h-5" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <Image 
            src={selectedImage} 
            alt="Review image" 
            width={800} 
            height={600} 
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </ProviderLayout>
  );
}
