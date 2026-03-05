'use client';

import { useEffect, useState } from 'react';
import { X, QrCode, CheckCircle, Loader2, ExternalLink } from 'lucide-react';

interface QRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutUrl: string;
  amount: number;
  bookingId: string;
  onPaymentComplete?: () => void;
}

export default function QRPaymentModal({
  isOpen,
  onClose,
  checkoutUrl,
  amount,
  bookingId,
  onPaymentComplete,
}: QRPaymentModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'success' | 'failed'>('pending');
  const [checkingInterval, setCheckingInterval] = useState<NodeJS.Timeout | null>(null);
  const [modalOpenTime, setModalOpenTime] = useState<number | null>(null);

  // Track when modal opens to prevent false positives
  useEffect(() => {
    if (isOpen) {
      setModalOpenTime(Date.now());
    } else {
      setModalOpenTime(null);
      setPaymentStatus('pending');
    }
  }, [isOpen]);

  // Check payment status periodically - every 2 seconds for faster response
  // BUT only start polling after a delay to give user time to scan
  useEffect(() => {
    if (!isOpen || !bookingId) return;

    const checkPaymentStatus = async () => {
      try {
        setPaymentStatus('checking');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';
        const response = await fetch(`${apiUrl}/payments/verify-and-process/${bookingId}`, {
          method: 'POST',
        });
        const result = await response.json();

        if (result.status === 'paid') {
          // IMPORTANT: Only trigger success if modal has been open for at least 3 seconds
          // This prevents false positives from old payment records
          const timeElapsed = Date.now() - (modalOpenTime || 0);
          if (timeElapsed < 3000) {
            console.log('[QRPayment] Payment detected but modal just opened, ignoring (likely old record)');
            setPaymentStatus('pending');
            return;
          }
          
          setPaymentStatus('success');
          if (checkingInterval) {
            clearInterval(checkingInterval);
          }
          setTimeout(() => {
            onPaymentComplete?.();
            onClose();
          }, 2000);
        } else {
          setPaymentStatus('pending');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setPaymentStatus('pending');
      }
    };

    // IMPORTANT: Wait 5 seconds before starting to poll
    // This prevents false positives from old payment records
    const startPollingTimeout = setTimeout(() => {
      // Check immediately after delay
      checkPaymentStatus();
      
      // Then check every 2 seconds for faster updates
      const interval = setInterval(checkPaymentStatus, 2000);
      setCheckingInterval(interval);
    }, 5000); // Wait 5 seconds before first check

    return () => {
      clearTimeout(startPollingTimeout);
      if (checkingInterval) {
        clearInterval(checkingInterval);
      }
    };
  }, [isOpen, bookingId, onPaymentComplete, onClose, modalOpenTime]);

  const handleClose = () => {
    if (checkingInterval) {
      clearInterval(checkingInterval);
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
              {/* Payment iframe */}
              <div className="bg-gray-50 rounded-2xl overflow-hidden border-2 border-gray-200 mb-6">
                <iframe
                  src={checkoutUrl}
                  className="w-full h-[500px]"
                  title="QR Payment"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              </div>

              {/* Status indicator */}
              <div className="flex items-center justify-center gap-3 text-sm py-3">
                {paymentStatus === 'checking' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#00B14F]" />
                    <span className="text-gray-700 font-medium">Checking payment status...</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-gray-600">Scan QR code to pay • Auto-detects within seconds</span>
                  </>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-6 bg-blue-50 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to pay:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Open your GCash, Maya, or banking app</li>
                  <li>Scan the QR code shown above</li>
                  <li>Confirm the payment amount</li>
                  <li>Complete the payment</li>
                  <li>Wait for confirmation (this window will close automatically)</li>
                </ol>
              </div>

              {/* Open in new tab option */}
              <div className="mt-4 text-center">
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[#00B14F] hover:text-emerald-600 font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in new tab
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
