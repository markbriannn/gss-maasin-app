'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc, collection, query, where, getDocs, addDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import Link from 'next/link';
import { 
  ArrowLeft, Phone, MessageCircle, MapPin, Calendar, 
  CheckCircle, AlertCircle, User, Navigation, Play,
  Plus, Minus, Loader2, Banknote, Image as ImageIcon
} from 'lucide-react';
import { pushNotifications } from '@/lib/pushNotifications';

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
  paymentStatus?: string;
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

  const handleAccept = async () => {
    await updateJobStatus('accepted', { acceptedAt: serverTimestamp() });
    // Send FCM push to client
    if (job?.clientId) {
      const providerName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : job.providerName || 'Provider';
      pushNotifications.jobAcceptedToClient(job.clientId, job.id, providerName);
    }
  };
  
  const handleStartTraveling = async () => {
    await updateJobStatus('traveling', { travelingAt: serverTimestamp() });
    // Send FCM push to client
    if (job?.clientId) {
      pushNotifications.providerTravelingToClient(job.clientId, job.id);
    }
  };
  
  const handleArrived = async () => {
    await updateJobStatus('arrived', { arrivedAt: serverTimestamp() });
    // Send FCM push to client
    if (job?.clientId) {
      pushNotifications.providerArrivedToClient(job.clientId, job.id);
    }
  };
  
  const handleStartWork = async () => {
    await updateJobStatus('in_progress', { startedAt: serverTimestamp() });
    // Send FCM push to client
    if (job?.clientId) {
      pushNotifications.jobStartedToClient(job.clientId, job.id, job.serviceCategory || 'Service');
    }
  };

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
    // Send FCM push to client
    if (job.clientId) {
      pushNotifications.jobCompletedToClient(job.clientId, job.id, job.serviceCategory || 'Service');
    }
  };

  const handleConfirmPayment = async () => {
    if (!job || !user) return;
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

    // Award gamification points for job completion
    try {
      const gamificationRef = doc(db, 'gamification', user.uid);
      const clientGamificationRef = doc(db, 'gamification', job.clientId);
      
      // Award provider points (JOB_COMPLETED: 100 points)
      const providerGamDoc = await getDoc(gamificationRef);
      if (providerGamDoc.exists()) {
        await updateDoc(gamificationRef, {
          points: (providerGamDoc.data().points || 0) + 100,
          'stats.completedJobs': (providerGamDoc.data().stats?.completedJobs || 0) + 1,
          'stats.totalEarnings': (providerGamDoc.data().stats?.totalEarnings || 0) + providerEarnings,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(gamificationRef, {
          points: 100,
          role: 'PROVIDER',
          stats: { completedJobs: 1, totalEarnings: providerEarnings, rating: 0, reviewCount: 0 },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Award client points (BOOKING_COMPLETED: 50 points)
      const clientGamDoc = await getDoc(clientGamificationRef);
      if (clientGamDoc.exists()) {
        await updateDoc(clientGamificationRef, {
          points: (clientGamDoc.data().points || 0) + 50,
          'stats.completedBookings': (clientGamDoc.data().stats?.completedBookings || 0) + 1,
          'stats.totalSpent': (clientGamDoc.data().stats?.totalSpent || 0) + finalAmount,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(clientGamificationRef, {
          points: 50,
          role: 'CLIENT',
          stats: { completedBookings: 1, totalSpent: finalAmount, reviewsGiven: 0 },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      
      console.log('Gamification points awarded for job completion');
    } catch (gamError) {
      console.error('Error awarding gamification points:', gamError);
      // Don't fail the job completion if gamification fails
    }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex-1">
                <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full ${
                  job.status === 'pending' ? 'bg-amber-400/20 text-amber-100' :
                  job.status === 'completed' ? 'bg-emerald-400/20 text-emerald-100' :
                  job.status === 'cancelled' || job.status === 'rejected' ? 'bg-red-400/20 text-red-100' :
                  'bg-white/20 text-white'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Admin Approval Banner */}
          {!job.adminApproved && job.status !== 'cancelled' && job.status !== 'rejected' && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center gap-3 shadow-sm">
              <div className="p-2 bg-amber-100 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-amber-700 text-sm font-medium">Awaiting admin approval before you can start</p>
            </div>
          )}

          {/* Payment Badge - Escrow System */}
          {(job.paymentStatus || job.paymentPreference) && (
            <div className={`rounded-2xl p-4 mb-4 flex items-center gap-3 shadow-sm ${
              job.paymentStatus === 'held' || job.isPaidUpfront 
                ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200' 
                : job.paymentStatus === 'released'
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
                : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'
            }`}>
              <div className={`p-2 rounded-xl ${
                job.paymentStatus === 'held' || job.isPaidUpfront ? 'bg-emerald-100' : 
                job.paymentStatus === 'released' ? 'bg-blue-100' : 'bg-amber-100'
              }`}>
                {job.paymentStatus === 'held' || job.isPaidUpfront ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : job.paymentStatus === 'released' ? (
                  <Banknote className="w-5 h-5 text-blue-600" />
                ) : (
                  <Banknote className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div>
                <span className={`font-semibold ${
                  job.paymentStatus === 'held' || job.isPaidUpfront ? 'text-emerald-700' : 
                  job.paymentStatus === 'released' ? 'text-blue-700' : 'text-amber-700'
                }`}>
                  {job.paymentStatus === 'held' ? 'Payment Held in Escrow' : 
                   job.paymentStatus === 'released' ? 'Payment Released to You' :
                   job.isPaidUpfront ? 'Client Paid Upfront' : 
                   'Awaiting Client Payment'}
                </span>
                {job.paymentStatus === 'held' && (
                  <p className="text-xs text-emerald-600 mt-0.5">Released when client confirms completion</p>
                )}
              </div>
            </div>
          )}

          {/* Tracking Banner */}
          {(job.status === 'traveling' || job.status === 'arrived') && (
            <Link
              href={`/provider/jobs/${job.id}/tracking`}
              className={`flex items-center gap-4 p-4 rounded-2xl mb-4 shadow-lg ${
                job.status === 'traveling' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-500/30' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30'
              }`}
            >
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Navigation className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">
                  {job.status === 'traveling' ? 'Navigate to Client' : 'You have arrived'}
                </p>
                <p className="text-sm text-white/80">Tap to view map and directions</p>
              </div>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          {/* Client Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50 mb-4 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="relative">
                {job.clientPhoto ? (
                  <img src={job.clientPhoto} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-md" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-md">
                    <User className="w-7 h-7 text-blue-500" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-lg">{job.clientName}</p>
                <p className="text-sm text-gray-500">Client</p>
              </div>
              <div className="flex gap-2">
                {job.clientPhone && (
                  <a href={`tel:${job.clientPhone}`} className="p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl text-emerald-600 hover:shadow-md transition-all border border-emerald-100">
                    <Phone className="w-5 h-5" />
                  </a>
                )}
                <button onClick={() => handleStartChat(job.clientId)} className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-blue-600 hover:shadow-md transition-all border border-blue-100">
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50 mb-4 border border-gray-100">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Schedule</p>
                  <p className="font-semibold text-gray-900">{job.scheduledDate} at {job.scheduledTime}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Location</p>
                  <p className="font-semibold text-gray-900">{job.clientAddress || job.address || 'Maasin City'}</p>
                </div>
              </div>
              {job.description && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500 font-medium mb-2">Description</p>
                  <p className="text-gray-700 bg-gray-50 rounded-xl p-3">{job.description}</p>
                </div>
              )}
            </div>
          </div>

        {/* Media */}
          {((job.mediaFiles && job.mediaFiles.length > 0) || (job.mediaUrls && job.mediaUrls.length > 0)) && (
            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50 mb-4 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                </div>
                Attached Photos ({(job.mediaFiles || job.mediaUrls || []).length})
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {(job.mediaFiles || job.mediaUrls || []).map((media, idx) => {
                  const imageUrl = typeof media === 'string' ? media : (media as { url?: string; uri?: string })?.url || (media as { uri?: string })?.uri;
                  const isVideo = typeof media === 'object' && (media as { isVideo?: boolean })?.isVideo;
                  if (!imageUrl) return null;
                  return isVideo ? (
                    <a key={idx} href={imageUrl} target="_blank" rel="noopener noreferrer" className="w-full h-24 bg-gray-800 rounded-xl flex items-center justify-center shadow-md">
                      <span className="text-white text-xl">▶</span>
                    </a>
                  ) : (
                    <a key={idx} href={imageUrl} target="_blank" rel="noopener noreferrer">
                      <img src={imageUrl} alt="" className="w-full h-24 object-cover rounded-xl shadow-md hover:shadow-lg transition-shadow" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50 mb-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Pricing</h3>
              {canModifyPricing && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowChargeModal(true)}
                    className="text-sm px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 rounded-lg flex items-center gap-1 font-medium border border-blue-100 hover:shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" /> Charge
                  </button>
                  <button
                    onClick={() => setShowDiscountModal(true)}
                    className="text-sm px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-600 rounded-lg flex items-center gap-1 font-medium border border-emerald-100 hover:shadow-sm transition-all"
                  >
                    <Minus className="w-4 h-4" /> Discount
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Service Fee</span>
                <span className="font-semibold text-gray-900">{formatCurrency(job.providerPrice || job.fixedPrice || job.totalAmount || job.price || 0)}</span>
              </div>
              {(job.additionalCharges || []).map(charge => (
                <div key={charge.id} className="flex justify-between items-center text-sm">
                  <span className={charge.status === 'rejected' ? 'text-red-400 line-through' : 'text-gray-500'}>
                    {charge.description}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                      charge.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                      charge.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {charge.status}
                    </span>
                  </span>
                  <span className={charge.status === 'rejected' ? 'text-red-400 line-through' : 'text-gray-700 font-medium'}>
                    +{formatCurrency(charge.total || charge.amount)}
                  </span>
                </div>
              ))}
              {job.discount && job.discount > 0 && (
                <div className="flex justify-between items-center text-sm text-emerald-600">
                  <span>Discount {job.discountReason && `(${job.discountReason})`}</span>
                  <span className="font-medium">-{formatCurrency(job.discount)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{formatCurrency(calculateTotal())}</span>
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
                  className="py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Accept
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="py-4 border-2 border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-all"
                >
                  Reject
                </button>
              </div>
            )}

            {job.status === 'accepted' && (
              <button
                onClick={handleStartTraveling}
                disabled={updating}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                Start Traveling
              </button>
            )}

            {job.status === 'traveling' && (
              <button
                onClick={handleArrived}
                disabled={updating}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                I Have Arrived
              </button>
            )}

            {job.status === 'arrived' && (
              <button
                onClick={handleStartWork}
                disabled={updating}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                Start Working
              </button>
            )}

            {job.status === 'in_progress' && (
              <button
                onClick={handleMarkDone}
                disabled={updating}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Mark as Done
              </button>
            )}

            {job.status === 'payment_received' && (
              <button
                onClick={handleConfirmPayment}
                disabled={updating}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Confirm Payment Received
              </button>
            )}

            {job.status === 'completed' && (
              <Link
                href={`/provider/jobs/${job.id}/receipt`}
                className="w-full py-4 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-2xl font-bold hover:shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Banknote className="w-5 h-5" />
                View Earnings Receipt
              </Link>
            )}
          </div>
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
