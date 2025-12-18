'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import Image from 'next/image';
import { 
  User, Trophy, Clock, CreditCard, Heart, Bell, HelpCircle, FileText, Info,
  ChevronRight, LogOut, MapPin, Star, Award, Settings, Shield, Sparkles, Crown, Zap
} from 'lucide-react';

interface GamificationData {
  tier: string;
  points: number;
  badges: string[];
}

const TIER_CONFIG: Record<string, { bg: string; text: string; gradient: string; icon: string }> = {
  new: { bg: 'bg-gray-100', text: 'text-gray-600', gradient: 'from-gray-400 to-gray-600', icon: '🌱' },
  regular: { bg: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-blue-400 to-blue-600', icon: '⭐' },
  loyal: { bg: 'bg-green-100', text: 'text-green-600', gradient: 'from-green-400 to-emerald-600', icon: '💚' },
  vip: { bg: 'bg-purple-100', text: 'text-purple-600', gradient: 'from-purple-400 to-purple-600', icon: '💎' },
  elite: { bg: 'bg-amber-100', text: 'text-amber-600', gradient: 'from-amber-400 to-orange-500', icon: '👑' },
  bronze: { bg: 'bg-amber-100', text: 'text-amber-700', gradient: 'from-amber-500 to-amber-700', icon: '🥉' },
  silver: { bg: 'bg-gray-100', text: 'text-gray-600', gradient: 'from-gray-400 to-gray-600', icon: '🥈' },
  gold: { bg: 'bg-yellow-100', text: 'text-yellow-700', gradient: 'from-yellow-400 to-amber-500', icon: '🥇' },
  platinum: { bg: 'bg-cyan-100', text: 'text-cyan-700', gradient: 'from-cyan-400 to-blue-500', icon: '💠' },
  diamond: { bg: 'bg-purple-100', text: 'text-purple-700', gradient: 'from-purple-400 to-pink-500', icon: '💎' },
};

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [gamificationData, setGamificationData] = useState<GamificationData | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.uid) loadGamificationData();
  }, [user]);

  const loadGamificationData = async () => {
    if (!user?.uid) return;
    try {
      const gamDoc = await getDoc(doc(db, 'gamification', user.uid));
      if (gamDoc.exists()) {
        const data = gamDoc.data();
        setGamificationData({
          tier: data.tier || 'new',
          points: data.points || 0,
          badges: data.badges || [],
        });
      }
    } catch (error) {
      console.log('Error loading gamification data:', error);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
      router.push('/login');
    }
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: User, title: 'Edit Profile', path: '/settings/profile', color: 'text-blue-500', bg: 'bg-blue-50' },
        { icon: Shield, title: 'Privacy & Security', path: '/settings', color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { icon: Bell, title: 'Notifications', path: '/notifications', color: 'text-amber-500', bg: 'bg-amber-50' },
      ]
    },
    {
      title: 'Activity',
      items: [
        { icon: Trophy, title: 'Leaderboard', path: '/leaderboard', color: 'text-purple-500', bg: 'bg-purple-50' },
        { icon: Clock, title: 'Service History', path: '/history', color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { icon: Heart, title: 'Favorite Providers', path: '/client/favorites', color: 'text-rose-500', bg: 'bg-rose-50' },
      ]
    },
    {
      title: 'Payments',
      items: [
        { icon: CreditCard, title: 'Payment Methods', path: '/client/payment-methods', color: 'text-teal-500', bg: 'bg-teal-50' },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, title: 'Help Center', path: '/help', color: 'text-cyan-500', bg: 'bg-cyan-50' },
        { icon: FileText, title: 'Terms & Conditions', path: '/terms', color: 'text-gray-500', bg: 'bg-gray-50' },
        { icon: Info, title: 'About Us', path: '/about', color: 'text-slate-500', bg: 'bg-slate-50' },
      ]
    },
  ];

  const tierConfig = TIER_CONFIG[gamificationData?.tier?.toLowerCase() || 'new'] || TIER_CONFIG.new;

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        {/* Premium Profile Header */}
        <div className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative max-w-2xl mx-auto px-4 py-8">
            {/* Settings Button */}
            <button
              onClick={() => router.push('/settings')}
              className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>

            {/* Profile Photo */}
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white shadow-2xl">
                  {user?.profilePhoto ? (
                    <Image src={user.profilePhoto} alt="" width={112} height={112} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center">
                      <User className="w-14 h-14 text-white" />
                    </div>
                  )}
                </div>
                {/* Tier Badge */}
                {gamificationData && (
                  <div className={`absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br ${tierConfig.gradient} rounded-xl flex items-center justify-center shadow-lg border-2 border-white`}>
                    <span className="text-lg">{tierConfig.icon}</span>
                  </div>
                )}
              </div>

              {/* Name & Email */}
              <h1 className="text-2xl font-bold text-white mb-1">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-white/80 text-sm mb-4">{user?.email}</p>

              {/* Gamification Stats */}
              {gamificationData && (
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm`}>
                    <Crown className="w-4 h-4 text-amber-300" />
                    <span className="text-white font-bold capitalize">{gamificationData.tier}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span className="text-white font-bold">{gamificationData.points.toLocaleString()} pts</span>
                  </div>
                </div>
              )}

              {/* Badges */}
              {gamificationData?.badges && gamificationData.badges.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  {gamificationData.badges.slice(0, 4).map((badge, index) => (
                    <div key={index} className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center" title={badge}>
                      <Star className="w-5 h-5 text-amber-300" />
                    </div>
                  ))}
                  {gamificationData.badges.length > 4 && (
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <span className="text-white text-sm font-bold">+{gamificationData.badges.length - 4}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Location */}
              {(user?.barangay || user?.streetAddress) && (
                <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {user?.barangay ? `Brgy. ${user.barangay}, Maasin City` : `${user?.streetAddress}, Maasin City`}
                  </span>
                </div>
              )}

              {/* Edit Profile Button */}
              <button
                onClick={() => router.push('/settings/profile')}
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-emerald-600 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                {section.title}
              </h3>
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                {section.items.map((item, index) => (
                  <button
                    key={item.title}
                    onClick={() => router.push(item.path)}
                    className={`w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
                      index !== section.items.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="flex-1 text-left text-gray-900 font-medium">{item.title}</span>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Logout Button */}
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-lg border border-red-100 hover:bg-red-50 transition-colors"
            >
              <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <span className="flex-1 text-left text-red-500 font-semibold">Logout</span>
            </button>
          </div>

          {/* Version */}
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">Version 1.0.0</p>
            <p className="text-xs text-gray-300 mt-1">Made with ❤️ in Maasin City</p>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
