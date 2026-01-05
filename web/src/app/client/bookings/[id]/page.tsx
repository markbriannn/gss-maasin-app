'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
}

interface JobData {
  id: string;
  status: string;
  title?: string;
  serviceCategory: string;
  description?: string;
  address?: string;
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

export default function JobDetailsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobData | null>(null);
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

  // Real-time listener for provider info
  useEffect(() => {
    if (!job?.providerId) return;

    const unsubscribe = onSnapshot(doc(db, 'users', job.providerId), (docSnap) => {
      if (docSnap.exists()) {
        const pData = docSnap.data();
        const providerRating = pData.rating || pData.averageRating || 0;
        const providerReviewCount = pData.reviewCount || pData.totalReviews || 0;
        const completedJobs = pData.completedJobs || pData.jobsCompleted || 0;
        
        setJob(prev => prev ? {
          ...prev,
          provider: {
            id: docSnap.id,
            name: `${pData.firstName || ''} ${pData.lastName || ''}`.trim() || 'Provider',
            phone: pData.phone || pData.phoneNumber,
            photo: pData.profilePhoto,
            rating: providerRating,
            reviewCount: providerReviewCount,
            completedJobs,
            tier: pData.tier,
            points: pData.points || 0,
          },
        } : null);
      }
    });

    return () => unsubscribe();
  }, [job?.providerId]);

