'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import Link from 'next/link';
import { 
  ArrowLeft, Phone, MessageCircle, MapPin, Calendar, 
  CheckCircle, AlertCircle, User, Navigation, Play,
  Plus, Minus, Loader2, Banknote, Image as ImageIcon
} from 'lucide-react';

interface AdditionalCharge {
  id: string;
  description: string;
  amount: number;
  total?: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface JobData {
  id: string;
  status: string;
  serviceCategory: string;
  description?: string;
  scheduledDate: string;
  scheduledTime: string;
  address?: string;
  price?: number;
  totalAmount?: number;
  finalAmount?: number;
  providerPrice?: number;
  fixedPrice?: number;
  providerId: string;
  providerName: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientPhoto?: string;
  clientAddress?: string;
  paymentPreference?: string;
  isPaidUpfront?: boolean;
  adminApproved?: boolean;
  additionalCharges?: AdditionalCharge[];
  discount?: number;
  discountReason?: string;
  mediaUrls?: string[];
  mediaFiles?: Array<{ url?: string; uri?: string; isVideo?: boolean } | string>;
  createdAt?: Date;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  accepted: { label: 'Accepted', color: 'text-green-600', bgColor: 'bg-green-50' },
  traveling: { label: 'On The Way', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  arrived: { label: 'Arrived', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  pending_completion: { label: 'Awaiting Client Confirmation', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  pending_payment: { label: 'Awaiting Payment', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  payment_received: { label: 'Payment Received', color: 'text-green-600', bgColor: 'bg-green-50' },
  completed: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-50' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-50' },
  rejected: { label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-50' },
};

const CANCEL_REASONS = [
  'Schedule conflict',
  'Too far from my location',
  'Job scope too complex',
  'Not my expertise',
  'Emergency situation',
  'Other',
];

export default function ProviderJobDetailsPage() {
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
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDescription, setChargeDescription] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!jobId || !user) return;

    const unsubscribe = onSnapshot(doc(db, 'bookings', jobId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Fetch client info
        let clientInfo = { name: data.clientName || 'Client', phone: '', photo: '', address: '' };
        if (data.clientId) {
          try {
            const clientDoc = await getDoc(doc(db, 'users', data.clientId));
            if (clientDoc.exists()) {
              const cData = clientDoc.data();
              let fullAddress = '';
              if (cData.houseNumber) fullAddress += cData.houseNumber + ', ';
              if (cData.streetAddress) fullAddress += cData.streetAddress + ', ';
              if (cData.barangay) fullAddress += 'Brgy. ' + cData.barangay + ', ';
              fullAddress += 'Maasin City';
              
              clientInfo = {
                name: `${cData.firstName || ''} ${cData.lastName || ''}`.trim() || data.clientName,
                phone: cData.phone || cData.phoneNumber || '',
                photo: cData.profilePhoto || '',
                address: fullAddress,
              };
            }
          } catch (e) {
            console.error('Error fetching client:', e);
          }
        }

        setJob({
          id: docSnap.id,
          ...data,
          clientName: clientInfo.name,
          clientPhone: clientInfo.phone,
          clientPhoto: clientInfo.photo,
          clientAddress: clientInfo.address || data.address,
        } as JobData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [jobId, user]);

  const calculateTotal = useCallback(() => {
    if (!job) return 0;
    const basePrice = job.providerPrice || job.fixedPrice || job.totalAmount || job.price || 0;
    const approvedCharges = (job.additionalCharges || [])
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + (c.total || c.amount || 0), 0);
    const discount = job.discount || 0;
    return basePrice + approvedCharges - discount;
  }, [job]);

  const updateJobStatus = async (newStatus: string, extraData: Record<string, unknown> = {}) => {
    if (!job) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'bookings', job.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...extraData,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update job status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAccept = () => updateJobStatus('accepted', { acceptedAt: serverTimestamp() });
  const handleStartTraveling = () => updateJobStatus('traveling', { travelingAt: serverTimestamp() });
  const handleArrived = () => updateJobStatus('arrived', { arrivedAt: serverTimestamp() });
  const handleStartWork = () => updateJobStatus('in_progress', { startedAt: serverTimestamp() });

  const handleStartChat = async (clientId: string) => {
    if (!user?.uid || !clientId) return;
    try {
      // Check if conversation already exists
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(conversationsQuery);
      let existingConversationId: string | null = null;
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.participants?.includes(clientId)) {
          existingConversationId = docSnap.id;
        }
      });

      if (existingConversationId) {
        router.push(`/chat/${existingConversationId}`);
      } else {
        // Create new conversation
        const newConversation = await addDoc(collection(db, 'conversations'), {
          participants: [user.uid, clientId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
          jobId: jobId,
        });
        router.push(`/chat/${newConversation.id}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat');
    }
  };
  
  const handleMarkDone = async () => {
    if (!job) return;
    const finalAmount = calculateTotal();
    await updateJobStatus('pending_completion', { 
      markedDoneAt: serverTimestamp(),
      finalAmount,
    });
  };

  const handleConfirmPayment = async () => {
    if (!job) return;
    const finalAmount = calculateTotal();
    const systemFee = finalAmount * 0.05;
    const providerEarnings = finalAmount - systemFee;
    
    await updateJobStatus('completed', {
      completedAt: serverTimestamp(),
      finalAmount,
      systemFee,
      providerEarnings,
      providerConfirmedPaymentAt: serverTimestamp(),
    });
  };

  const handleReject = async () => {
    const reason = selectedCancelReason === 'Other' ? cancelReason : selectedCancelReason;
    if (!reason) {
      alert('Please select or enter a reason');
      return;
    }
    await updateJobStatus('rejected', {
      rejectedAt: serverTimestamp(),
      rejectReason: reason,
    });
    setShowCancelModal(false);
  };

  const handleAddCharge = async () => {
    if (!job || !chargeAmount || !chargeDescription) {
      alert('Please enter amount and description');
      return;
    }
    const amount = parseFloat(chargeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const newCharge: AdditionalCharge = {
      id: Date.now().toString(),
      description: chargeDescription,
      amount,
      total: amount,
      status: 'pending',
    };

    try {
      await updateDoc(doc(db, 'bookings', job.id), {
        additionalCharges: [...(job.additionalCharges || []), newCharge],
        hasAdditionalPending: true,
      });
      setShowChargeModal(false);
      setChargeAmount('');
      setChargeDescription('');
    } catch (error) {
      console.error('Error adding charge:', error);
      alert('Failed to add charge');
    }
  };

  const handleAddDiscount = async () => {
    if (!job || !discountAmount) {
      alert('Please enter discount amount');
      return;
    }
    const amount = parseFloat(discountAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await updateDoc(doc(db, 'bookings', job.id), {
        discount: amount,
        discountAmount: amount,
        discountReason: discountReason || 'Discount applied',
        hasDiscount: true,
      });
      setShowDiscountModal(false);
      setDiscountAmount('');
      setDiscountReason('');
    } catch (error) {
      console.error('Error adding discount:', error);
      alert('Failed to add discount');
    }
  };

  const formatCurrency = (amount: number) => `₱${amount.toLocaleString()}`;

  const statusConfig = job ? STATUS_CONFIG[job.status] || STATUS_CONFIG.pending : STATUS_CONFIG.pending;

  if (authLoading || loading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </ProviderLayout>
    );
  }

  if (!job) {
    return (
      <ProviderLayout>
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-500">Job not found</p>
          <Link href="/provider/jobs" className="text-[#00B14F] mt-4 inline-block">Back to Jobs</Link>
        </div>
      </ProviderLayout>
    );
  }

  const canModifyPricing = ['accepted', 'traveling', 'arrived', 'in_progress'].includes(job.status);

  return (
    <ProviderLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{job.serviceCategory}</h1>
            <span className={`text-sm px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Admin Approval Banner */}
        {!job.adminApproved && job.status !== 'cancelled' && job.status !== 'rejected' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="text-amber-700 text-sm">Awaiting admin approval before you can start</p>
          </div>
        )}

        {/* Payment Badge */}
        {job.paymentPreference && (
          <div className={`rounded-xl p-3 mb-4 flex items-center gap-2 ${job.isPaidUpfront ? 'bg-green-50' : 'bg-amber-50'}`}>
            {job.isPaidUpfront ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">Client Paid Upfront</span>
              </>
            ) : (
              <>
                <Banknote className="w-5 h-5 text-amber-600" />
                <span className="text-amber-700 font-medium">
                  {job.paymentPreference === 'pay_first' ? 'Pay First (Not Yet Paid)' : 'Pay After Service'}
                </span>
              </>
            )}
          </div>
        )}

        {/* Tracking Banner - Show when traveling or arrived */}
        {(job.status === 'traveling' || job.status === 'arrived') && (
          <Link
            href={`/provider/jobs/${job.id}/tracking`}
            className={`flex items-center gap-4 p-4 rounded-xl mb-4 ${
              job.status === 'traveling' ? 'bg-blue-500' : 'bg-emerald-500'
            }`}
          >
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Navigation className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">
                {job.status === 'traveling' ? 'Navigate to Client' : 'You have arrived'}
              </p>
              <p className="text-sm text-white/90">Tap to view map and directions</p>
            </div>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        {/* Client Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-4">
            {job.clientPhoto ? (
              <img src={job.clientPhoto} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{job.clientName}</p>
              <p className="text-sm text-gray-500">Client</p>
            </div>
            <div className="flex gap-2">
              {job.clientPhone && (
                <a href={`tel:${job.clientPhone}`} className="p-2 bg-green-50 rounded-full text-green-600">
                  <Phone className="w-5 h-5" />
                </a>
              )}
              <button onClick={() => handleStartChat(job.clientId)} className="p-2 bg-blue-50 rounded-full text-blue-600 hover:bg-blue-100 transition-colors">
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Schedule</p>
              <p className="font-medium text-gray-900">{job.scheduledDate} at {job.scheduledTime}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium text-gray-900">{job.clientAddress || job.address || 'Maasin City'}</p>
            </div>
          </div>
          {job.description && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Description</p>
              <p className="text-gray-700">{job.description}</p>
            </div>
          )}
        </div>

        {/* Media */}
        {((job.mediaFiles && job.mediaFiles.length > 0) || (job.mediaUrls && job.mediaUrls.length > 0)) && (
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Attached Photos ({(job.mediaFiles || job.mediaUrls || []).length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(job.mediaFiles || job.mediaUrls || []).map((media, idx) => {
                const imageUrl = typeof media === 'string' ? media : (media as { url?: string; uri?: string })?.url || (media as { uri?: string })?.uri;
                const isVideo = typeof media === 'object' && (media as { isVideo?: boolean })?.isVideo;
                if (!imageUrl) return null;
                return isVideo ? (
                  <a key={idx} href={imageUrl} target="_blank" rel="noopener noreferrer" className="w-full h-24 bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">▶</span>
                  </a>
                ) : (
                  <a key={idx} href={imageUrl} target="_blank" rel="noopener noreferrer">
                    <img src={imageUrl} alt="" className="w-full h-24 object-cover rounded-lg" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Pricing</h3>
            {canModifyPricing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowChargeModal(true)}
                  className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Charge
                </button>
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="text-sm px-3 py-1 bg-green-50 text-green-600 rounded-lg flex items-center gap-1"
                >
                  <Minus className="w-4 h-4" /> Discount
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Service Fee</span>
              <span className="font-medium">{formatCurrency(job.providerPrice || job.fixedPrice || job.totalAmount || job.price || 0)}</span>
            </div>
            {(job.additionalCharges || []).map(charge => (
              <div key={charge.id} className="flex justify-between text-sm">
                <span className={charge.status === 'rejected' ? 'text-red-400 line-through' : 'text-gray-500'}>
                  {charge.description}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                    charge.status === 'approved' ? 'bg-green-100 text-green-600' :
                    charge.status === 'rejected' ? 'bg-red-100 text-red-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {charge.status}
                  </span>
                </span>
                <span className={charge.status === 'rejected' ? 'text-red-400 line-through' : 'text-gray-700'}>
                  +{formatCurrency(charge.total || charge.amount)}
                </span>
              </div>
            ))}
            {job.discount && job.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount {job.discountReason && `(${job.discountReason})`}</span>
                <span>-{formatCurrency(job.discount)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-[#00B14F]">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {job.status === 'pending' && job.adminApproved && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAccept}
                disabled={updating}
                className="py-3 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Accept
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                className="py-3 border border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50"
              >
                Reject
              </button>
            </div>
          )}

          {job.status === 'accepted' && (
            <button
              onClick={handleStartTraveling}
              disabled={updating}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
              Start Traveling
            </button>
          )}

          {job.status === 'traveling' && (
            <button
              onClick={handleArrived}
              disabled={updating}
              className="w-full py-3 bg-indigo-500 text-white rounded-xl font-semibold hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
              I Have Arrived
            </button>
          )}

          {job.status === 'arrived' && (
            <button
              onClick={handleStartWork}
              disabled={updating}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              Start Working
            </button>
          )}

          {job.status === 'in_progress' && (
            <button
              onClick={handleMarkDone}
              disabled={updating}
              className="w-full py-3 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Mark as Done
            </button>
          )}

          {job.status === 'payment_received' && (
            <button
              onClick={handleConfirmPayment}
              disabled={updating}
              className="w-full py-3 bg-[#00B14F] text-white rounded-xl font-semibold hover:bg-[#009940] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Confirm Payment Received
            </button>
          )}

          {job.status === 'completed' && (
            <Link
              href={`/provider/jobs/${job.id}/receipt`}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 flex items-center justify-center gap-2"
            >
              <Banknote className="w-5 h-5" />
              View Earnings Receipt
            </Link>
          )}
        </div>
      </div>

      {/* Cancel/Reject Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Job</h3>
            <p className="text-gray-600 mb-4">Please select a reason:</p>
            <div className="space-y-2 mb-4">
              {CANCEL_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => setSelectedCancelReason(reason)}
                  className={`w-full p-3 rounded-lg text-left border transition-colors ${
                    selectedCancelReason === reason
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            {selectedCancelReason === 'Other' && (
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please specify..."
                className="w-full p-3 border border-gray-200 rounded-lg mb-4 resize-none"
                rows={3}
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={handleReject}
                disabled={updating || !selectedCancelReason}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {updating ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Additional Charge</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Amount (₱)</label>
                <input
                  type="number"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  placeholder="0"
                  className="w-full p-3 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Description</label>
                <input
                  type="text"
                  value={chargeDescription}
                  onChange={(e) => setChargeDescription(e.target.value)}
                  placeholder="e.g., Additional materials"
                  className="w-full p-3 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowChargeModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCharge}
                className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium"
              >
                Add Charge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Discount</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Amount (₱)</label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0"
                  className="w-full p-3 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Reason (optional)</label>
                <input
                  type="text"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="e.g., Loyal customer"
                  className="w-full p-3 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDiscount}
                className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium"
              >
                Add Discount
              </button>
            </div>
          </div>
        </div>
      )}
    </ProviderLayout>
  );
}
