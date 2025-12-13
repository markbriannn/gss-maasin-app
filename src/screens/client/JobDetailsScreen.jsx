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
import {doc, getDoc, updateDoc, serverTimestamp, onSnapshot} from 'firebase/firestore';
import notificationService from '../../services/notificationService';
import paymentService from '../../services/paymentService';
import {useAuth} from '../../context/AuthContext';

const JobDetailsScreen = ({navigation, route}) => {
  const {job, jobId} = route.params || {};
  const {user} = useAuth();
  const [jobData, setJobData] = useState(job || null);
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

  // Check payment status when app returns from background (after GCash/Maya checkout)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        jobData?.status === 'pending_payment'
      ) {
        // App came back to foreground, check if payment was completed
        setIsCheckingPayment(true);
        const bookingId = jobData.id || jobId;
        
        try {
          const result = await paymentService.checkPaymentStatus(bookingId);
          if (result.success && result.status === 'paid') {
            // Payment was successful, the webhook should have updated the booking
            setPaymentError(null);
            Alert.alert('Payment Successful', 'Your payment has been processed successfully!');
          } else if (result.success && result.status === 'failed') {
            setPaymentError('Payment failed. Please try again.');
          }
        } catch (error) {
          console.log('Payment status check error:', error);
        } finally {
          setIsCheckingPayment(false);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [jobData?.status, jobData?.id, jobId]);

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
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Fetch provider info
          let providerInfo = null;
          if (data.providerId) {
            try {
              const providerDoc = await getDoc(doc(db, 'users', data.providerId));
              if (providerDoc.exists()) {
                const pData = providerDoc.data();
                providerInfo = {
                  id: providerDoc.id,
                  name: `${pData.firstName || ''} ${pData.lastName || ''}`.trim() || data.providerName || 'Provider',
                  phone: pData.phone,
                  photo: pData.profilePhoto,
                  rating: pData.rating || null,
                  reviewCount: pData.reviewCount || 0,
                };
              }
            } catch (e) {
              console.log('Error fetching provider:', e);
            }
          }

          setJobData({
            ...data,
            id: docSnap.id,
            title: data.title || data.serviceCategory,
            serviceCategory: data.serviceCategory || data.service,
            description: data.description || data.notes,
            status: data.status,
            scheduledDate: data.scheduledDate,
            scheduledTime: data.scheduledTime,
            price: data.totalAmount || data.price,
            address: data.address,
            mediaFiles: data.mediaFiles || [],
            provider: providerInfo,
            // Ensure counter offer fields are included
            counterOfferPrice: data.counterOfferPrice,
            counterOfferNote: data.counterOfferNote,
            offeredPrice: data.offeredPrice,
            isNegotiable: data.isNegotiable,
            createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString(),
          });
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'pending_negotiation': return '#F59E0B';
      case 'counter_offer': return '#8B5CF6';
      case 'accepted': return '#3B82F6';
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
      // Notify provider about cancellation
      if (jobData.providerId) {
        notificationService.notifyJobCancelled(jobData, 'client', reason);
      }
      setShowCancelModal(false);
      Alert.alert('Cancelled', 'Job has been cancelled');
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
    Alert.alert(
      'Confirm Work Complete',
      'Are you satisfied with the work? This will proceed to payment.',
      [
        {text: 'Not Yet', style: 'cancel'},
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
              setJobData(prev => ({...prev, status: 'pending_payment'}));
              Alert.alert('Confirmed', 'Please proceed to pay the provider.');
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

  // Process payment based on selected method
  const processPayment = async (method) => {
    const amount = jobData?.totalAmount || jobData?.amount || 0;
    const bookingId = jobData.id || jobId;
    const userId = user?.uid || user?.id;

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
              `Please complete your ${method === 'gcash' ? 'GCash' : 'Maya'} payment in the browser. The app will update automatically once payment is confirmed.`,
              [{text: 'OK'}]
            );
          } else {
            setPaymentError('Could not open payment page. Please try again.');
            Alert.alert('Error', 'Could not open payment page. Please try again.');
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
      <SafeAreaView style={globalStyles.container}>
        <View style={globalStyles.centerContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      </SafeAreaView>
    );
  }

  if (!jobData) {
    return (
      <SafeAreaView style={globalStyles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={{width: 24}} />
        </View>
        <View style={globalStyles.centerContainer}>
          <Text style={globalStyles.bodyMedium}>Job not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
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

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.infoRow}>
            <Icon name="calendar-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              {jobData.scheduledDate || jobData.date || 'Not specified'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="time-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              {jobData.scheduledTime || jobData.time || 'Not specified'}
            </Text>
          </View>
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
                  <Icon name="star" size={14} color={jobData.provider?.rating ? "#F59E0B" : "#D1D5DB"} />
                  <Text style={styles.ratingText}>
                    {jobData.provider?.rating ? `${jobData.provider.rating} (${jobData.provider.reviewCount || 0} reviews)` : 'New Provider'}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Contact Buttons - Only show after admin approval */}
            {jobData.adminApproved ? (
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
                {file.uri && (
                  <Image source={{uri: file.uri}} style={styles.mediaImage} />
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
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                <Text style={{fontSize: 14, color: '#4B5563'}}>System Fee (5%)</Text>
                <Text style={{fontSize: 14, fontWeight: '600', color: '#1F2937'}}>
                  ₱{(jobData.systemFee || 0).toLocaleString()}
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
            <TouchableOpacity 
              style={{
                backgroundColor: '#10B981',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
              onPress={handleConfirmCompletion}>
              <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={{color: '#FFFFFF', fontWeight: '600', fontSize: 16, marginLeft: 8}}>
                Confirm & Proceed to Pay
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
                Payment Required
              </Text>
              <Text style={{fontSize: 22, fontWeight: '700', color: '#1E40AF', marginTop: 8}}>
                ₱{(jobData?.totalAmount || jobData?.amount || 0).toLocaleString()}
              </Text>
              <Text style={{fontSize: 13, color: '#3B82F6', marginTop: 4, textAlign: 'center'}}>
                Please pay the provider to complete this job.
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

            {/* Cash Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: selectedPaymentMethod === 'cash' ? '#FEF3C7' : '#F9FAFB',
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedPaymentMethod === 'cash' ? '#F59E0B' : '#E5E7EB',
              }}
              onPress={() => processPayment('cash')}
              disabled={isProcessingPayment}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#F59E0B',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Icon name="cash" size={24} color="#FFFFFF" />
              </View>
              <View style={{flex: 1, marginLeft: 12}}>
                <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937'}}>Cash</Text>
                <Text style={{fontSize: 13, color: '#6B7280'}}>Pay cash directly to provider</Text>
              </View>
              {isProcessingPayment && selectedPaymentMethod === 'cash' ? (
                <ActivityIndicator color="#F59E0B" />
              ) : (
                <Icon name="chevron-forward" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>

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
