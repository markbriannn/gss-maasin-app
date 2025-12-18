'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/components/layouts/ClientLayout';
import Image from 'next/image';
import { Heart, Star, MapPin, ArrowRight, Search } from 'lucide-react';

interface FavoriteProvider {
  id: string;
  providerId: string;
  name: string;
  firstName: string;
  service: string;
  rating: number;
  reviewCount: number;
  totalJobs: number;
  photo?: string;
  isOnline?: boolean;
  barangay?: string;
  responseTime?: number;
}

export default function FavoritesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const favQuery = query(collection(db, 'favorites'), where('userId', '==', user?.uid));
      const snapshot = await getDocs(favQuery);
      const list: FavoriteProvider[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.providerId) {
          const providerDoc = await getDoc(doc(db, 'users', data.providerId));
          if (providerDoc.exists()) {
            const p = providerDoc.data();
            list.push({
              id: docSnap.id,
              providerId: data.providerId,
              name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Provider',
              firstName: p.firstName || '',
              service: p.serviceCategory || p.category || 'Service Provider',
              rating: p.rating || p.averageRating || 0,
              reviewCount: p.reviewCount || 0,
              totalJobs: p.completedJobs || 0,
              photo: p.profilePhoto,
              isOnline: p.isOnline || false,
              barangay: p.barangay,
              responseTime: p.responseTime || Math.floor(Math.random() * 10) + 2,
            });
          }
        }
      }
      setFavorites(list);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await deleteDoc(doc(db, 'favorites', id));
      setFavorites(favorites.filter(f => f.id !== id));
    } catch (error) {
      alert('Failed to remove from favorites');
    } finally {
      setRemovingId(null);
    }
  };

  const filteredFavorites = favorites.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-red-500">
          <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Heart className="w-7 h-7 text-white fill-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">My Favorites</h1>
                <p className="text-rose-100">{favorites.length} saved providers</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search your favorites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-lg focus:ring-4 focus:ring-white/30 focus:outline-none text-gray-900"
              />
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-2/3" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFavorites.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-12 h-12 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {searchQuery ? 'No matches found' : 'No favorites yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Try a different search term' : 'Save providers you like for quick access'}
              </p>
              <button
                onClick={() => router.push('/client/providers')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                <span>Browse Providers</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFavorites.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden border border-gray-100"
                >
                  <div className="p-5">
                    <div className="flex gap-4">
                      {/* Photo */}
                      <div className="relative cursor-pointer" onClick={() => router.push(`/client/providers/${item.providerId}`)}>
                        {item.photo ? (
                          <Image src={item.photo} alt={item.name} width={80} height={80} className="w-20 h-20 rounded-xl object-cover" />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                            <span className="text-2xl font-bold text-gray-400">{item.firstName?.[0] || 'P'}</span>
                          </div>
                        )}
                        {item.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 
                            className="font-bold text-gray-900 truncate cursor-pointer hover:text-rose-500 transition-colors"
                            onClick={() => router.push(`/client/providers/${item.providerId}`)}
                          >
                            {item.name}
                          </h3>
                          <button
                            onClick={() => handleRemove(item.id)}
                            disabled={removingId === item.id}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            {removingId === item.id ? (
                              <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Heart className="w-5 h-5 fill-current text-red-500" />
                            )}
                          </button>
                        </div>
                        
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mb-2 ${
                          item.service.toLowerCase().includes('electric') ? 'bg-amber-100 text-amber-700' :
                          item.service.toLowerCase().includes('plumb') ? 'bg-blue-100 text-blue-700' :
                          item.service.toLowerCase().includes('carpen') ? 'bg-orange-100 text-orange-700' :
                          item.service.toLowerCase().includes('clean') ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.service.toLowerCase().includes('electric') ? '⚡' :
                           item.service.toLowerCase().includes('plumb') ? '🔧' :
                           item.service.toLowerCase().includes('carpen') ? '🪚' :
                           item.service.toLowerCase().includes('clean') ? '🧹' : '✨'} {item.service}
                        </span>
                        
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className={`w-4 h-4 ${item.rating > 0 ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                            <span className="font-semibold text-gray-900">{item.rating > 0 ? item.rating.toFixed(1) : 'New'}</span>
                            {item.reviewCount > 0 && <span className="text-gray-400">({item.reviewCount})</span>}
                          </div>
                          {item.totalJobs > 0 && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-gray-500">{item.totalJobs} jobs</span>
                            </>
                          )}
                        </div>

                        {item.barangay && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                            <MapPin className="w-4 h-4" />
                            <span>Brgy. {item.barangay}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => router.push(`/client/book?providerId=${item.providerId}`)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                      >
                        <span>Contact Us</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