  const calculateTotal = useCallback(() => {
    if (!job) return 0;
    const basePrice = job.providerPrice || job.fixedPrice || job.totalAmount || job.price || 0;
    const approvedCharges = (job.additionalCharges || [])
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + (c.total || c.amount || 0), 0);
    const discount = job.discountAmount || job.discount || 0;
    return basePrice + approvedCharges - discount;
  }, [job]);

  const handleConfirmCompletion = async () => {
    if (!job) return;
    const additionalChargesTotal = (job.additionalCharges || [])
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + (c.total || 0), 0);
    const hasAdditionalToPay = additionalChargesTotal > 0;
    const isPayFirstComplete = job.paymentPreference === 'pay_first' && job.isPaidUpfront && !hasAdditionalToPay;

    if (!confirm(isPayFirstComplete 
      ? 'Are you satisfied with the work? This will complete the job.'
      : 'Are you satisfied with the work? This will proceed to payment.')) return;

    setUpdating(true);
    try {
      if (isPayFirstComplete) {
        await updateDoc(doc(db, 'bookings', job.id), {
          status: 'payment_received',
          clientConfirmedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        alert('Job marked as complete. Waiting for provider confirmation.');
      } else {
        await updateDoc(doc(db, 'bookings', job.id), {
          status: 'pending_payment',
          clientConfirmedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        alert('Confirmed! Please proceed to pay the provider.');
      }
    } catch (error) {
      console.error('Error confirming:', error);
      alert('Failed to confirm completion');
    } finally {
      setUpdating(false);
    }
  };

  const handlePayment = async (method: 'gcash' | 'maya' | 'cash') => {
    if (!job || !user) return;
    
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
        if (isUpfrontPayment) {
          await updateDoc(doc(db, 'bookings', job.id), {
            isPaidUpfront: true,
            upfrontPaidAmount: amount,
            upfrontPaidAt: serverTimestamp(),
            paymentMethod: 'cash',
            updatedAt: serverTimestamp(),
          });
          alert('Payment recorded! The provider can now start working.');
        } else if (isPayFirstWithAdditional) {
          await updateDoc(doc(db, 'bookings', job.id), {
            status: 'payment_received',
            additionalChargesPaid: true,
            additionalChargesPaidAmount: amount,
            clientPaidAt: serverTimestamp(),
            paymentMethod: 'cash',
            updatedAt: serverTimestamp(),
          });
          alert('Additional payment complete! Provider will confirm to complete the job.');
        } else {
          await updateDoc(doc(db, 'bookings', job.id), {
            status: 'payment_received',
            clientPaidAt: serverTimestamp(),
            paymentMethod: 'cash',
            finalAmount: amount,
            updatedAt: serverTimestamp(),
          });
          alert('Payment recorded! Waiting for provider confirmation.');
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
          alert('Please complete the payment in the new tab. Once done, refresh this page.');
        } else if (result.checkoutUrl) {
          // Handle legacy response format
          setShowPaymentModal(false);
          window.open(result.checkoutUrl, '_blank');
          alert('Please complete the payment in the new tab. Once done, refresh this page.');
        } else {
          alert(result.error || 'Failed to create payment. Please try again.');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelJob = async () => {
    if (!job) return;
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
      setShowCancelModal(false);
      alert('Booking cancelled');
      router.back();
    } catch (error) {
      console.error('Error cancelling:', error);
      alert('Failed to cancel booking');
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
  const providerName = job.provider?.name || 'Provider';
  const providerPhone = job.provider?.phone;
  const providerPhoto = job.provider?.photo;
  const providerRating = job.provider?.rating || 0;
  const providerReviewCount = job.provider?.reviewCount || 0;
  const providerPoints = job.provider?.points || 0;

  return (
    <ClientLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Job Details</h1>
        </div>

        {/* Status Banner */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-4 ${statusConfig.bgColor}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.color.replace('text-', 'bg-')}`} />
          <span className={`font-semibold ${statusConfig.color}`}>{statusConfig.label}</span>
        </div>

        {/* Provider Traveling/Arrived Banner - Prominent tracking CTA */}
        {(job.status === 'traveling' || job.status === 'arrived') && (
          <Link
            href={`/client/bookings/${job.id}/tracking`}
            className={`flex items-center gap-4 p-4 rounded-xl mb-4 ${
              job.status === 'traveling' ? 'bg-blue-500' : 'bg-emerald-500'
            }`}
          >
            <div className="p-2.5 bg-white/20 rounded-xl">
              {job.status === 'traveling' ? (
                <Navigation className="w-6 h-6 text-white" />
              ) : (
                <CheckCircle className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">
                {job.status === 'traveling' ? 'Provider is on the way!' : 'Provider has arrived!'}
              </p>
              <p className="text-sm text-white/90">Tap to track their location in real-time</p>
            </div>
            <ChevronRight className="w-6 h-6 text-white" />
          </Link>
        )}

        {/* Admin Review Banner */}
        {!job.adminApproved && (job.status === 'pending' || job.status === 'pending_negotiation') && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800 text-sm">Under Admin Review</p>
              <p className="text-blue-600 text-sm">
                Your request is being reviewed by our team. We'll notify you once it's sent to the provider.
              </p>
            </div>
          </div>
        )}

        {/* Approved Banner - Sent to Provider */}
        {job.adminApproved && job.status === 'pending' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Sent to Provider</p>
              <p className="text-green-600 text-sm">
                Your request has been approved and sent to the provider. Waiting for their response.
              </p>
            </div>
          </div>
        )}

        {/* Job Info Section */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2">{job.title || job.serviceCategory}</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full">
            <Tag className="w-3.5 h-3.5 text-[#00B14F]" />
            <span className="text-sm font-medium text-[#00B14F]">{job.serviceCategory}</span>
          </div>
          {job.description && (
            <p className="text-gray-600 mt-3">{job.description}</p>
          )}
        </div>

        {/* Provider Info */}
        {(job.provider || job.providerId) && (
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Service Provider</h3>
            <div className="flex items-center gap-4">
              {providerPhoto ? (
                <img src={providerPhoto} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{providerName}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className={`w-4 h-4 ${providerRating > 0 ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                  <span className="text-sm text-gray-600">
                    {providerRating > 0 || providerReviewCount > 0
                      ? `${providerRating.toFixed(1)} (${providerReviewCount} ${providerReviewCount === 1 ? 'review' : 'reviews'})`
                      : 'New Provider'}
                  </span>
                </div>
                {/* Provider Tier Badge */}
                {providerPoints > 0 && (
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getTierInfo(providerPoints).color} text-white`}>
                      {getTierInfo(providerPoints).name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Buttons - Only show after admin approval */}
            {job.adminApproved ? (
              <div className="mt-4">
                <div className="flex gap-3">
                  {providerPhone && (
                    <a
                      href={`tel:${providerPhone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-50 text-[#00B14F] rounded-xl font-semibold hover:bg-green-100"
                    >
                      <Phone className="w-5 h-5" />
                      Call
                    </a>
                  )}
                  <Link
                    href={`/chat/new?recipientId=${job.providerId}&jobId=${job.id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-50 text-[#00B14F] rounded-xl font-semibold hover:bg-green-100"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Message
                  </Link>
                </div>
                {/* Track Provider Button */}
                {(job.status === 'traveling' || job.status === 'arrived') && (
                  <Link
                    href={`/client/bookings/${job.id}/tracking`}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600"
                  >
                    <MapPin className="w-5 h-5" />
                    {job.status === 'traveling' ? 'Track Provider Location' : 'View Provider Location'}
                  </Link>
                )}
              </div>
            ) : (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-500" />
                <p className="text-sm text-amber-700">
                  Contact options will be available once admin approves your request.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Location */}
        {job.address && (
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium text-gray-900">{job.address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Media Files - Horizontal Scroll */}
        {job.mediaFiles && job.mediaFiles.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Attached Media</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {job.mediaFiles.map((file, idx) => {
                const imageUrl = typeof file === 'string' ? file : (file?.url || file?.uri);
                const isVideo = typeof file === 'object' && file?.isVideo;
                if (!imageUrl) return null;
                return (
                  <div key={idx} className="relative flex-shrink-0">
                    <img
                      src={imageUrl}
                      alt={`Media ${idx + 1}`}
                      className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => setSelectedImage(imageUrl)}
                    />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                        <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center">
                          <div className="w-0 h-0 border-l-[12px] border-l-gray-800 border-y-[8px] border-y-transparent ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Preference */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Payment Method</h3>
          <div className={`rounded-xl p-4 border ${
            job.paymentPreference === 'pay_first' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {job.paymentPreference === 'pay_first' ? (
                  <CreditCard className="w-6 h-6 text-green-600" />
                ) : (
                  <Clock className="w-6 h-6 text-blue-600" />
                )}
                <div>
                  <p className={`font-bold ${job.paymentPreference === 'pay_first' ? 'text-green-700' : 'text-blue-700'}`}>
                    {job.paymentPreference === 'pay_first' ? 'Pay First' : 'Pay Later'}
                  </p>
                  <p className={`text-sm ${job.paymentPreference === 'pay_first' ? 'text-green-600' : 'text-blue-600'}`}>
                    {job.paymentPreference === 'pay_first' ? 'Pay before service starts' : 'Pay after job completion'}
                  </p>
                </div>
              </div>
              {job.isPaidUpfront && (
                <span className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg">PAID</span>
              )}
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Price Breakdown</h3>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
            {/* Negotiation info */}
            {job.isNegotiable && (
              <div className="text-sm text-gray-500 pb-3 border-b border-green-200">
                <p>Provider's Fixed Price: {formatCurrency(job.providerFixedPrice || 0)}</p>
                <p>Your Offer: {formatCurrency(job.offeredPrice || 0)}</p>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">Service Price</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(job.providerPrice || job.offeredPrice || job.price || 0)}
              </span>
            </div>

            {/* Discount */}
            {job.hasDiscount && (job.discountAmount || 0) > 0 && (
              <div className="bg-green-100 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Provider Discount</span>
                  </div>
                  <span className="font-bold text-green-600">-{formatCurrency(job.discountAmount || 0)}</span>
                </div>
                {job.discountReason && (
                  <p className="text-sm text-green-600 mt-1 italic">"{job.discountReason}"</p>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">System Fee (5%)</span>
              <span className="font-semibold text-gray-900">{formatCurrency(job.systemFee || 0)}</span>
            </div>

            {/* Additional Charges */}
            {job.additionalCharges && job.additionalCharges.length > 0 && (
              <div className="pt-3 border-t border-green-200">
                <p className="font-semibold text-gray-700 mb-2">Additional Charges</p>
                {job.additionalCharges.map((charge, index) => (
                  <div key={charge.id || index} className="mb-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 truncate flex-1">{charge.reason || charge.description}</span>
                      <span className="text-sm font-medium text-gray-900 ml-2">+{formatCurrency(charge.total || charge.amount)}</span>
                    </div>
                    {charge.status === 'pending' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleRejectCharge(charge.id)}
                          className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveCharge(charge.id)}
                          className="flex-1 py-2 bg-green-100 text-green-600 rounded-lg text-sm font-semibold hover:bg-green-200"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                    {charge.status === 'approved' && (
                      <p className="text-xs text-green-600 mt-1">✓ Approved</p>
                    )}
                    {charge.status === 'rejected' && (
                      <p className="text-xs text-red-600 mt-1">✗ Rejected</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-green-200 flex justify-between">
              <span className="font-bold text-gray-900">Total Amount</span>
              <span className="text-xl font-bold text-[#00B14F]">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </div>

        {/* Counter Offer Section */}
        {job.status === 'counter_offer' && (
          <div className="bg-purple-50 border border-purple-300 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-5 h-5 text-purple-600" />
              <span className="font-bold text-purple-800">Provider's Counter Offer</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(job.counterOfferPrice || 0)}</p>
            <p className="text-sm text-gray-500 mt-1">
              Total with fee: {formatCurrency((job.counterOfferPrice || 0) * 1.05)}
            </p>
            {job.counterOfferNote && (
              <p className="text-purple-700 mt-2 italic">"{job.counterOfferNote}"</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowNewOfferModal(true)}
                className="flex-1 py-3 bg-white border-2 border-purple-500 text-purple-600 rounded-xl font-semibold hover:bg-purple-50"
              >
                Make New Offer
              </button>
              <button
                onClick={handleAcceptCounterOffer}
                disabled={updating}
                className="flex-1 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 disabled:opacity-50"
              >
                Accept
              </button>
            </div>
          </div>
        )}

        {/* Review Prompt - Completed but not reviewed */}
        {job.status === 'completed' && !job.reviewed && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Star className="w-7 h-7 text-amber-500" />
              <span className="text-lg font-bold text-amber-800">How was your experience?</span>
            </div>
            <p className="text-amber-700 mb-4">
              Your feedback helps other clients and rewards great providers. Take a moment to share your experience!
            </p>
            <Link
              href={`/client/bookings/${job.id}/review`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600"
            >
              <Star className="w-5 h-5" />
              Leave a Review
            </Link>
          </div>
        )}

        {/* Review Submitted Badge */}
        {job.status === 'completed' && job.reviewed && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div className="flex-1">
              <p className="font-semibold text-green-700">Review Submitted</p>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= (job.reviewRating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                  />
                ))}
                <span className="text-sm text-green-600 ml-2">Thank you for your feedback!</span>
              </div>
            </div>
          </div>
        )}

        {/* Job ID & Created */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <p className="text-sm text-gray-500">Job ID: {job.id}</p>
          <p className="text-sm text-gray-400">Created: {job.createdAt}</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Cancel Button - for pending statuses */}
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full py-3 border border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50"
            >
              Cancel Request
            </button>
          )}

          {/* PAY FIRST - Pay Upfront Button */}
          {job.paymentPreference === 'pay_first' && !job.isPaidUpfront && 
           ['accepted', 'traveling', 'arrived'].includes(job.status) && (
            <div className="space-y-4">
              <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-lg font-bold text-amber-800">Payment Required First</p>
                <p className="text-2xl font-bold text-amber-600 mt-2">{formatCurrency(calculateTotal())}</p>
                <p className="text-sm text-amber-700 mt-2">
                  You selected "Pay First". Please pay now so the provider can start working.
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Pay Now (Before Service)
              </button>
            </div>
          )}

          {/* PAY FIRST - Already paid, waiting for work */}
          {job.paymentPreference === 'pay_first' && job.isPaidUpfront && 
           ['accepted', 'traveling', 'arrived', 'in_progress'].includes(job.status) && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-bold text-green-700">Payment Complete</p>
              <p className="text-green-600">{formatCurrency(job.upfrontPaidAmount || job.totalAmount || 0)} paid</p>
              <p className="text-sm text-green-600 mt-2">
                Provider can now proceed with the work. You'll be notified when complete.
              </p>
            </div>
          )}

          {/* Pending Completion - Confirm Button */}
          {showConfirmButton && (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-semibold text-amber-800">Provider Marked Work Complete</p>
                <p className="text-sm text-amber-700 mt-1">
                  Please confirm if you're satisfied with the work to proceed to payment.
                </p>
              </div>

              {/* Pending additional charges warning */}
              {pendingCharges.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-red-800">Additional Charges Pending</span>
                  </div>
                  <p className="text-sm text-red-600 mb-3">
                    Please review and approve or reject additional charges before confirming completion.
                  </p>
                  {pendingCharges.map((charge) => (
                    <div key={charge.id} className="bg-white rounded-lg p-3 mb-2">
                      <p className="text-gray-700">{charge.reason || charge.description}</p>
                      <p className="font-bold text-red-600">+{formatCurrency(charge.total || charge.amount)}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleRejectCharge(charge.id)}
                          className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveCharge(charge.id)}
                          className="flex-1 py-2 bg-green-100 text-green-600 rounded-lg text-sm font-semibold"
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
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 ${
                  job.hasAdditionalPending 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {job.hasAdditionalPending ? 'Review Additional Charges First' : 'Confirm & Proceed to Pay'}
              </button>
            </div>
          )}

          {/* Pending Payment - Pay Button */}
          {job.status === 'pending_payment' && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <CreditCard className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="font-semibold text-blue-800">
                  {job.paymentPreference === 'pay_first' && job.isPaidUpfront 
                    ? 'Additional Payment Required' 
                    : 'Payment Required'}
                </p>
                <p className="text-2xl font-bold text-blue-700 mt-2">
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
                  <p className="text-sm text-blue-500 mt-1">
                    (Original {formatCurrency(job.upfrontPaidAmount || job.totalAmount || 0)} already paid)
                  </p>
                )}
                <p className="text-sm text-blue-600 mt-2">
                  {job.paymentPreference === 'pay_first' && job.isPaidUpfront 
                    ? 'Please pay the additional charges to complete this job.'
                    : 'Please pay the provider to complete this job.'}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 flex items-center justify-center gap-2"
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
    </ClientLayout>
  );
}