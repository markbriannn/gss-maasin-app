'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Bell, MessageSquare, Briefcase, CheckCircle, 
  Star, CreditCard, X, MapPin, Truck, Play
} from 'lucide-react';

interface Toast {
  id: string;
  type: 'booking' | 'message' | 'job' | 'payment' | 'review' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  link?: string;
  icon?: React.ReactNode;
  color?: string;
}

export default function ToastNotification() {
  const { user } = useAuth();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const shownToastIds = useRef(new Set<string>());

  const addToast = useCallback((toastData: Omit<Toast, 'id'>, uniqueKey?: string) => {
    if (uniqueKey && shownToastIds.current.has(uniqueKey)) return;
    if (uniqueKey) {
      shownToastIds.current.add(uniqueKey);
      setTimeout(() => shownToastIds.current.delete(uniqueKey), 60000);
    }

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { ...toastData, id }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleToastClick = (toast: Toast) => {
    if (toast.link) router.push(toast.link);
    removeToast(toast.id);
  };

  // Listen for new notifications
  useEffect(() => {
    if (!user?.uid) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(10)
    );

    let isFirstLoad = true;
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      if (isFirstLoad) { isFirstLoad = false; return; }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdAt = data.createdAt?.toDate() || new Date();
          
          if (new Date().getTime() - createdAt.getTime() < 30000) {
            const toastData = getToastFromNotification(data);
            if (toastData) addToast(toastData, `notif_${change.doc.id}`);
          }
        }
      });
    }, () => {
      const fallbackQuery = query(
        collection(db, 'notifications'),
        where('targetUserId', '==', user.uid),
        limit(10)
      );
      
      let fallbackFirstLoad = true;
      onSnapshot(fallbackQuery, (snapshot) => {
        if (fallbackFirstLoad) { fallbackFirstLoad = false; return; }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const createdAt = data.createdAt?.toDate() || new Date();
            
            if (new Date().getTime() - createdAt.getTime() < 30000) {
              const toastData = getToastFromNotification(data);
              if (toastData) addToast(toastData, `notif_${change.doc.id}`);
            }
          }
        });
      });
    });

    return () => unsubscribe();
  }, [user?.uid, addToast]);

  // Listen for provider bookings
  useEffect(() => {
    if (!user?.uid || user?.role?.toUpperCase() !== 'PROVIDER') return;

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', user.uid),
      limit(20)
    );

    const shownToasts = new Set<string>();
    let isFirstLoad = true;

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      if (isFirstLoad) {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.adminApproved) shownToasts.add(`approved_${doc.id}`);
          if (data.status === 'pending') shownToasts.add(`pending_${doc.id}`);
        });
        isFirstLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const docId = change.doc.id;

        if (change.type === 'added' && data.status === 'pending' && !shownToasts.has(`pending_${docId}`)) {
          shownToasts.add(`pending_${docId}`);
          addToast({
            type: 'booking',
            title: 'New Booking Request',
            message: `${data.clientName || 'A client'} requested ${data.serviceCategory || 'a service'}`,
            timestamp: new Date(),
            link: `/provider/jobs/${docId}`,
            color: 'emerald',
          }, `provider_pending_${docId}`);
        }

        if (change.type === 'modified' && data.adminApproved && !shownToasts.has(`approved_${docId}`)) {
          shownToasts.add(`approved_${docId}`);
          addToast({
            type: 'job',
            title: 'Job Approved',
            message: `Admin approved your job for ${data.clientName || 'client'}`,
            timestamp: new Date(),
            link: `/provider/jobs/${docId}`,
            color: 'emerald',
          }, `provider_approved_${docId}`);
        }

        if (change.type === 'modified' && data.status === 'completed' && !shownToasts.has(`completed_${docId}`)) {
          shownToasts.add(`completed_${docId}`);
          addToast({
            type: 'payment',
            title: 'Job Completed',
            message: `Payment: ₱${data.totalAmount?.toLocaleString() || data.providerPrice?.toLocaleString() || '0'}`,
            timestamp: new Date(),
            link: `/provider/jobs/${docId}`,
            color: 'emerald',
          }, `provider_completed_${docId}`);
        }
      });
    });

    return () => unsubscribe();
  }, [user?.uid, user?.role, addToast]);

  // Listen for messages
  useEffect(() => {
    if (!user?.uid) return;

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    let isFirstLoad = true;
    const lastMessageTimes = new Map<string, number>();
    
    const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
      if (isFirstLoad) {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const lastTime = data.lastMessageTime?.toDate?.()?.getTime() || data.updatedAt?.toDate?.()?.getTime() || 0;
          lastMessageTimes.set(doc.id, lastTime);
        });
        isFirstLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          const docId = change.doc.id;
          const unreadCount = data.unreadCount?.[user.uid] || 0;
          const currentTime = data.lastMessageTime?.toDate?.()?.getTime() || data.updatedAt?.toDate?.()?.getTime() || 0;
          const previousTime = lastMessageTimes.get(docId) || 0;
          
          if (unreadCount > 0 && data.lastSenderId !== user.uid && currentTime > previousTime) {
            lastMessageTimes.set(docId, currentTime);
            addToast({
              type: 'message',
              title: 'New Message',
              message: data.lastMessage?.slice(0, 50) + (data.lastMessage?.length > 50 ? '...' : '') || 'You have a new message',
              timestamp: new Date(),
              link: `/chat/${docId}`,
              color: 'blue',
            }, `msg_${docId}_${currentTime}`);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user?.uid, addToast]);

  // Listen for admin bookings
  useEffect(() => {
    if (!user?.uid || user?.role?.toUpperCase() !== 'ADMIN') return;

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('status', 'in', ['pending', 'pending_negotiation']),
      limit(50)
    );

    const shownToasts = new Set<string>();
    let isFirstLoad = true;

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      if (isFirstLoad) {
        snapshot.docs.forEach(doc => shownToasts.add(`new_${doc.id}`));
        isFirstLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const docId = change.doc.id;

        if (change.type === 'added' && !data.adminApproved && !shownToasts.has(`new_${docId}`)) {
          shownToasts.add(`new_${docId}`);
          addToast({
            type: 'booking',
            title: 'New Booking Request',
            message: `${data.clientName || 'A client'} submitted a ${data.serviceCategory || 'service'} request`,
            timestamp: new Date(),
            link: `/admin/jobs/${docId}`,
            color: 'amber',
          }, `admin_new_${docId}`);
        }
      });
    });

    return () => unsubscribe();
  }, [user?.uid, user?.role, addToast]);

  // Listen for client bookings
  useEffect(() => {
    if (!user?.uid || user?.role?.toUpperCase() !== 'CLIENT') return;

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clientId', '==', user.uid),
      limit(20)
    );

    const shownToasts = new Set<string>();
    let isFirstLoad = true;

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      if (isFirstLoad) {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          shownToasts.add(`${data.status}_${doc.id}`);
          if (data.adminApproved) shownToasts.add(`approved_${doc.id}`);
        });
        isFirstLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          const docId = change.doc.id;
          const status = data.status;
          const statusKey = `${status}_${docId}`;
          
          if (shownToasts.has(statusKey)) return;
          
          let toastData: Omit<Toast, 'id'> | null = null;
          let uniqueKey: string | undefined;
          
          if (data.adminApproved && !shownToasts.has(`approved_${docId}`)) {
            shownToasts.add(`approved_${docId}`);
            uniqueKey = `client_approved_${docId}`;
            toastData = {
              type: 'job',
              title: 'Booking Approved',
              message: `Your ${data.serviceCategory || 'service'} booking has been approved`,
              timestamp: new Date(),
              link: `/client/bookings/${docId}`,
              color: 'emerald',
            };
          } else if (status === 'accepted') {
            shownToasts.add(statusKey);
            uniqueKey = `client_accepted_${docId}`;
            toastData = {
              type: 'job',
              title: 'Booking Accepted',
              message: `${data.providerName || 'Provider'} accepted your booking`,
              timestamp: new Date(),
              link: `/client/bookings/${docId}`,
              color: 'emerald',
            };
          } else if (status === 'traveling') {
            shownToasts.add(statusKey);
            uniqueKey = `client_traveling_${docId}`;
            toastData = {
              type: 'job',
              title: 'Provider On The Way',
              message: `${data.providerName || 'Provider'} is traveling to your location`,
              timestamp: new Date(),
              link: `/client/bookings/${docId}/tracking`,
              color: 'blue',
            };
          } else if (status === 'arrived') {
            shownToasts.add(statusKey);
            uniqueKey = `client_arrived_${docId}`;
            toastData = {
              type: 'job',
              title: 'Provider Arrived',
              message: `${data.providerName || 'Provider'} has arrived`,
              timestamp: new Date(),
              link: `/client/bookings/${docId}`,
              color: 'emerald',
            };
          } else if (status === 'in_progress') {
            shownToasts.add(statusKey);
            uniqueKey = `client_inprogress_${docId}`;
            toastData = {
              type: 'job',
              title: 'Service Started',
              message: `${data.providerName || 'Provider'} has started working`,
              timestamp: new Date(),
              link: `/client/bookings/${docId}/tracking`,
              color: 'blue',
            };
          } else if (status === 'completed' || status === 'pending_completion') {
            shownToasts.add(statusKey);
            uniqueKey = `client_completed_${docId}`;
            toastData = {
              type: 'job',
              title: 'Service Completed',
              message: `Your ${data.serviceCategory || 'service'} has been completed`,
              timestamp: new Date(),
              link: `/client/bookings/${docId}/review`,
              color: 'emerald',
            };
          } else if (status === 'rejected' || status === 'cancelled') {
            shownToasts.add(statusKey);
            uniqueKey = `client_${status}_${docId}`;
            toastData = {
              type: 'job',
              title: 'Booking Update',
              message: `Your booking was ${status}`,
              timestamp: new Date(),
              link: `/client/bookings/${docId}`,
              color: 'red',
            };
          }
          
          if (toastData) addToast(toastData, uniqueKey);
        }
      });
    });

    return () => unsubscribe();
  }, [user?.uid, user?.role, addToast]);

  const getToastFromNotification = (data: any): Omit<Toast, 'id'> | null => {
    const type = data.type || 'system';
    let color = 'gray';
    let link = '/notifications';

    switch (type) {
      case 'booking':
      case 'job':
        color = 'emerald';
        link = data.bookingId ? `/client/bookings/${data.bookingId}` : '/notifications';
        break;
      case 'message':
        color = 'blue';
        link = data.conversationId ? `/chat/${data.conversationId}` : '/notifications';
        break;
      case 'payment':
        color = 'amber';
        break;
      case 'review':
        color = 'purple';
        break;
    }

    return {
      type,
      title: data.title || 'Notification',
      message: data.body || data.message || '',
      timestamp: data.createdAt?.toDate() || new Date(),
      link,
      color,
    };
  };

  const getIcon = (type: string) => {
    const iconClass = 'w-5 h-5 text-white';
    switch (type) {
      case 'booking':
        return <Briefcase className={iconClass} />;
      case 'message':
        return <MessageSquare className={iconClass} />;
      case 'job':
        return <CheckCircle className={iconClass} />;
      case 'payment':
        return <CreditCard className={iconClass} />;
      case 'review':
        return <Star className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getIconBg = (color: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-500';
      case 'blue': return 'bg-blue-500';
      case 'amber': return 'bg-amber-500';
      case 'purple': return 'bg-purple-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-[380px] w-full pointer-events-none">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-toast-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* macOS-style notification card */}
          <div
            onClick={() => handleToastClick(toast)}
            className="group relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/20 dark:border-gray-700/50 overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)]"
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* App Icon - macOS style */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg flex items-center justify-center">
                    <Image 
                      src="/gss-icon.svg" 
                      alt="GSS" 
                      width={44} 
                      height={44} 
                      className="rounded-xl"
                    />
                  </div>
                  {/* Notification type badge */}
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${getIconBg(toast.color || 'gray')} rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-gray-900`}>
                    {getIcon(toast.type)}
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                      GSS Maasin
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      now
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-[15px] leading-tight mb-0.5">
                    {toast.title}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 text-[13px] leading-snug line-clamp-2">
                    {toast.message}
                  </p>
                </div>
                
                {/* Close button - appears on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToast(toast.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-100/80 dark:bg-gray-800/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Progress bar for auto-dismiss */}
            <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
              <div 
                className={`h-full ${getIconBg(toast.color || 'gray')} animate-progress`}
                style={{ animationDuration: '5s' }}
              />
            </div>
          </div>
        </div>
      ))}
      
      <style jsx global>{`
        @keyframes toast-in {
          0% {
            transform: translateX(100%) scale(0.9);
            opacity: 0;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        
        .animate-toast-in {
          animation: toast-in 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
        }
        
        .animate-progress {
          animation: progress linear forwards;
        }
      `}</style>
    </div>
  );
}
