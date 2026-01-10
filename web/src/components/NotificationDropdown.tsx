'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Bell,
  Calendar,
  MessageCircle,
  DollarSign,
  Star,
  Briefcase,
  AlertCircle,
  Settings,
  Car,
  MapPin,
  Wrench,
  CheckCircle,
  CreditCard,
  Trophy,
  UserPlus,
  FileText,
  Tag,
  X,
  Sparkles,
  Clock,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  icon: string;
  iconColor: string;
  jobId?: string;
  providerId?: string;
  urgent?: boolean;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}


// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; color?: string }>> = {
  'checkmark-circle': CheckCircle,
  car: Car,
  location: MapPin,
  construct: Wrench,
  'checkmark-done': CheckCircle,
  card: CreditCard,
  cash: DollarSign,
  trophy: Trophy,
  'person-add': UserPlus,
  'document-text': FileText,
  briefcase: Briefcase,
  pricetag: Tag,
  'close-circle': AlertCircle,
  clock: Clock,
  chatbubble: MessageCircle,
  notifications: Bell,
  default: Bell,
};

// Role-specific color schemes
const roleColors = {
  ADMIN: {
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    lightGradient: 'from-violet-500/20 to-purple-500/20',
    accent: '#8B5CF6',
    accentLight: 'rgba(139, 92, 246, 0.15)',
    badge: 'bg-violet-500',
    tabActive: 'bg-violet-500/20 text-violet-400',
    tabHover: 'hover:bg-violet-500/10',
    button: 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700',
    ring: 'ring-violet-500/30',
  },
  PROVIDER: {
    gradient: 'from-blue-600 via-indigo-600 to-purple-700',
    lightGradient: 'from-blue-500/20 to-indigo-500/20',
    accent: '#3B82F6',
    accentLight: 'rgba(59, 130, 246, 0.15)',
    badge: 'bg-blue-500',
    tabActive: 'bg-blue-500/20 text-blue-400',
    tabHover: 'hover:bg-blue-500/10',
    button: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
    ring: 'ring-blue-500/30',
  },
  CLIENT: {
    gradient: 'from-emerald-600 via-green-600 to-teal-700',
    lightGradient: 'from-emerald-500/20 to-teal-500/20',
    accent: '#10B981',
    accentLight: 'rgba(16, 185, 129, 0.15)',
    badge: 'bg-emerald-500',
    tabActive: 'bg-emerald-500/20 text-emerald-400',
    tabHover: 'hover:bg-emerald-500/10',
    button: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
    ring: 'ring-emerald-500/30',
  },
};


