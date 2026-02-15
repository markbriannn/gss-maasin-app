'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Smartphone, ExternalLink, Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [countdown, setCountdown] = useState(3);
  const [notificationsSent, setNotificationsSent] = useState(false);

  useEffect(() => {
    // Send booking confirmation notifications
    const sendNotifications = async () => {
      if (!bookingId || notificationsSent) return;
      
      try {
        console.log('[Payment Success] Fetching booking data for:', bookingId);
        
        // Get booking details from Firestore
        const bookingRef = doc(db, 'jobs', bookingId);
        const bookingSnap = await getDoc(bookingRef);
        
        if (!bookingSnap.exists()) {
          console.error('[Payment Success] Booking not found:', bookingId);
          return;
        }
        
        const bookingData = bookingSnap.data();
        const booking: any = { id: bookingSnap.id, ...bookingData };
        console.log('[Payment Success] Booking data:', booking);
        
        // Get client details
        const clientRef = doc(db, 'users', booking.clientId);
        const clientSnap = await getDoc(clientRef);
        const client: any = clientSnap.exists() ? clientSnap.data() : null;
        
        // Get provider details if available
        let provider: any = null;
        if (booking.providerId) {
          const providerRef = doc(db, 'users', booking.providerId);
          const providerSnap = await getDoc(providerRef);
          provider = providerSnap.exists() ? providerSnap.data() : null;
        }
        
        if (!client) {
          console.error('[Payment Success] Client not found');
          return;
        }
        
        const API_URL = 'https://gss-maasin-app.onrender.com/api';
        
        // Prepare notification data
        const clientPhone = client.phoneNumber || client.phone;
        const clientEmail = client.email;
        const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client';
        const providerName = provider ? `${provider.firstName || ''} ${provider.lastName || ''}`.trim() : 'Provider';
        
        // Format date/time
        const formatDate = (date: any) => {
          if (!date) return 'ASAP';
          try {
            const d = date.toDate ? date.toDate() : new Date(date);
            return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
          } catch {
            return 'ASAP';
          }
        };
        
        const dateStr = booking.scheduledDate || formatDate(booking.createdAt) || 'ASAP';
        const timeStr = booking.scheduledTime || 'As soon as possible';
        
        // Send SMS notification to client
        if (clientPhone) {
          const smsMessage = `GSS Maasin: Your booking for ${booking.serviceCategory} with ${providerName} is confirmed! ${dateStr !== 'ASAP' ? `Date: ${dateStr} at ${timeStr}.` : ''} Total: ₱${booking.totalAmount?.toLocaleString()}. Job ID: ${bookingId.slice(-6)}`;
          
          fetch(`${API_URL}/sms/send-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phoneNumber: clientPhone,
              message: smsMessage,
            }),
          }).catch(err => console.error('[Payment Success] SMS failed:', err));
        }
        
        // Send Email notification to client
        if (clientEmail) {
          fetch(`${API_URL}/email/booking-confirmation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: clientEmail,
              clientName: clientName,
              booking: {
                id: bookingId,
                serviceCategory: booking.serviceCategory,
                scheduledDate: dateStr,
                scheduledTime: timeStr,
                address: booking.address || booking.location || 'As specified',
                totalAmount: booking.totalAmount,
              },
              provider: {
                name: providerName,
              },
            }),
          }).catch(err => console.error('[Payment Success] Email failed:', err));
        }
        
        console.log('[Payment Success] Notifications sent successfully');
        setNotificationsSent(true);
        
      } catch (error) {
        console.error('[Payment Success] Error sending notifications:', error);
      }
    };
    
    sendNotifications();
  }, [bookingId, notificationsSent]);

  useEffect(() => {
    // Try to redirect to mobile app via deep link
    const deepLink = `gssmaasin://payment/success?bookingId=${bookingId}`;
    
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
    window.location.href = `gssmaasin://payment/success?bookingId=${bookingId}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">Your payment has been processed successfully.</p>
        
        {bookingId && (
          <p className="text-sm text-gray-500 mb-6">Booking ID: {bookingId}</p>
        )}

        <div className="bg-emerald-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-emerald-700">
            <Smartphone className="w-5 h-5" />
            <span className="font-medium">Redirecting to app{countdown > 0 ? ` in ${countdown}s` : '...'}</span>
          </div>
        </div>

        <button
          onClick={handleOpenApp}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          <ExternalLink className="w-5 h-5" />
          Open GSS Maasin App
        </button>

        <p className="text-xs text-gray-400 mt-4">
          If the app doesn&apos;t open automatically, tap the button above.
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
