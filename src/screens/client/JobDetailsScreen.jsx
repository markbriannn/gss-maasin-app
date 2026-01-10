import {useState, useEffect, useRef} from 'react';
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
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {jobDetailsStyles as styles} from '../../css/jobDetailsStyles';
import {db} from '../../config/firebase';
import {doc, getDoc, updateDoc, serverTimestamp, onSnapshot, collection, setDoc} from 'firebase/firestore';
import notificationService from '../../services/notificationService';
import paymentService from '../../services/paymentService';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {sendPaymentReceipt} from '../../services/emailService';
import {APP_CONFIG} from '../../config/constants';
import {getProviderBadges, getProviderTier} from '../../utils/gamification';
import {BadgeList, TierBadge} from '../../components/gamification';

const JobDetailsScreen = ({navigation, route}) => {
  const {job, jobId} = route.params || {};
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  
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
          setJobData(prev => ({...prev, isPaidUpfront: true, upfrontPaidAmount: prev.totalAmount || prev.price}));
        } else {
          setJobData(prev => ({...prev, status: 'payment_received'}));
        }
        Alert.alert('Payment Successful', 'Your payment has been processed successfully!');
      } else if (result.status === 'failed') {
        setPaymentError('Payment failed or expired. Please try again.');
      } else if (result.status === 'pending') {
        Alert.alert('Payment Pending', 'Your payment is still being processed. Please complete the payment in GCash/Maya app.');
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
              setJobData(prev => ({...prev, isPaidUpfront: true, upfrontPaidAmount: prev.totalAmount || prev.price}));
            } else {
              setJobData(prev => ({...prev, status: 'payment_received'}));
            }
            Alert.alert('Payment Successful', 'Your payment has been processed successfully!');
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
            isPaidUpfront: data.isPaidUpfront || false,
            upfrontPaidAmount: data.upfrontPaidAmount || 0,
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
          
          console.log('[JobDetails] Provider data:', {rating: providerRating, reviewCount: providerReviewCount, badges: providerBadges.length});
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
      case 'pending': return '#F59E0B';
      case 'pending_negotiation': return '#F59E0B';
      case 'counter_offer': return '#8B5CF6';
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
      case 'pending': return 'Pending';
      case 'pending_negotiation': return 'Offer Sent';
      case 'counter_offer': return 'Counter Offer Received';
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

  const handleCallProvider = () => {
    const phone = jobData?.provider?.phone || jobData?.providerPhone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Not Available', 'Provider phone number not available yet. Try messaging instead.');
    }
  };

  const handleMessageProvider = () => {
    if (!jobData?.providerId) {
      Alert.alert('Not Available', 'No provider assigned to this job yet');
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

  const handleCancelJob = () => {
    setShowCancelModal(true);
  };

  const submitCancellation = async () => {
    const reason = selectedCancelReason === 'Other' ? cancelReason : selectedCancelReason;
    if (!reason.trim()) {
      Alert.alert('Required', 'Please select or enter a cancellation reason.');
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
            Alert.alert('Cancelled & Refunded', `Job cancelled. Refund of ₱${refundResult.amount} will be processed to your ${jobData.paymentMethod || 'payment method'}.`);
          } else {
            Alert.alert('Cancelled', 'Job has been cancelled');
          }
        } catch (refundError) {
          console.error('Refund error:', refundError);
          Alert.alert('Cancelled', 'Job cancelled. Refund will be processed shortly.');
        }
      } else {
        Alert.alert('Cancelled', 'Job has been cancelled');
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
      Alert.alert('Error', 'Failed to cancel job. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Client confirms work is complete and proceeds to payment
  const handleConfirmCompletion = () => {
    // Check if there are approved additional charges that need to be paid
    const additionalChargesTotal = jobData?.additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.total || 0), 0) || 0;
    const hasAdditionalToPay = additionalChargesTotal > 0;
    
    // Check if this is an escrow payment that needs to be released
    const isEscrowPayment = jobData.paymentStatus === 'held';
    
    // For Pay First: if already paid upfront and no additional charges, go straight to payment_received
    const isPayFirstComplete = jobData.paymentPreference === 'pay_first' && jobData.isPaidUpfront && !hasAdditionalToPay;
    
    let message, buttonText;
    
    if (isEscrowPayment) {
      message = 'Are you satisfied with the work? This will release the payment from escrow to the provider.';
      buttonText = 'Yes, Release Payment';
    } else if (isPayFirstComplete) {
      message = 'Are you satisfied with the work? This will complete the job.';
      buttonText = 'Yes, Complete Job';
    } else if (hasAdditionalToPay && jobData.isPaidUpfront) {
      message = `Are you satisfied with the work? You have ₱${additionalChargesTotal.toLocaleString()} in additional charges to pay.`;
      buttonText = 'Yes, Proceed to Pay';
    } else {
      message = 'Are you satisfied with the work? This will proceed to payment.';
      buttonText = 'Yes, Proceed to Pay';
    }
    
    Alert.alert(
      isEscrowPayment ? 'Release Payment to Provider?' : 'Confirm Work Complete',
      message,
      [
        {text: 'Not Yet', style: 'cancel'},
        {
          text: buttonText,
          onPress: async () => {
            try {
              setIsUpdating(true);
              
              if (isEscrowPayment) {
                // Call backend to release escrow
                const apiUrl = APP_CONFIG?.API_URL || 'https://gss-maasin-app.onrender.com/api';
                const response = await fetch(`${apiUrl}/payments/release-escrow/${jobData.id || jobId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ clientId: user?.uid || user?.id }),
                });
                
                const result = await response.json();
                
                if (result.success) {
                  setJobData(prev => ({...prev, status: 'completed', paymentStatus: 'released'}));
                  Alert.alert('Payment Released! 🎉', `₱${result.providerShare?.toLocaleString() || ''} has been released to the provider. Thank you!`);
                } else {
                  Alert.alert('Error', result.error || 'Failed to release payment. Please try again.');
                }
              } else if (isPayFirstComplete) {
                // Pay First with no additional charges - go straight to payment_received
                await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
                  status: 'payment_received',
                  clientConfirmedAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                setJobData(prev => ({...prev, status: 'payment_received'}));
                Alert.alert('Completed', 'Job marked as complete. Waiting for provider confirmation.');
              } else {
                // Pay Later OR Pay First with additional charges - need payment
                await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
                  status: 'pending_payment',
                  clientConfirmedAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                setJobData(prev => ({...prev, status: 'pending_payment'}));
                Alert.alert('Confirmed', 'Please proceed to pay the provider.');
              }
            } catch (error) {
              console.error('Error confirming completion:', error);
              Alert.alert('Error', 'Failed to confirm. Please try again.');
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

  // PAID - Client pays upfront before service starts
  const handlePayUpfront = () => {
    Alert.alert(
      'Pay Now',
      `Pay ₱${(jobData?.totalAmount || jobData?.amount || 0).toLocaleString()} now before the service starts?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Pay Now',
          onPress: () => setShowPaymentModal(true),
        },
      ]
    );
  };

  // Process payment based on selected method
  const processPayment = async (method) => {
    // Prevent double-click
    if (isProcessingPayment || isUpdating) return;
    
    // Calculate total including approved additional charges
    const baseAmount = jobData?.totalAmount || jobData?.amount || 0;
    const additionalChargesTotal = jobData?.additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.total || 0), 0) || 0;
    
    // For Pay First: if already paid upfront, only charge additional charges
    const isPayFirstWithAdditional = jobData.paymentPreference === 'pay_first' && jobData.isPaidUpfront && additionalChargesTotal > 0;
    const amount = isPayFirstWithAdditional ? additionalChargesTotal : (baseAmount + additionalChargesTotal);
    
    const bookingId = jobData.id || jobId;
    const userId = user?.uid || user?.id;
    
    // PayMongo minimum amount is ₱100 for GCash/Maya
    if ((method === 'gcash' || method === 'maya') && amount < 100) {
      Alert.alert(
        'Minimum Amount Required',
        `The minimum payment amount for ${method === 'gcash' ? 'GCash' : 'Maya'} is ₱100. Your total is ₱${amount.toLocaleString()}.`,
        [{text: 'OK'}]
      );
      return;
    }
    
    // Check if this is an upfront payment (Pay First flow - initial payment before work starts)
    const isUpfrontPayment = jobData.paymentPreference === 'pay_first' && 
                             !jobData.isPaidUpfront && 
                             (jobData.status === 'accepted' || jobData.status === 'traveling' || jobData.status === 'arrived');

    setIsProcessingPayment(true);
    setSelectedPaymentMethod(method);
    setPaymentError(null);

    try {
      if (method === 'cash') {
        // Record cash payment
        const result = await paymentService.recordCashPayment(
          bookingId,
          userId,
          amount,
          jobData.providerId
        );

        if (result.success) {
          // Different update based on payment type
          if (isUpfrontPayment) {
            // Initial upfront payment for Pay First
            await updateDoc(doc(db, 'bookings', bookingId), {
              isPaidUpfront: true,
              upfrontPaidAmount: amount,
              upfrontPaidAt: serverTimestamp(),
              paymentMethod: 'cash',
              updatedAt: serverTimestamp(),
            });
            setJobData(prev => ({...prev, isPaidUpfront: true, upfrontPaidAmount: amount}));
            setShowPaymentModal(false);
            Alert.alert('Payment Complete', 'Thank you! The provider can now start working on your job.');
          } else if (isPayFirstWithAdditional) {
            // Pay First - paying additional charges only (already paid upfront)
            await updateDoc(doc(db, 'bookings', bookingId), {
              status: 'payment_received',
              additionalChargesPaid: true,
              additionalChargesPaidAmount: amount,
              additionalChargesPaidAt: serverTimestamp(),
              clientPaidAt: serverTimestamp(),
              paymentMethod: 'cash',
              updatedAt: serverTimestamp(),
            });
            setJobData(prev => ({...prev, status: 'payment_received', additionalChargesPaid: true}));
            notificationService.notifyPaymentReceived?.(jobData);
            setShowPaymentModal(false);
            Alert.alert('Additional Payment Complete', 'The provider will confirm receipt to complete the job.');
          } else {
            // Pay Later - full payment after work
            await updateDoc(doc(db, 'bookings', bookingId), {
              status: 'payment_received',
              clientPaidAt: serverTimestamp(),
              paymentMethod: 'cash',
              updatedAt: serverTimestamp(),
            });
            setJobData(prev => ({...prev, status: 'payment_received'}));
            notificationService.notifyPaymentReceived?.(jobData);
            setShowPaymentModal(false);
            Alert.alert('Payment Recorded', 'The provider will confirm receipt of payment to complete the job.');
          }
          
          // Send payment receipt email to client via Brevo
          if (user?.email) {
            const clientName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Client';
            sendPaymentReceipt(user.email, clientName, {
              bookingId: bookingId,
              serviceName: jobData.title || jobData.serviceCategory,
              providerName: jobData.provider?.name || jobData.providerName || 'Provider',
              amount: amount,
              paymentMethod: 'Cash',
            }).catch(err => console.log('Payment receipt email failed:', err));
          }
        } else {
          setPaymentError(result.error || 'Failed to record payment');
          Alert.alert('Error', result.error || 'Failed to record payment');
        }
      } else {
        // GCash or Maya - create payment source
        const createPayment = method === 'gcash' 
          ? paymentService.createGCashPayment 
          : paymentService.createPayMayaPayment;

        const result = await createPayment(
          bookingId,
          userId,
          amount,
          `Payment for ${jobData.title || jobData.serviceCategory}`
        );

        if (result.success && result.checkoutUrl) {
          setShowPaymentModal(false);
          
          // Open checkout URL
          const openResult = await paymentService.openPaymentCheckout(result.checkoutUrl);
          
          if (openResult.success) {
            // Show info that they need to complete payment
            Alert.alert(
              'Complete Payment',
              `Please complete your ${method === 'gcash' ? 'GCash' : 'Maya'} payment in the browser.\n\nIf the page appears blank or doesn't load, please wait a few seconds and refresh the page.\n\nOnce payment is complete, return to the app and tap "Verify Payment" to confirm.`,
              [{text: 'OK'}]
            );
          } else {
            // Show URL so user can copy it manually
            Alert.alert(
              'Open in Browser',
              `Could not open automatically. Please copy this link and open in your browser:\n\n${result.checkoutUrl}`,
              [
                {text: 'OK'},
              ]
            );
          }
        } else {
          setPaymentError(result.error || 'Failed to create payment');
          Alert.alert('Payment Error', result.error || 'Failed to create payment. Please try again.');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError('Payment failed. Please check your connection and try again.');
      Alert.alert('Error', 'Payment failed. Please check your connection and try again.');
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
        {text: 'Cancel', style: 'cancel'},
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
              Alert.alert('Accepted', 'Counter offer accepted. Waiting for provider confirmation.');
            } catch (error) {
              console.error('Error accepting counter offer:', error);
              Alert.alert('Error', 'Failed to accept counter offer');
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
      Alert.alert('Error', 'Please enter a valid offer price');
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
      Alert.alert('Offer Sent', 'Your new offer has been sent to the provider.');
    } catch (error) {
      console.error('Error sending new offer:', error);
      Alert.alert('Error', 'Failed to send new offer');
    } finally {
      setIsUpdating(false);
    }
  };

  // Approve additional charge
  const handleApproveAdditional = (chargeId) => {
    const charge = jobData.additionalCharges?.find(c => c.id === chargeId);
    if (!charge) return;

    Alert.alert(
      'Approve Additional Charge',
      `Approve additional payment of ₱${charge.total?.toLocaleString()} for:\n\n"${charge.reason}"`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setIsUpdating(true);
              const updatedCharges = jobData.additionalCharges.map(c => 
                c.id === chargeId ? {...c, status: 'approved', approvedAt: new Date().toISOString()} : c
              );
              
              // Check if any more pending
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
              Alert.alert('Approved', 'Additional charge has been approved.');
            } catch (error) {
              console.error('Error approving charge:', error);
              Alert.alert('Error', 'Failed to approve charge');
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
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUpdating(true);
              const updatedCharges = jobData.additionalCharges.map(c => 
                c.id === chargeId ? {...c, status: 'rejected', rejectedAt: new Date().toISOString()} : c
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
              Alert.alert('Rejected', 'Additional charge has been rejected.');
            } catch (error) {
              console.error('Error rejecting charge:', error);
              Alert.alert('Error', 'Failed to reject charge');
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
      <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
        <View style={globalStyles.centerContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      </SafeAreaView>
    );
  }

  if (!jobData) {
    return (
      <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
        <View style={[styles.header, isDark && {backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border}]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && {color: theme.colors.text}]}>Job Details</Text>
          <View style={{width: 24}} />
        </View>
        <View style={globalStyles.centerContainer}>
          <Text style={[globalStyles.bodyMedium, isDark && {color: theme.colors.text}]}>Job not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, isDark && {backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && {color: theme.colors.text}]}>Job Details</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, {backgroundColor: getStatusColor(jobData.status) + '15'}]}>
          <View style={[styles.statusDot, {backgroundColor: getStatusColor(jobData.status)}]} />
          <Text style={[styles.statusText, {color: getStatusColor(jobData.status)}]}>
            {getStatusLabel(jobData.status)}
          </Text>
        </View>

        {/* Provider Traveling Banner - Prominent tracking CTA */}
        {(jobData.status === 'traveling' || jobData.status === 'arrived') && (
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
            <View style={{flex: 1, marginLeft: 12}}>
              <Text style={{fontSize: 15, fontWeight: '700', color: '#FFFFFF'}}>
                {jobData.status === 'traveling' ? 'Provider is on the way!' : 'Provider has arrived!'}
              </Text>
              <Text style={{fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2}}>
                Tap to track their location in real-time
              </Text>
            </View>
            <Icon name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Admin Review Banner - Show when pending and not yet approved */}
        {!jobData.adminApproved && (jobData.status === 'pending' || jobData.status === 'pending_negotiation') && (
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
            <View style={{marginLeft: 12, flex: 1}}>
              <Text style={{fontSize: 13, fontWeight: '600', color: '#1E40AF', marginBottom: 2}}>
                Under Admin Review
              </Text>
              <Text style={{fontSize: 12, color: '#3B82F6'}}>
                Your request is being reviewed by our team. We'll notify you once it's sent to the provider.
              </Text>
            </View>
          </View>
        )}

        {/* Approved Banner - Show when admin approved and waiting for provider */}
        {jobData.adminApproved && jobData.status === 'pending' && (
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
            <View style={{marginLeft: 12, flex: 1}}>
              <Text style={{fontSize: 13, fontWeight: '600', color: '#065F46', marginBottom: 2}}>
                Sent to Provider
              </Text>
              <Text style={{fontSize: 12, color: '#047857'}}>
                Your request has been approved and sent to the provider. Waiting for their response.
              </Text>
            </View>
          </View>
        )}

        {/* Job Info */}
        <View style={styles.section}>
          <Text style={styles.jobTitle}>{jobData.title || jobData.serviceCategory}</Text>
          <View style={styles.categoryTag}>
            <Icon name="construct" size={14} color="#00B14F" />
            <Text style={styles.categoryText}>{jobData.serviceCategory}</Text>
          </View>
          
          {jobData.description && (
            <Text style={styles.description}>{jobData.description}</Text>
          )}
        </View>

        {/* Provider Info (show if provider assigned or providerName exists) */}
        {(jobData.provider || jobData.providerName || jobData.providerId) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Provider</Text>
            <View style={styles.personCard}>
              <View style={styles.personAvatar}>
                {jobData.provider?.photo ? (
                  <Image source={{uri: jobData.provider.photo}} style={styles.avatarImage} />
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
                {(jobData.provider?.tier || jobData.provider?.points > 0) && (
                  <View style={{marginTop: 4}}>
                    <TierBadge tier={jobData.provider?.tier || getProviderTier(jobData.provider.points)} size="small" />
                  </View>
                )}
              </View>
            </View>
            
            {/* Provider Badges */}
            {jobData.provider?.badges?.length > 0 && (
              <View style={{marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB'}}>
                <Text style={{fontSize: 12, color: '#6B7280', marginBottom: 6}}>Provider Badges</Text>
                <BadgeList badges={jobData.provider.badges} maxDisplay={4} size="small" />
              </View>
            )}
            
            {/* Contact Buttons - Only show after admin approval */}
            {jobData.adminApproved ? (
              <View>
                <View style={styles.contactButtons}>
                  <TouchableOpacity style={styles.contactButtonLarge} onPress={handleCallProvider}>
                    <Icon name="call" size={20} color="#00B14F" />
                    <Text style={styles.contactButtonTextLarge}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.contactButtonLarge} onPress={handleMessageProvider}>
                    <Icon name="chatbubble" size={20} color="#00B14F" />
                    <Text style={styles.contactButtonTextLarge}>Message</Text>
                  </TouchableOpacity>
                </View>
                {/* Track Provider Button - Show when traveling or arrived */}
                {(jobData.status === 'traveling' || jobData.status === 'arrived') && (
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
                    <Text style={{color: '#FFFFFF', fontWeight: '600', fontSize: 15, marginLeft: 8}}>
                      {jobData.status === 'traveling' ? 'Track Provider Location' : 'View Provider Location'}
                    </Text>
                  </TouchableOpacity>
                )}
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
                <Text style={{fontSize: 13, color: '#92400E', marginLeft: 8, flex: 1}}>
                  Contact options will be available once admin approves your request.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Media Files */}
        {jobData.mediaFiles && jobData.mediaFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attached Media</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {jobData.mediaFiles.map((file, index) => (
                <View key={index} style={styles.mediaItem}>
                {(file.url || file.uri) && (
                  <Image source={{uri: file.url || file.uri}} style={styles.mediaImage} />
                )}
                  {file.isVideo && (
                    <View style={styles.videoOverlay}>
                      <Icon name="play-circle" size={30} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

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
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Icon 
                  name="wallet" 
                  size={24} 
                  color="#059669" 
                />
                <View style={{marginLeft: 12}}>
                  <Text style={{fontSize: 16, fontWeight: '700', color: '#059669'}}>
                    {jobData.paymentMethod === 'maya' ? 'Maya' : 'GCash'}
                  </Text>
                  <Text style={{fontSize: 12, color: '#047857'}}>
                    Pay First • Protected Payment
                  </Text>
                </View>
              </View>
              {jobData.isPaidUpfront && (
                <View style={{backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8}}>
                  <Text style={{fontSize: 12, fontWeight: '700', color: '#FFFFFF'}}>PAID</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Price Info */}
        {(jobData.price || jobData.estimatedPrice || jobData.totalAmount) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Breakdown</Text>
            <View style={{
              backgroundColor: '#F0FDF4',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: '#BBF7D0',
            }}>
              {/* Show negotiation info */}
              {jobData.isNegotiable && (
                <View style={{marginBottom: 12}}>
                  <Text style={{fontSize: 12, color: '#6B7280', marginBottom: 4}}>
                    Provider's Fixed Price: ₱{(jobData.providerFixedPrice || 0).toLocaleString()}
                  </Text>
                  <Text style={{fontSize: 12, color: '#6B7280'}}>
                    Your Offer: ₱{(jobData.offeredPrice || 0).toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                <Text style={{fontSize: 14, color: '#4B5563'}}>Service Price</Text>
                <Text style={{fontSize: 14, fontWeight: '600', color: '#1F2937'}}>
                  ₱{(jobData.providerPrice || jobData.offeredPrice || jobData.price || 0).toLocaleString()}
                </Text>
              </View>

              {/* Show discount if applied */}
              {jobData.hasDiscount && jobData.discountAmount > 0 && (
                <View style={{
                  backgroundColor: '#D1FAE5',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 8,
                }}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Icon name="pricetag" size={16} color="#059669" />
                      <Text style={{fontSize: 13, color: '#065F46', marginLeft: 6, fontWeight: '600'}}>
                        Provider Discount
                      </Text>
                    </View>
                    <Text style={{fontSize: 14, fontWeight: '700', color: '#059669'}}>
                      -₱{jobData.discountAmount.toLocaleString()}
                    </Text>
                  </View>
                  {jobData.discountReason && (
                    <Text style={{fontSize: 12, color: '#065F46', marginTop: 4, fontStyle: 'italic'}}>
                      "{jobData.discountReason}"
                    </Text>
                  )}
                </View>
              )}

              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                <Text style={{fontSize: 14, color: '#4B5563'}}>System Fee ({APP_CONFIG.SERVICE_FEE_PERCENTAGE}%)</Text>
                <Text style={{fontSize: 14, fontWeight: '600', color: '#1F2937'}}>
                  {APP_CONFIG.CURRENCY_SYMBOL}{(jobData.systemFee || 0).toLocaleString()}
                </Text>
              </View>

              {/* Show additional charges */}
              {jobData.additionalCharges && jobData.additionalCharges.length > 0 && (
                <View style={{marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#BBF7D0'}}>
                  <Text style={{fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8}}>
                    Additional Charges
                  </Text>
                  {jobData.additionalCharges.map((charge, index) => (
                    <View key={charge.id || index} style={{marginBottom: 8}}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Text style={{fontSize: 13, color: '#4B5563', flex: 1}} numberOfLines={1}>
                          {charge.reason}
                        </Text>
                        <Text style={{fontSize: 13, fontWeight: '500', color: '#1F2937'}}>
                          +₱{(charge.total || 0).toLocaleString()}
                        </Text>
                      </View>
                      {charge.status === 'pending' && (
                        <View style={{flexDirection: 'row', marginTop: 8}}>
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
                            <Text style={{fontSize: 12, color: '#DC2626', fontWeight: '600'}}>Reject</Text>
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
                            <Text style={{fontSize: 12, color: '#059669', fontWeight: '600'}}>Approve</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {charge.status === 'approved' && (
                        <Text style={{fontSize: 11, color: '#059669', marginTop: 2}}>✓ Approved</Text>
                      )}
                      {charge.status === 'rejected' && (
                        <Text style={{fontSize: 11, color: '#DC2626', marginTop: 2}}>✗ Rejected</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <View style={{
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: '#BBF7D0',
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 8,
              }}>
                <Text style={{fontSize: 16, fontWeight: '700', color: '#1F2937'}}>Total Amount</Text>
                <Text style={{fontSize: 18, fontWeight: '700', color: '#00B14F'}}>
                  ₱{(
                    (jobData.totalAmount || jobData.price || 0) +
                    (jobData.additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.total, 0) || 0)
                  ).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Counter Offer Section */}
        {jobData.status?.toLowerCase() === 'counter_offer' && (
          <View style={styles.section}>
            <View style={{
              backgroundColor: '#EDE9FE',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: '#8B5CF6',
            }}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Icon name="pricetag" size={20} color="#8B5CF6" />
                <Text style={{fontSize: 16, fontWeight: '700', color: '#5B21B6', marginLeft: 8}}>
                  Provider's Counter Offer
                </Text>
              </View>
              <Text style={{fontSize: 28, fontWeight: '700', color: '#8B5CF6'}}>
                ₱{(jobData.counterOfferPrice || 0).toLocaleString()}
              </Text>
              <Text style={{fontSize: 13, color: '#6B7280', marginTop: 4}}>
                Total with fee: ₱{((jobData.counterOfferPrice || 0) * 1.05).toLocaleString()}
              </Text>
              {jobData.counterOfferNote && (
                <Text style={{fontSize: 14, color: '#5B21B6', marginTop: 8, fontStyle: 'italic'}}>
                  "{jobData.counterOfferNote}"
                </Text>
              )}
              
              <View style={{flexDirection: 'row', marginTop: 16}}>
                <TouchableOpacity 
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    paddingVertical: 12,
                    borderRadius: 8,
                    marginRight: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#8B5CF6',
                  }}
                  onPress={() => setShowNewOfferModal(true)}>
                  <Text style={{fontSize: 14, color: '#8B5CF6', fontWeight: '600'}}>Make New Offer</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{
                    flex: 1,
                    backgroundColor: '#8B5CF6',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={handleAcceptCounterOffer}>
                  <Text style={{fontSize: 14, color: '#FFFFFF', fontWeight: '600'}}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Review Prompt - Show when job is completed and not yet reviewed */}
        {jobData.status === 'completed' && !jobData.reviewed && (
          <View style={{
            margin: 16,
            padding: 20,
            backgroundColor: '#FFFBEB',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#FCD34D',
          }}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
              <Icon name="star" size={28} color="#F59E0B" />
              <Text style={{fontSize: 18, fontWeight: '700', color: '#92400E', marginLeft: 10}}>
                How was your experience?
              </Text>
            </View>
            <Text style={{fontSize: 14, color: '#B45309', marginBottom: 16, lineHeight: 20}}>
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
              <Text style={{color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginLeft: 8}}>
                Leave a Review
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Review Submitted Badge - Show when reviewed */}
        {jobData.status === 'completed' && jobData.reviewed && (
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
            <View style={{marginLeft: 12, flex: 1}}>
              <Text style={{fontSize: 14, fontWeight: '600', color: '#065F46'}}>
                Review Submitted
              </Text>
              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon 
                    key={star}
                    name={star <= (jobData.reviewRating || 0) ? "star" : "star-outline"} 
                    size={16} 
                    color="#F59E0B"
                  />
                ))}
                <Text style={{fontSize: 13, color: '#047857', marginLeft: 8}}>
                  Thank you for your feedback!
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* View Receipt Button - Show for completed jobs */}
        {jobData.status === 'completed' && (
          <View style={{marginHorizontal: 16, marginBottom: 16}}>
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
              <Text style={{color: '#374151', fontSize: 16, fontWeight: '600', marginLeft: 8}}>
                View Receipt
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Job ID */}
        <View style={styles.section}>
          <Text style={styles.jobId}>Job ID: {jobData.id || jobId || 'N/A'}</Text>
          <Text style={styles.createdAt}>
            Created: {jobData.createdAt || new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Action Buttons */}
        {(jobData.status === 'pending' || jobData.status === 'pending_negotiation') && (
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelJob}>
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PAY FIRST - Client needs to pay before provider starts work */}
        {jobData.paymentPreference === 'pay_first' && 
         !jobData.isPaidUpfront && 
         (jobData.status === 'accepted' || jobData.status === 'traveling' || jobData.status === 'arrived') && (
          <View style={styles.actionSection}>
            <View style={{
              backgroundColor: '#FEF3C7',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#F59E0B',
            }}>
              <Icon name="alert-circle" size={32} color="#F59E0B" />
              <Text style={{fontSize: 18, fontWeight: '700', color: '#92400E', marginTop: 8}}>
                Payment Required First
              </Text>
              <Text style={{fontSize: 22, fontWeight: '700', color: '#D97706', marginTop: 8}}>
                ₱{(jobData?.totalAmount || jobData?.amount || 0).toLocaleString()}
              </Text>
              <Text style={{fontSize: 13, color: '#B45309', marginTop: 8, textAlign: 'center'}}>
                You selected "Pay First". Please pay now so the provider can start working.
              </Text>
            </View>
            <TouchableOpacity 
              style={{
                backgroundColor: '#F59E0B',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
              onPress={handlePayUpfront}>
              <Icon name="card" size={20} color="#FFFFFF" />
              <Text style={{color: '#FFFFFF', fontWeight: '700', fontSize: 16, marginLeft: 8}}>
                Pay Now (Before Service)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PAY FIRST - Already paid, waiting for work */}
        {jobData.paymentPreference === 'pay_first' && 
         jobData.isPaidUpfront && 
         (jobData.status === 'accepted' || jobData.status === 'traveling' || jobData.status === 'arrived' || jobData.status === 'in_progress') && (
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
              <Text style={{fontSize: 16, fontWeight: '700', color: '#065F46', marginTop: 8}}>
                Payment Complete
              </Text>
              <Text style={{fontSize: 14, color: '#047857', marginTop: 4}}>
                ₱{(jobData.upfrontPaidAmount || jobData.totalAmount || 0).toLocaleString()} paid
              </Text>
              <Text style={{fontSize: 13, color: '#059669', marginTop: 8, textAlign: 'center'}}>
                Provider can now proceed with the work. You'll be notified when complete.
              </Text>
            </View>
          </View>
        )}

        {/* Pending Completion - Client needs to confirm work is done */}
        {jobData.status === 'pending_completion' && (
          <View style={styles.actionSection}>
            <View style={{
              backgroundColor: '#FEF3C7',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
              alignItems: 'center',
            }}>
              <Icon name="construct" size={32} color="#F59E0B" />
              <Text style={{fontSize: 16, fontWeight: '600', color: '#92400E', marginTop: 8}}>
                Provider Marked Work Complete
              </Text>
              <Text style={{fontSize: 13, color: '#B45309', marginTop: 4, textAlign: 'center'}}>
                Please confirm if you're satisfied with the work to proceed to payment.
              </Text>
            </View>

            {/* Show pending additional charges that need approval */}
            {jobData.additionalCharges?.some(c => c.status === 'pending') && (
              <View style={{
                backgroundColor: '#FEE2E2',
                padding: 16,
                borderRadius: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#FECACA',
              }}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                  <Icon name="alert-circle" size={20} color="#DC2626" />
                  <Text style={{fontSize: 14, fontWeight: '600', color: '#991B1B', marginLeft: 8}}>
                    Additional Charges Pending
                  </Text>
                </View>
                <Text style={{fontSize: 13, color: '#DC2626', marginBottom: 12}}>
                  The provider has requested additional charges. Please review and approve or reject before confirming completion.
                </Text>
                {jobData.additionalCharges.filter(c => c.status === 'pending').map((charge, index) => (
                  <View key={charge.id || index} style={{
                    backgroundColor: '#FFFFFF',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}>
                    <Text style={{fontSize: 13, color: '#374151', marginBottom: 4}}>{charge.reason}</Text>
                    <Text style={{fontSize: 16, fontWeight: '700', color: '#DC2626'}}>
                      +₱{charge.total?.toLocaleString()}
                    </Text>
                    <View style={{flexDirection: 'row', marginTop: 10, gap: 8}}>
                      <TouchableOpacity 
                        style={{
                          flex: 1,
                          backgroundColor: '#FEE2E2',
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                        onPress={() => handleRejectAdditional(charge.id)}>
                        <Text style={{fontSize: 14, color: '#DC2626', fontWeight: '600'}}>Reject</Text>
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
                        <Text style={{fontSize: 14, color: '#059669', fontWeight: '600'}}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

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
              <Text style={{color: '#FFFFFF', fontWeight: '600', fontSize: 16, marginLeft: 8}}>
                {jobData.hasAdditionalPending ? 'Review Additional Charges First' : 'Confirm & Proceed to Pay'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Payment - Client needs to pay */}
        {jobData.status === 'pending_payment' && (
          <View style={styles.actionSection}>
            {/* Show error banner if payment failed */}
            {paymentError && (
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
                <View style={{flex: 1, marginLeft: 10}}>
                  <Text style={{fontSize: 13, fontWeight: '600', color: '#991B1B'}}>Payment Failed</Text>
                  <Text style={{fontSize: 12, color: '#DC2626'}}>{paymentError}</Text>
                </View>
                <TouchableOpacity onPress={() => setPaymentError(null)}>
                  <Icon name="close" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            )}

            {/* Checking payment status indicator */}
            {isCheckingPayment && (
              <View style={{
                backgroundColor: '#FEF3C7',
                padding: 14,
                borderRadius: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={{fontSize: 13, color: '#92400E', marginLeft: 10}}>
                  Checking payment status...
                </Text>
              </View>
            )}

            <View style={{
              backgroundColor: '#DBEAFE',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
              alignItems: 'center',
            }}>
              <Icon name="card" size={32} color="#3B82F6" />
              <Text style={{fontSize: 16, fontWeight: '600', color: '#1E40AF', marginTop: 8}}>
                {jobData.paymentPreference === 'pay_first' && jobData.isPaidUpfront 
                  ? 'Additional Payment Required' 
                  : 'Payment Required'}
              </Text>
              <Text style={{fontSize: 22, fontWeight: '700', color: '#1E40AF', marginTop: 8}}>
                ₱{(() => {
                  const baseAmount = jobData?.totalAmount || jobData?.amount || 0;
                  const additionalTotal = jobData?.additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.total || 0), 0) || 0;
                  // For Pay First with upfront payment, only show additional charges
                  if (jobData.paymentPreference === 'pay_first' && jobData.isPaidUpfront) {
                    return additionalTotal;
                  }
                  return baseAmount + additionalTotal;
                })().toLocaleString()}
              </Text>
              {jobData.paymentPreference === 'pay_first' && jobData.isPaidUpfront && (
                <Text style={{fontSize: 12, color: '#3B82F6', marginTop: 2}}>
                  (Original ₱{(jobData.upfrontPaidAmount || jobData.totalAmount || 0).toLocaleString()} already paid)
                </Text>
              )}
              <Text style={{fontSize: 13, color: '#3B82F6', marginTop: 4, textAlign: 'center'}}>
                {jobData.paymentPreference === 'pay_first' && jobData.isPaidUpfront 
                  ? 'Please pay the additional charges to complete this job.'
                  : 'Please pay the provider to complete this job.'}
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
              <Text style={{color: '#FFFFFF', fontWeight: '600', fontSize: 16, marginLeft: 8}}>
                {paymentError ? 'Retry Payment' : 'Pay Now'}
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
                  <Text style={{color: '#6B7280', fontWeight: '600', fontSize: 14, marginLeft: 8}}>
                    Already Paid? Verify Payment
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Payment Received - Waiting for provider confirmation */}
        {jobData.status === 'payment_received' && (
          <View style={styles.actionSection}>
            <View style={{
              backgroundColor: '#D1FAE5',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
            }}>
              <Icon name="checkmark-done-circle" size={32} color="#059669" />
              <Text style={{fontSize: 16, fontWeight: '600', color: '#065F46', marginTop: 8}}>
                Payment Sent!
              </Text>
              <Text style={{fontSize: 13, color: '#047857', marginTop: 4, textAlign: 'center'}}>
                Waiting for provider to confirm receipt of payment.
              </Text>
            </View>
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>

      {/* Cancellation Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            maxHeight: '80%',
          }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#1F2937'}}>Cancel Job</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{fontSize: 14, color: '#6B7280', marginBottom: 16}}>
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

            {selectedCancelReason === 'Other' && (
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
            )}

            <View style={{flexDirection: 'row', marginTop: 20}}>
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
                <Text style={{color: '#6B7280', fontSize: 16, fontWeight: '600'}}>Keep Job</Text>
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
                  <Text style={{color: '#FFFFFF', fontSize: 16, fontWeight: '600'}}>Cancel Job</Text>
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
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
          }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#1F2937'}}>Make New Offer</Text>
              <TouchableOpacity onPress={() => setShowNewOfferModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{fontSize: 13, color: '#6B7280', marginBottom: 12}}>
              Provider's counter: ₱{(jobData?.counterOfferPrice || 0).toLocaleString()} | 
              Your last offer: ₱{(jobData?.offeredPrice || 0).toLocaleString()}
            </Text>

            <Text style={{fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8}}>
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
              <Text style={{fontSize: 18, color: '#00B14F', fontWeight: '700'}}>₱</Text>
              <TextInput
                style={{flex: 1, fontSize: 18, color: '#1F2937', paddingVertical: 14, paddingHorizontal: 8}}
                placeholder="Enter your offer"
                keyboardType="numeric"
                value={newOfferPrice}
                onChangeText={setNewOfferPrice}
              />
            </View>

            <Text style={{fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8}}>
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

            {newOfferPrice && (
              <View style={{backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 16}}>
                <Text style={{fontSize: 13, color: '#6B7280'}}>Your total with fee:</Text>
                <Text style={{fontSize: 20, fontWeight: '700', color: '#00B14F'}}>
                  ₱{(parseFloat(newOfferPrice || 0) * 1.05).toLocaleString()}
                </Text>
              </View>
            )}

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
                <Text style={{color: '#FFFFFF', fontSize: 16, fontWeight: '700'}}>Send Offer</Text>
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
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 40,
          }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#1F2937'}}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{fontSize: 14, color: '#6B7280', marginBottom: 16}}>
              Amount to pay: <Text style={{fontWeight: '700', color: '#00B14F'}}>
                ₱{(jobData?.totalAmount || jobData?.amount || 0).toLocaleString()}
              </Text>
            </Text>

            {/* GCash Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: selectedPaymentMethod === 'gcash' ? '#EFF6FF' : '#F9FAFB',
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 2,
                borderColor: selectedPaymentMethod === 'gcash' ? '#007DFE' : '#E5E7EB',
              }}
              onPress={() => processPayment('gcash')}
              disabled={isProcessingPayment}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#007DFE',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{fontSize: 18, fontWeight: '700', color: '#FFFFFF'}}>G</Text>
              </View>
              <View style={{flex: 1, marginLeft: 12}}>
                <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937'}}>GCash</Text>
                <Text style={{fontSize: 13, color: '#6B7280'}}>Pay with your GCash wallet</Text>
              </View>
              {isProcessingPayment && selectedPaymentMethod === 'gcash' ? (
                <ActivityIndicator color="#007DFE" />
              ) : (
                <Icon name="chevron-forward" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>

            {/* Maya Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: selectedPaymentMethod === 'maya' ? '#F0FDF4' : '#F9FAFB',
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 2,
                borderColor: selectedPaymentMethod === 'maya' ? '#00D66C' : '#E5E7EB',
              }}
              onPress={() => processPayment('maya')}
              disabled={isProcessingPayment}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#00D66C',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{fontSize: 18, fontWeight: '700', color: '#FFFFFF'}}>M</Text>
              </View>
              <View style={{flex: 1, marginLeft: 12}}>
                <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937'}}>Maya</Text>
                <Text style={{fontSize: 13, color: '#6B7280'}}>Pay with your Maya wallet</Text>
              </View>
              {isProcessingPayment && selectedPaymentMethod === 'maya' ? (
                <ActivityIndicator color="#00D66C" />
              ) : (
                <Icon name="chevron-forward" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>

            {/* Cash option removed - only GCash and Maya allowed */}

            <Text style={{fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 16}}>
              Secure payment powered by PayMongo
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default JobDetailsScreen;
