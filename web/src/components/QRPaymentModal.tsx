'use client';

import { useEffect, useState } from 'react';
import { X, QrCode, CheckCircle, Loader2, ExternalLink } from 'lucide-react';

interface QRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutUrl: string;
  amount: number;
  bookingId: string;
  paymentType?: 'upfront' | 'completion' | 'additional_charge';
  onPaymentComplete?: () => void;
}

export default function QRPaymentModal({
  isOpen,
  onClose,
  checkoutUrl,
  amount,
  bookingId,
  paymentType = 'upfront',
  onPaymentComplete,
}: QRPaymentModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'success' | 'failed'>('pending');
  const [checkingInterval, setCheckingInterval] = useState<NodeJS.Timeout | null>(null);
  const [modalOpenTime, setModalOpenTime] = useState<number | null>(null);
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null);

  // Track when modal opens and auto-open payment window
  useEffect(() => {
    if (isOpen) {
      setModalOpenTime(Date.now());
      // Auto-open payment in new window
      const newWindow = window.open(checkoutUrl, '_blank', 'width=600,height=800');
      setPaymentWindow(newWindow);
    } else {
      setModalOpenTime(null);
      setPaymentStatus('pending');
      // Close payment window if still open
      if (paymentWindow && !paymentWindow.closed) {
        paymentWindow.close();
      }
      setPaymentWindow(null);
    }
  }, [isOpen, checkoutUrl]);

  // Listen for iframe navigation to detect "Return to Merchant" click
  useEffect(() => {
    if (!isOpen || !paymentWindow) return;

    // Check if payment window was closed by user
    const checkWindowClosed = setInterval(() => {
      if (paymentWindow.closed) {
        console.log('[QRPayment] Payment window was closed');
        clearInterval(checkWindowClosed);
        // Don't close modal, just let polling continue
      }
    }, 1000);

    return () => {
      clearInterval(checkWindowClosed);
    };
  }, [isOpen, paymentWindow]);

  const handlePaymentSuccess = () => {
    // Clear interval
    if (checkingInterval) {
      clearInterval(checkingInterval);
    }
    
    // Close payment window if still open
    if (paymentWindow && !paymentWindow.closed) {
      paymentWindow.close();
    }
    
    // Close modal immediately
    onClose();
    
    // Notify parent after modal closes
    setTimeout(() => {
      onPaymentComplete?.();
    }, 300);
  };

  // Check payment status periodically - every 2 seconds for faster response
  // BUT only start polling after a delay to give user time to scan
  useEffect(() => {
    if (!isOpen || !bookingId) return;

    const checkPaymentStatus = async () => {
      try {
        setPaymentStatus('checking');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';
        
        // Pass payment type as query parameter so backend knows which payment to check
        const url = `${apiUrl}/payments/verify-and-process/${bookingId}?paymentType=${paymentType}`;
        const response = await fetch(url, {
          method: 'POST',
        });
        const result = await response.json();

        if (result.status === 'paid') {
          // IMPORTANT: Only trigger success if modal has been open for at least 5 seconds
          // This ensures user had time to actually scan and complete payment
          // Prevents false positives from old payment records
          const timeElapsed = Date.now() - (modalOpenTime || 0);
          if (timeElapsed < 5000) {
            console.log('[QRPayment] Payment detected but modal opened only', Math.round(timeElapsed/1000), 'seconds ago - ignoring (likely old record)');
            setPaymentStatus('pending');
            return;
          }
          
          console.log('[QRPayment] Payment detected as paid after', Math.round(timeElapsed/1000), 'seconds!');
          
          handlePaymentSuccess();
        } else {
          setPaymentStatus('pending');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setPaymentStatus('pending');
      }
    };

    // IMPORTANT: Wait 3 seconds before starting to poll
    // This prevents false positives from old payment records
    const startPollingTimeout = setTimeout(() => {
      // Check immediately after delay
      checkPaymentStatus();
      
      // Then check every 2 seconds for faster updates
      const interval = setInterval(checkPaymentStatus, 2000);
      setCheckingInterval(interval);
    }, 3000); // Wait 3 seconds before first check

    return () => {
      clearTimeout(startPollingTimeout);
      if (checkingInterval) {
        clearInterval(checkingInterval);
      }
    };
  }, [isOpen, bookingId, paymentType, onPaymentComplete, onClose, modalOpenTime]);

  const handleClose = () => {
    if (checkingInterval) {
      clearInterval(checkingInterval);
    }
    // Close payment window if still open
    if (paymentWindow && !paymentWindow.closed) {
      paymentWindow.close();
    }
    setPaymentStatus('pending');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00B14F] to-emerald-500 p-6 text-white relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl">
              <QrCode className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Complete Payment</h2>
              <p className="text-white/90 text-sm mt-1">Scan QR code to pay ₱{amount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {paymentStatus === 'success' ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-gray-600">Your booking has been confirmed.</p>
            </div>
          ) : (
            <>
              {/* Payment window opened message */}
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Window Opened</h3>
                <p className="text-gray-600 mb-6">
                  A new window has opened with your QR code. Scan it with your payment app to complete the transaction.
                </p>
                
                {/* Re-open button if window was closed */}
                <button
                  onClick={() => {
                    const newWindow = window.open(checkoutUrl, '_blank', 'width=600,height=800');
                    setPaymentWindow(newWindow);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#00B14F] text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium"
                >
                  <ExternalLink className="w-5 h-5" />
                  Open Payment Window
                </button>
              </div>

              {/* Status indicator */}
              <div className="flex items-center justify-center gap-3 text-sm py-4 border-t border-gray-200">
                {paymentStatus === 'checking' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#00B14F]" />
                    <span className="text-gray-700 font-medium">Checking payment status...</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-gray-600">Waiting for payment • Auto-detects when complete</span>
                  </>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-4 bg-blue-50 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to pay:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Look for the payment window that just opened</li>
                  <li>Open your GCash, Maya, or banking app</li>
                  <li>Scan the QR code shown in the payment window</li>
                  <li>Confirm and complete the payment</li>
                  <li>This window will close automatically once payment is detected</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
