import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { globalStyles } from '../../css/globalStyles';
import { jobDetailsStyles as styles } from '../../css/jobDetailsStyles';
import { db } from '../../config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot, collection, setDoc } from 'firebase/firestore';
import notificationService from '../../services/notificationService';
import paymentService from '../../services/paymentService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { sendPaymentReceipt } from '../../services/emailService';
import { APP_CONFIG } from '../../config/constants';
import { getProviderBadges, getProviderTier } from '../../utils/gamification';
import { BadgeList, TierBadge } from '../../components/gamification';
import { PremiumModal, ConfirmModal, PaymentModal as PremiumPaymentModal } from '../../components/common';
import { showInfoModal, showErrorModal, showSuccessModal } from '../../utils/modalManager';
import {
  calculateClientTotal,
  calculateUpfrontPayment,
  calculateCompletionPayment,
  formatCurrency,
  getAdditionalChargesSummary,
} from '../../utils/bookingCalculations';
import VoiceCall from '../../components/common/VoiceCall';
import QRPaymentModal from '../../components/common/QRPaymentModal';
import { initiateCall, listenToIncomingCalls, answerCall, declineCall, endCall } from '../../services/callService';

const JobDetailsScreen = ({ navigation, route }) => {
  const { job, jobId } = route.params || {};
  const { user } = useAuth();
  const { isDark, theme } = useTheme();

  // Helper function to safely convert Firestore timestamps
  const formatTimestamp = (timestamp, type = 'date') => {
    if (!timestamp) return null;
    // If it has toDate method (Firestore Timestamp)
    if (timestamp?.toDate) {
      const date = timestamp.toDate();
      return type === 'date' ? date.toLocaleDateString() : date.toLocaleTimeString();
    }
    // If it's an object with seconds (plain timestamp object)
    if (timestamp?.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return type === 'date' ? date.toLocaleDateString() : date.toLocaleTimeString();
    }
    // If it's already a string, return as-is
    if (typeof timestamp === 'string') return timestamp;
    // If it's a Date object
    if (timestamp instanceof Date) {
      return type === 'date' ? timestamp.toLocaleDateString() : timestamp.toLocaleTimeString();
    }
    return null;
  };

  // Format initial job data from route params
  const formatJobData = (data) => {
    if (!data) return null;
    return {
      ...data,
      scheduledDate: formatTimestamp(data.scheduledDate, 'date'),
      scheduledTime: formatTimestamp(data.scheduledTime, 'time'),
      createdAt: formatTimestamp(data.createdAt, 'date') || new Date().toLocaleDateString(),
    };
  };

  const [jobData, setJobData] = useState(formatJobData(job) || null);
  const [isLoading, setIsLoading] = useState(!job);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNewOfferModal, setShowNewOfferModal] = useState(false);
  const [newOfferPrice, setNewOfferPrice] = useState('');
  const [newOfferNote, setNewOfferNote] = useState('');
  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedCancelReason, setSelectedCancelReason] = useState('');
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const appState = useRef(AppState.currentState);

  // QR Payment modal state
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [qrPaymentUrl, setQRPaymentUrl] = useState(null);
  const [qrPaymentAmount, setQRPaymentAmount] = useState(0);

  // Premium modal states
  const [premiumModal, setPremiumModal] = useState({ visible: false, variant: 'success', title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ visible: false, type: 'confirm', title: '', message: '', onConfirm: null });
  const [showPremiumPayment, setShowPremiumPayment] = useState(false);

  // Voice call state
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  // Manual verify payment function
  const handleVerifyPayment = async () => {
    const bookingId = jobData?.id || jobId;
    if (!bookingId) return;

    setIsCheckingPayment(true);
    setPaymentError(null);

    try {
      const result = await paymentService.verifyAndProcessPayment(bookingId);
      console.log('Payment verification result:', result);

      if (result.success && result.status === 'paid') {
        // Update local state to reflect payment - check if it's upfront payment
        if (jobData.paymentPreference === 'pay_first' && !jobData.isPaidUpfront) {
          setJobData(prev => ({ ...prev, isPaidUpfront: true, upfrontPaidAmount: prev.totalAmount || prev.price }));
        } else {
          setJobData(prev => ({ ...prev, status: 'payment_received' }));
        }
        setPremiumModal({ visible: true, variant: 'success', title: 'Payment Successful! 💰', message: 'Your payment has been processed successfully!' });
      } else if (result.status === 'failed') {
        setPaymentError('Payment failed or expired. Please try again.');
      } else if (result.status === 'pending') {
        setPremiumModal({ visible: true, variant: 'warning', title: 'Payment Pending', message: 'Your payment is still being processed. Please complete the payment in GCash/Maya app.' });
      } else if (result.status === 'error') {
        setPaymentError(result.error || 'Could not verify payment. Please try again.');
      }
    } catch (error) {
      console.log('Payment verification error:', error);
      setPaymentError('Could not connect to server. Please check your internet and try again.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Check payment status when app returns from background (after GCash/Maya checkout)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        (jobData?.status === 'pending_payment' || jobData?.status === 'pending_completion' ||
          (jobData?.paymentPreference === 'pay_first' && !jobData?.isPaidUpfront))
      ) {
        // App came back to foreground, verify and process payment
        setIsCheckingPayment(true);
        const bookingId = jobData.id || jobId;

        try {
          // Use verify-and-process to handle webhook failures
          const result = await paymentService.verifyAndProcessPayment(bookingId);
          console.log('Payment verification result:', result);

          if (result.success && result.status === 'paid') {
            setPaymentError(null);
            // Update local state for upfront payment
            if (jobData.paymentPreference === 'pay_first' && !jobData.isPaidUpfront) {
              setJobData(prev => ({ ...prev, isPaidUpfront: true, upfrontPaidAmount: prev.totalAmount || prev.price }));
            } else {
              setJobData(prev => ({ ...prev, status: 'payment_received' }));
            }
            setPremiumModal({ visible: true, variant: 'success', title: 'Payment Successful! 💰', message: 'Your payment has been processed successfully!' });
          } else if (result.status === 'failed') {
            setPaymentError('Payment failed or expired. Please try again.');
          } else if (result.status === 'pending') {
            // Still pending, user might not have completed payment
            console.log('Payment still pending');
          } else if (result.status === 'error') {
            // Server error - show message but don't block user
            console.log('Server error during verification:', result.error);
          }
        } catch (error) {
          console.log('Payment verification error:', error);
        } finally {
          setIsCheckingPayment(false);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [jobData?.status, jobData?.id, jobId, jobData?.paymentPreference, jobData?.isPaidUpfront]);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const unsubscribe = listenToIncomingCalls(user.uid, (call) => {
      setIncomingCall(call);
    });

    return () => unsubscribe();
  }, [user]);

  const CANCEL_REASONS = [
    'Changed my mind',
    'Found another provider',
    'Schedule conflict',
    'Price too high',
    'Provider not responding',
    'Other',
  ];

  // Real-time listener for job updates
  useEffect(() => {
    const docId = jobId || job?.id;
    if (!docId) return;

    setIsLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'bookings', docId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          // Build full location string from address fields
          let fullLocation = '';
          if (data.houseNumber) fullLocation += data.houseNumber + ', ';
          if (data.streetAddress) fullLocation += data.streetAddress + ', ';
          if (data.barangay) fullLocation += 'Brgy. ' + data.barangay + ', ';
          fullLocation += 'Maasin City';
          if (!data.houseNumber && !data.streetAddress && !data.barangay) {
            fullLocation = data.location || data.address || 'Maasin City';
          }

          setJobData(prev => ({
            ...prev,
            ...data,
            id: docSnap.id,
            title: data.title || data.serviceCategory,
            serviceCategory: data.serviceCategory || data.service,
            description: data.description || data.notes,
            status: data.status,
            scheduledDate: formatTimestamp(data.scheduledDate, 'date'),
            scheduledTime: formatTimestamp(data.scheduledTime, 'time'),
            price: data.totalAmount || data.price,
            address: data.address,
            // Address fields
            streetAddress: data.streetAddress || '',
            houseNumber: data.houseNumber || '',
            barangay: data.barangay || '',
            landmark: data.landmark || '',
            location: fullLocation,
            mediaFiles: data.mediaFiles || [],
            counterOfferPrice: data.counterOfferPrice,
            counterOfferNote: data.counterOfferNote,
            offeredPrice: data.offeredPrice,
            isNegotiable: data.isNegotiable,
            createdAt: formatTimestamp(data.createdAt, 'date') || new Date().toLocaleDateString(),
            // Payment - Always Pay First with GCash/Maya
            paymentPreference: 'pay_first', // Always pay first
            paymentStatus: data.paymentStatus || null, // pending, held, released, refunded
            paymentMethod: data.paymentMethod || 'gcash', // gcash or maya
            escrowAmount: data.escrowAmount || 0,
            isPaidUpfront: data.isPaidUpfront || data.paid || false, // Check both fields
            upfrontPaidAmount: data.upfrontPaidAmount || data.paidAmount || 0,
            additionalCharges: data.additionalCharges || [],
          }));
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to job:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId, job?.id]);

  // Real-time listener for provider info (separate so photo updates in real-time)
  useEffect(() => {
    const providerId = jobData?.providerId || job?.providerId;
    if (!providerId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', providerId),
      (docSnap) => {
        if (docSnap.exists()) {
          const pData = docSnap.data();
          // Check both rating and averageRating fields for compatibility
          const providerRating = pData.rating || pData.averageRating || 0;
          const providerReviewCount = pData.reviewCount || pData.totalReviews || 0;
          const completedJobs = pData.completedJobs || pData.jobsCompleted || 0;

          // Calculate provider badges
          const providerBadges = getProviderBadges({
            completedJobs,
            rating: providerRating,
            reviewCount: providerReviewCount,
            avgResponseTime: pData.avgResponseTime || pData.responseTime || 999,
            isVerified: pData.isVerified || pData.status === 'approved',
          });

          console.log('[JobDetails] Provider data:', { rating: providerRating, reviewCount: providerReviewCount, badges: providerBadges.length });
          setJobData(prev => ({
            ...prev,
            provider: {
              id: docSnap.id,
              name: `${pData.firstName || ''} ${pData.lastName || ''}`.trim() || prev?.provider?.name || 'Provider',
              phone: pData.phone,
              photo: pData.profilePhoto,
              rating: providerRating,
              reviewCount: providerReviewCount,
              completedJobs,
              badges: providerBadges,
              tier: pData.tier || null,
              points: pData.points || 0,
            },
          }));
        }
      },
      (error) => {
        console.log('Error listening to provider:', error);
      }
    );

    return () => unsubscribe();
  }, [jobData?.providerId, job?.providerId]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'awaiting_payment': return '#EA580C';
      case 'pending': return '#F59E0B';
      case 'payment_received': return '#10B981';
      case 'accepted': return '#3B82F6';
      case 'traveling': return '#3B82F6';
      case 'arrived': return '#10B981';
      case 'in_progress': return '#8B5CF6';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'declined': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'awaiting_payment': return 'Awaiting Payment';
      case 'pending': return 'Pending';
      case 'payment_received': return 'Payment Received';
      case 'accepted': return 'Accepted';
      case 'traveling': return 'Provider On The Way';
      case 'arrived': return 'Provider Arrived';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'declined': return 'Declined';
      default: return status || 'Unknown';
    }
  };

  const handleCallProvider = async () => {
    // Check if admin approved
    if (!jobData?.adminApproved) {
      showErrorModal('Not Available', 'Voice calls are only available after admin approval');
      return;
    }

    if (!user || !jobData?.providerId) {
      showErrorModal('Error', 'Unable to initiate call');
      return;
    }

    try {
      const call = await initiateCall(
        user.uid,
        user.firstName || 'Client',
        jobData.providerId,
        jobData.provider?.name || 'Provider',
        jobData.id || jobId
      );
      setActiveCall(call);
    } catch (error) {
      console.error('Failed to initiate call:', error);
      showErrorModal('Error', 'Failed to start voice call');
    }
  };

  const handleMessageProvider = () => {
    if (!jobData?.providerId) {
      showInfoModal('Not Available', 'No provider assigned to this job yet');
      return;
    }
    navigation.navigate('Chat', {
      recipient: {
        id: jobData.providerId,
        name: jobData.provider?.name || jobData.providerName || 'Provider',
        role: 'PROVIDER',
      },
      jobId: jobData.id || jobId,
      jobTitle: jobData.title || 'Service Request',
    });
  };

  // Voice call handlers
  const handleAnswerCall = async () => {
    if (!incomingCall) return;

    try {
      await answerCall(incomingCall.id);
      setActiveCall(incomingCall);
      setIncomingCall(null);
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;

    try {
      await declineCall(incomingCall.id);
      setIncomingCall(null);
    } catch (error) {
      console.error('Failed to decline call:', error);
    }
  };

  const handleEndCall = async (duration) => {
    if (!activeCall) return;

    try {
      await endCall(activeCall.id, duration || 0);
      setActiveCall(null);
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  const handleCancelJob = () => {
    setShowCancelModal(true);
  };

  const submitCancellation = async () => {
    const reason = selectedCancelReason === 'Other' ? cancelReason : selectedCancelReason;
    if (!reason.trim()) {
      showErrorModal('Required', 'Please select or enter a cancellation reason.');
      return;
    }

    try {
      setIsUpdating(true);
      await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: 'client',
        cancellationReason: reason,
      });

      // Process automatic refund if payment was made
      if (jobData.paid || jobData.isPaidUpfront) {
        try {
          const API_URL = 'https://gss-maasin-app.onrender.com/api';
          const refundResponse = await fetch(`${API_URL}/payments/auto-refund/${jobData.id || jobId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason, cancelledBy: 'client' }),
          });
          const refundResult = await refundResponse.json();
          if (refundResult.refunded) {
            showInfoModal('Cancelled & Refunded', `Job cancelled. Refund of ₱${refundResult.amount} will be processed to your ${jobData.paymentMethod || 'payment method'}.`);
          } else {
            showInfoModal('Cancelled', 'Job has been cancelled');
          }
        } catch (refundError) {
          console.error('Refund error:', refundError);
          showInfoModal('Cancelled', 'Job cancelled. Refund will be processed shortly.');
        }
      } else {
        showInfoModal('Cancelled', 'Job has been cancelled');
      }

      // Notify provider about cancellation
      if (jobData.providerId) {
        notificationService.notifyJobCancelled(jobData, 'client', reason);

        // Send FCM push notification to provider (works when app is closed)
        notificationService.sendPushToUser(
          jobData.providerId,
          '❌ Job Cancelled',
          `Client cancelled the ${jobData.serviceCategory || 'service'} job.${reason ? ` Reason: ${reason}` : ''}`,
          { type: 'job_cancelled', jobId: jobData.id || jobId }
        );

        // Create Firestore notification for provider
        try {
          const notifRef = doc(collection(db, 'notifications'));
          await setDoc(notifRef, {
            id: notifRef.id,
            type: 'booking_cancelled',
            title: '❌ Job Cancelled',
            message: `Client cancelled the ${jobData.serviceCategory || 'service'} job.${reason ? ` Reason: ${reason}` : ''}`,
            userId: jobData.providerId,
            targetUserId: jobData.providerId,
            bookingId: jobData.id || jobId,
            jobId: jobData.id || jobId,
            createdAt: new Date(),
            read: false,
          });
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }
      setShowCancelModal(false);
      navigation.goBack();
    } catch (error) {
      console.error('Error cancelling job:', error);
      showErrorModal('Error', 'Failed to cancel job. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Client confirms work is complete and proceeds to remaining 50% payment
  const handleConfirmCompletion = () => {
    // Use centralized calculation utilities
    const chargesSummary = getAdditionalChargesSummary(jobData?.additionalCharges);
    const completionAmount = calculateCompletionPayment(jobData);

    const message = chargesSummary.approved.count > 0
      ? `Are you satisfied with the work? You need to pay the remaining 50% plus ${formatCurrency(chargesSummary.approved.total)} in additional charges. Total: ${formatCurrency(completionAmount)}`
      : `Are you satisfied with the work? You need to pay the remaining 50% (${formatCurrency(completionAmount)}) to complete the job.`;

    Alert.alert(
      'Confirm Work Complete',
      message,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Proceed to Pay',
          onPress: async () => {
            try {
              setIsUpdating(true);
              await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
                status: 'pending_payment',
                clientConfirmedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              setJobData(prev => ({ ...prev, status: 'pending_payment' }));
              showSuccessModal('Confirmed', 'Please proceed to pay the remaining balance.');
            } catch (error) {
              console.error('Error confirming completion:', error);
              showErrorModal('Error', 'Failed to confirm. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  // Client makes payment - show payment method modal
  const handleMakePayment = () => {
    setShowPaymentModal(true);
  };



  // Process payment - QR Ph only
  const processPayment = async (method) => {
    // Prevent double-click
    if (isProcessingPayment || isUpdating) return;

    // Use context-aware payment amount based on current status
    const isUpfrontPayment = jobData?.status === 'awaiting_payment';
    const amount = isUpfrontPayment
      ? calculateUpfrontPayment(jobData)
      : calculateCompletionPayment(jobData);
    const paymentType = isUpfrontPayment ? 'upfront' : 'completion';
    const description = isUpfrontPayment
      ? `50% Downpayment - ${jobData.title || jobData.serviceCategory}`
      : `50% Completion - ${jobData.title || jobData.serviceCategory}`;

    const bookingId = jobData.id || jobId;
    const userId = user?.uid || user?.id;

    setIsProcessingPayment(true);
    setSelectedPaymentMethod(method);
    setPaymentError(null);

    try {
      // QRPh - create payment
      const result = await paymentService.createQRPhPayment(
        bookingId,
        userId,
        amount,
        description,
        { paymentType }
      );

      if (result.success && result.checkoutUrl) {
        setShowPaymentModal(false);

        // Show QR payment in-app modal
        setQRPaymentUrl(result.checkoutUrl);
        // Ensure amount is properly rounded to 2 decimals for display
        setQRPaymentAmount(Math.round(amount * 100) / 100);
        setShowQRPayment(true);
      } else {
        setPaymentError(result.error || 'Failed to create payment');
        showErrorModal('Payment Error', result.error || 'Failed to create payment. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError('Payment failed. Please check your connection and try again.');
      showErrorModal('Error', 'Payment failed. Please check your connection and try again.');
    } finally {
      setIsProcessingPayment(false);
      setSelectedPaymentMethod(null);
    }
  };

  // Retry payment after failure
  const handleRetryPayment = () => {
    setPaymentError(null);
    setShowPaymentModal(true);
  };

  // Accept counter offer from provider
  const handleAcceptCounterOffer = () => {
    const counterPrice = jobData?.counterOfferPrice || 0;
    const systemFee = counterPrice * 0.05;
    const totalAmount = counterPrice + systemFee;

    Alert.alert(
      'Accept Counter Offer',
      `Accept provider's offer of ₱${counterPrice.toLocaleString()}?\n\nTotal with fee: ₱${totalAmount.toLocaleString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setIsUpdating(true);
              await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
                status: 'pending', // Back to pending for provider to accept
                providerPrice: counterPrice,
                offeredPrice: counterPrice,
                systemFee: systemFee,
                totalAmount: totalAmount,
                counterOfferAcceptedAt: serverTimestamp(),
                negotiationHistory: [...(jobData.negotiationHistory || []), {
                  type: 'client_accepted_counter',
                  amount: counterPrice,
                  timestamp: new Date().toISOString(),
                  by: 'client',
                }],
              });
              setJobData(prev => ({
                ...prev,
                status: 'pending',
                providerPrice: counterPrice,
                totalAmount: totalAmount,
              }));
              showSuccessModal('Accepted', 'Counter offer accepted. Waiting for provider confirmation.');
            } catch (error) {
              console.error('Error accepting counter offer:', error);
              showErrorModal('Error', 'Failed to accept counter offer');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  // Make a new counter offer
  const handleNewOffer = async () => {
    if (!newOfferPrice || parseFloat(newOfferPrice) <= 0) {
      showErrorModal('Error', 'Please enter a valid offer price');
      return;
    }

    try {
      setIsUpdating(true);
      const newPrice = parseFloat(newOfferPrice);
      const systemFee = newPrice * 0.05;
      const totalAmount = newPrice + systemFee;

      await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
        status: 'pending_negotiation',
        offeredPrice: newPrice,
        priceNote: newOfferNote,
        systemFee: systemFee,
        totalAmount: totalAmount,
        negotiationHistory: [...(jobData.negotiationHistory || []), {
          type: 'client_counter',
          amount: newPrice,
          note: newOfferNote,
          timestamp: new Date().toISOString(),
          by: 'client',
        }],
      });

      setJobData(prev => ({
        ...prev,
        status: 'pending_negotiation',
        offeredPrice: newPrice,
      }));
      setShowNewOfferModal(false);
      setNewOfferPrice('');
      setNewOfferNote('');
      showSuccessModal('Offer Sent', 'Your new offer has been sent to the provider.');
    } catch (error) {
      console.error('Error sending new offer:', error);
      showErrorModal('Error', 'Failed to send new offer');
    } finally {
      setIsUpdating(false);
    }
  };

  // Approve additional charge and create real QR payment
  const handleApproveAdditional = (chargeId) => {
    const charge = jobData.additionalCharges?.find(c => c.id === chargeId);
    if (!charge) return;

    const chargeAmount = charge.total || charge.amount || 0;

    Alert.alert(
      'Pay Additional Charge',
      `Pay ₱${chargeAmount.toLocaleString()} for:\n\n"${charge.reason}"\n\nYou will be redirected to QR Ph payment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              setIsUpdating(true);
              const bookingId = jobData.id || jobId;
              const userId = user?.uid || user?.id;

              // Mark charge as approved and set to pending_payment in Firestore
              const updatedCharges = jobData.additionalCharges.map(c =>
                c.id === chargeId ? { ...c, status: 'pending_payment', approvedAt: new Date().toISOString() } : c
              );
              const hasPending = updatedCharges.some(c => c.status === 'pending');

              // Calculate new total with approved charges and discount
              const basePrice = jobData.totalAmount || ((jobData.providerPrice || jobData.fixedPrice || jobData.price || 0) + (jobData.systemFee || 0));
              const approvedTotal = updatedCharges
                .filter(c => c.status === 'approved')
                .reduce((sum, c) => sum + (c.total || c.amount || 0), 0);
              const discount = jobData.discountAmount || jobData.discount || 0;
              const newFinalAmount = basePrice + approvedTotal - discount;

              await updateDoc(doc(db, 'bookings', bookingId), {
                additionalCharges: updatedCharges,
                hasAdditionalPending: hasPending,
                finalAmount: newFinalAmount,
                approvedAdditionalCharges: updatedCharges.filter(c => c.status === 'approved'),
                updatedAt: serverTimestamp(),
              });
              setJobData(prev => ({
                ...prev,
                additionalCharges: updatedCharges,
                hasAdditionalPending: hasPending,
                finalAmount: newFinalAmount,
              }));

              // Create real QR payment for the additional charge amount
              const result = await paymentService.createQRPhPayment(
                bookingId,
                userId,
                chargeAmount,
                `Additional charge: ${charge.reason}`,
                { chargeId, paymentType: 'additional_charge' }
              );

              if (result.success && result.checkoutUrl) {
                // Show QR payment in-app modal
                setQRPaymentUrl(result.checkoutUrl);
                // Ensure amount is properly rounded to 2 decimals for display
                setQRPaymentAmount(Math.round(chargeAmount * 100) / 100);
                setShowQRPayment(true);
              } else {
                showErrorModal('Payment Error', result.error || 'Failed to create payment. Please try again.');
              }
            } catch (error) {
              console.error('Error processing additional charge payment:', error);
              showErrorModal('Error', 'Failed to process payment. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  // Reject additional charge
  const handleRejectAdditional = (chargeId) => {
    Alert.alert(
      'Reject Additional Charge',
      'Are you sure you want to reject this additional charge?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUpdating(true);
              const updatedCharges = jobData.additionalCharges.map(c =>
                c.id === chargeId ? { ...c, status: 'rejected', rejectedAt: new Date().toISOString() } : c
              );

              const hasPending = updatedCharges.some(c => c.status === 'pending');

              await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
                additionalCharges: updatedCharges,
                hasAdditionalPending: hasPending,
              });

              setJobData(prev => ({
                ...prev,
                additionalCharges: updatedCharges,
                hasAdditionalPending: hasPending,
              }));
              showInfoModal('Rejected', 'Additional charge has been rejected.');
            } catch (error) {
              console.error('Error rejecting charge:', error);
              showErrorModal('Error', 'Failed to reject charge');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[globalStyles.container, isDark && { backgroundColor: theme.colors.background }]}>
        <View style={globalStyles.centerContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      </SafeAreaView>
    );
  }

  if (!jobData) {
    return (
      <SafeAreaView style={[globalStyles.container, isDark && { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, isDark && { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && { color: theme.colors.text }]}>Job Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={globalStyles.centerContainer}>
          <Text style={[globalStyles.bodyMedium, isDark && { color: theme.colors.text }]}>Job not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[globalStyles.container, isDark && { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, isDark && { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && { color: theme.colors.text }]}>Job Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(jobData.status) + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(jobData.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(jobData.status) }]}>
            {getStatusLabel(jobData.status)}
          </Text>
        </View>

        {/* Provider Traveling Banner - Prominent tracking CTA */}
        {(jobData.status === 'traveling' || jobData.status === 'arrived') ? (
          <TouchableOpacity
            style={{
              backgroundColor: jobData.status === 'traveling' ? '#3B82F6' : '#10B981',
              marginHorizontal: 16,
              marginTop: 8,
              padding: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => navigation.navigate('Tracking', {
              jobId: jobData.id || jobId,
              job: jobData,
            })}>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: 10,
              borderRadius: 12,
            }}>
              <Icon name={jobData.status === 'traveling' ? 'car' : 'checkmark-circle'} size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                {jobData.status === 'traveling' ? 'Provider is on the way!' : 'Provider has arrived!'}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
                Tap to track their location in real-time
              </Text>
            </View>
            <Icon name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
        {/* Admin Review Banner - Show when pending and not yet approved */}
        {(!jobData.adminApproved && jobData.status === 'pending') ? (
          <View style={{
            backgroundColor: '#EFF6FF',
            padding: 14,
            marginHorizontal: 16,
            marginTop: 8,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#BFDBFE',
          }}>
            <Icon name="time" size={22} color="#3B82F6" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E40AF', marginBottom: 2 }}>
                Under Admin Review
              </Text>
              <Text style={{ fontSize: 12, color: '#3B82F6' }}>
                Your request is being reviewed by our team. We'll notify you once it's sent to the provider.
              </Text>
            </View>
          </View>
        ) : null}
        {/* Approved Banner - Show when admin approved and waiting for provider */}
        {(jobData.adminApproved && jobData.status === 'pending') ? (
          <View style={{
            backgroundColor: '#F0FDF4',
            padding: 14,
            marginHorizontal: 16,
            marginTop: 8,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#BBF7D0',
          }}>
            <Icon name="checkmark-circle" size={22} color="#10B981" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#065F46', marginBottom: 2 }}>
                Sent to Provider
              </Text>
              <Text style={{ fontSize: 12, color: '#047857' }}>
                Your request has been approved and sent to the provider. Waiting for their response.
              </Text>
            </View>
          </View>
        ) : null}
        {/* Job Info */}
        <View style={styles.section}>
          <Text style={styles.jobTitle}>{jobData.title || jobData.serviceCategory}</Text>
          <View style={styles.categoryTag}>
            <Icon name="construct" size={14} color="#00B14F" />
            <Text style={styles.categoryText}>{jobData.serviceCategory}</Text>
          </View>

          {jobData.description ? (
            <Text style={styles.description}>{jobData.description}</Text>
          ) : null}
        </View>
        {/* Location Section */}
        {(jobData.location || jobData.address || jobData.barangay) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Location</Text>
            <View style={{
              backgroundColor: isDark ? theme.colors.surface : '#F9FAFB',
              borderRadius: 12,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'flex-start',
            }}>
              <View style={{
                backgroundColor: '#FEE2E2',
                padding: 10,
                borderRadius: 10,
                marginRight: 12,
              }}>
                <Icon name="location" size={20} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: isDark ? theme.colors.text : '#1F2937',
                  marginBottom: 4,
                }}>
                  {jobData.location || jobData.address || 'Maasin City'}
                </Text>
                {jobData.landmark ? (
                  <Text style={{
                    fontSize: 13,
                    color: isDark ? theme.colors.textSecondary : '#6B7280',
                  }}>
                    {`Landmark: ${jobData.landmark}`}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
        {/* Provider Info (show if provider assigned or providerName exists) */}
        {(jobData.provider || jobData.providerName || jobData.providerId) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Provider</Text>
            <View style={styles.personCard}>
              <View style={styles.personAvatar}>
                {jobData.provider?.photo ? (
                  <Image source={{ uri: jobData.provider.photo }} style={styles.avatarImage} />
                ) : (
                  <Icon name="person" size={30} color="#6B7280" />
                )}
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{jobData.provider?.name || jobData.providerName || 'Provider'}</Text>
                <View style={styles.ratingRow}>
                  <Icon name="star" size={14} color={(jobData.provider?.rating > 0 || jobData.provider?.reviewCount > 0) ? "#F59E0B" : "#D1D5DB"} />
                  <Text style={styles.ratingText}>
                    {(jobData.provider?.rating > 0 || jobData.provider?.reviewCount > 0)
                      ? `${(jobData.provider.rating || 0).toFixed(1)} (${jobData.provider.reviewCount || 0} ${jobData.provider.reviewCount === 1 ? 'review' : 'reviews'})`
                      : 'New Provider'}
                  </Text>
                </View>
                {/* Provider Tier */}
                {(jobData.provider?.tier || jobData.provider?.points > 0) ? (
                  <View style={{ marginTop: 4 }}>
                    <TierBadge tier={jobData.provider?.tier || getProviderTier(jobData.provider.points)} size="small" />
                  </View>
                ) : null}
              </View>
            </View>

            {/* Provider Badges */}
            {jobData.provider?.badges?.length > 0 ? (
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Provider Badges</Text>
                <BadgeList badges={jobData.provider.badges} maxDisplay={4} size="small" />
              </View>
            ) : null}

            {/* Contact Buttons - Only show after admin approval and NOT completed */}
            {jobData.adminApproved && jobData.status !== 'completed' ? (
              <View>
                <View style={styles.contactButtons}>
                  {/* VOICE CALL DISABLED - Temporarily hidden
                  <TouchableOpacity style={styles.contactButtonLarge} onPress={handleCallProvider}>
                    <Icon name="call" size={20} color="#00B14F" />
                    <Text style={styles.contactButtonTextLarge}>Voice Call</Text>
                  </TouchableOpacity>
                  */}
                  <TouchableOpacity style={[styles.contactButtonLarge, { flex: 1 }]} onPress={handleMessageProvider}>
                    <Icon name="chatbubble" size={20} color="#00B14F" />
                    <Text style={styles.contactButtonTextLarge}>Message</Text>
                  </TouchableOpacity>
                </View>
                {/* Track Provider Button - Show when traveling or arrived */}
                {(jobData.status === 'traveling' || jobData.status === 'arrived') ? (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#3B82F6',
                      borderRadius: 12,
                      paddingVertical: 14,
                      marginTop: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => navigation.navigate('Tracking', {
                      jobId: jobData.id || jobId,
                      job: jobData,
                    })}>
                    <Icon name="location" size={20} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15, marginLeft: 8 }}>
                      {jobData.status === 'traveling' ? 'Track Provider Location' : 'View Provider Location'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={{
                backgroundColor: '#FEF3C7',
                padding: 12,
                borderRadius: 10,
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Icon name="time-outline" size={18} color="#F59E0B" />
                <Text style={{ fontSize: 13, color: '#92400E', marginLeft: 8, flex: 1 }}>
                  Contact options will be available once admin approves your request.
                </Text>
              </View>
            )}
          </View>
        ) : null}
        {/* Media Files */}
        {jobData.mediaFiles && jobData.mediaFiles.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attached Media</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {jobData.mediaFiles.map((file, index) => (
                <View key={index} style={styles.mediaItem}>
                  {(file.url || file.uri) ? (
                    <Image source={{ uri: file.url || file.uri }} style={styles.mediaImage} />
                  ) : null}
                  {file.isVideo ? (
                    <View style={styles.videoOverlay}>
                      <Icon name="play-circle" size={30} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
        {/* Payment Preference - Always Pay First with GCash/Maya */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={{
            backgroundColor: '#D1FAE5',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: '#A7F3D0',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon
                  name="wallet"
                  size={24}
                  color="#059669"
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#059669' }}>
                    {jobData.paymentMethod === 'maya' ? 'Maya' : 'GCash'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#047857' }}>
                    Pay First • Protected Payment
                  </Text>
                </View>
              </View>
              {jobData.isPaidUpfront ? (
                <View style={{ backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>PAID</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Price Info */}
        {(jobData.price || jobData.estimatedPrice || jobData.totalAmount) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Summary</Text>
            <View style={{
              backgroundColor: '#F0FDF4',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: '#BBF7D0',
            }}>

              {/* Show additional charges */}
              {(jobData.additionalCharges && jobData.additionalCharges.length > 0) ? (
                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#BBF7D0' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    Additional Charges
                  </Text>
                  {jobData.additionalCharges.map((charge, index) => (
                    <View key={charge.id || index} style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: '#4B5563', flex: 1 }} numberOfLines={1}>
                          {charge.reason}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: '#1F2937' }}>
                          +₱{(charge.total || 0).toLocaleString()}
                        </Text>
                      </View>
                      {charge.status === 'pending' ? (
                        <View style={{ flexDirection: 'row', marginTop: 8 }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#FEE2E2',
                              paddingVertical: 8,
                              borderRadius: 6,
                              marginRight: 8,
                              alignItems: 'center',
                            }}
                            onPress={() => handleRejectAdditional(charge.id)}>
                            <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600' }}>Reject</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#D1FAE5',
                              paddingVertical: 8,
                              borderRadius: 6,
                              alignItems: 'center',
                            }}
                            onPress={() => handleApproveAdditional(charge.id)}>
                            <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>Approve</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                      {charge.status === 'pending_payment' ? (
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#7C3AED',
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            borderRadius: 8,
                            marginTop: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={() => handlePayAdditionalCharge(charge)}
                        >
                          <Icon name="card" size={16} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
                            Pay ₱{charge.total?.toFixed(2)}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {charge.status === 'paid' ? (
                        <Text style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>✓ Paid</Text>
                      ) : null}
                      {charge.status === 'rejected' ? (
                        <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>✗ Rejected</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={{
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: '#BBF7D0',
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 8,
              }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }}>Total Amount</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#00B14F' }}>
                  {formatCurrency(calculateClientTotal(jobData))}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
        {/* Review Prompt - Show when job is completed and not yet reviewed */}
        {(jobData.status === 'completed' && !jobData.reviewed) ? (
          <View style={{
            margin: 16,
            padding: 20,
            backgroundColor: '#FFFBEB',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#FCD34D',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="star" size={28} color="#F59E0B" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#92400E', marginLeft: 10 }}>
                How was your experience?
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: '#B45309', marginBottom: 16, lineHeight: 20 }}>
              Your feedback helps other clients and rewards great providers. Take a moment to share your experience!
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#F59E0B',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
              onPress={() => navigation.navigate('Review', {
                jobId: jobData.id || jobId,
                providerId: jobData.provider?.id || jobData.providerId,
                providerName: jobData.provider?.name || 'Provider',
              })}>
              <Icon name="create" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginLeft: 8 }}>
                Leave a Review
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {/* Review Submitted Badge - Show when reviewed */}
        {(jobData.status === 'completed' && jobData.reviewed) ? (
          <View style={{
            margin: 16,
            padding: 16,
            backgroundColor: '#F0FDF4',
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#BBF7D0',
          }}>
            <Icon name="checkmark-circle" size={24} color="#10B981" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#065F46' }}>
                Review Submitted
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={star}
                    name={star <= (jobData.reviewRating || 0) ? "star" : "star-outline"}
                    size={16}
                    color="#F59E0B"
                  />
                ))}
                <Text style={{ fontSize: 13, color: '#047857', marginLeft: 8 }}>
                  Thank you for your feedback!
                </Text>
              </View>
            </View>
          </View>
        ) : null}
        {/* View Receipt Button - Show for completed jobs */}
        {jobData.status === 'completed' ? (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
              onPress={() => navigation.navigate('ServiceReceipt', {
                booking: {
                  id: jobData.id || jobId,
                  serviceCategory: jobData.serviceCategory || jobData.title,
                  description: jobData.description,
                  status: jobData.status,
                  createdAt: jobData.createdAt,
                  completedAt: jobData.completedAt,
                  otherParty: {
                    id: jobData.providerId,
                    name: jobData.provider?.name || jobData.providerName,
                    photo: jobData.provider?.photo,
                    rating: jobData.provider?.rating,
                  },
                  providerPrice: jobData.providerPrice,
                  offeredPrice: jobData.offeredPrice,
                  totalAmount: jobData.totalAmount || jobData.price,
                  additionalCharges: jobData.additionalCharges || [],
                  streetAddress: jobData.streetAddress,
                  barangay: jobData.barangay,
                  location: jobData.location || jobData.address,
                  scheduledDate: jobData.scheduledDate,
                  scheduledTime: jobData.scheduledTime,
                  review: jobData.review,
                  rating: jobData.reviewRating || jobData.rating,
                },
                isProvider: false,
              })}>
              <Icon name="receipt-outline" size={20} color="#374151" />
              <Text style={{ color: '#374151', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                View Receipt
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {/* Job ID */}
        <View style={styles.section}>
          <Text style={styles.jobId}>Job ID: {jobData.id || jobId || 'N/A'}</Text>
          <Text style={styles.createdAt}>
            Created: {jobData.createdAt || new Date().toLocaleDateString()}
          </Text>
        </View>
        {/* Action Buttons */}
        {(jobData.status === 'pending' || jobData.status === 'awaiting_payment') ? (
          <View style={styles.actionSection}>
            {/* Pay Now button for awaiting_payment */}
            {jobData.status === 'awaiting_payment' && (
              <>
                <View style={{
                  backgroundColor: '#FFF7ED',
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: '#FB923C',
                }}>
                  <Icon name="card" size={32} color="#EA580C" />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#9A3412', marginTop: 8 }}>
                    50% Downpayment Required
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: '#EA580C', marginTop: 8 }}>
                    {formatCurrency(calculateUpfrontPayment(jobData))}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#C2410C', marginTop: 2 }}>
                    (50% of {formatCurrency(calculateClientTotal(jobData))} total)
                  </Text>
                  <Text style={{ fontSize: 13, color: '#C2410C', marginTop: 4, textAlign: 'center' }}>
                    Pay 50% now to submit your booking. Remaining 50% after the job is done.
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#EA580C',
                    borderRadius: 12,
                    paddingVertical: 16,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                  onPress={handleMakePayment}>
                  <Icon name="wallet" size={20} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                    Pay 50% Downpayment
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelJob}>
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {/* Payment already made during booking - show confirmation */}
        {(jobData.isPaidUpfront &&
          (jobData.status === 'accepted' || jobData.status === 'traveling' || jobData.status === 'arrived' || jobData.status === 'in_progress')) ? (
          <View style={styles.actionSection}>
            <View style={{
              backgroundColor: '#D1FAE5',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#A7F3D0',
            }}>
              <Icon name="checkmark-circle" size={32} color="#059669" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#065F46', marginTop: 8 }}>
                Payment Complete
              </Text>
              <Text style={{ fontSize: 14, color: '#047857', marginTop: 4 }}>
                ₱{(jobData.upfrontPaidAmount || jobData.totalAmount || 0).toLocaleString()} paid
              </Text>
              <Text style={{ fontSize: 13, color: '#059669', marginTop: 8, textAlign: 'center' }}>
                {jobData.status === 'in_progress'
                  ? 'Provider is working on your job. You\'ll be notified when complete.'
                  : jobData.status === 'arrived'
                    ? 'Provider has arrived and will start working soon.'
                    : jobData.status === 'traveling'
                      ? 'Provider is on the way to your location.'
                      : 'Provider has accepted. They will start traveling soon.'}
              </Text>
            </View>
          </View>
        ) : null}
        {/* Pending Completion - Client needs to confirm work is done */}
        {jobData.status === 'pending_completion' ? (
          <View style={styles.actionSection}>
            <View style={{
              backgroundColor: '#FEF3C7',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
              alignItems: 'center',
            }}>
              <Icon name="construct" size={32} color="#F59E0B" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#92400E', marginTop: 8 }}>
                Provider Marked Work Complete
              </Text>
              <Text style={{ fontSize: 13, color: '#B45309', marginTop: 4, textAlign: 'center' }}>
                Please confirm if you're satisfied with the work to proceed to payment.
              </Text>
            </View>
            {/* Show pending additional charges that need approval */}
            {jobData.additionalCharges?.some(c => c.status === 'pending') ? (
              <View style={{
                backgroundColor: '#FEE2E2',
                padding: 16,
                borderRadius: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#FECACA',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="alert-circle" size={20} color="#DC2626" />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#991B1B', marginLeft: 8 }}>
                    Additional Charges Pending
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>
                  The provider has requested additional charges. Please review and approve or reject before confirming completion.
                </Text>
                {jobData.additionalCharges.filter(c => c.status === 'pending').map((charge, index) => (
                  <View key={charge.id || index} style={{
                    backgroundColor: '#FFFFFF',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}>
                    <Text style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>{charge.reason}</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#DC2626' }}>
                      +₱{charge.total?.toLocaleString()}
                    </Text>
                    <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: '#FEE2E2',
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                        onPress={() => handleRejectAdditional(charge.id)}>
                        <Text style={{ fontSize: 14, color: '#DC2626', fontWeight: '600' }}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: '#D1FAE5',
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                        onPress={() => handleApproveAdditional(charge.id)}>
                        <Text style={{ fontSize: 14, color: '#059669', fontWeight: '600' }}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            <TouchableOpacity
              style={{
                backgroundColor: jobData.hasAdditionalPending ? '#9CA3AF' : '#10B981',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
              disabled={jobData.hasAdditionalPending}
              onPress={handleConfirmCompletion}>
              <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                {(() => {
                  if (jobData.hasAdditionalPending) return 'Review Additional Charges First';
                  const chargesSummary = getAdditionalChargesSummary(jobData.additionalCharges);
                  const discount = jobData.discountAmount || jobData.discount || 0;
                  if (chargesSummary.approved.total > discount) return 'Confirm & Pay';
                  if (discount > chargesSummary.approved.total) return 'Confirm & Get Refund';
                  return 'Confirm';
                })()}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {/* Pending Payment - Client needs to pay */}
        {jobData.status === 'pending_payment' ? (
          <View style={styles.actionSection}>
            {/* Show error banner if payment failed */}
            {paymentError ? (
              <View style={{
                backgroundColor: '#FEE2E2',
                padding: 14,
                borderRadius: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#FECACA',
              }}>
                <Icon name="alert-circle" size={22} color="#DC2626" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#991B1B' }}>Payment Failed</Text>
                  <Text style={{ fontSize: 12, color: '#DC2626' }}>{paymentError}</Text>
                </View>
                <TouchableOpacity onPress={() => setPaymentError(null)}>
                  <Icon name="close" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ) : null}
            {/* Checking payment status indicator */}
            {isCheckingPayment ? (
              <View style={{
                backgroundColor: '#FEF3C7',
                padding: 14,
                borderRadius: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={{ fontSize: 13, color: '#92400E', marginLeft: 10 }}>
                  Checking payment status...
                </Text>
              </View>
            ) : null}
            <View style={{
              backgroundColor: '#DBEAFE',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
              alignItems: 'center',
            }}>
              <Icon name="card" size={32} color="#3B82F6" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E40AF', marginTop: 8 }}>
                Remaining 50% Balance Due
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#1E40AF', marginTop: 8 }}>
                {formatCurrency(calculateCompletionPayment(jobData))}
              </Text>
              <Text style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>
                (Already paid 50% = {formatCurrency(jobData.upfrontPaidAmount || calculateUpfrontPayment(jobData))})
              </Text>
              <Text style={{ fontSize: 13, color: '#3B82F6', marginTop: 4, textAlign: 'center' }}>
                Work is complete! Pay the remaining balance to finalize the job.
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: paymentError ? '#EF4444' : '#3B82F6',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
              onPress={paymentError ? handleRetryPayment : handleMakePayment}
              disabled={isCheckingPayment}>
              <Icon name={paymentError ? 'refresh' : 'wallet'} size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                {paymentError ? 'Retry Payment' : 'Pay Remaining 50%'}
              </Text>
            </TouchableOpacity>

            {/* Manual Verify Payment Button - for when user already paid but status not updated */}
            <TouchableOpacity
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
              onPress={handleVerifyPayment}
              disabled={isCheckingPayment}>
              {isCheckingPayment ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <>
                  <Icon name="checkmark-circle-outline" size={18} color="#6B7280" />
                  <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 14, marginLeft: 8 }}>
                    Already Paid? Verify Payment
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
        {/* Payment Received - Waiting for provider confirmation */}
        {jobData.status === 'payment_received' ? (
          <View style={styles.actionSection}>
            <View style={{
              backgroundColor: '#D1FAE5',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
            }}>
              <Icon name="checkmark-done-circle" size={32} color="#059669" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#065F46', marginTop: 8 }}>
                Payment Sent!
              </Text>
              <Text style={{ fontSize: 13, color: '#047857', marginTop: 4, textAlign: 'center' }}>
                Waiting for provider to confirm receipt of payment.
              </Text>
            </View>
          </View>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cancellation Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            maxHeight: '80%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Cancel Job</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
              Please let us know why you're cancelling this job request.
            </Text>

            {CANCEL_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: selectedCancelReason === reason ? '#FEE2E2' : '#F9FAFB',
                  borderRadius: 10,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: selectedCancelReason === reason ? '#EF4444' : '#E5E7EB',
                }}
                onPress={() => setSelectedCancelReason(reason)}>
                <Icon
                  name={selectedCancelReason === reason ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selectedCancelReason === reason ? '#EF4444' : '#9CA3AF'}
                />
                <Text style={{
                  marginLeft: 12,
                  fontSize: 15,
                  color: selectedCancelReason === reason ? '#DC2626' : '#374151',
                  fontWeight: selectedCancelReason === reason ? '600' : '400',
                }}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            {selectedCancelReason === 'Other' ? (
              <TextInput
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  padding: 12,
                  fontSize: 14,
                  color: '#1F2937',
                  height: 80,
                  textAlignVertical: 'top',
                  marginTop: 8,
                }}
                placeholder="Please specify your reason..."
                multiline
                value={cancelReason}
                onChangeText={setCancelReason}
              />
            ) : null}

            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#F3F4F6',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginRight: 8,
                }}
                onPress={() => setShowCancelModal(false)}>
                <Text style={{ color: '#6B7280', fontSize: 16, fontWeight: '600' }}>Keep Job</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#EF4444',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginLeft: 8,
                }}
                onPress={submitCancellation}
                disabled={isUpdating || !selectedCancelReason}>
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Cancel Job</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Offer Modal */}
      <Modal
        visible={showNewOfferModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNewOfferModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Make New Offer</Text>
              <TouchableOpacity onPress={() => setShowNewOfferModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
              Provider's counter: ₱{(jobData?.counterOfferPrice || 0).toLocaleString()} |
              Your last offer: ₱{(jobData?.offeredPrice || 0).toLocaleString()}
            </Text>

            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              Your New Offer (₱)
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              paddingHorizontal: 12,
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 18, color: '#00B14F', fontWeight: '700' }}>₱</Text>
              <TextInput
                style={{ flex: 1, fontSize: 18, color: '#1F2937', paddingVertical: 14, paddingHorizontal: 8 }}
                placeholder="Enter your offer"
                keyboardType="numeric"
                value={newOfferPrice}
                onChangeText={setNewOfferPrice}
              />
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              Note (optional)
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                padding: 12,
                fontSize: 14,
                color: '#1F2937',
                height: 80,
                textAlignVertical: 'top',
                marginBottom: 20,
              }}
              placeholder="Add a note..."
              multiline
              value={newOfferNote}
              onChangeText={setNewOfferNote}
            />

            {newOfferPrice ? (
              <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>Your total with fee:</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#00B14F' }}>
                  ₱{(parseFloat(newOfferPrice || 0) * 1.05).toLocaleString()}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={{
                backgroundColor: '#00B14F',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
              }}
              onPress={handleNewOffer}
              disabled={isUpdating}>
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Send Offer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Method Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 40,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>
              {jobData?.status === 'awaiting_payment' ? '50% Downpayment' :
                jobData?.status === 'pending_payment' ? 'Remaining 50% Balance' : 'Amount to Pay'}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
              Amount to pay: <Text style={{ fontWeight: '700', color: '#00B14F' }}>
                {formatCurrency(
                  jobData?.status === 'pending_payment'
                    ? calculateCompletionPayment(jobData)
                    : jobData?.status === 'awaiting_payment'
                      ? calculateUpfrontPayment(jobData)
                      : (jobData?.totalAmount || jobData?.amount || 0)
                )}
              </Text>
            </Text>

            {/* QR Ph Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: selectedPaymentMethod === 'qrph' ? '#F5F3FF' : '#F9FAFB',
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 2,
                borderColor: selectedPaymentMethod === 'qrph' ? '#7C3AED' : '#E5E7EB',
              }}
              onPress={() => processPayment('qrph')}
              disabled={isProcessingPayment}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#7C3AED',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Icon name="qr-code" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>QR Ph</Text>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>Scan to pay with any banking or e-wallet app</Text>
              </View>
              {isProcessingPayment && selectedPaymentMethod === 'qrph' ? (
                <ActivityIndicator color="#7C3AED" />
              ) : (
                <Icon name="chevron-forward" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>



            <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 16 }}>
              Secure payment powered by PayMongo
            </Text>
          </View>
        </View>
      </Modal>

      {/* Premium Success/Error/Info Modal */}
      <PremiumModal
        visible={premiumModal.visible}
        variant={premiumModal.variant}
        title={premiumModal.title}
        message={premiumModal.message}
        primaryButton={{ text: 'OK', onPress: () => setPremiumModal(prev => ({ ...prev, visible: false })) }}
        onClose={() => setPremiumModal(prev => ({ ...prev, visible: false }))}
        autoClose={premiumModal.variant === 'success'}
        autoCloseDelay={3000}
      />

      {/* Premium Confirm Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          setConfirmModal(prev => ({ ...prev, visible: false }));
          confirmModal.onConfirm?.();
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
        isLoading={isUpdating}
      />

      {/* QR Payment Modal */}
      <QRPaymentModal
        visible={showQRPayment}
        checkoutUrl={qrPaymentUrl}
        amount={qrPaymentAmount}
        bookingId={jobData?.id || jobId}
        onClose={() => {
          setShowQRPayment(false);
          setQRPaymentUrl(null);
          setQRPaymentAmount(0);
        }}
        onPaymentComplete={() => {
          // Payment completed, verify it
          handleVerifyPayment();
        }}
      />

      {/* Voice Call Modals */}
      {activeCall && (
        <Modal 
          visible={true} 
          transparent={false} 
          animationType="slide"
          statusBarTranslucent
          presentationStyle="fullScreen"
        >
          <VoiceCall
            callId={activeCall.id}
            channelName={activeCall.channelName}
            isIncoming={false}
            callerName={activeCall.receiverName}
            onEnd={handleEndCall}
          />
        </Modal>
      )}

      {incomingCall && (
        <Modal 
          visible={true} 
          transparent={false} 
          animationType="slide"
          statusBarTranslucent
          presentationStyle="fullScreen"
        >
          <VoiceCall
            callId={incomingCall.id}
            channelName={incomingCall.channelName}
            isIncoming={true}
            callerName={incomingCall.callerName}
            onAnswer={handleAnswerCall}
            onDecline={handleDeclineCall}
            onEnd={handleEndCall}
          />
        </Modal>
      )}
    </SafeAreaView>
  );
};

export default JobDetailsScreen;
