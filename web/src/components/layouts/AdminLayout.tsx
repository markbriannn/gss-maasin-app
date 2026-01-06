'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  BarChart3, 
  DollarSign,
  MessageSquare,
  Settings,
  Wrench,
  Bell,
  LogOut,
  Menu,
  X,
  Map
} from 'lucide-react';
import NotificationDropdown from '@/components/NotificationDropdown';
import ToastNotification from '@/components/ToastNotification';

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  icon: any;
  label: string;
  badgeKey?: 'providers' | 'jobs';
}

const navItems: NavItem[] = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/providers', icon: Users, label: 'Providers', badgeKey: 'providers' },
  { href: '/admin/jobs', icon: Briefcase, label: 'Jobs', badgeKey: 'jobs' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/earnings', icon: DollarSign, label: 'Earnings' },
  { href: '/admin/messages', icon: MessageSquare, label: 'Messages' },
  { href: '/admin/map', icon: Map, label: 'Live Map' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeCounts, setBadgeCounts] = useState<{ providers: number; jobs: number }>({ providers: 0, jobs: 0 });
  const notificationBtnRef = useRef<HTMLButtonElement>(null);

  // Listen for pending providers and jobs counts for sidebar badges
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribers: (() => void)[] = [];
    
    // Listen to pending providers
    const providersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'PROVIDER'),
      where('providerStatus', '==', 'pending')
    );
    
    unsubscribers.push(onSnapshot(providersQuery, (snapshot) => {
      setBadgeCounts(prev => ({ ...prev, providers: snapshot.size }));
    }));
    
    // Listen to pending jobs (not yet admin approved)
    const jobsQuery = query(
      collection(db, 'bookings'),
      where('status', 'in', ['pending', 'accepted']),
      where('adminApproved', '==', false)
    );
    
    unsubscribers.push(onSnapshot(jobsQuery, (snapshot) => {
      setBadgeCounts(prev => ({ ...prev, jobs: snapshot.size }));
    }, (error) => {
      // Fallback query without adminApproved filter if index doesn't exist
      console.log('Jobs badge query error, using fallback:', error.code);
      const fallbackQuery = query(
        collection(db, 'bookings'),
        where('status', 'in', ['pending', 'accepted'])
      );
      onSnapshot(fallbackQuery, (snap) => {
        const pendingCount = snap.docs.filter(d => !d.data().adminApproved).length;
        setBadgeCounts(prev => ({ ...prev, jobs: pendingCount }));
      });
    }));
    
    return () => unsubscribers.forEach(unsub => unsub());
  }, [user?.uid]);

  // Listen for unread notifications count (from bookings and providers like mobile app)
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribers: (() => void)[] = [];
    let latestProvidersSnapshot: any = null;
    let latestJobsSnapshot: any = null;
    
    const calculateUnreadCount = () => {
      // Always get fresh read IDs from localStorage
      const stored = localStorage.getItem(`read_notifications_${user.uid}`);
      const readIds = stored ? new Set(JSON.parse(stored)) : new Set();
      
      let pendingProvidersCount = 0;
      let pendingJobsCount = 0;
      
      if (latestProvidersSnapshot) {
        latestProvidersSnapshot.forEach((docSnap: any) => {
          const notifId = `provider_${docSnap.id}`;
          if (!readIds.has(notifId)) pendingProvidersCount++;
        });
      }
      
      if (latestJobsSnapshot) {
        latestJobsSnapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          if (!data.adminApproved) {
            const notifId = `job_${docSnap.id}`;
            if (!readIds.has(notifId)) pendingJobsCount++;
          }
        });
      }
      
      setUnreadCount(pendingProvidersCount + pendingJobsCount);
    };
    
    // Listen to pending providers
    const providersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'PROVIDER'),
      where('providerStatus', '==', 'pending')
    );
    
    unsubscribers.push(onSnapshot(providersQuery, (snapshot) => {
      latestProvidersSnapshot = snapshot;
      calculateUnreadCount();
    }));
    
    // Listen to pending jobs
    const jobsQuery = query(
      collection(db, 'bookings'),
      where('status', 'in', ['pending', 'pending_negotiation'])
    );
    
    unsubscribers.push(onSnapshot(jobsQuery, (snapshot) => {
      latestJobsSnapshot = snapshot;
      calculateUnreadCount();
    }));
    
    // Listen for localStorage changes (when dropdown marks as read)
    const handleStorageChange = () => calculateUnreadCount();
    window.addEventListener('notificationsRead', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
      window.removeEventListener('notificationsRead', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.uid]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r overflow-y-auto">
          <div className="flex items-center gap-2 px-6 py-5 border-b">
            <div className="w-10 h-10 bg-[#00B14F] rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">GSS Admin</span>
              <p className="text-xs text-gray-500">Management Panel</p>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === item.href
                      ? 'bg-[#00B14F] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {badgeCount > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                      pathname === item.href 
                        ? 'bg-white text-[#00B14F]' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold">
                  {user?.firstName?.[0] || 'A'}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <button 
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#00B14F] rounded-lg flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-bold">GSS Admin</span>
              </div>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <nav className="px-4 py-4 space-y-1">
              {navItems.map((item) => {
                const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg ${
                      pathname === item.href
                        ? 'bg-[#00B14F] text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {badgeCount > 0 && (
                      <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                        pathname === item.href 
                          ? 'bg-white text-[#00B14F]' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-4">
            <button 
              className="lg:hidden p-2 text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <div className="relative">
                <button 
                  ref={notificationBtnRef}
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                <NotificationDropdown 
                  isOpen={notificationOpen}
                  onClose={() => setNotificationOpen(false)}
                  anchorRef={notificationBtnRef}
                />
              </div>
            </div>
          </div>
        </header>

        <main>{children}</main>
        
        {/* Toast Notifications */}
        <ToastNotification />
      </div>
    </div>
  );
}
