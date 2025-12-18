'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import {
  ArrowLeft, Bell, CheckCircle, Car, MapPin, Wrench, CreditCard, DollarSign, Trophy, Tag, Briefcase,
  UserPlus, FileText, CheckCheck, Sparkles, Filter, Clock
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  icon: string;
  iconColor: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  jobId?: string;
  providerId?: string;
  urgent?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  'checkmark-circle': CheckCircle, 'car': Car, 'location': MapPin, 'construct': Wrench,
  'checkmark-done': CheckCircle, 'card': CreditCard, 'cash': DollarSign, 'trophy': Trophy,
  'pricetag': Tag, 'briefcase': Briefcase, 'person-add': UserPlus, 'document-text': FileText,
};

// Role-based gradient configs
const ROLE_THEMES = {
  CLIENT: { gradient: 'from-emerald-500 via-green-500 to-teal-500', accent: 'emerald', light: 'emerald-50' },
  PROVIDER: { gradient: 'from-blue-500 via-indigo-500 to-purple-500', accent: 'blue', light: 'blue-50' },
  ADMIN: { gradient: 'from-purple-500 via-violet-500 to-indigo-500', accent: 'purple', light: 'purple-50' },
};

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const normalizedRole = (user?.role?.toUpperCase() || 'CLIENT') as keyof typeof ROLE_THEMES;
  const theme = ROLE_THEMES[normalizedRole] || ROLE_THEMES.CLIENT;

  useEffect(() => {
    if (user?.uid) {
      const stored = localStorage.getItem(`read_notifications_${user.uid}`);
      if (stored) setReadIds(new Set(JSON.parse(stored)));
    }
  }, [user?.uid]);

  const formatTime = (timestamp: unknown) => {
    if (!timestamp) return 'Just now';
    const date = (timestamp as { toDate?: () => Date }).toDate ? (timestamp as { toDate: () => Date }).toDate() : new Date(timestamp as string);
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

  const generateNotifications = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const notificationsList: Notification[] = [];
      const currentReadIds = readIds;

      if (normalizedRole === 'ADMIN') {
        const pendingProvidersQuery = query(collection(db, 'users'), where('role', '==', 'PROVIDER'), where('providerStatus', '==', 'pending'));
        const pendingProvidersSnapshot = await getDocs(pendingProvidersQuery);
        pendingProvidersSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const notifId = `provider_${docSnap.id}`;
          notificationsList.push({
            id: notifId, type: 'provider_approval', icon: 'person-add', iconColor: '#F59E0B',
            title: 'New Provider Registration',
            message: `${data.firstName || ''} ${data.lastName || ''} applied as ${data.serviceCategory || 'Service Provider'}`,
            time: formatTime(data.createdAt), read: currentReadIds.has(notifId), providerId: docSnap.id,
          });
        });

        const pendingJobsQuery = query(collection(db, 'bookings'), where('status', 'in', ['pending', 'pending_negotiation']));
        const pendingJobsSnapshot = await getDocs(pendingJobsQuery);
        pendingJobsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.adminApproved) {
            const notifId = `job_${docSnap.id}`;
            notificationsList.push({
              id: notifId, type: 'job_pending', icon: 'document-text', iconColor: data.isNegotiable ? '#8B5CF6' : '#3B82F6',
              title: data.isNegotiable ? 'Job Request with Offer' : 'New Job Request',
              message: data.isNegotiable ? `${data.serviceCategory || 'Service'} - Client offers ₱${(data.offeredPrice || 0).toLocaleString()}` : `${data.serviceCategory || 'Service'} - ${data.title || data.description || 'No description'}`,
              time: formatTime(data.createdAt), read: currentReadIds.has(notifId), jobId: docSnap.id,
            });
          }
        });
      } else if (normalizedRole === 'PROVIDER') {
        const availableJobsQuery = query(collection(db, 'bookings'), where('status', 'in', ['pending', 'pending_negotiation']));
        const availableJobsSnapshot = await getDocs(availableJobsQuery);
        availableJobsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.adminApproved && !data.providerId) {
            const notifId = `available_${docSnap.id}`;
            notificationsList.push({
              id: notifId, type: 'job_request', icon: data.isNegotiable ? 'pricetag' : 'briefcase', iconColor: data.isNegotiable ? '#F59E0B' : '#3B82F6',
              title: data.isNegotiable ? 'New Job with Offer' : 'New Job Available',
              message: data.isNegotiable ? `Client offers ₱${(data.offeredPrice || 0).toLocaleString()} for ${data.serviceCategory || 'service'}` : `${data.clientName || 'Client'} needs ${data.serviceCategory || 'service'}`,
              time: formatTime(data.createdAt), read: currentReadIds.has(notifId), jobId: docSnap.id,
            });
          }
        });

        const myJobsQuery = query(collection(db, 'bookings'), where('providerId', '==', user.uid));
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
          };
          const config = statusConfig[status];
          if (config) notificationsList.push({ id: notifId, type: 'my_job', ...config, time: formatTime(data.updatedAt || data.createdAt), read: currentReadIds.has(notifId), jobId: docSnap.id });
        });
      } else {
        const myBookingsQuery = query(collection(db, 'bookings'), where('clientId', '==', user.uid));
        const myBookingsSnapshot = await getDocs(myBookingsQuery);
        myBookingsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const status = data.status;
          const notifId = `${status}_${docSnap.id}`;
          const statusConfig: Record<string, { icon: string; iconColor: string; title: string; message: string; urgent?: boolean }> = {
            'accepted': { icon: 'checkmark-circle', iconColor: '#10B981', title: 'Job Accepted', message: `Your ${data.serviceCategory || 'service'} request has been accepted` },
            'traveling': { icon: 'car', iconColor: '#3B82F6', title: 'Provider On The Way', message: `Provider is traveling to your location` },
            'arrived': { icon: 'location', iconColor: '#10B981', title: 'Provider Arrived', message: `Provider has arrived at your location` },
            'in_progress': { icon: 'construct', iconColor: '#8B5CF6', title: 'Work In Progress', message: `Your ${data.serviceCategory || 'service'} is being worked on` },
            'pending_completion': { icon: 'checkmark-done', iconColor: '#F59E0B', title: 'Work Complete - Confirm', message: `Provider marked work as complete. Please confirm.` },
            'pending_payment': { icon: 'card', iconColor: '#3B82F6', title: 'Payment Required', message: `Please complete payment for your ${data.serviceCategory || 'service'}` },
            'payment_received': { icon: 'cash', iconColor: '#10B981', title: 'Payment Sent', message: `Your payment is being processed` },
            'counter_offer': { icon: 'pricetag', iconColor: '#EC4899', title: 'Counter Offer Received!', message: `Provider offers ₱${(data.counterOfferPrice || 0).toLocaleString()} - Tap to respond`, urgent: true },
            'completed': { icon: 'checkmark-circle', iconColor: '#10B981', title: 'Job Completed', message: `Your ${data.serviceCategory || 'service'} has been completed` },
          };
          const config = statusConfig[status];
          if (config) notificationsList.push({ id: notifId, type: status === 'counter_offer' ? 'counter_offer' : 'job', ...config, time: formatTime(data.updatedAt || data.createdAt), read: currentReadIds.has(notifId), jobId: docSnap.id });
        });
      }

      notificationsList.sort((a, b) => { if (a.urgent && !b.urgent) return -1; if (!a.urgent && b.urgent) return 1; return 0; });
      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error generating notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, normalizedRole, readIds]);

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);
  useEffect(() => { if (user?.uid) generateNotifications(); }, [user?.uid, generateNotifications]);

  const markAsRead = (notificationId: string) => {
    const newReadIds = new Set(readIds);
    newReadIds.add(notificationId);
    setReadIds(newReadIds);
    localStorage.setItem(`read_notifications_${user?.uid}`, JSON.stringify([...newReadIds]));
    setNotifications(prev => prev.map(notif => notif.id === notificationId ? { ...notif, read: true } : notif));
  };

  const markAllAsRead = () => {
    const allIds = new Set(readIds);
    notifications.forEach(n => allIds.add(n.id));
    setReadIds(allIds);
    localStorage.setItem(`read_notifications_${user?.uid}`, JSON.stringify([...allIds]));
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.jobId) {
      if (normalizedRole === 'PROVIDER') router.push(`/provider/jobs/${notification.jobId}`);
      else if (normalizedRole === 'ADMIN') router.push(`/admin/jobs/${notification.jobId}`);
      else router.push(`/client/bookings/${notification.jobId}`);
    } else if (notification.providerId && normalizedRole === 'ADMIN') {
      router.push(`/admin/providers/${notification.providerId}`);
    }
  };

  const getDashboardUrl = () => {
    if (normalizedRole === 'ADMIN') return '/admin';
    if (normalizedRole === 'PROVIDER') return '/provider';
    return '/client';
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayedNotifications = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      {/* Premium Header */}
      <div className={`bg-gradient-to-r ${theme.gradient}`}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href={getDashboardUrl()} className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                <ArrowLeft className="w-5 h-5 text-white" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Notifications</h1>
                <p className="text-white/80 text-sm">Stay updated on your activity</p>
              </div>
            </div>
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Bell className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-white/80" />
                <span className="text-2xl font-bold text-white">{notifications.length}</span>
              </div>
              <p className="text-xs text-white/70">Total</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-white/80" />
                <span className="text-2xl font-bold text-white">{unreadCount}</span>
              </div>
              <p className="text-xs text-white/70">Unread</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-4">
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-1.5 flex mb-4">
          <button onClick={() => setFilter('all')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${filter === 'all' ? `bg-gradient-to-r ${theme.gradient} text-white shadow-md` : 'text-gray-500 hover:text-gray-700'}`}>
            <Filter className="w-4 h-4" /> All ({notifications.length})
          </button>
          <button onClick={() => setFilter('unread')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${filter === 'unread' ? `bg-gradient-to-r ${theme.gradient} text-white shadow-md` : 'text-gray-500 hover:text-gray-700'}`}>
            <Sparkles className="w-4 h-4" /> Unread ({unreadCount})
          </button>
        </div>

        {/* Mark All Read */}
        {unreadCount > 0 && (
          <div className="flex justify-end mb-3">
            <button onClick={markAllAsRead} className={`text-sm font-semibold text-${theme.accent}-600 hover:text-${theme.accent}-700 flex items-center gap-1`}>
              <CheckCheck className="w-4 h-4" /> Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        {displayedNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
            <div className={`w-24 h-24 bg-gradient-to-br from-${theme.light} to-gray-100 rounded-full flex items-center justify-center mx-auto mb-6`}>
              <Bell className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {filter === 'unread' ? 'All caught up!' : 'No notifications'}
            </h3>
            <p className="text-gray-500">
              {filter === 'unread' ? 'You have no unread notifications' : 'Your notifications will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-6">
            {displayedNotifications.map((notification) => {
              const IconComponent = ICON_MAP[notification.icon] || Bell;
              return (
                <div key={notification.id} onClick={() => handleNotificationClick(notification)}
                  className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden border ${
                    notification.urgent ? 'border-pink-200 bg-gradient-to-r from-pink-50 to-white' :
                    !notification.read ? `border-${theme.accent}-200 bg-gradient-to-r from-${theme.light}/50 to-white` : 'border-gray-100'
                  }`}>
                  <div className="p-4 flex gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${notification.iconColor}15` }}>
                        <IconComponent className="w-6 h-6" style={{ color: notification.iconColor }} />
                      </div>
                      {!notification.read && (
                        <div className={`absolute -top-1 -right-1 w-3 h-3 bg-${theme.accent}-500 rounded-full border-2 border-white`}></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </p>
                        {notification.urgent && (
                          <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-[10px] font-bold rounded-full">URGENT</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{notification.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
