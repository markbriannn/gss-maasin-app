'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { XCircle, Smartphone, ExternalLink, RefreshCw } from 'lucide-react';

export default function PaymentFailedPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Try to redirect to mobile app via deep link
    const deepLink = `gssmaasin://payment/failed?bookingId=${bookingId}`;
    
    // Attempt deep link redirect
    const timer = setTimeout(() => {
      window.location.href = deepLink;
    }, 1000);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
    };
  }, [bookingId]);

  const handleOpenApp = () => {
    window.location.href = `gssmaasin://payment/failed?bookingId=${bookingId}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30">
          <XCircle className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">Your payment could not be processed. Please try again.</p>
        
        {bookingId && (
          <p className="text-sm text-gray-500 mb-6">Booking ID: {bookingId}</p>
        )}

        <div className="bg-red-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-red-700">
            <Smartphone className="w-5 h-5" />
            <span className="font-medium">Redirecting to app{countdown > 0 ? ` in ${countdown}s` : '...'}</span>
          </div>
        </div>

        <button
          onClick={handleOpenApp}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/30 transition-all mb-3"
        >
          <ExternalLink className="w-5 h-5" />
          Open GSS Maasin App
        </button>

        <button
          onClick={() => window.history.back()}
          className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all"
        >
          <RefreshCw className="w-5 h-5" />
          Try Again
        </button>

        <p className="text-xs text-gray-400 mt-4">
          If the app doesn't open automatically, tap the button above.
        </p>
      </div>
    </div>
  );
}
