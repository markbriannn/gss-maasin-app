'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
  Bell, MessageSquare, Briefcase, CheckCircle, 
  Star, CreditCard, X, ChevronRight, Sparkles
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

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleToastClick = (toast: Toast) => {
    if (toast.link) {
      router.push(toast.link);
    }
    removeToast(toast.id);
  };

  // Listen for new notifications - simplified query without compound index
  useEffect(() => {
    if (!user?.uid) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    let isFirstLoad = true;
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      if (isFirstLoad) {
        isFirstLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdAt = data.createdAt?.toDate() || new Date();
          
          // Only show if it's a new notification (within last 10 seconds)
          if (new Date().getTime() - createdAt.getTime() < 10000) {
            const toast = getToastFromNotification(data);
            if (toast) addToast(toast);
          }
        }
      });
    }, (error) => {
      // Silently handle index errors
      console.log('Notifications listener error (index may be needed):', error.code);
    });

    return () => unsubscribe();
  }, [user?.uid, addToast]);

  // Listen for new bookings (for providers) - simplified query to avoid index
  useEffect(() => {
    if (!user?.uid || user?.role?.toUpperCase() !== 'PROVIDER') return;

    // Simple query without compound index requirement
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', user.uid),
      limit(10)
    );

    let isFirstLoad = true;
    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      if (isFirstLoad) {
        isFirstLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Only show toast for pending bookings
          if (data.status === 'pending') {
            const createdAt = data.createdAt?.toDate?.() || new Date();
            // Only show if created within last 30 seconds
            if (new Date().getTime() - createdAt.getTime() < 30000) {
              addToast({
                type: 'booking',
                title: 'New Booking Request! 🎉',
                message: `${data.clientName || 'A client'} requested ${data.serviceCategory || 'a service'}`,
                timestamp: new Date(),
                link: `/provider/jobs/${change.doc.id}`,
                color: 'emerald',
              });
            }
          }
        }
      });
    }, (error) => {
      console.log('Provider bookings listener error:', error.code);
    });

    return () => unsubscribe();
  }, [user?.uid, user?.role, addToast]);

  // Listen for new messages
  useEffect(() => {
    if (!user?.uid) return;

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    let isFirstLoad = true;
    const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
      if (isFirstLoad) {
        isFirstLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          const unreadCount = data.unreadCount?.[user.uid] || 0;
          
          // Only show toast if there's a new unread message and it's not from current user
          if (unreadCount > 0 && data.lastSenderId !== user.uid) {
            addToast({
              type: 'message',
              title: 'New Message 💬',
              message: data.lastMessage?.slice(0, 50) + (data.lastMessage?.length > 50 ? '...' : '') || 'You have a new message',
              timestamp: new Date(),
              link: `/chat/${change.doc.id}`,
              color: 'blue',
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user?.uid, addToast]);

  // Listen for job status changes (for clients) - simplified query to avoid index
  useEffect(() => {
    if (!user?.uid || user?.role?.toUpperCase() !== 'CLIENT') return;

    // Simple query without compound index requirement
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clientId', '==', user.uid),
      limit(10)
    );

    let isFirstLoad = true;
    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      if (isFirstLoad) {
        isFirstLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          const status = data.status;
          
          let toast: Omit<Toast, 'id'> | null = null;
          
          if (status === 'accepted') {
            toast = {
              type: 'job',
              title: 'Booking Accepted! ✅',
              message: `${data.providerName || 'Provider'} accepted your booking`,
              timestamp: new Date(),
              link: `/client/bookings/${change.doc.id}`,
              color: 'emerald',
            };
          } else if (status === 'in_progress') {
            toast = {
              type: 'job',
              title: 'Service Started 🚀',
              message: `${data.providerName || 'Provider'} has started working on your job`,
              timestamp: new Date(),
              link: `/client/bookings/${change.doc.id}/tracking`,
              color: 'blue',
            };
          } else if (status === 'completed') {
            toast = {
              type: 'job',
              title: 'Service Completed! 🎉',
              message: `Your ${data.serviceCategory || 'service'} has been completed`,
              timestamp: new Date(),
              link: `/client/bookings/${change.doc.id}/review`,
              color: 'emerald',
            };
          } else if (status === 'rejected' || status === 'cancelled') {
            toast = {
              type: 'job',
              title: 'Booking Update',
              message: `Your booking was ${status}`,
              timestamp: new Date(),
              link: `/client/bookings/${change.doc.id}`,
              color: 'red',
            };
          }
          
          if (toast) addToast(toast);
        }
      });
    }, (error) => {
      console.log('Client bookings listener error:', error.code);
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

  const getIcon = (type: string, color: string) => {
    const iconClass = `w-5 h-5 text-${color}-500`;
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

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
          light: 'bg-emerald-50',
          border: 'border-emerald-200',
          icon: 'text-emerald-500',
        };
      case 'blue':
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
          light: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-500',
        };
      case 'amber':
        return {
          bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
          light: 'bg-amber-50',
          border: 'border-amber-200',
          icon: 'text-amber-500',
        };
      case 'purple':
        return {
          bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
          light: 'bg-purple-50',
          border: 'border-purple-200',
          icon: 'text-purple-500',
        };
      case 'red':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-rose-500',
          light: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-500 to-slate-500',
          light: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-500',
        };
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast, index) => {
        const colors = getColorClasses(toast.color || 'gray');
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white rounded-2xl shadow-2xl border ${colors.border} overflow-hidden transform transition-all duration-300 animate-slide-in-right cursor-pointer hover:scale-[1.02]`}
            onClick={() => handleToastClick(toast)}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Color bar */}
            <div className={`h-1 ${colors.bg}`} />
            
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl ${colors.light} flex items-center justify-center flex-shrink-0`}>
                  {getIcon(toast.type, toast.color || 'gray')}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm">{toast.title}</h4>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2">{toast.message}</p>
                  {toast.link && (
                    <div className="flex items-center gap-1 mt-2 text-xs font-medium text-gray-400">
                      <span>Tap to view</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                </div>
                
                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToast(toast.id);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
      
      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