export default function NotificationDropdown({
  isOpen,
  onClose,
  anchorRef,
}: NotificationDropdownProps) {
  const { user } = useAuth();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const role = (user?.role?.toUpperCase() || 'CLIENT') as keyof typeof roleColors;
  const colors = roleColors[role] || roleColors.CLIENT;

  // Load read notification IDs from localStorage
  useEffect(() => {
    if (user?.uid) {
      const stored = localStorage.getItem(`read_notifications_${user.uid}`);
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    }
  }, [user?.uid]);

  // Save read IDs to localStorage and notify other components
  const saveReadIds = (ids: Set<string>) => {
    if (user?.uid) {
      localStorage.setItem(`read_notifications_${user.uid}`, JSON.stringify([...ids]));
      // Dispatch custom event to notify layout components to update badge count
      window.dispatchEvent(new CustomEvent('notificationsRead'));
    }
  };

  const formatTime = (timestamp: Date | { toDate: () => Date } | null) => {
    if (!timestamp) return 'Just now';
    const date = typeof timestamp === 'object' && 'toDate' in timestamp 
      ? timestamp.toDate() 
      : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };


  // Generate notifications from bookings (like mobile app)
  const generateNotifications = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const notificationsList: Notification[] = [];
      const userRole = user.role?.toUpperCase() || 'CLIENT';

      if (userRole === 'ADMIN') {
        // Admin: pending providers
        const pendingProvidersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'PROVIDER'),
          where('providerStatus', '==', 'pending')
        );
        const pendingProvidersSnapshot = await getDocs(pendingProvidersQuery);
        pendingProvidersSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const notifId = `provider_${docSnap.id}`;
          notificationsList.push({
            id: notifId,
            type: 'provider_approval',
            icon: 'person-add',
            iconColor: '#F59E0B',
            title: 'New Provider Registration',
            message: `${data.firstName || ''} ${data.lastName || ''} applied as ${data.serviceCategory || 'Service Provider'}`,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            read: readIds.has(notifId),
            providerId: docSnap.id,
          });
        });

        // Admin: pending jobs
        const pendingJobsQuery = query(
          collection(db, 'bookings'),
          where('status', 'in', ['pending', 'pending_negotiation'])
        );
        const pendingJobsSnapshot = await getDocs(pendingJobsQuery);
        pendingJobsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.adminApproved) {
            const notifId = `job_${docSnap.id}`;
            notificationsList.push({
              id: notifId,
              type: 'job_pending',
              icon: data.isNegotiable ? 'pricetag' : 'document-text',
              iconColor: data.isNegotiable ? '#8B5CF6' : '#3B82F6',
              title: data.isNegotiable ? 'Job Request with Offer' : 'New Job Request',
              message: data.isNegotiable 
                ? `${data.serviceCategory || 'Service'} - Client offers ₱${(data.offeredPrice || 0).toLocaleString()}`
                : `${data.serviceCategory || 'Service'} - ${data.title || data.description || 'No description'}`,
              createdAt: data.createdAt?.toDate?.() || new Date(),
              read: readIds.has(notifId),
              jobId: docSnap.id,
            });
          }
        });
      } else if (userRole === 'PROVIDER') {
        // Provider: available jobs
        const availableJobsQuery = query(
          collection(db, 'bookings'),
          where('status', 'in', ['pending', 'pending_negotiation'])
        );
        const availableJobsSnapshot = await getDocs(availableJobsQuery);
        availableJobsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.adminApproved && !data.providerId) {
            const notifId = `available_${docSnap.id}`;
            notificationsList.push({
              id: notifId,
              type: 'job_request',
              icon: data.isNegotiable ? 'pricetag' : 'briefcase',
              iconColor: data.isNegotiable ? '#F59E0B' : '#3B82F6',
              title: data.isNegotiable ? 'New Job with Offer' : 'New Job Available',
              message: data.isNegotiable 
                ? `Client offers ₱${(data.offeredPrice || 0).toLocaleString()} for ${data.serviceCategory || 'service'}`
                : `${data.clientName || 'Client'} needs ${data.serviceCategory || 'service'}`,
              createdAt: data.approvedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
              read: readIds.has(notifId),
              jobId: docSnap.id,
            });
          }
        });

        // Provider: my assigned jobs
        const myJobsQuery = query(
          collection(db, 'bookings'),
          where('providerId', '==', user.uid)
        );
        const myJobsSnapshot = await getDocs(myJobsQuery);
        myJobsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const status = data.status;
          const notifId = `myjob_${status}_${docSnap.id}`;
          
          const statusConfig: Record<string, { icon: string; iconColor: string; title: string; message: string }> = {
            'accepted': { icon: 'checkmark-circle', iconColor: '#10B981', title: 'Job Accepted', message: `You accepted ${data.serviceCategory || 'service'} from ${data.clientName || 'Client'}` },
            'traveling': { icon: 'car', iconColor: '#3B82F6', title: 'On The Way', message: `Traveling to ${data.clientName || 'client'}'s location` },
            'arrived': { icon: 'location', iconColor: '#10B981', title: 'Arrived', message: `You arrived at ${data.clientName || 'client'}'s location` },
            'in_progress': { icon: 'construct', iconColor: '#8B5CF6', title: 'Work In Progress', message: `Working on ${data.serviceCategory || 'service'}` },
            'pending_completion': { icon: 'checkmark-done', iconColor: '#F59E0B', title: 'Awaiting Confirmation', message: `Waiting for ${data.clientName || 'client'} to confirm completion` },
            'pending_payment': { icon: 'card', iconColor: '#3B82F6', title: 'Awaiting Payment', message: `Waiting for payment from ${data.clientName || 'client'}` },
            'payment_received': { icon: 'cash', iconColor: '#10B981', title: 'Payment Received!', message: `₱${(data.providerPrice || data.totalAmount || 0).toLocaleString()} received for ${data.serviceCategory || 'service'}` },
            'completed': { icon: 'trophy', iconColor: '#10B981', title: 'Job Completed!', message: `${data.serviceCategory || 'Service'} completed successfully` },
            'cancelled': { icon: 'close-circle', iconColor: '#EF4444', title: 'Job Cancelled', message: `${data.clientName || 'Client'} cancelled the ${data.serviceCategory || 'service'} job` },
          };
          
          const config = statusConfig[status];
          if (config) {
            notificationsList.push({
              id: notifId,
              type: 'my_job',
              icon: config.icon,
              iconColor: config.iconColor,
              title: config.title,
              message: config.message,
              createdAt: data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
              read: readIds.has(notifId),
              jobId: docSnap.id,
            });
          }
        });
      } else {
        // Client: booking updates
        const myBookingsQuery = query(
          collection(db, 'bookings'),
          where('clientId', '==', user.uid)
        );
        const myBookingsSnapshot = await getDocs(myBookingsQuery);
        myBookingsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const status = data.status;
          const notifId = `${status}_${docSnap.id}`;
          
          const statusConfig: Record<string, { icon: string; iconColor: string; title: string; message: string; urgent?: boolean }> = {
            'pending': { icon: 'clock', iconColor: '#F59E0B', title: 'Booking Pending', message: `Your ${data.serviceCategory || 'service'} request is pending approval` },
            'accepted': { icon: 'checkmark-circle', iconColor: '#10B981', title: 'Job Accepted', message: `Your ${data.serviceCategory || 'service'} request has been accepted` },
            'traveling': { icon: 'car', iconColor: '#3B82F6', title: 'Provider On The Way', message: `Provider is traveling to your location` },
            'arrived': { icon: 'location', iconColor: '#10B981', title: 'Provider Arrived', message: `Provider has arrived at your location` },
            'in_progress': { icon: 'construct', iconColor: '#8B5CF6', title: 'Work In Progress', message: `Your ${data.serviceCategory || 'service'} is being worked on` },
            'pending_completion': { icon: 'checkmark-done', iconColor: '#F59E0B', title: 'Work Complete - Confirm', message: `Provider marked work as complete. Please confirm.` },
            'pending_payment': { icon: 'card', iconColor: '#3B82F6', title: 'Payment Required', message: `Please complete payment for your ${data.serviceCategory || 'service'}` },
            'payment_received': { icon: 'cash', iconColor: '#10B981', title: 'Payment Sent', message: `Your payment is being processed` },
            'counter_offer': { icon: 'pricetag', iconColor: '#EC4899', title: 'Counter Offer Received!', message: `Provider offers ₱${(data.counterOfferPrice || 0).toLocaleString()} - Tap to respond`, urgent: true },
            'completed': { icon: 'checkmark-circle', iconColor: '#10B981', title: 'Job Completed', message: `Your ${data.serviceCategory || 'service'} has been completed` },
            'cancelled': { icon: 'close-circle', iconColor: '#EF4444', title: 'Job Cancelled', message: `Your ${data.serviceCategory || 'service'} request was cancelled` },
            'rejected': { icon: 'close-circle', iconColor: '#EF4444', title: 'Job Rejected', message: `Your ${data.serviceCategory || 'service'} request was rejected` },
          };
          
          const config = statusConfig[status];
          if (config) {
            notificationsList.push({
              id: notifId,
              type: status === 'counter_offer' ? 'counter_offer' : 'job',
              icon: config.icon,
              iconColor: config.iconColor,
              title: config.title,
              message: config.message,
              createdAt: data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
              read: readIds.has(notifId),
              jobId: docSnap.id,
              urgent: config.urgent,
            });
          }
        });
      }

      // Also fetch from notifications collection for custom notifications
      try {
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('targetUserId', '==', user.uid)
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        
        const notificationsQuery2 = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid)
        );
        const notificationsSnapshot2 = await getDocs(notificationsQuery2);
        
        const processedIds = new Set<string>();
        const processNotification = (docSnap: any) => {
          const data = docSnap.data();
          const notifId = docSnap.id;
          
          if (processedIds.has(notifId)) return;
          processedIds.add(notifId);
          
          const typeConfig: Record<string, { icon: string; iconColor: string }> = {
            'booking_cancelled': { icon: 'close-circle', iconColor: '#EF4444' },
            'job_cancelled': { icon: 'close-circle', iconColor: '#EF4444' },
            'job_accepted': { icon: 'checkmark-circle', iconColor: '#10B981' },
            'job_completed': { icon: 'trophy', iconColor: '#10B981' },
            'new_message': { icon: 'chatbubble', iconColor: '#3B82F6' },
            'payment_received': { icon: 'cash', iconColor: '#10B981' },
            'job_approved': { icon: 'checkmark-circle', iconColor: '#10B981' },
            'job_rejected': { icon: 'close-circle', iconColor: '#EF4444' },
            'provider_traveling': { icon: 'car', iconColor: '#3B82F6' },
            'provider_arrived': { icon: 'location', iconColor: '#10B981' },
            'job_started': { icon: 'construct', iconColor: '#8B5CF6' },
            'work_completed': { icon: 'checkmark-done', iconColor: '#F59E0B' },
          };
          
          const config = typeConfig[data.type] || { icon: 'notifications', iconColor: '#6B7280' };
          
          notificationsList.push({
            id: notifId,
            type: data.type || 'notification',
            icon: config.icon,
            iconColor: config.iconColor,
            title: data.title || 'Notification',
            message: data.message || '',
            createdAt: data.createdAt?.toDate?.() || new Date(),
            read: data.read || readIds.has(notifId),
            jobId: data.bookingId || data.jobId,
          });
        };
        
        notificationsSnapshot.forEach(processNotification);
        notificationsSnapshot2.forEach(processNotification);
      } catch (e) {
        console.log('Notifications collection query error:', e);
      }

      // Sort by date (newest first)
      notificationsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error generating notifications:', error);
    } finally {
      setLoading(false);
    }
  };


  // Set up real-time listeners
  useEffect(() => {
    if (!user?.uid || !isOpen) return;

    const userRole = user.role?.toUpperCase() || 'CLIENT';
    const unsubscribers: (() => void)[] = [];

    // Initial load
    generateNotifications();

    // Listen to notifications collection for this user (real-time updates)
    const notificationsQuery1 = query(
      collection(db, 'notifications'),
      where('targetUserId', '==', user.uid)
    );
    unsubscribers.push(onSnapshot(notificationsQuery1, () => generateNotifications()));

    const notificationsQuery2 = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );
    unsubscribers.push(onSnapshot(notificationsQuery2, () => generateNotifications()));

    // Set up listeners based on role
    if (userRole === 'ADMIN') {
      const providersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'PROVIDER'),
        where('providerStatus', '==', 'pending')
      );
      unsubscribers.push(onSnapshot(providersQuery, () => generateNotifications()));

      const jobsQuery = query(
        collection(db, 'bookings'),
        where('status', 'in', ['pending', 'pending_negotiation'])
      );
      unsubscribers.push(onSnapshot(jobsQuery, () => generateNotifications()));
    } else if (userRole === 'PROVIDER') {
      const availableJobsQuery = query(
        collection(db, 'bookings'),
        where('status', 'in', ['pending', 'pending_negotiation'])
      );
      unsubscribers.push(onSnapshot(availableJobsQuery, () => generateNotifications()));

      const myJobsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', user.uid)
      );
      unsubscribers.push(onSnapshot(myJobsQuery, () => generateNotifications()));
    } else {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('clientId', '==', user.uid)
      );
      unsubscribers.push(onSnapshot(bookingsQuery, () => generateNotifications()));
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user?.uid, user?.role, isOpen, readIds]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  const markAsRead = (notificationId: string) => {
    const newReadIds = new Set(readIds);
    newReadIds.add(notificationId);
    setReadIds(newReadIds);
    saveReadIds(newReadIds);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    const newReadIds = new Set(readIds);
    notifications.forEach(n => newReadIds.add(n.id));
    setReadIds(newReadIds);
    saveReadIds(newReadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    onClose();

    const userRole = user?.role?.toUpperCase();
    
    if (notification.type === 'provider_approval' && notification.providerId) {
      router.push(`/admin/providers/${notification.providerId}`);
    } else if (notification.jobId) {
      if (userRole === 'ADMIN') {
        router.push(`/admin/jobs/${notification.jobId}`);
      } else if (userRole === 'PROVIDER') {
        router.push(`/provider/jobs/${notification.jobId}`);
      } else {
        router.push(`/client/bookings/${notification.jobId}`);
      }
    }
  };


  const groupNotifications = (notifs: Notification[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);

    const groups: { label: string; items: Notification[]; icon: React.ComponentType<{ className?: string }> }[] = [
      { label: 'New', items: [], icon: Sparkles },
      { label: 'Today', items: [], icon: Clock },
      { label: 'Yesterday', items: [], icon: Calendar },
      { label: 'Earlier', items: [], icon: FileText },
    ];

    notifs.forEach((n) => {
      const nDate = new Date(n.createdAt);
      if (!n.read && nDate >= today) {
        groups[0].items.push(n);
      } else if (nDate >= today) {
        groups[1].items.push(n);
      } else if (nDate >= yesterday) {
        groups[2].items.push(n);
      } else {
        groups[3].items.push(n);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  };

  const filteredNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const groupedNotifications = groupNotifications(filteredNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!isOpen) return null;

  const roleLabel = role === 'ADMIN' ? 'Admin' : role === 'PROVIDER' ? 'Provider' : 'Client';


  return (
    <div
      ref={dropdownRef}
      className={`absolute right-0 top-full mt-2 w-[400px] max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden z-[100] border border-gray-200 ring-1 ${colors.ring}`}
      style={{
        animation: 'slideDown 0.2s ease-out',
      }}
    >
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>

      {/* Premium Gradient Header */}
      <div className={`bg-gradient-to-r ${colors.gradient} text-white p-4`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Notifications</h2>
              <p className="text-white/70 text-xs">{roleLabel} Updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium backdrop-blur-sm transition-all"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-white/70 text-xs">Unread</p>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.length}</p>
                <p className="text-white/70 text-xs">Total</p>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Tabs */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'all'
                ? colors.tabActive
                : `text-gray-500 ${colors.tabHover}`
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'unread'
                ? colors.tabActive
                : `text-gray-500 ${colors.tabHover}`
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className={`${colors.badge} text-white text-xs px-2 py-0.5 rounded-full`}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto max-h-[calc(85vh-220px)]">
        {loading ? (
          <div className="p-8 text-center">
            <div className={`w-10 h-10 border-3 border-t-transparent rounded-full animate-spin mx-auto mb-3`} style={{ borderColor: colors.accent, borderTopColor: 'transparent' }}></div>
            <p className="text-gray-500 text-sm">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className={`w-16 h-16 bg-gradient-to-br ${colors.lightGradient} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              <Bell className="w-8 h-8" style={{ color: colors.accent }} />
            </div>
            <p className="text-gray-900 font-medium">
              {activeTab === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {activeTab === 'unread' ? 'You\'ve read all your notifications' : 'New updates will appear here'}
            </p>
          </div>
        ) : (
          groupedNotifications.map((group) => (
            <div key={group.label}>
              {/* Group Header */}
              <div className="px-4 py-2 bg-gray-50 border-y border-gray-100 flex items-center gap-2">
                <group.icon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 font-semibold text-xs uppercase tracking-wide">{group.label}</span>
                <span className="text-gray-400 text-xs">({group.items.length})</span>
              </div>
              
              {/* Notification Items */}
              {group.items.map((notification) => {
                const IconComponent = ICON_MAP[notification.icon] || ICON_MAP.default;
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 flex gap-3 cursor-pointer transition-all duration-200 border-b border-gray-50 ${
                      !notification.read 
                        ? `bg-gradient-to-r ${colors.lightGradient} hover:brightness-95` 
                        : 'hover:bg-gray-50'
                    } ${notification.urgent ? 'animate-pulse' : ''}`}
                  >
                    {/* Icon with glow effect */}
                    <div className="relative flex-shrink-0">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ 
                          backgroundColor: `${notification.iconColor}15`,
                          boxShadow: !notification.read ? `0 0 20px ${notification.iconColor}30` : 'none'
                        }}
                      >
                        <IconComponent 
                          className="w-6 h-6" 
                          color={notification.iconColor}
                        />
                      </div>
                      {notification.urgent && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">
                        <span className="font-semibold text-gray-900">
                          {notification.title}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <p className={`text-xs ${!notification.read ? 'font-medium' : ''}`} style={{ color: !notification.read ? colors.accent : '#9CA3AF' }}>
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Unread indicator & Arrow */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && (
                        <div 
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ 
                            backgroundColor: colors.accent,
                            boxShadow: `0 0 8px ${colors.accent}`
                          }}
                        />
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>


      {/* Premium Footer */}
      <div className="border-t border-gray-100 p-3 bg-gray-50/50">
        <button
          onClick={() => {
            onClose();
            router.push('/notifications');
          }}
          className={`w-full py-2.5 ${colors.button} text-white font-medium text-sm rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2`}
        >
          <Bell className="w-4 h-4" />
          View All Notifications
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
