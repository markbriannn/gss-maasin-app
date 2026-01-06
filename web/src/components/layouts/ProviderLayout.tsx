'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  LayoutDashboard, 
  Briefcase, 
  MessageSquare, 
  Wallet,
  User,
  Wrench,
  Bell,
  LogOut,
  Menu,
  X,
  History,
  Settings,
  Trophy
} from 'lucide-react';
import NotificationDropdown from '@/components/NotificationDropdown';
import ToastNotification from '@/components/ToastNotification';

interface ProviderLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  icon: any;
  label: string;
  badgeKey?: 'jobs' | 'messages';
}

const navItems: NavItem[] = [
  { href: '/provider', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/provider/jobs', icon: Briefcase, label: 'Jobs', badgeKey: 'jobs' },
  { href: '/provider/messages', icon: MessageSquare, label: 'Messages', badgeKey: 'messages' },
  { href: '/provider/earnings', icon: Wallet, label: 'Earnings' },
  { href: '/provider/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/provider/profile', icon: User, label: 'Profile' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function ProviderLayout({ children }: ProviderLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeCounts, setBadgeCounts] = useState<{ jobs: number; messages: number }>({ jobs: 0, messages: 0 });
  const notificationBtnRef = useRef<HTMLButtonElement>(null);

  // Listen for badge counts (jobs and messages)
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribers: (() => void)[] = [];
    
    // Listen to pending/new jobs for this provider
    const jobsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', user.uid),
      where('status', 'in', ['pending', 'accepted'])
    );
    
    unsubscribers.push(onSnapshot(jobsQuery, (snapshot) => {
      // Count jobs that need attention (pending or recently accepted)
      const count = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'pending' || (data.status === 'accepted' && data.adminApproved);
      }).length;
      setBadgeCounts(prev => ({ ...prev, jobs: count }));
    }, (error) => {
      console.log('Jobs badge error:', error.code);
    }));
    
    // Listen to unread messages
    const messagesQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );
    
    unsubscribers.push(onSnapshot(messagesQuery, (snapshot) => {
      let unreadMessages = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const unread = data.unreadCount?.[user.uid] || 0;
        unreadMessages += unread;
      });
      setBadgeCounts(prev => ({ ...prev, messages: unreadMessages }));
    }));
    
    return () => unsubscribers.forEach(unsub => unsub());
  }, [user?.uid]);

  // Listen for unread notifications count (from bookings like mobile app)
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribers: (() => void)[] = [];
    let latestAvailableSnapshot: any = null;
    let latestMyJobsSnapshot: any = null;
    
    const calculateUnreadCount = () => {
      // Always get fresh read IDs from localStorage
      const stored = localStorage.getItem(`read_notifications_${user.uid}`);
      const readIds = stored ? new Set(JSON.parse(stored)) : new Set();
      
      let availableCount = 0;
      let myJobsCount = 0;
      
      if (latestAvailableSnapshot) {
        latestAvailableSnapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          if (data.adminApproved && !data.providerId) {
            const notifId = `available_${docSnap.id}`;
            if (!readIds.has(notifId)) availableCount++;
          }
        });
      }
      
      if (latestMyJobsSnapshot) {
        latestMyJobsSnapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          const status = data.status;
          const notifId = `myjob_${status}_${docSnap.id}`;
          const hasNotification = ['accepted', 'traveling', 'arrived', 'in_progress', 
            'pending_completion', 'pending_payment', 'payment_received', 'completed'].includes(status);
          if (hasNotification && !readIds.has(notifId)) myJobsCount++;
        });
      }
      
      setUnreadCount(availableCount + myJobsCount);
    };
    
    // Listen to available jobs
    const availableJobsQuery = query(
      collection(db, 'bookings'),
      where('status', 'in', ['pending', 'pending_negotiation'])
    );
    
    unsubscribers.push(onSnapshot(availableJobsQuery, (snapshot) => {
      latestAvailableSnapshot = snapshot;
      calculateUnreadCount();
    }));
    
    // Listen to provider's own jobs
    const myJobsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', user.uid)
    );
    
    unsubscribers.push(onSnapshot(myJobsQuery, (snapshot) => {
      latestMyJobsSnapshot = snapshot;
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
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Link href="/provider" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#00B14F] rounded-lg flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">GSS Provider</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4">
              {navItems.map((item) => {
                const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      pathname === item.href
                        ? 'text-[#00B14F] bg-[#00B14F]/10'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center px-1">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button 
                  ref={notificationBtnRef}
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
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
              
              <div className="hidden md:flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-200 rounded-full overflow-hidden">
                  {user?.profilePhoto ? (
                    <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold">
                      {user?.firstName?.[0] || 'P'}
                    </div>
                  )}
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile menu button */}
              <button 
                className="md:hidden p-2 text-gray-600"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <nav className="px-4 py-2 space-y-1">
              {navItems.map((item) => {
                const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between gap-3 px-3 py-3 rounded-lg ${
                      pathname === item.href
                        ? 'text-[#00B14F] bg-[#00B14F]/10'
                        : 'text-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {badgeCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
              <button 
                onClick={logout}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 w-full"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>{children}</main>
      
      {/* Toast Notifications */}
      <ToastNotification />
    </div>
  );
}
