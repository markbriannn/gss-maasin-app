'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import Image from 'next/image';
import {
  Briefcase, Star, Clock, MapPin, User, ChevronRight, Bell, History, Trophy, Wallet,
  RefreshCw, TrendingUp, Calendar, ArrowUpRight, Sparkles
} from 'lucide-react';

// Live location update interval (10-15 seconds to save Firestore quota)
const LIVE_LOCATION_INTERVAL = 12000; // 12 seconds

interface Job {
  id: string;
  title: string;
  serviceCategory: string;
  status: string;
  clientName?: string;
  location?: string;
  amount: number;
  createdAt: Date;
  description?: string;
  isNegotiable?: boolean;
  offeredPrice?: number;
}

interface Stats {
  todayEarnings: number;
  weekEarnings: number;
  totalEarnings: number;
  jobsToday: number;
  activeJobs: number;
  rating: number;
  completedJobs: number;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// Tier thresholds must match mobile (src/utils/gamification.js)
const TIERS = [
  { name: 'Bronze', minPoints: 0, color: '#CD7F32', gradient: 'from-amber-600 to-amber-800', icon: '🥉' },
  { name: 'Silver', minPoints: 1000, color: '#C0C0C0', gradient: 'from-gray-400 to-gray-600', icon: '🥈' },
  { name: 'Gold', minPoints: 3000, color: '#FFD700', gradient: 'from-yellow-400 to-amber-500', icon: '🥇' },
  { name: 'Platinum', minPoints: 7500, color: '#E5E4E2', gradient: 'from-cyan-400 to-blue-500', icon: '💠' },
];

const getTierInfo = (points: number) => {
  let currentTier = TIERS[0];
  let nextTier = TIERS[1];
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].minPoints) {
      currentTier = TIERS[i];
      nextTier = TIERS[i + 1] || null;
      break;
    }
  }
  const pointsNeeded = nextTier ? nextTier.minPoints - points : 0;
  const progress = nextTier ? ((points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100 : 100;
  return { ...currentTier, nextTier: nextTier?.name, pointsNeeded, progress };
};

export default function ProviderDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState<Stats>({ todayEarnings: 0, weekEarnings: 0, totalEarnings: 0, jobsToday: 0, activeJobs: 0, rating: 0, completedJobs: 0 });
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Ref for live location interval
  const liveLocationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Live location tracking - updates every 12 seconds when online
  useEffect(() => {
    const startLiveLocationTracking = () => {
      // Clear any existing interval
      if (liveLocationIntervalRef.current) {
        clearInterval(liveLocationIntervalRef.current);
        liveLocationIntervalRef.current = null;
      }
      
      if (!isOnline || !user?.uid) return;
      if (!navigator.geolocation) return;
      
      console.log('[Provider Web] Starting live location tracking (every 12s)');
      
      // Update location function
      const updateLocation = () => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                locationUpdatedAt: new Date(),
                isOnline: true,
              });
              console.log('[Provider Web] Live location updated');
            } catch (e) {
              console.log('[Provider Web] Live location update failed:', e);
            }
          },
          (error) => console.log('[Provider Web] Geolocation error:', error.message),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      };
      
      // Update immediately
      updateLocation();
      
      // Then update every 12 seconds
      liveLocationIntervalRef.current = setInterval(updateLocation, LIVE_LOCATION_INTERVAL);
    };
    
    startLiveLocationTracking();
    
    // Cleanup on unmount or when going offline
    return () => {
      if (liveLocationIntervalRef.current) {
        clearInterval(liveLocationIntervalRef.current);
        liveLocationIntervalRef.current = null;
        console.log('[Provider Web] Stopped live location tracking');
      }
    };
  }, [isOnline, user?.uid]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (user?.role?.toUpperCase() !== 'PROVIDER') router.push('/');
      // Redirect to profile setup if no profile photo and setup not complete
      // Check sessionStorage to prevent redirect loop after skip
      else if (!user?.profilePhoto && !user?.profileSetupComplete) {
        const skipped = typeof window !== 'undefined' && sessionStorage.getItem('profileSetupSkipped') === 'true';
        if (!skipped) {
          router.push('/provider/setup-profile');
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.uid && user?.role?.toUpperCase() === 'PROVIDER') {
      fetchData();
      
      // Update location when provider opens the app (if they're online)
      const updateLocationOnLoad = async () => {
        try {
          const providerDoc = await getDoc(doc(db, 'users', user.uid));
          if (providerDoc.exists() && providerDoc.data().isOnline && navigator.geolocation) {
            // Provider is online, update their location
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                try {
                  await updateDoc(doc(db, 'users', user.uid), {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    locationUpdatedAt: new Date(),
                  });
                  console.log('[Provider] Location updated on app open');
                } catch (e) {
                  console.log('Could not update location:', e);
                }
              },
              (error) => console.log('Geolocation error:', error),
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
          }
        } catch (e) {
          console.log('Could not check online status:', e);
        }
      };
      updateLocationOnLoad();
      
      const notifQuery = query(collection(db, 'notifications'), where('userId', '==', user.uid), where('read', '==', false));
      const unsubNotif = onSnapshot(notifQuery, (snapshot) => setUnreadCount(snapshot.size));
      return () => unsubNotif();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user?.uid) return;
    try {
      const providerDoc = await getDoc(doc(db, 'users', user.uid));
      let providerRating = user.rating || 0;
      if (providerDoc.exists()) {
        const data = providerDoc.data();
        setIsOnline(data.isOnline || false);
        setPoints(data.points || 0);
        providerRating = data.averageRating || data.rating || providerRating;
      }

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

      const myJobsQuery = query(collection(db, 'bookings'), where('providerId', '==', user.uid));
      const myJobsSnapshot = await getDocs(myJobsQuery);
      
      let todayEarnings = 0, weekEarnings = 0, totalEarnings = 0, jobsToday = 0, activeJobs = 0, completedJobs = 0;

      myJobsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'completed' || (data.status === 'payment_received' && data.isPaidUpfront)) {
          const approvedCharges = data.additionalCharges?.filter((c: { status: string }) => c.status === 'approved').reduce((sum: number, c: { amount: number }) => sum + (c.amount || 0), 0) || 0;
          
          // IMPORTANT: providerPrice is the provider's actual price (before 5% fee added to client)
          // Only divide by 1.05 if we're using totalAmount (which includes the fee)
          let providerEarnings: number;
          if (data.providerPrice || data.offeredPrice) {
            // Use provider's actual price directly
            providerEarnings = (data.providerPrice || data.offeredPrice) + approvedCharges;
          } else if (data.totalAmount) {
            // totalAmount includes 5% fee, so remove it
            providerEarnings = (data.totalAmount / 1.05) + approvedCharges;
          } else {
            providerEarnings = (data.price || 0) + approvedCharges;
          }
          
          totalEarnings += providerEarnings;
          completedJobs++;
          const completedAt = data.completedAt?.toDate?.() || data.clientConfirmedAt?.toDate?.();
          if (completedAt) {
            if (completedAt >= today) { todayEarnings += providerEarnings; jobsToday++; }
            if (completedAt >= weekAgo) weekEarnings += providerEarnings;
          }
        }
        if (data.status === 'in_progress' || data.status === 'accepted' || data.status === 'traveling' || data.status === 'arrived') activeJobs++;
      });

      setStats({ todayEarnings, weekEarnings, totalEarnings, jobsToday, activeJobs, rating: providerRating, completedJobs });

      const availableQuery = query(collection(db, 'bookings'), where('status', 'in', ['pending', 'approved', 'pending_negotiation']));
      const availableSnapshot = await getDocs(availableQuery);
      const available: Job[] = [];
      
      for (const docSnap of availableSnapshot.docs) {
        const data = docSnap.data();
        if (!data.providerId && data.adminApproved) {
          let location = data.barangay ? `Brgy. ${data.barangay}` : 'Maasin City';
          available.push({
            id: docSnap.id, title: data.title || data.serviceCategory || 'Service Request', serviceCategory: data.serviceCategory || 'General',
            status: data.status, clientName: data.clientName || 'Client', location, amount: data.totalAmount || data.price || 0,
            createdAt: data.createdAt?.toDate() || new Date(), description: data.description, isNegotiable: data.isNegotiable, offeredPrice: data.offeredPrice,
          });
        }
      }
      setAvailableJobs(available.slice(0, 5));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  const handleToggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    try {
      if (user?.uid) {
        const updateData: Record<string, unknown> = { 
          isOnline: newStatus, 
          lastOnline: new Date() 
        };
        
        // When going online, also update current location so clients can see provider on map
        if (newStatus && navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000,
              });
            });
            updateData.latitude = position.coords.latitude;
            updateData.longitude = position.coords.longitude;
            updateData.locationUpdatedAt = new Date();
          } catch (locError) {
            console.log('Could not get location for online status:', locError);
            // Continue without location update - don't block going online
          }
        }
        
        await updateDoc(doc(db, 'users', user.uid), updateData);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      setIsOnline(!newStatus);
    }
  };

  const tierInfo = getTierInfo(points);

  if (isLoading || loadingData) {
    return (
      <ProviderLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-7xl mx-auto px-4 py-6">
            {/* Top Row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                  {user?.profilePhoto ? (
                    <Image src={user.profilePhoto} alt="" width={56} height={56} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-blue-100 text-sm">{getGreeting()},</p>
                  <h1 className="text-xl font-bold text-white">{user?.firstName} {user?.lastName}</h1>
                </div>
              </div>
              
              <button onClick={handleToggleOnline}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isOnline ? 'bg-green-500 text-white' : 'bg-white/15 backdrop-blur-sm text-white/80'}`}>
                <div className={`relative w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-white' : 'bg-gray-400'}`}>
                  {isOnline && <div className="absolute inset-0 bg-white rounded-full animate-ping" />}
                </div>
                <span className="text-sm font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
              </button>
            </div>

            {/* Earnings Card */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Today&apos;s Earnings</p>
                  <p className="text-4xl font-bold text-white">₱{Math.round(stats.todayEarnings).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 rounded-full">
                  <TrendingUp className="w-4 h-4 text-green-300" />
                  <span className="text-green-300 text-sm font-semibold">+{stats.jobsToday} jobs</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-6">
                  <div>
                    <p className="text-blue-200 text-xs">This Week</p>
                    <p className="text-white font-bold text-lg">₱{Math.round(stats.weekEarnings).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-xs">All Time</p>
                    <p className="text-white font-bold text-lg">₱{Math.round(stats.totalEarnings).toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => router.push('/provider/earnings')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-600 rounded-xl font-semibold hover:shadow-lg transition-all">
                  <Wallet className="w-4 h-4" />
                  View Earnings
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 -mt-4 relative z-10">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <button onClick={() => router.push('/provider/jobs')} className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all text-left">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.activeJobs}</p>
              <p className="text-xs text-gray-500">Active Jobs</p>
            </button>
            <button onClick={() => router.push('/provider/history')} className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all text-left">
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.completedJobs}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </button>
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.rating > 0 ? stats.rating.toFixed(1) : 'New'}</p>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
            <button onClick={() => router.push('/leaderboard')} className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all text-left">
              <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                <Trophy className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{points}</p>
              <p className="text-xs text-gray-500">Points</p>
            </button>
          </div>

          {/* Tier Progress Card */}
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Your Progress</h2>
              <button onClick={() => router.push('/leaderboard')} className="flex items-center gap-1 text-purple-600 text-sm font-semibold hover:underline">
                <Trophy className="w-4 h-4" /> Leaderboard
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tierInfo.gradient} flex items-center justify-center shadow-lg`}>
                <span className="text-2xl">{tierInfo.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900">{tierInfo.name} Tier</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">{points.toLocaleString()} pts</span>
                </div>
                {tierInfo.nextTier && (
                  <>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress to {tierInfo.nextTier}</span>
                      <span>{tierInfo.pointsNeeded.toLocaleString()} pts needed</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${tierInfo.gradient}`} style={{ width: `${tierInfo.progress}%` }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: Briefcase, label: 'My Jobs', href: '/provider/jobs', color: 'blue' },
                { icon: History, label: 'History', href: '/provider/history', color: 'emerald' },
                { icon: Wallet, label: 'Wallet', href: '/provider/wallet', color: 'purple' },
                { icon: Bell, label: 'Alerts', href: '/notifications', color: 'amber', badge: unreadCount },
              ].map((action, i) => (
                <button key={i} onClick={() => router.push(action.href)}
                  className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all flex flex-col items-center gap-2 relative">
                  <div className={`w-12 h-12 bg-${action.color}-100 rounded-xl flex items-center justify-center`}>
                    <action.icon className={`w-6 h-6 text-${action.color}-600`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{action.label}</span>
                  {action.badge && action.badge > 0 && (
                    <span className="absolute top-2 right-2 min-w-[20px] h-5 bg-red-500 rounded-full text-xs font-bold text-white flex items-center justify-center px-1">
                      {action.badge > 99 ? '99+' : action.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Available Jobs */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Available Jobs</h2>
              <div className="flex items-center gap-2">
                <button onClick={handleRefresh} disabled={refreshing} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50">
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => router.push('/provider/jobs')} className="flex items-center gap-1 text-blue-600 text-sm font-semibold hover:underline">
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {availableJobs.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">No available jobs</h3>
                <p className="text-gray-500 text-sm">New jobs will appear here when clients post them</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableJobs.map((job) => (
                  <div key={job.id} onClick={() => router.push(`/provider/jobs/${job.id}`)}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-gray-100">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">{job.serviceCategory}</span>
                          {job.isNegotiable && (
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Negotiable
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">₱{(job.isNegotiable ? job.offeredPrice : job.amount)?.toLocaleString() || 'TBD'}</p>
                          {job.isNegotiable && <p className="text-xs text-gray-500">Client&apos;s offer</p>}
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{job.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center gap-1"><User className="w-4 h-4" />{job.clientName}</div>
                        <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</div>
                      </div>
                      {job.description && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{job.description}</p>}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{job.createdAt.toLocaleDateString()}</span>
                        <button className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all">
                          View Details <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
}
