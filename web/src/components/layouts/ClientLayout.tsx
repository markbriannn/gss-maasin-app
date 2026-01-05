'use client';

import { ReactNode, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Home, 
  Calendar, 
  MessageSquare, 
  User, 
  Wrench,
  Bell,
  LogOut,
  Menu,
  X,
  Heart,
  Trophy
} from 'lucide-react';
import NotificationDropdown from '@/components/NotificationDropdown';

interface ClientLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  icon: any;
  label: string;
  badgeKey?: 'bookings' | 'messages';
}

const navItems: NavItem[] = [
  { href: '/client', icon: Home, label: 'Home' },
  { href: '/client/bookings', icon: Calendar, label: 'Bookings', badgeKey: 'bookings' },
  { href: '/client/favorites', icon: Heart, label: 'Favorites' },
  { href: '/client/messages', icon: MessageSquare, label: 'Messages', badgeKey: 'messages' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/client/profile', icon: User, label: 'Profile' },
];

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeCounts, setBadgeCounts] = useState<{ bookings: number; messages: number }>({ bookings: 0, messages: 0 });
  const notificationBtnRef = useRef<HTMLButtonElement>(null);

  // Listen for badge counts (bookings and messages)
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribers: (() => void)[] = [];
    
    // Listen to active bookings for this client
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clientId', '==', user.uid),
      where('status', 'in', ['pending', 'accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion'])
    );
    
    unsubscribers.push(onSnapshot(bookingsQuery, (snapshot) => {
      setBadgeCounts(prev => ({ ...prev, bookings: snapshot.size }));
    }, (error) => {
      // Fallback without compound index
      console.log('Bookings badge error, using fallback:', error.code);
      const fallbackQuery = query(
        collection(db, 'bookings'),
        where('clientId', '==', user.uid)
      );
      onSnapshot(fallbackQuery, (snap) => {
        const activeStatuses = ['pending', 'accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion'];
        const count = snap.docs.filter(d => activeStatuses.includes(d.data().status)).length;
        setBadgeCounts(prev => ({ ...prev, bookings: count }));
      });
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
    
    // Function to calculate unread count
    const calculateUnreadCount = (snapshot: any) => {
      // Always get fresh read IDs from localStorage
      const stored = localStorage.getItem(`read_notifications_${user.uid}`);
      const readIds = stored ? new Set(JSON.parse(stored)) : new Set();
      
      let count = 0;
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        const status = data.status;
        const notifId = `${status}_${docSnap.id}`;
        
        // Count as unread if status has a notification and not in readIds
        const hasNotification = ['accepted', 'traveling', 'arrived', 'in_progress', 
          'pending_completion', 'pending_payment', 'payment_received', 'counter_offer', 'completed'].includes(status);
        
        if (hasNotification && !readIds.has(notifId)) {
          count++;
        }
      });
      setUnreadCount(count);
    };
    
    // Listen to client's bookings
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clientId', '==', user.uid)
    );
    
    let latestSnapshot: any = null;
    
    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      latestSnapshot = snapshot;
      calculateUnreadCount(snapshot);
    }, (error) => {
      console.log('Unread count error:', error);
    });
    
    // Listen for localStorage changes (when dropdown marks as read)
    const handleStorageChange = () => {
      if (latestSnapshot) {
        calculateUnreadCount(latestSnapshot);
      }
    };
    
    // Custom event for same-tab localStorage updates
    window.addEventListener('notificationsRead', handleStorageChange);
    // Standard storage event for cross-tab updates
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      unsubscribe();
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
              <Link href="/client" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#00B14F] rounded-lg flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">GSS Maasin</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
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
                    <span className="font-medium">{item.label}</span>
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
                      {user?.firstName?.[0] || 'U'}
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
    </div>
  );
}
