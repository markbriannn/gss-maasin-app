'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

export default function NotificationPermissionBanner() {
  const { isSupported, hasPermission, requestPermission } = useNotifications();
  const { isAuthenticated } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if banner was previously dismissed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('notification_banner_dismissed');
      if (dismissed) setIsDismissed(true);
    }
  }, []);

  // Don't show if not authenticated, not supported, already has permission, or dismissed
  if (!isAuthenticated || !isSupported || hasPermission || isDismissed) {
    return null;
  }

  // Don't show if permission was denied (user explicitly blocked)
  if (typeof window !== 'undefined' && Notification.permission === 'denied') {
    return null;
  }

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      await requestPermission();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('notification_banner_dismissed', 'true');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 p-4 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <Bell className="w-5 h-5 text-green-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">Enable Notifications</h3>
          <p className="text-xs text-gray-600 mt-1">
            Get notified about job updates, messages, and important alerts even when you&apos;re not on the site.
          </p>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-gray-600 text-xs font-medium hover:text-gray-800"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
