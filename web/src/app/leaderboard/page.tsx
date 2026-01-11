'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { Trophy, Crown, Users, Zap, ChevronLeft, Award, Flame } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  name: string;
  photo?: string;
  points: number;
  completedJobs?: number;
  rating?: number;
  service?: string;
  tier: { name: string; color: string; minPoints: number; gradient: string };
}

// Tier thresholds must match mobile (src/utils/gamification.js)
const PROVIDER_TIERS = [
  { name: 'Bronze', minPoints: 0, color: 'bg-amber-600', gradient: 'from-amber-500 to-amber-700' },
  { name: 'Silver', minPoints: 1000, color: 'bg-gray-400', gradient: 'from-gray-400 to-gray-600' },
  { name: 'Gold', minPoints: 3000, color: 'bg-yellow-500', gradient: 'from-yellow-400 to-amber-500' },
  { name: 'Platinum', minPoints: 7500, color: 'bg-cyan-400', gradient: 'from-cyan-400 to-blue-500' },
];

// Client tier thresholds must match mobile (src/utils/gamification.js)
const CLIENT_TIERS = [
  { name: 'Regular', minPoints: 0, color: 'bg-gray-400', gradient: 'from-gray-400 to-gray-600' },
  { name: 'VIP', minPoints: 500, color: 'bg-blue-500', gradient: 'from-blue-400 to-blue-600' },
  { name: 'Premium', minPoints: 1500, color: 'bg-yellow-500', gradient: 'from-yellow-400 to-amber-500' },
];

