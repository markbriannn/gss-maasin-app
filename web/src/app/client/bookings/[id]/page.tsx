'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ClientLayout from '@/components/layouts/ClientLayout';
import Link from 'next/link';
import { 
  ArrowLeft, Phone, MessageCircle, MapPin, Clock,
  CreditCard, CheckCircle, AlertCircle, Star, User,
  Banknote, Loader2, Wallet, X, ChevronRight, Navigation, Tag
} from 'lucide-react';
import { pushNotifications } from '@/lib/pushNotifications';

interface AdditionalCharge {
  id: string;
  reason?: string;
  description?: string;
  amount: number;
  total?: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface ProviderInfo {
  id: string;
  name: string;
  phone?: string;
  photo?: string;
  rating?: number;
  reviewCount?: number;
  completedJobs?: number;
  tier?: string;
  points?: number;
  avgResponseTime?: number;
  isVerified?: boolean;
}

interface JobData {
  id: string;
  status: string;
  title?: string;
  serviceCategory: string;
  description?: string;
  address?: string;
  streetAddress?: string;
  houseNumber?: string;
  barangay?: string;
  landmark?: string;
  price?: number;
  totalAmount?: number;
  finalAmount?: number;
  providerPrice?: number;
  fixedPrice?: number;
  systemFee?: number;
  providerId: string;
  provider?: ProviderInfo;
  clientId: string;
  paymentPreference?: string;
  paymentStatus?: string; // pending, held, released, refunded
  paymentMethod?: string;
  escrowAmount?: number;
  isPaidUpfront?: boolean;
  upfrontPaidAmount?: number;
  adminApproved?: boolean;
  additionalCharges?: AdditionalCharge[];
  discount?: number;
  discountAmount?: number;
  discountReason?: string;
  hasDiscount?: boolean;
  rating?: number;
  review?: string;
  reviewed?: boolean;
  reviewRating?: number;
  createdAt?: string;
  mediaUrls?: string[];
  mediaFiles?: Array<{ url?: string; uri?: string; isVideo?: boolean } | string>;
  counterOfferPrice?: number;
  counterOfferNote?: string;
  offeredPrice?: number;
  isNegotiable?: boolean;
  providerFixedPrice?: number;
  hasAdditionalPending?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  awaiting_payment: { label: 'Awaiting Payment', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  pending: { label: 'Pending', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  pending_negotiation: { label: 'Offer Sent', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  counter_offer: { label: 'Counter Offer Received', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  accepted: { label: 'Accepted', color: 'text-green-600', bgColor: 'bg-green-100' },
  traveling: { label: 'Provider On The Way', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  arrived: { label: 'Provider Arrived', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  in_progress: { label: 'In Progress', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  pending_completion: { label: 'Awaiting Confirmation', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  pending_payment: { label: 'Awaiting Payment', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  payment_received: { label: 'Payment Received', color: 'text-green-600', bgColor: 'bg-green-100' },
  completed: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-100' },
  rejected: { label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const CANCEL_REASONS = [
  'Changed my mind',
  'Found another provider',
  'Schedule conflict',
  'Price too high',
  'Provider not responding',
  'Other',
];

// Helper to get tier info
const getTierInfo = (points: number) => {
  if (points >= 5000) return { name: 'Diamond', color: 'bg-cyan-500', textColor: 'text-cyan-700' };
  if (points >= 2500) return { name: 'Platinum', color: 'bg-gray-400', textColor: 'text-gray-700' };
  if (points >= 1000) return { name: 'Gold', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
  if (points >= 500) return { name: 'Silver', color: 'bg-gray-300', textColor: 'text-gray-600' };
  return { name: 'Bronze', color: 'bg-amber-600', textColor: 'text-amber-700' };
};

// Provider badge configuration
const PROVIDER_BADGES = {
  FIRST_JOB: { id: 'first_job', name: 'First Job', icon: '✓', color: 'bg-emerald-100 text-emerald-700', requirement: { type: 'jobs', count: 1 } },
  RISING_STAR: { id: 'rising_star', name: 'Rising Star', icon: '📈', color: 'bg-blue-100 text-blue-700', requirement: { type: 'jobs', count: 10 } },
  EXPERIENCED: { id: 'experienced', name: 'Experienced Pro', icon: '🏅', color: 'bg-purple-100 text-purple-700', requirement: { type: 'jobs', count: 50 } },
  MASTER: { id: 'master', name: 'Master Provider', icon: '🏆', color: 'bg-amber-100 text-amber-700', requirement: { type: 'jobs', count: 100 } },
  TOP_RATED: { id: 'top_rated', name: 'Top Rated', icon: '⭐', color: 'bg-yellow-100 text-yellow-700', requirement: { type: 'rating', minRating: 4.8, minReviews: 20 } },
  FAST_RESPONDER: { id: 'fast_responder', name: 'Fast Responder', icon: '⚡', color: 'bg-red-100 text-red-700', requirement: { type: 'responseTime', maxMinutes: 5 } },
  VERIFIED_PRO: { id: 'verified_pro', name: 'Verified Pro', icon: '✅', color: 'bg-green-100 text-green-700', requirement: { type: 'verified', value: true } },
};

// Calculate provider badges
const getProviderBadges = (stats: { completedJobs?: number; rating?: number; reviewCount?: number; avgResponseTime?: number; isVerified?: boolean }) => {
  const earned: typeof PROVIDER_BADGES[keyof typeof PROVIDER_BADGES][] = [];
  const { completedJobs = 0, rating = 0, reviewCount = 0, avgResponseTime = 999, isVerified = false } = stats;

  Object.values(PROVIDER_BADGES).forEach(badge => {
    const req = badge.requirement;
    let isEarned = false;

    switch (req.type) {
      case 'jobs':
        isEarned = completedJobs >= (req as { count: number }).count;
        break;
      case 'rating':
        isEarned = rating >= (req as { minRating: number; minReviews: number }).minRating && 
                   reviewCount >= (req as { minRating: number; minReviews: number }).minReviews;
        break;
      case 'responseTime':
        isEarned = avgResponseTime <= (req as { maxMinutes: number }).maxMinutes;
        break;
      case 'verified':
        isEarned = isVerified === (req as { value: boolean }).value;
        break;
    }

    if (isEarned) earned.push(badge);
  });

  return earned;
};

export default function JobDetailsPage() {
  return (
    <Suspense fallback={
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      </ClientLayout>
    }>
      <JobDetailsContent />
    </Suspense>
  );
}

function JobDetailsContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const jobId = params.id as string;
  
  // Handle payment callback from PayMongo
  const paymentStatus = searchParams.get('payment');

  const [job, setJob] = useState<JobData | null>(null);
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedCancelReason, setSelectedCancelReason] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNewOfferModal, setShowNewOfferModal] = useState(false);
  const [newOfferPrice, setNewOfferPrice] = useState('');
  const [newOfferNote, setNewOfferNote] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info' | 'payment';
    title: string;
    message: string;
    onClose?: () => void;
  }>({ show: false, type: 'info', title: '', message: '' });
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const showAlert = (type: 'success' | 'error' | 'info' | 'payment', title: string, message: string, onClose?: () => void) => {
    setAlertModal({ show: true, type, title, message, onClose });
  };

  // Handle payment callback
  useEffect(() => {
    const verifyPayment = async () => {
      if (paymentStatus === 'success' && jobId) {
        setPaymentMessage({ type: 'success', text: 'Payment successful! Verifying...' });
        
        // Call backend to verify and process the payment
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';
          const response = await fetch(`${apiUrl}/payments/verify-and-process/${jobId}`, {
            method: 'POST',
          });
          const result = await response.json();
          
          if (result.status === 'paid') {
            setPaymentMessage({ type: 'success', text: 'Payment verified! Your booking has been updated.' });
          } else if (result.status === 'pending') {
            setPaymentMessage({ type: 'success', text: 'Payment processing. Please wait a moment and refresh.' });
          }
        } catch (error) {
          console.error('Error verifying payment:', error);
          // Still show success since PayMongo redirected with success
          setPaymentMessage({ type: 'success', text: 'Payment successful! Your booking will be updated shortly.' });
        }
        
        // Clear the URL params after showing message
        setTimeout(() => {
          router.replace(`/client/bookings/${jobId}`);
        }, 3000);
      } else if (paymentStatus === 'failed') {
        setPaymentMessage({ type: 'error', text: 'Payment failed. Please try again.' });
        setTimeout(() => {
          router.replace(`/client/bookings/${jobId}`);
        }, 3000);
      }
    };
    
    verifyPayment();
  }, [paymentStatus, jobId, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Real-time listener for job updates
  useEffect(() => {
    if (!jobId || !user) return;

    const unsubscribe = onSnapshot(doc(db, 'bookings', jobId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setJob({
          id: docSnap.id,
          ...data,
          title: data.title || data.serviceCategory,
          createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString(),
        } as JobData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [jobId, user]);

  // Fetch provider info once (not real-time to avoid flickering)
  useEffect(() => {
    if (!job?.providerId) return;
    
    // Skip if we already have this provider's info
    if (providerInfo?.id === job.providerId) return;

    const fetchProviderInfo = async () => {
      try {
        const { getDoc } = await import('firebase/firestore');
        const providerDoc = await getDoc(doc(db, 'users', job.providerId));
        if (providerDoc.exists()) {
          const pData = providerDoc.data();
          const providerRating = pData.rating || pData.averageRating || 0;
          const providerReviewCount = pData.reviewCount || pData.totalReviews || 0;
          const completedJobs = pData.completedJobs || pData.jobsCompleted || 0;
          
          setProviderInfo({
            id: providerDoc.id,
            name: `${pData.firstName || ''} ${pData.lastName || ''}`.trim() || 'Provider',
            phone: pData.phone || pData.phoneNumber,
            photo: pData.profilePhoto,
            rating: providerRating,
            reviewCount: providerReviewCount,
            completedJobs,
            tier: pData.tier,
            points: pData.points || 0,
            avgResponseTime: pData.avgResponseTime || pData.averageResponseTime || 999,
            isVerified: pData.isVerified || pData.verified || false,
          });
        }
      } catch (error) {
        console.error('Error fetching provider info:', error);
      }
    };

    fetchProviderInfo();
  }, [job?.providerId, providerInfo?.id]);

  const calculateTotal = useCallback(() => {
    if (!job) return 0;
    // Use totalAmount if available (already includes system fee), otherwise calculate
    const basePrice = job.totalAmount || ((job.providerPrice || job.fixedPrice || job.price || 0) + (job.systemFee || 0));
    const approvedCharges = (job.additionalCharges || [])
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + (c.total || c.amount || 0), 0);
    const discount = job.discountAmount || job.discount || 0;
    return basePrice + approvedCharges - discount;
  }, [job]);

  const handleConfirmCompletion = async () => {
    if (!job || !user) return;
    if (updating) return; // Prevent double-click
    
    // Check if this is an escrow payment that needs to be released
    const isEscrowPayment = job.paymentStatus === 'held';
    
    const additionalChargesTotal = (job.additionalCharges || [])
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + (c.total || 0), 0);
    const hasAdditionalToPay = additionalChargesTotal > 0;
    const isPayFirstComplete = job.paymentPreference === 'pay_first' && job.isPaidUpfront && !hasAdditionalToPay;

    setConfirmDialog({
      show: true,
      title: isEscrowPayment ? 'Release Payment to Provider? 💰' : (isPayFirstComplete ? 'Confirm Job Complete? ✅' : 'Confirm & Proceed to Pay?'),
      message: isEscrowPayment 
        ? 'Are you satisfied with the work? This will release the payment from escrow to the provider.'
        : (isPayFirstComplete 
            ? 'Are you satisfied with the work? This will mark the job as complete.'
            : 'Are you satisfied with the work? This will proceed to payment.'),
      onConfirm: async () => {
        setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
        setUpdating(true);
        
        // Optimistic update - update local state immediately
        const newStatus = isEscrowPayment || isPayFirstComplete ? 'payment_received' : 'pending_payment';
        setJob(prev => prev ? { ...prev, status: newStatus } : null);
        
        try {
          if (isEscrowPayment) {
            // Call backend to release escrow (fire and forget pattern for UI)
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';
            fetch(`${apiUrl}/payments/release-escrow/${job.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientId: user.uid }),
            }).then(async response => {
              const result = await response.json();
              if (result.success) {
                showAlert('success', 'Payment Released! 🎉', `₱${result.providerShare?.toLocaleString() || ''} has been released to the provider. Thank you!`);
              } else {
                // Revert on error
                setJob(prev => prev ? { ...prev, status: job.status } : null);
                showAlert('error', 'Error', result.error || 'Failed to release payment. Please try again.');
              }
            }).catch(error => {
              console.error('Error releasing escrow:', error);
              setJob(prev => prev ? { ...prev, status: job.status } : null);
              showAlert('error', 'Error', 'Failed to release payment. Please try again.');
            });
          } else if (isPayFirstComplete) {
            // Fire and forget Firestore update
            updateDoc(doc(db, 'bookings', job.id), {
              status: 'payment_received',
              clientConfirmedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }).catch(err => {
              console.error('Error updating booking:', err);
              setJob(prev => prev ? { ...prev, status: job.status } : null);
            });
            // Send FCM push to provider about payment received (fire and forget)
            if (job.providerId) {
              pushNotifications.paymentReceivedToProvider(job.providerId, job.id, calculateTotal()).catch(console.error);
            }
            showAlert('success', 'Job Complete! 🎉', 'Waiting for provider to confirm completion.');
          } else {
            // Fire and forget Firestore update
            updateDoc(doc(db, 'bookings', job.id), {
              status: 'pending_payment',
              clientConfirmedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }).catch(err => {
              console.error('Error updating booking:', err);
              setJob(prev => prev ? { ...prev, status: job.status } : null);
            });
            showAlert('info', 'Confirmed! 👍', 'Please proceed to pay the provider.');
          }
        } catch (error) {
          console.error('Error confirming:', error);
          // Revert optimistic update on error
          setJob(prev => prev ? { ...prev, status: job.status } : null);
          showAlert('error', 'Error', 'Failed to confirm completion. Please try again.');
        } finally {
          setUpdating(false);
        }
      }
    });
  };

  const handlePayment = async (method: 'gcash' | 'maya' | 'cash') => {
    if (!job || !user) return;
    if (updating) return; // Prevent double-click
    
    const baseAmount = job.totalAmount || job.price || 0;
    const additionalChargesTotal = (job.additionalCharges || [])
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + (c.total || 0), 0);
    const isPayFirstWithAdditional = job.paymentPreference === 'pay_first' && job.isPaidUpfront && additionalChargesTotal > 0;
    const amount = isPayFirstWithAdditional ? additionalChargesTotal : (baseAmount + additionalChargesTotal);
    const isUpfrontPayment = job.paymentPreference === 'pay_first' && !job.isPaidUpfront && 
      ['accepted', 'traveling', 'arrived'].includes(job.status);
    
    setUpdating(true);
    try {
      if (method === 'cash') {
        // Optimistic update for cash payments
        if (isUpfrontPayment) {
          setJob(prev => prev ? { ...prev, isPaidUpfront: true, upfrontPaidAmount: amount, paymentMethod: 'cash' } : null);
          // Fire and forget Firestore update
          updateDoc(doc(db, 'bookings', job.id), {
            isPaidUpfront: true,
            upfrontPaidAmount: amount,
            upfrontPaidAt: serverTimestamp(),
            paymentMethod: 'cash',
            updatedAt: serverTimestamp(),
          }).catch(err => {
            console.error('Error updating booking:', err);
            setJob(prev => prev ? { ...prev, isPaidUpfront: false } : null);
          });
          showAlert('success', 'Payment Recorded! 💵', 'The provider can now start working on your job.');
        } else if (isPayFirstWithAdditional) {
          setJob(prev => prev ? { ...prev, status: 'payment_received', additionalChargesPaid: true, paymentMethod: 'cash' } : null);
          // Fire and forget Firestore update
          updateDoc(doc(db, 'bookings', job.id), {
            status: 'payment_received',
            additionalChargesPaid: true,
            additionalChargesPaidAmount: amount,
            clientPaidAt: serverTimestamp(),
            paymentMethod: 'cash',
            updatedAt: serverTimestamp(),
          }).catch(err => {
            console.error('Error updating booking:', err);
            setJob(prev => prev ? { ...prev, status: job.status } : null);
          });
          // Send FCM push to provider about payment received (fire and forget)
          if (job.providerId) {
            pushNotifications.paymentReceivedToProvider(job.providerId, job.id, amount).catch(console.error);
          }
          showAlert('success', 'Additional Payment Complete! ✅', 'Provider will confirm to complete the job.');
        } else {
          setJob(prev => prev ? { ...prev, status: 'payment_received', paymentMethod: 'cash', finalAmount: amount } : null);
          // Fire and forget Firestore update
          updateDoc(doc(db, 'bookings', job.id), {
            status: 'payment_received',
            clientPaidAt: serverTimestamp(),
            paymentMethod: 'cash',
            finalAmount: amount,
            updatedAt: serverTimestamp(),
          }).catch(err => {
            console.error('Error updating booking:', err);
            setJob(prev => prev ? { ...prev, status: job.status } : null);
          });
          // Send FCM push to provider about payment received (fire and forget)
          if (job.providerId) {
            pushNotifications.paymentReceivedToProvider(job.providerId, job.id, amount).catch(console.error);
          }
          showAlert('success', 'Payment Recorded! 💵', 'Waiting for provider confirmation.');
        }
        setShowPaymentModal(false);
      } else {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';
        const response = await fetch(`${apiUrl}/payments/create-source`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: job.id,
            userId: user.uid,
            amount,
            type: method, // gcash or paymaya
            description: `Payment for ${job.title || job.serviceCategory}`,
            platform: 'web', // Use web redirect URLs
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Payment API error:', errorText);
          throw new Error('Payment service unavailable');
        }
        
        const result = await response.json();
        
        if (result.success && result.checkoutUrl) {
          setShowPaymentModal(false);
          window.open(result.checkoutUrl, '_blank');
          showAlert('payment', 'Complete Your Payment 💳', `A new tab has opened for ${method === 'gcash' ? 'GCash' : 'Maya'} payment. Complete the payment there, then return here.`);
        } else if (result.checkoutUrl) {
          // Handle legacy response format
          setShowPaymentModal(false);
          window.open(result.checkoutUrl, '_blank');
          showAlert('payment', 'Complete Your Payment 💳', `A new tab has opened for ${method === 'gcash' ? 'GCash' : 'Maya'} payment. Complete the payment there, then return here.`);
        } else {
          showAlert('error', 'Payment Failed', result.error || 'Failed to create payment. Please try again.');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      showAlert('error', 'Payment Error', 'Something went wrong. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelJob = async () => {
    if (!job || !user) return;
    const reason = selectedCancelReason === 'Other' ? cancelReason : selectedCancelReason;
    if (!reason) {
      alert('Please select or enter a reason');
      return;
    }

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'bookings', job.id), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelReason: reason,
        cancelledBy: 'client',
      });
      
      // Create notification for provider
      if (job.providerId) {
        const { collection: firestoreCollection, doc: firestoreDoc, setDoc } = await import('firebase/firestore');
        const notifRef = firestoreDoc(firestoreCollection(db, 'notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          type: 'booking_cancelled',
          title: '❌ Job Cancelled',
          message: `Client cancelled the ${job.serviceCategory || 'service'} job.${reason ? ` Reason: ${reason}` : ''}`,
          userId: job.providerId,
          targetUserId: job.providerId,
          bookingId: job.id,
          jobId: job.id,
          createdAt: new Date(),
          read: false,
        });
        
        // Send FCM push notification to provider
        pushNotifications.jobCancelledToUser(job.providerId, job.id, 'Client');
      }
      
      setShowCancelModal(false);
      showAlert('success', 'Cancelled', 'Your booking has been cancelled.');
      setTimeout(() => router.push('/client/bookings'), 1500);
    } catch (error) {
      console.error('Error cancelling:', error);
      showAlert('error', 'Error', 'Failed to cancel booking. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleAcceptCounterOffer = async () => {
    if (!job) return;
    const counterPrice = job.counterOfferPrice || 0;
    const systemFee = counterPrice * 0.05;
    const totalAmount = counterPrice + systemFee;

    if (!confirm(`Accept provider's offer of ₱${counterPrice.toLocaleString()}?\n\nTotal with fee: ₱${totalAmount.toLocaleString()}`)) return;

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'bookings', job.id), {
        status: 'pending',
        providerPrice: counterPrice,
        offeredPrice: counterPrice,
        systemFee: systemFee,
        totalAmount: totalAmount,
        counterOfferAcceptedAt: serverTimestamp(),
      });
      alert('Counter offer accepted. Waiting for provider confirmation.');
    } catch (error) {
      console.error('Error accepting counter offer:', error);
      alert('Failed to accept counter offer');
    } finally {
      setUpdating(false);
    }
  };

  const handleNewOffer = async () => {
    if (!newOfferPrice || parseFloat(newOfferPrice) <= 0) {
      alert('Please enter a valid offer price');
      return;
    }

    setUpdating(true);
    try {
      const newPrice = parseFloat(newOfferPrice);
      const systemFee = newPrice * 0.05;
      const totalAmount = newPrice + systemFee;

      await updateDoc(doc(db, 'bookings', job!.id), {
        status: 'pending_negotiation',
        offeredPrice: newPrice,
        priceNote: newOfferNote,
        systemFee: systemFee,
        totalAmount: totalAmount,
      });

      setShowNewOfferModal(false);
      setNewOfferPrice('');
      setNewOfferNote('');
      alert('Your new offer has been sent to the provider.');
    } catch (error) {
      console.error('Error sending new offer:', error);
      alert('Failed to send new offer');
    } finally {
      setUpdating(false);
    }
  };

  const handleApproveCharge = async (chargeId: string) => {
    if (!job) return;
    const updatedCharges = (job.additionalCharges || []).map(c =>
      c.id === chargeId ? { ...c, status: 'approved' as const, approvedAt: new Date().toISOString() } : c
    );
    const hasPending = updatedCharges.some(c => c.status === 'pending');
    try {
      await updateDoc(doc(db, 'bookings', job.id), { 
        additionalCharges: updatedCharges,
        hasAdditionalPending: hasPending,
      });
      alert('Additional charge approved.');
    } catch (error) {
      console.error('Error approving charge:', error);
    }
  };

  const handleRejectCharge = async (chargeId: string) => {
    if (!job) return;
    const updatedCharges = (job.additionalCharges || []).map(c =>
      c.id === chargeId ? { ...c, status: 'rejected' as const, rejectedAt: new Date().toISOString() } : c
    );
    const hasPending = updatedCharges.some(c => c.status === 'pending');
    try {
      await updateDoc(doc(db, 'bookings', job.id), { 
        additionalCharges: updatedCharges,
        hasAdditionalPending: hasPending,
      });
      alert('Additional charge rejected.');
    } catch (error) {
      console.error('Error rejecting charge:', error);
    }
  };

  const formatCurrency = (amount: number) => `₱${amount.toLocaleString()}`;

  const statusConfig = job ? STATUS_CONFIG[job.status] || STATUS_CONFIG.pending : STATUS_CONFIG.pending;

  if (authLoading || loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#00B14F]" />
        </div>
      </ClientLayout>
    );
  }

  if (!job) {
    return (
      <ClientLayout>
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-500">Booking not found</p>
          <Link href="/client/bookings" className="text-[#00B14F] mt-4 inline-block">
            Back to Bookings
          </Link>
        </div>
      </ClientLayout>
    );
  }

  const canCancel = ['pending', 'pending_negotiation', 'counter_offer', 'accepted'].includes(job.status);
  const showConfirmButton = job.status === 'pending_completion';
  const pendingCharges = (job.additionalCharges || []).filter(c => c.status === 'pending');
  const providerName = providerInfo?.name || 'Provider';
  const providerPhone = providerInfo?.phone;
  const providerPhoto = providerInfo?.photo;
  const providerRating = providerInfo?.rating || 0;
  const providerReviewCount = providerInfo?.reviewCount || 0;
  const providerPoints = providerInfo?.points || 0;
  const providerTier = providerInfo?.tier;

  // Helper to get tier display info from tier name
  const getTierDisplayFromName = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'diamond': return { name: 'Diamond', color: 'bg-cyan-500' };
      case 'platinum': return { name: 'Platinum', color: 'bg-gray-400' };
      case 'gold': return { name: 'Gold', color: 'bg-yellow-500' };
      case 'silver': return { name: 'Silver', color: 'bg-gray-300' };
      case 'bronze': return { name: 'Bronze', color: 'bg-amber-600' };
      default: return null;
    }
  };

  return (
    <ClientLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Payment Callback Message */}
        {paymentMessage && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 shadow-sm ${
            paymentMessage.type === 'success' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200'
          }`}>
            {paymentMessage.type === 'success' ? (
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            )}
            <span className={`font-medium ${
              paymentMessage.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              {paymentMessage.text}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Job Details</h1>
        </div>

        {/* Status Banner - Enhanced */}
        <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl mb-5 shadow-sm border ${
          job.status === 'pending' ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200' :
          job.status === 'completed' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' :
          job.status === 'cancelled' ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200' :
          `${statusConfig.bgColor} border-transparent`
        }`}>
          <div className={`w-3 h-3 rounded-full animate-pulse ${statusConfig.color.replace('text-', 'bg-')}`} />
          <span className={`font-bold text-base ${statusConfig.color}`}>{statusConfig.label}</span>
        </div>

        {/* Provider Traveling/Arrived Banner - Prominent tracking CTA */}
        {(job.status === 'traveling' || job.status === 'arrived') && (
          <Link
            href={`/client/bookings/${job.id}/tracking`}
            className={`flex items-center gap-4 p-5 rounded-2xl mb-5 shadow-lg transition-transform hover:scale-[1.02] ${
              job.status === 'traveling' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
            }`}
          >
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              {job.status === 'traveling' ? (
                <Navigation className="w-7 h-7 text-white" />
              ) : (
                <CheckCircle className="w-7 h-7 text-white" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-lg">
                {job.status === 'traveling' ? 'Provider is on the way!' : 'Provider has arrived!'}
              </p>
              <p className="text-sm text-white/90 mt-0.5">Tap to track their location in real-time</p>
            </div>
            <ChevronRight className="w-6 h-6 text-white" />
          </Link>
        )}

        {/* Admin Review Banner - Enhanced */}
        {!job.adminApproved && (job.status === 'pending' || job.status === 'pending_negotiation') && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-blue-800">Under Admin Review</p>
                <p className="text-blue-600 text-sm mt-1 leading-relaxed">
                  Your request is being reviewed by our team. We'll notify you once it's sent to the provider.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Approved Banner - Sent to Provider */}
        {job.adminApproved && job.status === 'pending' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 mb-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-green-800">Sent to Provider</p>
                <p className="text-green-600 text-sm mt-1 leading-relaxed">
                  Your request has been approved and sent to the provider. Waiting for their response.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Service Request Section - Enhanced */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Service Request</h3>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
              <Tag className="w-5 h-5 text-[#00B14F]" />
            </div>
            <span className="text-lg font-bold text-gray-900">{job.serviceCategory}</span>
          </div>
          {job.description && (
            <p className="text-gray-600 leading-relaxed">{job.description}</p>
          )}
          {!job.description && (
            <p className="text-gray-400 italic text-sm">See attached photos/videos</p>
          )}
        </div>

        {/* Provider Info - Enhanced */}
        {(job.provider || job.providerId) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Service Provider</h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                {providerPhoto ? (
                  <img src={providerPhoto} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-gray-100" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <User className="w-7 h-7 text-gray-400" />
                  </div>
                )}
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-lg">{providerName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                    <Star className={`w-4 h-4 ${providerRating > 0 ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                    <span className="text-sm font-semibold text-amber-700">
                      {providerRating > 0 ? providerRating.toFixed(1) : '0.0'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    ({providerReviewCount} {providerReviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
                {/* Provider Tier Badge */}
                {(providerTier || providerPoints > 0) && (
                  <div className="mt-2">
                    {(() => {
                      const tierDisplay = providerTier ? getTierDisplayFromName(providerTier) : (providerPoints > 0 ? getTierInfo(providerPoints) : null);
                      if (!tierDisplay) return null;
                      return (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${tierDisplay.color} text-white shadow-sm`}>
                          {tierDisplay.name}
                        </span>
                      );
                    })()}
                  </div>
                )}
                {/* Provider Badges */}
                {job.provider && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {getProviderBadges({
                      completedJobs: job.provider.completedJobs || 0,
                      rating: job.provider.rating || 0,
                      reviewCount: job.provider.reviewCount || 0,
                      avgResponseTime: job.provider.avgResponseTime || 999,
                      isVerified: job.provider.isVerified || false,
                    }).map(badge => (
                      <span key={badge.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${badge.color}`}>
                        <span>{badge.icon}</span>
                        {badge.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Contact Buttons - Only show after admin approval */}
            {job.adminApproved ? (
              <div className="mt-5">
                <div className="flex gap-3">
                  {providerPhone && (
                    <a
                      href={`tel:${providerPhone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-green-50 to-emerald-50 text-[#00B14F] rounded-xl font-semibold hover:from-green-100 hover:to-emerald-100 transition-all border border-green-200"
                    >
                      <Phone className="w-5 h-5" />
                      Call
                    </a>
                  )}
                  <Link
                    href={`/chat/new?recipientId=${job.providerId}&jobId=${job.id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-green-50 to-emerald-50 text-[#00B14F] rounded-xl font-semibold hover:from-green-100 hover:to-emerald-100 transition-all border border-green-200"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Message
                  </Link>
                </div>
                {/* Track Provider Button */}
                {(job.status === 'traveling' || job.status === 'arrived') && (
                  <Link
                    href={`/client/bookings/${job.id}/tracking`}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
                  >
                    <MapPin className="w-5 h-5" />
                    {job.status === 'traveling' ? 'Track Provider Location' : 'View Provider Location'}
                  </Link>
                )}
              </div>
            ) : (
              <div className="mt-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-sm text-amber-700 font-medium">
                  Contact options will be available once admin approves your request.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Location - Enhanced */}
        {(job.address || job.barangay) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-gradient-to-br from-red-50 to-rose-100 rounded-xl">
                <MapPin className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Location</p>
                <p className="font-semibold text-gray-900 mt-1">
                  {job.address || (
                    `${job.houseNumber ? job.houseNumber + ', ' : ''}${job.streetAddress ? job.streetAddress + ', ' : ''}${job.barangay ? 'Brgy. ' + job.barangay + ', ' : ''}Maasin City`
                  )}
                </p>
                {job.landmark && (
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-medium">Landmark:</span> {job.landmark}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Media Files - Enhanced */}
        {job.mediaFiles && job.mediaFiles.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Attached Media</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {job.mediaFiles.map((file, idx) => {
                const imageUrl = typeof file === 'string' ? file : (file?.url || file?.uri);
                const isVideo = typeof file === 'object' && file?.isVideo;
                if (!imageUrl) return null;
                return (
                  <div key={idx} className="relative flex-shrink-0 group">
                    <img
                      src={imageUrl}
                      alt={`Media ${idx + 1}`}
                      className="w-28 h-28 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-all ring-2 ring-gray-100 group-hover:ring-[#00B14F]"
                      onClick={() => setSelectedImage(imageUrl)}
                    />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                          <div className="w-0 h-0 border-l-[14px] border-l-gray-800 border-y-[9px] border-y-transparent ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Status - Enhanced */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Payment Status</h3>
          <div className={`rounded-xl p-5 border-2 ${
            job.paymentStatus === 'held' ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300' : 
            job.paymentStatus === 'released' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300' :
            job.isPaidUpfront ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' : 
            'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  job.paymentStatus === 'held' ? 'bg-emerald-100' : 
                  job.paymentStatus === 'released' ? 'bg-blue-100' :
                  job.isPaidUpfront ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  {job.paymentStatus === 'held' ? (
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  ) : job.paymentStatus === 'released' ? (
                    <Banknote className="w-6 h-6 text-blue-600" />
                  ) : job.isPaidUpfront ? (
                    <CreditCard className="w-6 h-6 text-green-600" />
                  ) : (
                    <Clock className="w-6 h-6 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className={`font-bold text-base ${
                    job.paymentStatus === 'held' ? 'text-emerald-700' : 
                    job.paymentStatus === 'released' ? 'text-blue-700' :
                    job.isPaidUpfront ? 'text-green-700' : 'text-amber-700'
                  }`}>
                    {job.paymentStatus === 'held' ? 'Payment Held in Escrow' : 
                     job.paymentStatus === 'released' ? 'Payment Released' :
                     job.isPaidUpfront ? 'Paid Upfront' : 
                     job.status === 'awaiting_payment' ? 'Awaiting Payment' :
                     job.paymentPreference === 'pay_first' ? 'PAID' : 'Pay Later'}
                  </p>
                  <p className={`text-sm mt-0.5 ${
                    job.paymentStatus === 'held' ? 'text-emerald-600' : 
                    job.paymentStatus === 'released' ? 'text-blue-600' :
                    job.isPaidUpfront ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {job.paymentStatus === 'held' ? 'Released when you confirm job completion' : 
                     job.paymentStatus === 'released' ? 'Payment sent to provider' :
                     job.isPaidUpfront ? 'Payment secured' : 
                     job.status === 'awaiting_payment' ? 'Complete payment to submit booking' :
                     job.paymentPreference === 'pay_first' ? 'Pay before service starts' : 'Pay after job completion'}
                  </p>
                </div>
              </div>
              {(job.isPaidUpfront || job.paymentStatus === 'held') && (
                <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm">
                  {job.paymentStatus === 'held' ? 'SECURED' : 'PAID'}
                </span>
              )}
            </div>
            {job.paymentMethod && (
              <p className="text-sm text-gray-500 mt-3 pt-3 border-t border-gray-200">
                Payment method: <span className="font-medium">{job.paymentMethod === 'gcash' ? 'GCash' : job.paymentMethod === 'maya' ? 'Maya' : job.paymentMethod}</span>
              </p>
            )}
          </div>
        </div>

        {/* Price Breakdown - Enhanced */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Price Breakdown</h3>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5 space-y-4">
            {/* Negotiation info */}
            {job.isNegotiable && (
              <div className="text-sm text-gray-500 pb-4 border-b border-green-200">
                <p>Provider's Fixed Price: {formatCurrency(job.providerFixedPrice || 0)}</p>
                <p>Your Offer: {formatCurrency(job.offeredPrice || 0)}</p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Service Price</span>
              <span className="font-bold text-gray-900 text-lg">
                {formatCurrency(job.providerPrice || job.offeredPrice || job.price || 0)}
              </span>
            </div>

            {/* Discount */}
            {job.hasDiscount && (job.discountAmount || 0) > 0 && (
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 -mx-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-200 rounded-lg">
                      <Tag className="w-4 h-4 text-green-700" />
                    </div>
                    <span className="text-sm font-bold text-green-800">Provider Discount</span>
                  </div>
                  <span className="font-bold text-green-600 text-lg">-{formatCurrency(job.discountAmount || 0)}</span>
                </div>
                {job.discountReason && (
                  <p className="text-sm text-green-700 mt-2 italic pl-8">"{job.discountReason}"</p>
                )}
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">System Fee (5%)</span>
              <span className="font-semibold text-gray-700">{formatCurrency(job.systemFee || 0)}</span>
            </div>

            {/* Additional Charges */}
            {job.additionalCharges && job.additionalCharges.length > 0 && (
              <div className="pt-4 border-t border-green-200">
                <p className="font-bold text-gray-800 mb-3">Additional Charges</p>
                {job.additionalCharges.map((charge, index) => (
                  <div key={charge.id || index} className="mb-3 bg-white/60 rounded-xl p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 truncate flex-1 font-medium">{charge.reason || charge.description}</span>
                      <span className="text-sm font-bold text-gray-900 ml-2">+{formatCurrency(charge.total || charge.amount)}</span>
                    </div>
                    {charge.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleRejectCharge(charge.id)}
                          className="flex-1 py-2.5 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveCharge(charge.id)}
                          className="flex-1 py-2.5 bg-green-100 text-green-600 rounded-xl text-sm font-bold hover:bg-green-200 transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                    {charge.status === 'approved' && (
                      <p className="text-xs text-green-600 mt-2 font-semibold">✓ Approved</p>
                    )}
                    {charge.status === 'rejected' && (
                      <p className="text-xs text-red-600 mt-2 font-semibold">✗ Rejected</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t-2 border-green-300 flex justify-between items-center">
              <span className="font-bold text-gray-900 text-lg">Total Amount</span>
              <span className="text-2xl font-black text-[#00B14F]">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </div>

        {/* Counter Offer Section - Enhanced */}
        {job.status === 'counter_offer' && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-2xl p-5 mb-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <span className="font-bold text-purple-800 text-lg">Provider's Counter Offer</span>
            </div>
            <p className="text-4xl font-black text-purple-600">{formatCurrency(job.counterOfferPrice || 0)}</p>
            <p className="text-sm text-gray-500 mt-2">
              Total with fee: <span className="font-semibold">{formatCurrency((job.counterOfferPrice || 0) * 1.05)}</span>
            </p>
            {job.counterOfferNote && (
              <p className="text-purple-700 mt-3 italic bg-purple-100/50 p-3 rounded-xl">"{job.counterOfferNote}"</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowNewOfferModal(true)}
                className="flex-1 py-3.5 bg-white border-2 border-purple-400 text-purple-600 rounded-xl font-bold hover:bg-purple-50 transition-colors"
              >
                Make New Offer
              </button>
              <button
                onClick={handleAcceptCounterOffer}
                disabled={updating}
                className="flex-1 py-3.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md"
              >
                Accept
              </button>
            </div>
          </div>
        )}

        {/* Review Prompt - Enhanced */}
        {(job.status === 'completed' || job.status === 'payment_received') && !job.reviewed && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-6 mb-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Star className="w-7 h-7 text-amber-500" />
              </div>
              <span className="text-xl font-bold text-amber-800">How was your experience?</span>
            </div>
            <p className="text-amber-700 mb-5 leading-relaxed">
              Your feedback helps other clients and rewards great providers. Take a moment to share your experience!
            </p>
            <Link
              href={`/client/bookings/${job.id}/review`}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"
            >
              <Star className="w-5 h-5" />
              Leave a Review
            </Link>
          </div>
        )}

        {/* Review Submitted Badge - Enhanced */}
        {(job.status === 'completed' || job.status === 'payment_received') && job.reviewed && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 mb-4 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-green-700 text-lg">Review Submitted</p>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${star <= (job.reviewRating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                  />
                ))}
                <span className="text-sm text-green-600 ml-2 font-medium">Thank you for your feedback!</span>
              </div>
            </div>
          </div>
        )}

        {/* View Receipt Button - Show for completed jobs */}
        {(job.status === 'completed' || job.status === 'payment_received') && (
          <Link
            href={`/client/bookings/${job.id}/receipt`}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold mb-4 transition-colors border border-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Receipt
          </Link>
        )}

        {/* Job ID & Created - Enhanced */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Job ID</span>
            <span className="font-mono text-gray-700 bg-white px-2 py-1 rounded-lg text-xs">{job.id}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-2">
            <span className="text-gray-500">Created</span>
            <span className="text-gray-700 font-medium">{job.createdAt}</span>
          </div>
        </div>

        {/* Action Buttons - Enhanced */}
        <div className="space-y-4">
          {/* Cancel Button - for pending statuses */}
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full py-3.5 border-2 border-red-300 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors"
            >
              Cancel Job
            </button>
          )}

          {/* PAY FIRST - Pay Upfront Button */}
          {job.paymentPreference === 'pay_first' && !job.isPaidUpfront && 
           ['accepted', 'traveling', 'arrived'].includes(job.status) && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 rounded-2xl p-5 text-center">
                <div className="p-3 bg-amber-100 rounded-xl inline-block mb-3">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
                <p className="text-xl font-bold text-amber-800">Payment Required First</p>
                <p className="text-3xl font-black text-amber-600 mt-3">{formatCurrency(calculateTotal())}</p>
                <p className="text-sm text-amber-700 mt-3 leading-relaxed">
                  Payment is required before the provider can start working.
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <CreditCard className="w-5 h-5" />
                Pay Now (Before Service)
              </button>
            </div>
          )}

          {/* PAY FIRST - Already paid, waiting for work */}
          {job.paymentPreference === 'pay_first' && job.isPaidUpfront && 
           ['accepted', 'traveling', 'arrived', 'in_progress'].includes(job.status) && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 text-center">
              <div className="p-3 bg-green-100 rounded-xl inline-block mb-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-bold text-green-700 text-lg">Payment Complete</p>
              <p className="text-green-600 font-semibold mt-1">{formatCurrency(job.upfrontPaidAmount || job.totalAmount || 0)} paid</p>
              <p className="text-sm text-green-600 mt-3 leading-relaxed">
                Provider can now proceed with the work. You'll be notified when complete.
              </p>
            </div>
          )}

          {/* Pending Completion - Confirm Button */}
          {showConfirmButton && (
            <div className="space-y-4">
              {/* Show different message based on payment status */}
              {job.paymentPreference === 'pay_first' && job.isPaidUpfront ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-5 text-center border-2 border-green-200">
                  <div className="p-3 bg-green-100 rounded-xl inline-block mb-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="font-bold text-green-800 text-lg">Provider Marked Work Complete</p>
                  <p className="text-sm text-green-700 mt-2 leading-relaxed">
                    Payment already done! Please confirm if you're satisfied with the work.
                  </p>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 text-center border-2 border-amber-200">
                  <div className="p-3 bg-amber-100 rounded-xl inline-block mb-3">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                  </div>
                  <p className="font-bold text-amber-800 text-lg">Provider Marked Work Complete</p>
                  <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                    Please confirm if you're satisfied with the work to proceed to payment.
                  </p>
                </div>
              )}

              {/* Pending additional charges warning */}
              {pendingCharges.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <span className="font-bold text-red-800">Additional Charges Pending</span>
                  </div>
                  <p className="text-sm text-red-600 mb-4 leading-relaxed">
                    Please review and approve or reject additional charges before confirming completion.
                  </p>
                  {pendingCharges.map((charge) => (
                    <div key={charge.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                      <p className="text-gray-700 font-medium">{charge.reason || charge.description}</p>
                      <p className="font-bold text-red-600 text-lg mt-1">+{formatCurrency(charge.total || charge.amount)}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleRejectCharge(charge.id)}
                          className="flex-1 py-2.5 bg-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-200 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveCharge(charge.id)}
                          className="flex-1 py-2.5 bg-green-100 text-green-600 rounded-xl text-sm font-bold hover:bg-green-200 transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleConfirmCompletion}
                disabled={updating || job.hasAdditionalPending}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  job.hasAdditionalPending 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                }`}
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {(() => {
                  if (job.hasAdditionalPending) return 'Review Additional Charges First';
                  const approvedCharges = (job.additionalCharges || []).filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.total || c.amount || 0), 0);
                  const discount = job.discountAmount || job.discount || 0;
                  if (approvedCharges > discount) return 'Confirm & Pay';
                  if (discount > approvedCharges) return 'Confirm & Get Refund';
                  return 'Confirm';
                })()}
              </button>
            </div>
          )}

          {/* Pending Payment - Pay Button */}
          {job.status === 'pending_payment' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 text-center border-2 border-blue-200">
                <div className="p-3 bg-blue-100 rounded-xl inline-block mb-3">
                  <CreditCard className="w-8 h-8 text-blue-500" />
                </div>
                <p className="font-bold text-blue-800 text-lg">
                  {job.paymentPreference === 'pay_first' && job.isPaidUpfront 
                    ? 'Additional Payment Required' 
                    : 'Payment Required'}
                </p>
                <p className="text-3xl font-black text-blue-700 mt-3">
                  {formatCurrency((() => {
                    const baseAmount = job.totalAmount || job.price || 0;
                    const additionalTotal = (job.additionalCharges || [])
                      .filter(c => c.status === 'approved')
                      .reduce((sum, c) => sum + (c.total || 0), 0);
                    if (job.paymentPreference === 'pay_first' && job.isPaidUpfront) {
                      return additionalTotal;
                    }
                    return baseAmount + additionalTotal;
                  })())}
                </p>
                {job.paymentPreference === 'pay_first' && job.isPaidUpfront && (
                  <p className="text-sm text-blue-500 mt-2">
                    (Original {formatCurrency(job.upfrontPaidAmount || job.totalAmount || 0)} already paid)
                  </p>
                )}
                <p className="text-sm text-blue-600 mt-3 leading-relaxed">
                  {job.paymentPreference === 'pay_first' && job.isPaidUpfront 
                    ? 'Please pay the additional charges to complete this job.'
                    : 'Please pay the provider to complete this job.'}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Wallet className="w-5 h-5" />
                Pay Now
              </button>
            </div>
          )}

          {/* Payment Received - Waiting for provider */}
          {job.status === 'payment_received' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-green-700">Payment Sent!</p>
              <p className="text-sm text-green-600 mt-1">
                Waiting for provider to confirm receipt of payment.
              </p>
            </div>
          )}

          {/* Completed - View Receipt */}
          {job.status === 'completed' && (
            <Link
              href={`/client/bookings/${job.id}/receipt`}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              View Receipt
            </Link>
          )}
        </div>

        <div className="h-8" />
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Cancel Job</h3>
              <button onClick={() => setShowCancelModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">Please let us know why you're cancelling this job request.</p>

            <div className="space-y-2 mb-4">
              {CANCEL_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => setSelectedCancelReason(reason)}
                  className={`w-full p-3 rounded-xl text-left border-2 transition-colors flex items-center gap-3 ${
                    selectedCancelReason === reason
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedCancelReason === reason ? 'border-red-500' : 'border-gray-300'
                  }`}>
                    {selectedCancelReason === reason && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                  </div>
                  <span className={selectedCancelReason === reason ? 'font-semibold' : ''}>{reason}</span>
                </button>
              ))}
            </div>

            {selectedCancelReason === 'Other' && (
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please specify your reason..."
                className="w-full p-3 border border-gray-200 rounded-xl mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
              >
                Keep Job
              </button>
              <button
                onClick={handleCancelJob}
                disabled={updating || !selectedCancelReason}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50"
              >
                {updating ? 'Cancelling...' : 'Cancel Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Offer Modal */}
      {showNewOfferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Make New Offer</h3>
              <button onClick={() => setShowNewOfferModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Provider's counter: {formatCurrency(job?.counterOfferPrice || 0)} | 
              Your last offer: {formatCurrency(job?.offeredPrice || 0)}
            </p>

            <label className="block text-sm font-semibold text-gray-700 mb-2">Your New Offer (₱)</label>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 mb-4">
              <span className="text-lg font-bold text-[#00B14F]">₱</span>
              <input
                type="number"
                value={newOfferPrice}
                onChange={(e) => setNewOfferPrice(e.target.value)}
                placeholder="Enter your offer"
                className="flex-1 py-3 px-2 bg-transparent text-lg text-gray-900 focus:outline-none"
              />
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-2">Note (optional)</label>
            <textarea
              value={newOfferNote}
              onChange={(e) => setNewOfferNote(e.target.value)}
              placeholder="Add a note..."
              className="w-full p-3 border border-gray-200 rounded-xl mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#00B14F]"
              rows={3}
            />

            {newOfferPrice && (
              <div className="bg-green-50 rounded-xl p-3 mb-4">
                <p className="text-sm text-gray-500">Your total with fee:</p>
                <p className="text-xl font-bold text-[#00B14F]">
                  {formatCurrency(parseFloat(newOfferPrice || '0') * 1.05)}
                </p>
              </div>
            )}

            <button
              onClick={handleNewOffer}
              disabled={updating}
              className="w-full py-3 bg-[#00B14F] text-white rounded-xl font-bold hover:bg-[#009940] disabled:opacity-50"
            >
              {updating ? 'Sending...' : 'Send Offer'}
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Select Payment Method</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">Amount to Pay</p>
              <p className="text-2xl font-bold text-[#00B14F]">{formatCurrency(calculateTotal())}</p>
            </div>

            <div className="space-y-3 mb-6">
              {/* GCash */}
              <button
                onClick={() => handlePayment('gcash')}
                disabled={updating}
                className="w-full p-4 border-2 border-gray-200 rounded-xl flex items-center gap-4 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">G</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">GCash</p>
                  <p className="text-sm text-gray-500">Pay with your GCash wallet</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Maya */}
              <button
                onClick={() => handlePayment('maya')}
                disabled={updating}
                className="w-full p-4 border-2 border-gray-200 rounded-xl flex items-center gap-4 hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">Maya</p>
                  <p className="text-sm text-gray-500">Pay with your Maya wallet</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Cash */}
              <button
                onClick={() => handlePayment('cash')}
                disabled={updating}
                className="w-full p-4 border-2 border-gray-200 rounded-xl flex items-center gap-4 hover:border-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">Cash</p>
                  <p className="text-sm text-gray-500">Pay cash to provider</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Secure payment powered by PayMongo
            </p>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-bounce-in">
            {/* Icon Header */}
            <div className={`p-8 flex flex-col items-center ${
              alertModal.type === 'success' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
              alertModal.type === 'error' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
              alertModal.type === 'payment' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
              'bg-gradient-to-br from-amber-500 to-orange-600'
            }`}>
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                {alertModal.type === 'success' && <CheckCircle className="w-10 h-10 text-white" />}
                {alertModal.type === 'error' && <AlertCircle className="w-10 h-10 text-white" />}
                {alertModal.type === 'payment' && <CreditCard className="w-10 h-10 text-white" />}
                {alertModal.type === 'info' && <AlertCircle className="w-10 h-10 text-white" />}
              </div>
              <h3 className="text-xl font-bold text-white text-center">{alertModal.title}</h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-600 text-center mb-6 leading-relaxed">{alertModal.message}</p>
              
              {alertModal.type === 'payment' && (
                <div className="bg-blue-50 rounded-xl p-4 mb-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-sm text-blue-700">
                    After completing payment, this page will automatically update. If not, tap the button below.
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setAlertModal({ show: false, type: 'info', title: '', message: '' });
                  if (alertModal.type === 'payment') {
                    window.location.reload();
                  }
                  alertModal.onClose?.();
                }}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                  alertModal.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-lg hover:shadow-emerald-500/30' :
                  alertModal.type === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-lg hover:shadow-red-500/30' :
                  alertModal.type === 'payment' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30' :
                  'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-amber-500/30'
                }`}
              >
                {alertModal.type === 'payment' ? 'Refresh Page' : 'Got it'}
              </button>
            </div>
          </div>

          <style jsx>{`
            @keyframes bounce-in {
              0% { transform: scale(0.8); opacity: 0; }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); opacity: 1; }
            }
            .animate-bounce-in {
              animation: bounce-in 0.3s ease-out forwards;
            }
          `}</style>
        </div>
      )}

      {/* Confirm Dialog Modal */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-bounce-in">
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-8 flex flex-col items-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white text-center">{confirmDialog.title}</h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-600 text-center mb-6 leading-relaxed">{confirmDialog.message}</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} })}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>

          <style jsx>{`
            @keyframes bounce-in {
              0% { transform: scale(0.8); opacity: 0; }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); opacity: 1; }
            }
            .animate-bounce-in {
              animation: bounce-in 0.3s ease-out forwards;
            }
          `}</style>
        </div>
      )}
    </ClientLayout>
  );
}