'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
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
  // Track shown toasts to prevent duplicates - use ref to persist across renders
  const shownToastIds = useRef(new Set<string>());

  const addToast = useCallback((toastData: Omit<Toast, 'id'>, uniqueKey?: string) => {
    // Prevent duplicate toasts using unique key
    if (uniqueKey && shownToastIds.current.has(uniqueKey)) {
      return;
    }
    if (uniqueKey) {
      shownToastIds.current.add(uniqueKey);
      // Clean up after 60 seconds
      setTimeout(() => shownToastIds.current.delete(uniqueKey), 60000);
    }

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { ...toastData, id }]);
    
    // Auto remove custom toast after 5 seconds
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

  // Listen for new notifications - try both userId and targetUserId fields
  useEffect(() => {
    if (!user?.uid) return;

    // Try with userId first (common field name)
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
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
          
          // Only show if it's a new notification (within last 30 seconds)
          if (new Date().getTime() - createdAt.getTime() < 30000) {
            const toastData = getToastFromNotification(data);
            if (toastData) addToast(toastData, `notif_${change.doc.id}`);
          }
        }
      });
    }, (error) => {
      // If userId field doesn't exist, try targetUserId
      console.log('Trying targetUserId field instead:', error.code);
      const fallbackQuery = query(
        collection(db, 'notifications'),
        where('targetUserId', '==', user.uid),
        limit(10)
      );
      
      let fallbackFirstLoad = true;
      onSnapshot(fallbackQuery, (snapshot) => {
        if (fallbackFirstLoad) {
          fallbackFirstLoad = false;
          return;
        }

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
      }, (err) => {
        console.log('Notifications listener error:', err.code);
      });
    });

    return () => unsubscribe();
  }, [user?.uid, addToast]);

  // Listen for new bookings (for providers) - show toast when admin approves
  useEffect(() => {
    if (!user?.uid || user?.role?.toUpperCase() !== 'PROVIDER') return;

    // Listen to all bookings assigned to this provider
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', user.uid),
      limit(20)
    );

    // Track which bookings we've already shown toasts for
    const shownToasts = new Set<string>();
    let isFirstLoad = true;

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      if (isFirstLoad) {
        // On first load, just record existing bookings
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.adminApproved) {
            shownToasts.add(`approved_${doc.id}`);
          }
          if (data.status === 'pending') {
            shownToasts.add(`pending_${doc.id}`);
          }
        });
        isFirstLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const docId = change.doc.id;

        // New booking assigned to provider
        if (change.type === 'added' && data.status === 'pending' && !shownToasts.has(`pending_${docId}`)) {
          shownToasts.add(`pending_${docId}`);
          addToast({
            type: 'booking',
            title: 'New Booking Request! 🎉',
            message: `${data.clientName || 'A client'} requested ${data.serviceCategory || 'a service'}`,
            timestamp: new Date(),
            link: `/provider/jobs/${docId}`,
            color: 'emerald',
          }, `provider_pending_${docId}`);
        }

        // Admin approved the booking - show toast to provider
        if (change.type === 'modified' && data.adminApproved && !shownToasts.has(`approved_${docId}`)) {
          shownToasts.add(`approved_${docId}`);
          addToast({
            type: 'job',
            title: 'Job Approved! ✅',
            message: `Admin approved your job for ${data.clientName || 'client'}. You can now contact them.`,
            timestamp: new Date(),
            link: `/provider/jobs/${docId}`,
            color: 'emerald',
          }, `provider_approved_${docId}`);
        }

        // Client contacted - new message or status change
        if (change.type === 'modified') {
          const status = data.status;
          
          if (status === 'traveling' && !shownToasts.has(`traveling_${docId}`)) {
            shownToasts.add(`traveling_${docId}`);
            // Provider started traveling - no toast needed for provider
          }
          
          if (status === 'completed' && !shownToasts.has(`completed_${docId}`)) {
            shownToasts.add(`completed_${docId}`);
            addToast({
              type: 'payment',
              title: 'Job Completed! 💰',
              message: `${data.serviceCategory || 'Service'} completed. Payment: ₱${data.totalAmount?.toLocaleString() || data.providerPrice?.toLocaleString() || '0'}`,
              timestamp: new Date(),
              link: `/provider/jobs/${docId}`,
              color: 'emerald',
            }, `provider_completed_${docId}`);
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
    // Track last message timestamps to prevent duplicate toasts
    const lastMessageTimes = new Map<string, number>();
    
    const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
      if (isFirstLoad) {
        // Record initial message times
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
          
          // Only show toast if there's a new unread message, it's not from current user, and it's actually new
          if (unreadCount > 0 && data.lastSenderId !== user.uid && currentTime > previousTime) {
            lastMessageTimes.set(docId, currentTime);
            addToast({
              type: 'message',
              title: 'New Message 💬',
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

  // Listen for new bookings (for ADMIN) - show toast when client submits a new booking
  useEffect(() => {
    if (!user?.uid || user?.role?.toUpperCase() !== 'ADMIN') return;

    // Listen to all pending bookings that need admin approval
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('status', 'in', ['pending', 'pending_negotiation']),
      limit(50)
    );

    // Track which bookings we've already shown toasts for
    const shownToasts = new Set<string>();
    let isFirstLoad = true;

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      if (isFirstLoad) {
        // On first load, just record existing bookings
        snapshot.docs.forEach(doc => {
          shownToasts.add(`new_${doc.id}`);
        });
        isFirstLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const docId = change.doc.id;

        // New booking submitted by client - needs admin approval
        if (change.type === 'added' && !data.adminApproved && !shownToasts.has(`new_${docId}`)) {
          shownToasts.add(`new_${docId}`);
          addToast({
            type: 'booking',
            title: 'New Booking Request! 📋',
            message: `${data.clientName || 'A client'} submitted a ${data.serviceCategory || 'service'} request`,
            timestamp: new Date(),
            link: `/admin/jobs/${docId}`,
            color: 'amber',
          }, `admin_new_${docId}`);
        }
      });
    }, (error) => {
      console.log('Admin bookings listener error:', error.code);
    });

    return () => unsubscribe();
  }, [user?.uid, user?.role, addToast]);

  // Listen for job status changes (for clients) - show toast on status changes
  useEffect(() => {
    if (!user?.uid || user?.role?.toUpperCase() !== 'CLIENT') return;

    // Listen to all bookings for this client
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clientId', '==', user.uid),
      limit(20)
    );

    // Track which toasts we've already shown
    const shownToasts = new Set<string>();
    let isFirstLoad = true;

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      if (isFirstLoad) {
        // On first load, record existing states
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          shownToasts.add(`${data.status}_${doc.id}`);
          if (data.adminApproved) {
            shownToasts.add(`approved_${doc.id}`);
          }
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
          
          // Skip if we've already shown this toast
          if (shownToasts.has(statusKey)) return;
          
          let toastData: Omit<Toast, 'id'> | null = null;
          let uniqueKey: string | undefined;
          
          // Admin approved the booking
          if (data.adminApproved && !shownToasts.has(`approved_${docId}`)) {
            shownToasts.add(`approved_${docId}`);
            uniqueKey = `client_approved_${docId}`;
            toastData = {
              type: 'job',
              title: 'Booking Approved! ✅',
              message: `Your booking for ${data.serviceCategory || 'service'} has been approved by admin`,
              timestamp: new Date(),
              link: `/client/bookings/${docId}`,
              color: 'emerald',
            };
          } else if (status === 'accepted') {
            shownToasts.add(statusKey);
            uniqueKey = `client_accepted_${docId}`;
            toastData = {
              type: 'job',
              title: 'Booking Accepted! ✅',
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
              title: 'Provider On The Way! 🚗',
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
              title: 'Provider Arrived! 📍',
              message: `${data.providerName || 'Provider'} has arrived at your location`,
              timestamp: new Date(),
              link: `/client/bookings/${docId}`,
              color: 'emerald',
            };
          } else if (status === 'in_progress') {
            shownToasts.add(statusKey);
            uniqueKey = `client_inprogress_${docId}`;
            toastData = {
              type: 'job',
              title: 'Service Started 🚀',
              message: `${data.providerName || 'Provider'} has started working on your job`,
              timestamp: new Date(),
              link: `/client/bookings/${docId}/tracking`,
              color: 'blue',
            };
          } else if (status === 'completed' || status === 'pending_completion') {
            shownToasts.add(statusKey);
            uniqueKey = `client_completed_${docId}`;
            toastData = {
              type: 'job',
              title: 'Service Completed! 🎉',
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
