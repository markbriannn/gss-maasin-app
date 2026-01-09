'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { 
  registerDeviceToken, 
  onForegroundMessage, 
  showLocalNotification,
  requestNotificationPermission,
  isPushSupported 
} from '@/lib/pushNotifications';

interface NotificationContextType {
  isSupported: boolean;
  hasPermission: boolean;
  isRegistered: boolean;
  requestPermission: () => Promise<boolean>;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check if push is supported
  useEffect(() => {
    isPushSupported().then(setIsSupported);
  }, []);

  // Check permission status
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  // Register device when user logs in
  useEffect(() => {
    if (!isAuthenticated || !user?.uid || !isSupported) return;

    const initializePush = async () => {
      try {
        console.log('[NotificationContext Web] Initializing push for user:', user.uid);
        
        // Request permission if not granted
        if (Notification.permission !== 'granted') {
          const granted = await requestNotificationPermission();
          setHasPermission(granted);
          if (!granted) {
            console.log('[NotificationContext Web] Permission not granted');
            return;
          }
        }

        // Register device token
        const result = await registerDeviceToken(user.uid);
        setIsRegistered(result.success);
        console.log('[NotificationContext Web] Registration result:', result);
      } catch (error) {
        console.error('[NotificationContext Web] Init error:', error);
      }
    };

    initializePush();
  }, [isAuthenticated, user?.uid, isSupported]);

  // Listen for foreground messages
  useEffect(() => {
    if (!isAuthenticated || !isSupported) return;

    const cleanup = onForegroundMessage((payload) => {
      console.log('[NotificationContext Web] Foreground message:', payload);
      
      // Show local notification for foreground messages
      if (payload.notification) {
        showLocalNotification(
          payload.notification.title || 'GSS Notification',
          payload.notification.body || 'You have a new notification',
          payload.data
        );
      }

      // Increment unread count
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [isAuthenticated, isSupported]);

  // Listen for service worker messages (notification clicks)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        console.log('[NotificationContext Web] Notification clicked:', event.data);
        if (event.data.url) {
          window.location.href = event.data.url;
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const requestPermissionHandler = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
    
    if (granted && user?.uid) {
      const result = await registerDeviceToken(user.uid);
      setIsRegistered(result.success);
    }
    
    return granted;
  }, [user?.uid]);

  return (
    <NotificationContext.Provider
      value={{
        isSupported,
        hasPermission,
        isRegistered,
        requestPermission: requestPermissionHandler,
        unreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