function getTier(points: number, isProvider: boolean) {
  const tiers = isProvider ? PROVIDER_TIERS : CLIENT_TIERS;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (points >= tiers[i].minPoints) return tiers[i];
  }
  return tiers[0];
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'providers' | 'clients'>('providers');
  const [providers, setProviders] = useState<LeaderboardEntry[]>([]);
  const [clients, setClients] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();
  }, [user]);

  const fetchLeaderboards = async () => {
    try {
      // Fetch all gamification data first
      const gamificationSnap = await getDocs(collection(db, 'gamification'));
      const gamificationMap: Map<string, { points: number; stats: any; role?: string }> = new Map();
      
      gamificationSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        gamificationMap.set(docSnap.id, { points: data.points || 0, stats: data.stats || {}, role: data.role });
      });

      // Fetch all users
      const usersSnap = await getDocs(collection(db, 'users'));
      const providersList: LeaderboardEntry[] = [];
      const clientsList: LeaderboardEntry[] = [];

      usersSnap.docs.forEach(userDoc => {
        const userData = userDoc.data();
        const role = userData.role?.toUpperCase();
        const gamData = gamificationMap.get(userDoc.id);
        const points = gamData?.points || userData.points || 0;
        const stats = gamData?.stats || {};

        if (role === 'PROVIDER') {
          // Check if provider is approved - be lenient, include if not explicitly rejected
          const status = userData.status?.toLowerCase();
          const providerStatus = userData.providerStatus?.toLowerCase();
          const isApproved = status === 'approved' || providerStatus === 'approved';
          const isRejected = status === 'rejected' || providerStatus === 'rejected' || status === 'suspended' || providerStatus === 'suspended';
          
          // Include if approved OR if not explicitly rejected (for providers without status set)
          if (isApproved || !isRejected) {
            providersList.push({
              id: userDoc.id,
              name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Provider',
              photo: userData.profilePhoto,
              points,
              completedJobs: stats.completedJobs || userData.completedJobs || 0,
              rating: userData.rating || userData.averageRating || stats.rating || 0,
              service: userData.serviceCategory || 'Service Provider',
              tier: getTier(points, true),
            });
          }
        } else if (role === 'CLIENT' || !role || role === 'USER') {
          // Include clients - also include users without role or with 'USER' role
          // Skip admin users
          if (role !== 'ADMIN') {
            const clientPoints = points || userData.loyaltyPoints || 0;
            clientsList.push({
              id: userDoc.id,
              name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Client',
              photo: userData.profilePhoto,
              points: clientPoints,
              completedJobs: stats.completedBookings || userData.completedBookings || userData.totalBookings || 0,
              tier: getTier(clientPoints, false),
            });
          }
        }
      });

      // Sort by points
      providersList.sort((a, b) => b.points - a.points);
      clientsList.sort((a, b) => b.points - a.points);
      
      setProviders(providersList.slice(0, 20));
      setClients(clientsList.slice(0, 20));

      if (user?.uid) {
        const gamDoc = await getDoc(doc(db, 'gamification', user.uid));
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isProvider = userData.role === 'PROVIDER';
          const points = gamDoc.exists() ? (gamDoc.data().points || 0) : 0;
          const stats = gamDoc.exists() ? (gamDoc.data().stats || {}) : {};
          const list = isProvider ? providersList : clientsList;
          const rank = list.findIndex(e => e.id === user.uid) + 1;
          setMyStats({ points, tier: getTier(points, isProvider), isProvider, stats, rank: rank > 0 ? rank : null });
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const data = activeTab === 'providers' ? providers : clients;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center gap-3 ml-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Leaderboard</h1>
              <p className="text-xs text-white/60">Top performers this month</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        {/* My Stats Card */}
        {myStats && (
          <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-6 mb-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${myStats.tier.gradient} flex items-center justify-center shadow-lg`}>
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Your Rank</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-white">{myStats.rank ? `#${myStats.rank}` : '-'}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${myStats.tier.gradient} text-white`}>
                      {myStats.tier.name}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-sm">Total Points</p>
                <p className="text-2xl font-bold text-amber-400">{myStats.points.toLocaleString()}</p>
              </div>
            </div>
            {/* Progress to next tier */}
            {(() => {
              const tiers = myStats.isProvider ? PROVIDER_TIERS : CLIENT_TIERS;
              const currentTierIndex = tiers.findIndex(t => t.name === myStats.tier.name);
              const nextTier = tiers[currentTierIndex + 1];
              if (!nextTier) return (
                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-3 flex items-center gap-3">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-200 text-sm font-medium">You&apos;ve reached the highest tier!</span>
                </div>
              );
              const progress = ((myStats.points - myStats.tier.minPoints) / (nextTier.minPoints - myStats.tier.minPoints)) * 100;
              return (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/60">Progress to {nextTier.name}</span>
                    <span className="text-white font-medium">{nextTier.minPoints - myStats.points} pts to go</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${nextTier.gradient} rounded-full transition-all`} style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-1.5 flex mb-6 border border-white/10">
          <button
            onClick={() => setActiveTab('providers')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'providers' ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            Top Providers
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'clients' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Top Clients
          </button>
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-white/20 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-12 h-12 text-white/30" />
            </div>
            <p className="text-white/60 text-lg">No data yet</p>
            <p className="text-white/40 text-sm mt-2">Be the first to climb the ranks!</p>
          </div>
        ) : (
          <>
            {/* Podium - Top 3 */}
            {data.length >= 3 && (
              <div className="flex items-end justify-center gap-3 mb-8 px-4">
                {/* 2nd Place */}
                <div className="flex-1 max-w-[140px]">
                  <div className="bg-gradient-to-b from-gray-400/20 to-gray-600/20 backdrop-blur-xl rounded-t-3xl p-4 text-center border border-white/10 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <div className="w-16 h-16 mx-auto mb-3 mt-4 rounded-full overflow-hidden ring-4 ring-gray-400/50 shadow-xl">
                      {data[1].photo ? (
                        <Image src={data[1].photo} alt="" width={64} height={64} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                          <span className="text-white text-xl font-bold">{data[1].name[0]}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-white font-semibold text-sm truncate">{data[1].name.split(' ')[0]}</p>
                    <p className="text-amber-400 font-bold">{data[1].points.toLocaleString()}</p>
                    <p className="text-white/50 text-xs">points</p>
                  </div>
                  <div className="h-16 bg-gradient-to-b from-gray-500/30 to-gray-700/30 rounded-b-xl" />
                </div>

                {/* 1st Place */}
                <div className="flex-1 max-w-[160px] -mt-8">
                  <div className="bg-gradient-to-b from-amber-400/20 to-orange-600/20 backdrop-blur-xl rounded-t-3xl p-4 text-center border border-amber-400/30 relative">
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                      <Crown className="w-10 h-10 text-amber-400 drop-shadow-lg" />
                    </div>
                    <div className="w-20 h-20 mx-auto mb-3 mt-6 rounded-full overflow-hidden ring-4 ring-amber-400 shadow-xl shadow-amber-500/30">
                      {data[0].photo ? (
                        <Image src={data[0].photo} alt="" width={80} height={80} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                          <span className="text-white text-2xl font-bold">{data[0].name[0]}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-white font-bold truncate">{data[0].name.split(' ')[0]}</p>
                    <div className="flex items-center justify-center gap-1">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <p className="text-amber-400 font-bold text-lg">{data[0].points.toLocaleString()}</p>
                    </div>
                    <p className="text-white/50 text-xs">points</p>
                  </div>
                  <div className="h-24 bg-gradient-to-b from-amber-500/30 to-orange-700/30 rounded-b-xl" />
                </div>

                {/* 3rd Place */}
                <div className="flex-1 max-w-[140px]">
                  <div className="bg-gradient-to-b from-amber-700/20 to-amber-900/20 backdrop-blur-xl rounded-t-3xl p-4 text-center border border-white/10 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-sm">3</span>
                    </div>
                    <div className="w-16 h-16 mx-auto mb-3 mt-4 rounded-full overflow-hidden ring-4 ring-amber-700/50 shadow-xl">
                      {data[2].photo ? (
                        <Image src={data[2].photo} alt="" width={64} height={64} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
                          <span className="text-white text-xl font-bold">{data[2].name[0]}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-white font-semibold text-sm truncate">{data[2].name.split(' ')[0]}</p>
                    <p className="text-amber-400 font-bold">{data[2].points.toLocaleString()}</p>
                    <p className="text-white/50 text-xs">points</p>
                  </div>
                  <div className="h-12 bg-gradient-to-b from-amber-700/30 to-amber-900/30 rounded-b-xl" />
                </div>
              </div>
            )}

            {/* Rest of the list */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
              {data.slice(3).map((entry, index) => (
                <div key={entry.id} className={`flex items-center p-4 hover:bg-white/5 transition-colors ${index !== data.length - 4 ? 'border-b border-white/5' : ''}`}>
                  <div className="w-10 text-center">
                    <span className="text-white/60 font-bold">{index + 4}</span>
                  </div>
                  <div className="w-12 h-12 rounded-full overflow-hidden ml-3 ring-2 ring-white/10">
                    {entry.photo ? (
                      <Image src={entry.photo} alt="" width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${entry.tier.gradient} flex items-center justify-center`}>
                        <span className="text-white font-bold">{entry.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{entry.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r ${entry.tier.gradient} text-white`}>
                        {entry.tier.name}
                      </span>
                      {entry.service && <span className="text-white/40 text-xs truncate">{entry.service}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-400">{entry.points.toLocaleString()}</p>
                    <p className="text-white/40 text-xs">points</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
