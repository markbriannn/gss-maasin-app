import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
  TextInput,
  Modal,
  Dimensions,
  AppState,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {jobDetailsStyles as styles} from '../../css/jobDetailsStyles';
import {db} from '../../config/firebase';
import {doc, getDoc, updateDoc, serverTimestamp, onSnapshot} from 'firebase/firestore';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import Video from 'react-native-video';
import notificationService from '../../services/notificationService';
import smsEmailService from '../../services/smsEmailService';
import locationService from '../../services/locationService';
import {sendJobAcceptedEmail, sendPaymentReceipt} from '../../services/emailService';
import {APP_CONFIG} from '../../config/constants';
import paymentService from '../../services/paymentService';
import {getClientBadges, getClientTier} from '../../utils/gamification';
import {BadgeList, TierBadge} from '../../components/gamification';
import {onBookingCompleted} from '../../services/gamificationService';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const ProviderJobDetailsScreen = ({navigation, route}) => {
  const {job, jobId} = route.params || {};
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const [jobData, setJobData] = useState(job || null);
  const [isLoading, setIsLoading] = useState(!job);
  const [isUpdating, setIsUpdating] = useState(false);
  // Location tracking state
  const locationWatchRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  // Additional charges state
  const [showAdditionalModal, setShowAdditionalModal] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState('');
  const [additionalReason, setAdditionalReason] = useState('');
  // Discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  // Media viewer state
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedCancelReason, setSelectedCancelReason] = useState('');

  const CANCEL_REASONS = [
    'Schedule conflict',
    'Too far from my location',
    'Job scope too complex',
    'Not my expertise',
    'Emergency situation',
    'Other',
  ];

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Start location tracking if status is traveling when screen loads
  useEffect(() => {
    if (jobData?.status === 'traveling') {
      startLocationTracking();
    } else if (jobData?.status !== 'traveling' && locationWatchRef.current) {
      stopLocationTracking();
    }
  }, [jobData?.status]);

  // Real-time listener for job updates
  useEffect(() => {
    const id = jobId || job?.id;
    if (!id) return;

    // Set initial data from passed job
    if (job && !jobData) {
      setJobData(job);
      setIsLoading(false);
    }

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(doc(db, 'bookings', id), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Fetch client info - always fetch to get latest coordinates
        let clientInfo = {
          id: data.clientId,
          name: data.clientName || 'Client',
          phone: null,
          photo: null,
          badges: [],
          tier: null,
          points: 0,
        };
        
        // Always fetch client data to ensure we have coordinates
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
              if (!cData.streetAddress && !cData.barangay) {
                fullAddress = cData.address || 'Maasin City';
              }
              const fetchedName = `${cData.firstName || ''} ${cData.lastName || ''}`.trim();
              
              // Calculate client badges and tier
              const clientBadges = getClientBadges({
                completedBookings: cData.completedBookings || cData.totalBookings || 0,
                totalSpent: cData.totalSpent || 0,
                reviewsGiven: cData.reviewsGiven || 0,
              });
              const clientTier = getClientTier(cData.points || 0);
              
              clientInfo = {
                id: clientDoc.id,
                name: fetchedName || data.clientName || 'Client',
                email: cData.email,
                phone: cData.phone || cData.phoneNumber,
                photo: cData.profilePhoto,
                address: fullAddress,
                streetAddress: cData.streetAddress,
                houseNumber: cData.houseNumber,
                barangay: cData.barangay,
                landmark: cData.landmark,
                latitude: cData.latitude || cData.location?.latitude,
                longitude: cData.longitude || cData.location?.longitude,
                badges: clientBadges,
                tier: clientTier,
                points: cData.points || 0,
              };
            }
          } catch (e) {
            console.log('Error fetching client info:', e);
          }
        }
        
        // Also check if booking has coordinates (from when booking was created)
        if (!clientInfo.latitude && data.latitude) {
          clientInfo.latitude = data.latitude;
          clientInfo.longitude = data.longitude;
        }

        // Helper to convert Firestore timestamp to string
        const formatTimestamp = (ts) => {
          if (!ts) return null;
          if (typeof ts === 'string') return ts;
          if (ts.toDate) return ts.toDate().toLocaleDateString();
          if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString();
          return String(ts);
        };

        // Create clean data object without raw timestamps
        const cleanData = {
          ...data,
          id: docSnap.id,
          adminApproved: data.adminApproved || false,
          client: clientInfo,
          // Convert all timestamp fields to strings
          createdAt: formatTimestamp(data.createdAt) || new Date().toLocaleDateString(),
          updatedAt: formatTimestamp(data.updatedAt),
          acceptedAt: formatTimestamp(data.acceptedAt),
          completedAt: formatTimestamp(data.completedAt),
          cancelledAt: formatTimestamp(data.cancelledAt),
          approvedAt: formatTimestamp(data.approvedAt),
          scheduledDate: data.scheduledDate || '',
          scheduledTime: data.scheduledTime || '',
        };

        setJobData(prev => ({
          ...prev,
          ...cleanData,
        }));
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [jobId, job?.id]);

  const fetchJobDetails = async () => {
    try {
      setIsLoading(true);
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      
      if (jobDoc.exists()) {
        const data = jobDoc.data();
        
        // Fetch client info - always fetch to get coordinates from user profile
        let clientInfo = {
          id: data.clientId,
          name: data.clientName || 'Client',
          phone: null,
          photo: null,
        };
        if (data.clientId) {
          try {
            const clientDoc = await getDoc(doc(db, 'users', data.clientId));
            if (clientDoc.exists()) {
              const cData = clientDoc.data();
              
              // Build full address from new location fields
              let fullAddress = '';
              if (cData.houseNumber) fullAddress += cData.houseNumber + ', ';
              if (cData.streetAddress) fullAddress += cData.streetAddress + ', ';
              if (cData.barangay) fullAddress += 'Brgy. ' + cData.barangay + ', ';
              fullAddress += 'Maasin City';
              
              // Fallback to old address format
              if (!cData.streetAddress && !cData.barangay) {
                fullAddress = cData.address || 'Maasin City';
              }
              
              // Use firstName/lastName from user doc, fallback to clientName from booking
              const fetchedName = `${cData.firstName || ''} ${cData.lastName || ''}`.trim();
              clientInfo = {
                id: clientDoc.id,
                name: fetchedName || data.clientName || 'Client',
                email: cData.email,
                phone: cData.phone || cData.phoneNumber,
                photo: cData.profilePhoto,
                address: fullAddress,
                streetAddress: cData.streetAddress,
                houseNumber: cData.houseNumber,
                barangay: cData.barangay,
                landmark: cData.landmark,
                // Get coordinates from user profile (registration location)
                latitude: cData.latitude || cData.location?.latitude,
                longitude: cData.longitude || cData.location?.longitude,
              };
            }
          } catch (e) {
            console.log('Error fetching client info:', e);
          }
        }
        
        // Also check if booking has coordinates
        if (!clientInfo.latitude && data.latitude) {
          clientInfo.latitude = data.latitude;
          clientInfo.longitude = data.longitude;
        }
        
        setJobData({
          ...data,
          id: jobDoc.id,
          title: data.title || data.serviceCategory,
          serviceCategory: data.serviceCategory || data.service,
          description: data.description || data.notes,
          status: data.status,
          adminApproved: data.adminApproved || false,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          date: data.date,
          time: data.time,
          // Pricing breakdown - providerPrice is what provider earns (before system fee)
          // If providerPrice is null/0, calculate from totalAmount by removing 5% fee
          providerPrice: data.providerPrice || (data.totalAmount ? Math.round(data.totalAmount / 1.05) : data.price || 0),
          systemFee: data.systemFee || (data.totalAmount ? Math.round(data.totalAmount - (data.totalAmount / 1.05)) : 0),
          totalAmount: data.totalAmount || data.price || 0,
          priceType: data.priceType || 'per_job',
          // Legacy support
          price: data.providerPrice || (data.totalAmount ? Math.round(data.totalAmount / 1.05) : data.price),
          estimatedPrice: data.estimatedPrice,
          address: data.address,
          location: data.location,
          mediaFiles: data.mediaFiles || [],
          client: clientInfo,
          clientName: data.clientName,
          createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString(),
          // Payment preference
          paymentPreference: data.paymentPreference || 'pay_later',
          isPaidUpfront: data.isPaidUpfront || false,
          upfrontPaidAmount: data.upfrontPaidAmount || 0,
          additionalCharges: data.additionalCharges || [],
        });
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#3B82F6';
      case 'in_progress': return '#8B5CF6';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status || 'Unknown';
    }
  };

  const handleCallClient = () => {
    if (jobData?.client?.phone) {
      Linking.openURL(`tel:${jobData.client.phone}`);
    } else {
      Alert.alert('Error', 'Client phone number not available');
    }
  };

  const handleMessageClient = () => {
    if (!jobData?.clientId) {
      Alert.alert('Not Available', 'Client information not available');
      return;
    }
    navigation.navigate('Chat', {
      recipient: {
        id: jobData.clientId,
        name: jobData.client?.name || 'Client',
        role: 'CLIENT',
      },
      jobId: jobData.id || jobId,
      jobTitle: jobData.title || 'Service Request',
    });
  };

  const handleAcceptJob = () => {
    const servicePrice = jobData?.providerPrice || jobData?.providerFixedPrice || 0;
    
    Alert.alert(
      'Accept Job',
      'Are you sure you want to accept this job?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setIsUpdating(true);
              const systemFee = servicePrice * 0.05;
              const totalAmount = servicePrice + systemFee;
              
              await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
                status: 'accepted',
                providerId: user.uid,
                providerPrice: servicePrice,
                systemFee: systemFee,
                totalAmount: totalAmount,
                acceptedAt: serverTimestamp(),
              });
              setJobData(prev => ({
                ...prev, 
                status: 'accepted',
                providerPrice: servicePrice,
                systemFee: systemFee,
                totalAmount: totalAmount,
              }));
              // Notify client via push notification
              notificationService.notifyJobAccepted(jobData);
              // Send SMS notification (async)
              if (jobData.client) {
                smsEmailService.notifyJobAccepted(jobData, jobData.client, {name: user?.firstName || 'Provider'})
                  .catch(err => console.log('SMS notification failed:', err));
                
                // Send email notification via EmailJS (async)
                const clientEmail = jobData.client?.email;
                const clientName = jobData.client?.name || 'Client';
                if (clientEmail) {
                  sendJobAcceptedEmail(clientEmail, clientName, {
                    title: jobData.title || jobData.serviceCategory,
                    serviceCategory: jobData.serviceCategory,
                    scheduledDate: jobData.scheduledDate,
                    scheduledTime: jobData.scheduledTime,
                    totalAmount: totalAmount,
                  }, {
                    name: user?.firstName || 'Provider',
                    phone: user?.phone || user?.phoneNumber,
                  }).catch(err => console.log('Email notification failed:', err));
                }
              }
              Alert.alert('Success', 'Job accepted successfully');
            } catch (error) {
              console.error('Error accepting job:', error);
              Alert.alert('Error', 'Failed to accept job. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  // Handle additional charges request
  const handleRequestAdditional = async () => {
    if (!additionalAmount || parseFloat(additionalAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!additionalReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the additional charge');
      return;
    }

    try {
      setIsUpdating(true);
      const addAmount = parseFloat(additionalAmount);
      const addSystemFee = addAmount * 0.05;
      const addTotal = addAmount + addSystemFee;

      const currentAdditionalCharges = jobData.additionalCharges || [];
      const newCharge = {
        id: Date.now().toString(),
        amount: addAmount,
        systemFee: addSystemFee,
        total: addTotal,
        reason: additionalReason,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
        additionalCharges: [...currentAdditionalCharges, newCharge],
        hasAdditionalPending: true,
      });

      setJobData(prev => ({
        ...prev,
        additionalCharges: [...currentAdditionalCharges, newCharge],
        hasAdditionalPending: true,
      }));
      setShowAdditionalModal(false);
      setAdditionalAmount('');
      setAdditionalReason('');
      Alert.alert('Request Sent', 'The client will be notified to approve the additional charge.');
    } catch (error) {
      console.error('Error requesting additional charge:', error);
      Alert.alert('Error', 'Failed to request additional charge');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle discount offer from provider (for easy jobs)
  const handleOfferDiscount = async () => {
    if (!discountAmount || parseFloat(discountAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid discount amount');
      return;
    }
    
    // Prevent discount if client already paid upfront (Pay First)
    if (jobData.isPaidUpfront) {
      Alert.alert(
        'Cannot Apply Discount',
        'The client has already paid upfront. Discounts cannot be applied after payment. If needed, contact admin for a partial refund.',
        [{text: 'OK'}]
      );
      setShowDiscountModal(false);
      return;
    }
    
    const currentPrice = jobData.providerPrice || jobData.totalAmount || 0;
    const discount = parseFloat(discountAmount);
    
    if (discount >= currentPrice) {
      Alert.alert('Error', 'Discount cannot be equal to or greater than the service price');
      return;
    }

    try {
      setIsUpdating(true);
      const newPrice = currentPrice - discount;
      const newSystemFee = newPrice * 0.05;
      const newTotal = newPrice + newSystemFee;

      await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
        discountAmount: discount,
        discountReason: discountReason || 'Easy job discount',
        providerPrice: newPrice,
        systemFee: newSystemFee,
        totalAmount: newTotal,
        hasDiscount: true,
        discountAppliedAt: serverTimestamp(),
      });

      setJobData(prev => ({
        ...prev,
        discountAmount: discount,
        discountReason: discountReason || 'Easy job discount',
        providerPrice: newPrice,
        systemFee: newSystemFee,
        totalAmount: newTotal,
        hasDiscount: true,
      }));
      setShowDiscountModal(false);
      setDiscountAmount('');
      setDiscountReason('');
      Alert.alert('Discount Applied', `You've reduced the price by ₱${discount.toLocaleString()}. The client will pay ₱${newTotal.toLocaleString()}.`);
    } catch (error) {
      console.error('Error applying discount:', error);
      Alert.alert('Error', 'Failed to apply discount');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeclineJob = () => {
    setShowCancelModal(true);
  };

  const submitDecline = async () => {
    const reason = selectedCancelReason === 'Other' ? cancelReason : selectedCancelReason;
    if (!reason.trim()) {
      Alert.alert('Required', 'Please select or enter a reason for declining.');
      return;
    }

    try {
      setIsUpdating(true);
      await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
        status: 'declined',
        declinedAt: serverTimestamp(),
        declinedBy: 'provider',
        declineReason: reason,
      });
      // Notify client about cancellation
      notificationService.notifyJobCancelled(jobData, 'provider', reason);
      setShowCancelModal(false);
      Alert.alert('Declined', 'Job has been declined');
      navigation.goBack();
    } catch (error) {
      console.error('Error declining job:', error);
      Alert.alert('Error', 'Failed to decline job. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Start location tracking for client to see provider's location
  const startLocationTracking = async () => {
    try {
      // Get initial location
      const initialLocation = await locationService.getCurrentLocation();
      const bookingId = jobData.id || jobId;
      
      // Update initial location to booking and user profile
      await updateDoc(doc(db, 'bookings', bookingId), {
        providerLocation: {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
        },
        locationUpdatedAt: serverTimestamp(),
      });
      
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          locationUpdatedAt: serverTimestamp(),
        });
      }

      // Start watching location
      locationWatchRef.current = locationService.watchLocation(
        async (position) => {
          try {
            // Update location in booking document
            await updateDoc(doc(db, 'bookings', bookingId), {
              providerLocation: {
                latitude: position.latitude,
                longitude: position.longitude,
              },
              locationUpdatedAt: serverTimestamp(),
            });
            // Also update provider's user document
            if (user?.uid) {
              await updateDoc(doc(db, 'users', user.uid), {
                latitude: position.latitude,
                longitude: position.longitude,
                locationUpdatedAt: serverTimestamp(),
              });
            }
          } catch (e) {
            console.log('Error updating location:', e);
          }
        },
        (error) => {
          console.log('Location watch error:', error);
        }
      );
    } catch (error) {
      console.log('Error starting location tracking:', error);
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationWatchRef.current !== null) {
      locationService.stopWatchingLocation();
      locationWatchRef.current = null;
    }
  };

  // Start traveling to client location
  const handleStartTraveling = () => {
    Alert.alert(
      'Start Traveling',
      'Start traveling to the client location? Your location will be shared with the client.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Start',
          onPress: async () => {
            try {
              setIsUpdating(true);
              // Update booking status to traveling
              await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
                status: 'traveling',
                travelStartedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              // Update provider's user document for admin tracking
              if (user?.uid) {
                await updateDoc(doc(db, 'users', user.uid), {
                  currentJobId: jobData.id || jobId,
                  jobStatus: 'traveling',
                  updatedAt: serverTimestamp(),
                });
              }
              setJobData(prev => ({...prev, status: 'traveling'}));
              // Start location tracking for client
              startLocationTracking();
              // Notify client
              notificationService.notifyProviderTraveling?.(jobData);
              Alert.alert('On the way!', 'Client has been notified and can now track your location.');
            } catch (error) {
              console.error('Error starting travel:', error);
              Alert.alert('Error', 'Failed to start. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  // Mark as arrived at client location
  const handleMarkArrived = () => {
    Alert.alert(
      'Arrived',
      'Confirm you have arrived at the client location?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setIsUpdating(true);
              // Stop location tracking since we've arrived
              stopLocationTracking();
              await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
                status: 'arrived',
                arrivedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              // Update provider's user document
              if (user?.uid) {
                await updateDoc(doc(db, 'users', user.uid), {
                  jobStatus: 'arrived',
                  updatedAt: serverTimestamp(),
                });
              }
              setJobData(prev => ({...prev, status: 'arrived'}));
              notificationService.notifyProviderArrived?.(jobData);
              Alert.alert('Arrived', 'Client has been notified of your arrival.');
            } catch (error) {
              console.error('Error marking arrived:', error);
              Alert.alert('Error', 'Failed to update. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  // Start working on the job
  const handleStartJob = () => {
    Alert.alert(
      'Start Work',
      'Start working on this job now?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Start',
          onPress: async () => {
            try {
              setIsUpdating(true);
              await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
                status: 'in_progress',
                workStartedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              // Update provider's user document
              if (user?.uid) {
                await updateDoc(doc(db, 'users', user.uid), {
                  jobStatus: 'in_progress',
                  updatedAt: serverTimestamp(),
                });
              }
              setJobData(prev => ({...prev, status: 'in_progress'}));
              // Notify client via push notification
              notificationService.notifyJobStarted(jobData);
              // Send SMS notification (async)
              if (jobData.client) {
                smsEmailService.notifyJobStarted(jobData, jobData.client)
                  .catch(err => console.log('SMS notification failed:', err));
              }
              Alert.alert('Started', 'Job is now in progress');
            } catch (error) {
              console.error('Error starting job:', error);
              Alert.alert('Error', 'Failed to start job. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  // Provider marks work as done - waiting for client confirmation
  const handleCompleteJob = () => {
    Alert.alert(
      'Mark Work Complete',
      'This will notify the client to confirm the work is done and proceed to payment. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Yes, Work is Done',
          onPress: async () => {
            try {
              setIsUpdating(true);
              await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
                status: 'pending_completion',
                workCompletedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              // Update provider's job status
              if (user?.uid) {
                await updateDoc(doc(db, 'users', user.uid), {
                  jobStatus: 'pending_completion',
                  updatedAt: serverTimestamp(),
                });
              }
              setJobData(prev => ({...prev, status: 'pending_completion'}));
              // Notify client to confirm completion
              notificationService.notifyWorkCompleted?.(jobData);
              Alert.alert(
                'Waiting for Client', 
                'The client has been notified to confirm the work is complete and proceed to payment.'
              );
            } catch (error) {
              console.error('Error marking complete:', error);
              Alert.alert('Error', 'Failed to update. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  // Provider confirms payment received - final completion
  const handleConfirmPayment = () => {
    // Calculate total including approved additional charges
    const baseAmount = jobData?.totalAmount || jobData?.providerPrice || 0;
    const additionalChargesTotal = jobData?.additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
    const totalAmount = baseAmount + additionalChargesTotal;
    
    Alert.alert(
      'Confirm Payment Received',
      `Confirm that you have received ₱${totalAmount.toLocaleString()} from the client?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Confirm Payment',
          onPress: async () => {
            try {
              setIsUpdating(true);
              
              // If payment wasn't recorded yet (e.g., direct cash), record it now
              if (!jobData.paid) {
                await paymentService.recordCashPayment(
                  jobData.id || jobId,
                  jobData.clientId,
                  totalAmount,
                  user?.uid
                );
              }
              
              await updateDoc(doc(db, 'bookings', jobData.id || jobId), {
                status: 'completed',
                paid: true,
                // Store the final amount for earnings calculation
                finalAmount: totalAmount,
                paymentConfirmedAt: serverTimestamp(),
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              // Clear provider's current job status
              if (user?.uid) {
                await updateDoc(doc(db, 'users', user.uid), {
                  currentJobId: null,
                  jobStatus: null,
                  updatedAt: serverTimestamp(),
                });
              }
              setJobData(prev => ({...prev, status: 'completed', paid: true}));
              
              // Award gamification points to both client and provider
              if (jobData.clientId && user?.uid) {
                onBookingCompleted(jobData.clientId, user.uid, totalAmount)
                  .then(result => {
                    if (result.success) {
                      console.log('Gamification points awarded successfully');
                    }
                  })
                  .catch(err => console.log('Gamification error:', err));
              }
              
              // Notify client job is fully completed
              notificationService.notifyJobCompleted?.(jobData);
              // Send SMS/Email notification (async)
              if (jobData.client) {
                smsEmailService.notifyJobCompleted(jobData, jobData.client, {name: user?.firstName || 'Provider'})
                  .catch(err => console.log('SMS/Email notification failed:', err));
                
                // Send payment receipt email via EmailJS (async)
                const clientEmail = jobData.client?.email;
                const clientName = jobData.client?.name || 'Client';
                if (clientEmail) {
                  sendPaymentReceipt(clientEmail, clientName, {
                    bookingId: jobData.id || jobId,
                    serviceName: jobData.title || jobData.serviceCategory,
                    providerName: user?.firstName || 'Provider',
                    amount: totalAmount,
                    paymentMethod: jobData.paymentMethod || 'Cash',
                  }).catch(err => console.log('Payment receipt email failed:', err));
                }
              }
              Alert.alert('Job Completed!', 'Payment confirmed. Thank you for your service!');
            } catch (error) {
              console.error('Error confirming payment:', error);
              Alert.alert('Error', 'Failed to confirm. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleGetDirections = () => {
    // Get destination coordinates
    let destination = null;
    let destinationName = jobData?.client?.name || 'Client Location';
    let destinationAddress = jobData?.client?.address || jobData?.address || 'Maasin City';
    
    // Helper to parse coordinate (handles string or number)
    const parseCoord = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val);
      return null;
    };
    
    // Try to get coordinates from various sources
    const clientLat = parseCoord(jobData?.client?.latitude);
    const clientLng = parseCoord(jobData?.client?.longitude);
    const bookingLat = parseCoord(jobData?.latitude);
    const bookingLng = parseCoord(jobData?.longitude);
    const locationLat = parseCoord(jobData?.location?.latitude);
    const locationLng = parseCoord(jobData?.location?.longitude);
    
    if (clientLat && clientLng && !isNaN(clientLat) && !isNaN(clientLng)) {
      destination = {
        latitude: clientLat,
        longitude: clientLng,
      };
    } else if (bookingLat && bookingLng && !isNaN(bookingLat) && !isNaN(bookingLng)) {
      destination = {
        latitude: bookingLat,
        longitude: bookingLng,
      };
    } else if (locationLat && locationLng && !isNaN(locationLat) && !isNaN(locationLng)) {
      destination = {
        latitude: locationLat,
        longitude: locationLng,
      };
    }
    
    console.log('Directions - Client coords:', clientLat, clientLng);
    console.log('Directions - Booking coords:', bookingLat, bookingLng);
    console.log('Directions - Final destination:', destination);
    
    // Always navigate to in-app directions screen
    // If no coordinates, use Maasin City center as fallback
    if (!destination) {
      // Default to Maasin City center (on land - City Hall area)
      destination = {
        latitude: 10.1335,
        longitude: 124.8513,
      };
      // Show info that we're using approximate location
      Alert.alert(
        'Approximate Location',
        'Exact coordinates not available. Showing approximate location in Maasin City. Please refer to the address details for exact location.',
        [{text: 'OK', onPress: () => {
          navigation.navigate('Directions', {
            destination,
            destinationName: destinationAddress,
            jobTitle: jobData?.title || 'Service Request',
          });
        }}]
      );
    } else {
      navigation.navigate('Directions', {
        destination,
        destinationName: destinationAddress,
        jobTitle: jobData?.title || 'Service Request',
      });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[globalStyles.container, {backgroundColor: isDark ? '#111827' : '#FFFFFF'}]}>
        <View style={globalStyles.centerContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      </SafeAreaView>
    );
  }

  if (!jobData) {
    return (
      <SafeAreaView style={[globalStyles.container, {backgroundColor: isDark ? '#111827' : '#FFFFFF'}]}>
        <View style={[styles.header, {backgroundColor: isDark ? '#1F2937' : '#FFFFFF'}]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: isDark ? '#F9FAFB' : '#1F2937'}]}>Job Details</Text>
          <View style={{width: 24}} />
        </View>
        <View style={globalStyles.centerContainer}>
          <Text style={[globalStyles.bodyMedium, {color: isDark ? '#9CA3AF' : '#6B7280'}]}>Job not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[globalStyles.container, {backgroundColor: isDark ? '#111827' : '#FFFFFF'}]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, {backgroundColor: isDark ? '#1F2937' : '#FFFFFF'}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: isDark ? '#F9FAFB' : '#1F2937'}]}>Job Details</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView style={{flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB'}} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, {backgroundColor: getStatusColor(jobData.status) + '15'}]}>
          <View style={[styles.statusDot, {backgroundColor: getStatusColor(jobData.status)}]} />
          <Text style={[styles.statusText, {color: getStatusColor(jobData.status)}]}>
            {getStatusLabel(jobData.status)}
          </Text>
        </View>

        {/* Job Info - Enhanced to show all client submitted details */}
        <View style={[styles.section, {backgroundColor: isDark ? '#1F2937' : '#FFFFFF'}]}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
            <Icon name="document-text" size={20} color="#00B14F" />
            <Text style={[styles.sectionTitle, {marginLeft: 8, marginBottom: 0, color: isDark ? '#F9FAFB' : '#1F2937'}]}>Job Request Details</Text>
          </View>
          
          <Text style={[styles.jobTitle, {color: isDark ? '#F9FAFB' : '#1F2937'}]}>{jobData.title || jobData.serviceCategory}</Text>
          <View style={[styles.categoryTag, {backgroundColor: isDark ? '#064E3B' : '#ECFDF5'}]}>
            <Icon name="construct" size={14} color="#00B14F" />
            <Text style={[styles.categoryText, {color: isDark ? '#6EE7B7' : '#059669'}]}>{jobData.serviceCategory}</Text>
          </View>
          
          {/* Additional Notes from Client */}
          {jobData.description && jobData.description !== 'See attached photos/videos' && (
            <View style={{
              backgroundColor: isDark ? '#374151' : '#F9FAFB',
              borderRadius: 12,
              padding: 14,
              marginTop: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#00B14F',
            }}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                <Icon name="chatbox-ellipses" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={{fontSize: 13, fontWeight: '600', color: isDark ? '#D1D5DB' : '#4B5563', marginLeft: 6}}>Additional Notes</Text>
              </View>
              <Text style={{fontSize: 14, color: isDark ? '#E5E7EB' : '#374151', lineHeight: 22}}>{jobData.description}</Text>
            </View>
          )}

          {/* Legacy notes field if different from description */}
          {jobData.notes && jobData.notes !== jobData.description && jobData.notes !== 'See attached photos/videos' && (
            <View style={{
              backgroundColor: isDark ? '#78350F' : '#FEF3C7',
              borderRadius: 12,
              padding: 14,
              marginTop: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#F59E0B',
            }}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                <Icon name="alert-circle" size={16} color="#F59E0B" />
                <Text style={{fontSize: 13, fontWeight: '600', color: isDark ? '#FDE68A' : '#92400E', marginLeft: 6}}>Additional Notes</Text>
              </View>
              <Text style={{fontSize: 14, color: isDark ? '#FEF3C7' : '#78350F', lineHeight: 22}}>{jobData.notes}</Text>
            </View>
          )}
        </View>

        {/* Client Info */}
        <View style={[styles.section, {backgroundColor: isDark ? '#1F2937' : '#FFFFFF'}]}>
          <Text style={[styles.sectionTitle, {color: isDark ? '#F9FAFB' : '#1F2937'}]}>Client</Text>
          <View style={[styles.personCard, {backgroundColor: isDark ? '#374151' : '#F9FAFB'}]}>
            <View style={[styles.personAvatar, {backgroundColor: isDark ? '#4B5563' : '#E5E7EB'}]}>
              {jobData.client?.photo ? (
                <Image source={{uri: jobData.client.photo}} style={styles.avatarImage} />
              ) : (
                <Icon name="person" size={30} color={isDark ? '#9CA3AF' : '#6B7280'} />
              )}
            </View>
            <View style={styles.personInfo}>
              <Text style={[styles.personName, {color: isDark ? '#F9FAFB' : '#1F2937'}]}>{jobData.client?.name || jobData.clientName || 'Client'}</Text>
              {jobData.client?.barangay && (
                <Text style={[styles.personSubtext, {color: isDark ? '#9CA3AF' : '#6B7280'}]} numberOfLines={1}>
                  Brgy. {jobData.client.barangay}, Maasin City
                </Text>
              )}
              {/* Client Tier - Always show tier (even Regular at 0 points) */}
              {jobData.client?.tier && (
                <View style={{marginTop: 4, flexDirection: 'row', alignItems: 'center'}}>
                  <TierBadge tier={jobData.client.tier} size="small" />
                  {jobData.client.points > 0 && (
                    <Text style={{fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginLeft: 6}}>
                      {jobData.client.points.toLocaleString()} pts
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
          
          {/* Client Badges or New Client indicator */}
          <View style={{marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB'}}>
            {jobData.client?.badges?.length > 0 ? (
              <>
                <Text style={{fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 6}}>Client Badges</Text>
                <BadgeList badges={jobData.client.badges} maxDisplay={4} size="small" />
              </>
            ) : (
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Icon name="sparkles" size={14} color="#3B82F6" />
                <Text style={{fontSize: 12, color: '#3B82F6', marginLeft: 4}}>New Client</Text>
              </View>
            )}
          </View>
          
          {/* Address Details - Always show service location */}
          <View style={{backgroundColor: isDark ? '#374151' : '#F9FAFB', borderRadius: 10, padding: 12, marginTop: 8}}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
              <Icon name="location" size={18} color="#00B14F" />
              <Text style={{fontWeight: '600', color: isDark ? '#F9FAFB' : '#1F2937', marginLeft: 6}}>Service Location</Text>
            </View>
            
            {/* Barangay */}
            <View style={{flexDirection: 'row', marginBottom: 6}}>
              <Text style={{fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280', width: 100}}>Barangay:</Text>
              <Text style={{fontSize: 14, color: isDark ? '#E5E7EB' : '#1F2937', fontWeight: '500', flex: 1}}>
                {jobData.client?.barangay || jobData.barangay || 'Not specified'}
              </Text>
            </View>
            
            {/* Street Address */}
            <View style={{flexDirection: 'row', marginBottom: 6}}>
              <Text style={{fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280', width: 100}}>Street:</Text>
              <Text style={{fontSize: 14, color: isDark ? '#E5E7EB' : '#1F2937', fontWeight: '500', flex: 1}}>
                {jobData.client?.streetAddress || jobData.streetAddress || 'Not specified'}
              </Text>
            </View>
            
            {/* House/Building Number */}
            <View style={{flexDirection: 'row', marginBottom: 6}}>
              <Text style={{fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280', width: 100}}>House/Bldg:</Text>
              <Text style={{fontSize: 14, color: isDark ? '#E5E7EB' : '#1F2937', fontWeight: '500', flex: 1}}>
                {jobData.client?.houseNumber || jobData.houseNumber || 'Not specified'}
              </Text>
            </View>
            
            {/* Landmark */}
            <View style={{flexDirection: 'row', marginBottom: 6}}>
              <Text style={{fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280', width: 100}}>Landmark:</Text>
              <Text style={{fontSize: 14, color: isDark ? '#E5E7EB' : '#1F2937', fontWeight: '500', flex: 1}}>
                {jobData.client?.landmark || jobData.landmark || 'None'}
              </Text>
            </View>
            
            {/* City */}
            <View style={{flexDirection: 'row', paddingTop: 6, borderTopWidth: 1, borderTopColor: isDark ? '#4B5563' : '#E5E7EB'}}>
              <Text style={{fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280', width: 100}}>City:</Text>
              <Text style={{fontSize: 14, color: isDark ? '#E5E7EB' : '#1F2937', fontWeight: '500', flex: 1}}>
                Maasin City, Southern Leyte
              </Text>
            </View>
          </View>
          
          {/* Contact & Direction Buttons - Only show after admin approval */}
          {jobData.adminApproved ? (
            <View style={styles.contactButtons}>
              <TouchableOpacity style={[styles.contactButton, {backgroundColor: isDark ? '#374151' : '#F0FDF4'}]} onPress={handleCallClient}>
                <Icon name="call" size={18} color="#00B14F" />
                <Text style={[styles.contactButtonText, {color: isDark ? '#6EE7B7' : '#059669'}]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.contactButton, {backgroundColor: isDark ? '#374151' : '#F0FDF4'}]} onPress={handleMessageClient}>
                <Icon name="chatbubble" size={18} color="#00B14F" />
                <Text style={[styles.contactButtonText, {color: isDark ? '#6EE7B7' : '#059669'}]}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.contactButton, {backgroundColor: isDark ? '#374151' : '#F0FDF4'}]} onPress={handleGetDirections}>
                <Icon name="navigate" size={18} color="#00B14F" />
                <Text style={[styles.contactButtonText, {color: isDark ? '#6EE7B7' : '#059669'}]}>Directions</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{
              backgroundColor: isDark ? '#78350F' : '#FEF3C7',
              padding: 12,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 12,
            }}>
              <Icon name="time-outline" size={18} color="#F59E0B" />
              <Text style={{fontSize: 13, color: isDark ? '#FDE68A' : '#92400E', marginLeft: 8, flex: 1}}>
                Contact options will be available once admin approves this request
              </Text>
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View style={[styles.section, {backgroundColor: isDark ? '#1F2937' : '#FFFFFF'}]}>
          <Text style={[styles.sectionTitle, {color: isDark ? '#F9FAFB' : '#1F2937'}]}>Schedule</Text>
          <View style={styles.infoRow}>
            <Icon name="calendar-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text style={[styles.infoText, {color: isDark ? '#E5E7EB' : '#374151'}]}>
              {jobData.scheduledDate || jobData.date || 'Not specified'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="time-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text style={[styles.infoText, {color: isDark ? '#E5E7EB' : '#374151'}]}>
              {jobData.scheduledTime || jobData.time || 'Not specified'}
            </Text>
          </View>
        </View>

        {/* Media Files - Problem photos/videos from client */}
        {jobData.mediaFiles && jobData.mediaFiles.length > 0 && (
          <View style={[styles.section, {backgroundColor: isDark ? '#1F2937' : '#FFFFFF'}]}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Icon name="images" size={20} color="#3B82F6" />
                <Text style={[styles.sectionTitle, {marginLeft: 8, marginBottom: 0, color: isDark ? '#F9FAFB' : '#1F2937'}]}>Problem Photos/Videos</Text>
              </View>
              <View style={{backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12}}>
                <Text style={{fontSize: 12, fontWeight: '600', color: '#3B82F6'}}>{jobData.mediaFiles.length} file(s)</Text>
              </View>
            </View>
            
            {/* Helpful hint */}
            <View style={{backgroundColor: isDark ? '#064E3B' : '#F0FDF4', padding: 10, borderRadius: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center'}}>
              <Icon name="information-circle" size={16} color="#10B981" />
              <Text style={{fontSize: 12, color: isDark ? '#6EE7B7' : '#047857', marginLeft: 6, flex: 1}}>
                Tap any image/video to view full screen. Review these to understand the issue.
              </Text>
            </View>
            
            {/* Media Grid */}
            <View style={{flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4}}>
              {jobData.mediaFiles.map((file, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={{
                    width: (SCREEN_WIDTH - 64) / 3,
                    height: (SCREEN_WIDTH - 64) / 3,
                    margin: 4,
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: '#F3F4F6',
                  }}
                  onPress={() => {
                    setSelectedMediaIndex(index);
                    setShowMediaViewer(true);
                  }}
                >
                  {(file.uri || file.url) ? (
                    <Image 
                      source={{uri: file.uri || file.url}} 
                      style={{width: '100%', height: '100%'}} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                      <Icon name="image-outline" size={24} color="#9CA3AF" />
                    </View>
                  )}
                  {(file.isVideo || file.type?.includes('video')) && (
                    <View style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Icon name="play-circle" size={36} color="#FFFFFF" />
                    </View>
                  )}
                  {/* Image number badge */}
                  <View style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}>
                    <Text style={{fontSize: 10, color: '#FFFFFF', fontWeight: '600'}}>{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Payment Preference */}
        <View style={[styles.section, {backgroundColor: isDark ? '#1F2937' : '#FFFFFF'}]}>
          <Text style={[styles.sectionTitle, {color: isDark ? '#F9FAFB' : '#1F2937'}]}>Payment Method</Text>
          <View style={{
            backgroundColor: jobData.paymentPreference === 'pay_first' 
              ? (isDark ? '#064E3B' : '#D1FAE5') 
              : (isDark ? '#1E3A5F' : '#DBEAFE'),
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: jobData.paymentPreference === 'pay_first' 
              ? (isDark ? '#10B981' : '#A7F3D0') 
              : (isDark ? '#3B82F6' : '#BFDBFE'),
          }}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Icon 
                  name={jobData.paymentPreference === 'pay_first' ? 'card' : 'time'} 
                  size={24} 
                  color={jobData.paymentPreference === 'pay_first' ? '#10B981' : '#3B82F6'} 
                />
                <View style={{marginLeft: 12}}>
                  <Text style={{fontSize: 16, fontWeight: '700', color: jobData.paymentPreference === 'pay_first' ? '#10B981' : '#3B82F6'}}>
                    {jobData.paymentPreference === 'pay_first' ? 'Pay First' : 'Pay Later'}
                  </Text>
                  <Text style={{fontSize: 12, color: jobData.paymentPreference === 'pay_first' 
                    ? (isDark ? '#6EE7B7' : '#047857') 
                    : (isDark ? '#93C5FD' : '#1D4ED8')}}>
                    {jobData.paymentPreference === 'pay_first' 
                      ? 'Client pays before you start' 
                      : 'Client pays after job completion'}
                  </Text>
                </View>
              </View>
              {jobData.isPaidUpfront && (
                <View style={{backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8}}>
                  <Text style={{fontSize: 12, fontWeight: '700', color: '#FFFFFF'}}>PAID</Text>
                </View>
              )}
            </View>
            {jobData.paymentPreference === 'pay_first' && (
              <Text style={{fontSize: 11, color: isDark ? '#6EE7B7' : '#047857', marginTop: 10, fontStyle: 'italic'}}>
                You can still request additional charges if extra work or materials are needed.
              </Text>
            )}
          </View>
        </View>

        {/* Earnings - Your Payment */}
        <View style={[styles.section, {backgroundColor: isDark ? '#1F2937' : '#FFFFFF'}]}>
          <Text style={[styles.sectionTitle, {color: isDark ? '#F9FAFB' : '#1F2937'}]}>Your Earnings</Text>
          <View style={{
            backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: isDark ? '#10B981' : '#BBF7D0',
          }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
              <Text style={{fontSize: 14, color: isDark ? '#D1D5DB' : '#4B5563'}}>
                Your Service Price ({jobData.priceType === 'per_hire' ? 'per hire' : 'per job'})
              </Text>
              <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#1F2937'}}>
                ₱{(jobData.providerPrice || jobData.price || 0).toLocaleString()}
              </Text>
            </View>

            {/* Show additional charges if any */}
            {jobData.additionalCharges && jobData.additionalCharges.length > 0 && (
              <View style={{marginBottom: 8}}>
                <Text style={{fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 4}}>
                  Additional Charges:
                </Text>
                {jobData.additionalCharges.map((charge, index) => (
                  <View key={charge.id || index} style={{
                    flexDirection: 'row', 
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                  }}>
                    <Text style={{fontSize: 13, color: charge.status === 'approved' ? '#059669' : '#F59E0B', flex: 1}}>
                      {charge.reason} {charge.status === 'pending' ? '(Pending)' : charge.status === 'approved' ? '✓' : '✗'}
                    </Text>
                    <Text style={{fontSize: 13, fontWeight: '500', color: '#1F2937'}}>
                      +₱{charge.amount.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Show pending amount if there are pending charges */}
            {jobData.additionalCharges?.some(c => c.status === 'pending') && (
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: '#FDE68A',
                marginBottom: 8,
              }}>
                <Text style={{fontSize: 14, color: '#F59E0B', fontWeight: '600'}}>If Approved</Text>
                <Text style={{fontSize: 14, fontWeight: '700', color: '#F59E0B'}}>
                  +₱{(jobData.additionalCharges?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0) || 0).toLocaleString()}
                </Text>
              </View>
            )}

            <View style={{
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: '#BBF7D0',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
              <Text style={{fontSize: 16, fontWeight: '700', color: '#1F2937'}}>You'll Receive</Text>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#00B14F'}}>
                ₱{(
                  (jobData.providerPrice || jobData.price || 0) +
                  (jobData.additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0) || 0)
                ).toLocaleString()}
              </Text>
            </View>

            {/* Show potential total if pending charges get approved */}
            {jobData.additionalCharges?.some(c => c.status === 'pending') && (
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 4,
              }}>
                <Text style={{fontSize: 13, color: '#F59E0B'}}>Potential Total</Text>
                <Text style={{fontSize: 14, fontWeight: '600', color: '#F59E0B'}}>
                  ₱{(
                    (jobData.providerPrice || jobData.price || 0) +
                    (jobData.additionalCharges?.filter(c => c.status === 'approved' || c.status === 'pending').reduce((sum, c) => sum + c.amount, 0) || 0)
                  ).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
          <Text style={{fontSize: 12, color: '#6B7280', marginTop: 8, textAlign: 'center'}}>
            Client pays {APP_CONFIG.CURRENCY_SYMBOL}{(
              (jobData.totalAmount || jobData.price || 0) +
              (jobData.additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.total, 0) || 0)
            ).toLocaleString()} (includes {APP_CONFIG.SERVICE_FEE_PERCENTAGE}% system fee)
          </Text>
        </View>

        {/* Job ID */}
        <View style={styles.section}>
          <Text style={styles.jobId}>Job ID: {jobData.id || jobId || 'N/A'}</Text>
          <Text style={styles.createdAt}>
            Created: {jobData.createdAt || new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Admin Approval Banner - Show if not yet approved */}
        {!jobData.adminApproved && (jobData.status === 'pending' || jobData.status === 'pending_negotiation') && (
          <View style={{
            backgroundColor: '#FEF3C7',
            padding: 16,
            borderRadius: 12,
            marginTop: 16,
            marginHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#F59E0B',
          }}>
            <Icon name="time" size={24} color="#F59E0B" />
            <View style={{marginLeft: 12, flex: 1}}>
              <Text style={{fontSize: 14, fontWeight: '600', color: '#92400E', marginBottom: 4}}>
                ⏳ Waiting for Admin Approval
              </Text>
              <Text style={{fontSize: 12, color: '#92400E'}}>
                The admin needs to review and approve this job request before you can accept or decline it. You'll be notified once it's approved.
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons based on status */}
        <View style={styles.actionSection}>
          {isUpdating ? (
            <ActivityIndicator size="large" color="#00B14F" />
          ) : (
            <>
              {/* Pending Negotiation - Client made an offer */}
              {jobData.status === 'pending' && (
                jobData.adminApproved ? (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.declineButton]} 
                      onPress={handleDeclineJob}>
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.acceptButton]} 
                      onPress={handleAcceptJob}>
                      <Text style={styles.acceptButtonText}>Accept Job</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{
                    backgroundColor: '#F3F4F6',
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}>
                    <Icon name="lock-closed" size={24} color="#9CA3AF" />
                    <Text style={{fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center'}}>
                      Actions locked until admin approval
                    </Text>
                  </View>
                )
              )}
              
              {jobData.status === 'accepted' && (
                <View>
                  {/* Pay First - Waiting for client payment */}
                  {jobData.paymentPreference === 'pay_first' && !jobData.isPaidUpfront && (
                    <View style={{
                      backgroundColor: '#FEF3C7',
                      padding: 16,
                      borderRadius: 12,
                      marginBottom: 16,
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: '#F59E0B',
                    }}>
                      <Icon name="time" size={32} color="#F59E0B" />
                      <Text style={{fontSize: 16, fontWeight: '700', color: '#92400E', marginTop: 8}}>
                        Waiting for Client Payment
                      </Text>
                      <Text style={{fontSize: 13, color: '#B45309', marginTop: 4, textAlign: 'center'}}>
                        Client selected "Pay First". You can start traveling once they complete payment.
                      </Text>
                    </View>
                  )}
                  
                  {/* Pay First - Client has paid, can proceed */}
                  {jobData.paymentPreference === 'pay_first' && jobData.isPaidUpfront && (
                    <View style={{
                      backgroundColor: '#D1FAE5',
                      padding: 12,
                      borderRadius: 10,
                      marginBottom: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon name="checkmark-circle" size={20} color="#059669" />
                      <Text style={{fontSize: 14, fontWeight: '600', color: '#065F46', marginLeft: 8}}>
                        Client Paid ₱{(jobData.upfrontPaidAmount || jobData.totalAmount || 0).toLocaleString()} - Ready to Start!
                      </Text>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={[
                      styles.actionButton, 
                      styles.startButton,
                      // Disable if Pay First and not paid yet
                      (jobData.paymentPreference === 'pay_first' && !jobData.isPaidUpfront) && {backgroundColor: '#9CA3AF'}
                    ]} 
                    onPress={handleStartTraveling}
                    disabled={jobData.paymentPreference === 'pay_first' && !jobData.isPaidUpfront}>
                    <Icon name="navigate" size={20} color="#FFFFFF" />
                    <Text style={styles.startButtonText}>
                      {jobData.paymentPreference === 'pay_first' && !jobData.isPaidUpfront 
                        ? 'Waiting for Payment...' 
                        : 'Start Traveling'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 12,
                    }} 
                    onPress={() => {
                      navigation.navigate('Directions', {
                        destination: {
                          latitude: jobData.location?.latitude || jobData.latitude,
                          longitude: jobData.location?.longitude || jobData.longitude,
                          address: jobData.address || jobData.location?.address,
                        },
                        jobId: jobData.id || jobId,
                      });
                    }}>
                    <Icon name="map" size={18} color="#3B82F6" />
                    <Text style={{color: '#3B82F6', fontWeight: '600', marginLeft: 6}}>View Directions</Text>
                  </TouchableOpacity>
                </View>
              )}

              {jobData.status === 'traveling' && (
                <View>
                  <View style={{
                    backgroundColor: '#DBEAFE',
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon name="navigate" size={20} color="#3B82F6" />
                    <Text style={{fontSize: 14, fontWeight: '600', color: '#1E40AF', marginLeft: 8}}>
                      Traveling to Client
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.actionButton, {backgroundColor: '#10B981'}]} 
                    onPress={handleMarkArrived}>
                    <Icon name="location" size={20} color="#FFFFFF" />
                    <Text style={styles.startButtonText}>I've Arrived</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 12,
                    }} 
                    onPress={() => {
                      navigation.navigate('Directions', {
                        destination: {
                          latitude: jobData.location?.latitude || jobData.latitude,
                          longitude: jobData.location?.longitude || jobData.longitude,
                          address: jobData.address || jobData.location?.address,
                        },
                        jobId: jobData.id || jobId,
                      });
                    }}>
                    <Icon name="map" size={18} color="#3B82F6" />
                    <Text style={{color: '#3B82F6', fontWeight: '600', marginLeft: 6}}>View Directions</Text>
                  </TouchableOpacity>
                </View>
              )}

              {jobData.status === 'arrived' && (
                <View>
                  <View style={{
                    backgroundColor: '#D1FAE5',
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon name="checkmark-circle" size={20} color="#059669" />
                    <Text style={{fontSize: 14, fontWeight: '600', color: '#065F46', marginLeft: 8}}>
                      Arrived at Location
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.startButton]} 
                    onPress={handleStartJob}>
                    <Icon name="hammer" size={20} color="#FFFFFF" />
                    <Text style={styles.startButtonText}>Start Work</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {jobData.status === 'in_progress' && (
                <View>
                  {/* Price Adjustment Buttons */}
                  <View style={{flexDirection: 'row', marginBottom: 12}}>
                    {/* Offer Discount Button */}
                    <TouchableOpacity 
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#D1FAE5',
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#10B981',
                        marginRight: 5,
                      }}
                      onPress={() => setShowDiscountModal(true)}>
                      <Icon name="pricetag" size={18} color="#059669" />
                      <Text style={{color: '#065F46', fontWeight: '600', marginLeft: 6, fontSize: 13}}>
                        Give Discount
                      </Text>
                    </TouchableOpacity>

                    {/* Request Additional Charge Button */}
                    <TouchableOpacity 
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FEF3C7',
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#F59E0B',
                        marginLeft: 5,
                      }}
                      onPress={() => setShowAdditionalModal(true)}>
                      <Icon name="add-circle" size={18} color="#F59E0B" />
                      <Text style={{color: '#92400E', fontWeight: '600', marginLeft: 6, fontSize: 13}}>
                        Add Charge
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 12}}>
                    Easy job? Give a discount. Extra work needed? Add a charge.
                  </Text>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.completeButton]} 
                    onPress={handleCompleteJob}>
                    <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.completeButtonText}>Mark Work Done</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Pending Completion - Waiting for client to confirm */}
              {jobData.status === 'pending_completion' && (
                <View>
                  <View style={{
                    backgroundColor: '#FEF3C7',
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}>
                    <Icon name="time" size={32} color="#F59E0B" />
                    <Text style={{fontSize: 16, fontWeight: '600', color: '#92400E', marginTop: 8}}>
                      Waiting for Client Confirmation
                    </Text>
                    <Text style={{fontSize: 13, color: '#B45309', marginTop: 4, textAlign: 'center'}}>
                      The client needs to confirm the work is complete and proceed to payment.
                    </Text>
                  </View>
                </View>
              )}

              {/* Payment Received - Provider needs to confirm */}
              {jobData.status === 'payment_received' && (
                <View>
                  <View style={{
                    backgroundColor: '#D1FAE5',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    alignItems: 'center',
                  }}>
                    <Icon name="card" size={32} color="#059669" />
                    <Text style={{fontSize: 16, fontWeight: '600', color: '#065F46', marginTop: 8}}>
                      Client Has Paid!
                    </Text>
                    <Text style={{fontSize: 13, color: '#047857', marginTop: 4, textAlign: 'center'}}>
                      Please confirm you have received the payment to complete this job.
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.actionButton, {backgroundColor: '#10B981'}]} 
                    onPress={handleConfirmPayment}>
                    <Icon name="checkmark-done" size={20} color="#FFFFFF" />
                    <Text style={styles.completeButtonText}>Confirm Payment Received</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        <View style={{height: 40}} />
      </ScrollView>

      {/* Media Viewer Modal */}
      <Modal
        visible={showMediaViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMediaViewer(false)}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.95)'}}>
          {/* Header */}
          <SafeAreaView style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16}}>
            <TouchableOpacity onPress={() => setShowMediaViewer(false)}>
              <Icon name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={{fontSize: 16, color: '#FFFFFF', fontWeight: '600'}}>
              {selectedMediaIndex + 1} / {jobData?.mediaFiles?.length || 0}
            </Text>
            <View style={{width: 28}} />
          </SafeAreaView>
          
          {/* Media Content */}
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            {jobData?.mediaFiles?.[selectedMediaIndex] && (
              (jobData.mediaFiles[selectedMediaIndex].isVideo || 
               jobData.mediaFiles[selectedMediaIndex].type?.includes('video')) ? (
                (jobData.mediaFiles[selectedMediaIndex].uri || jobData.mediaFiles[selectedMediaIndex].url) ? (
                  <Video
                    source={{uri: jobData.mediaFiles[selectedMediaIndex].uri || jobData.mediaFiles[selectedMediaIndex].url}}
                    style={{width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6}}
                    resizeMode="contain"
                    controls={true}
                    paused={false}
                  />
                ) : (
                  <View style={{width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6, justifyContent: 'center', alignItems: 'center'}}>
                    <Icon name="videocam-outline" size={60} color="#9CA3AF" />
                    <Text style={{color: '#9CA3AF', marginTop: 12}}>Video not available</Text>
                  </View>
                )
              ) : (
                (jobData.mediaFiles[selectedMediaIndex].uri || jobData.mediaFiles[selectedMediaIndex].url) ? (
                  <Image
                    source={{uri: jobData.mediaFiles[selectedMediaIndex].uri || jobData.mediaFiles[selectedMediaIndex].url}}
                    style={{width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7}}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={{width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7, justifyContent: 'center', alignItems: 'center'}}>
                    <Icon name="image-outline" size={60} color="#9CA3AF" />
                    <Text style={{color: '#9CA3AF', marginTop: 12}}>Image not available</Text>
                  </View>
                )
              )
            )}
          </View>
          
          {/* Navigation Arrows */}
          <View style={{flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingBottom: 40}}>
            <TouchableOpacity 
              style={{
                backgroundColor: selectedMediaIndex > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                padding: 16,
                borderRadius: 30,
              }}
              onPress={() => setSelectedMediaIndex(Math.max(0, selectedMediaIndex - 1))}
              disabled={selectedMediaIndex === 0}
            >
              <Icon name="chevron-back" size={24} color={selectedMediaIndex > 0 ? '#FFFFFF' : '#666'} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{
                backgroundColor: selectedMediaIndex < (jobData?.mediaFiles?.length || 0) - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                padding: 16,
                borderRadius: 30,
              }}
              onPress={() => setSelectedMediaIndex(Math.min((jobData?.mediaFiles?.length || 1) - 1, selectedMediaIndex + 1))}
              disabled={selectedMediaIndex >= (jobData?.mediaFiles?.length || 0) - 1}
            >
              <Icon name="chevron-forward" size={24} color={selectedMediaIndex < (jobData?.mediaFiles?.length || 0) - 1 ? '#FFFFFF' : '#666'} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>



      {/* Decline/Cancel Modal */}
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
              <Text style={{fontSize: 18, fontWeight: '700', color: '#1F2937'}}>Decline Job</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{fontSize: 14, color: '#6B7280', marginBottom: 16}}>
              Please let us know why you're declining this job.
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
                <Text style={{color: '#6B7280', fontSize: 16, fontWeight: '600'}}>Go Back</Text>
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
                onPress={submitDecline}
                disabled={isUpdating || !selectedCancelReason}>
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{color: '#FFFFFF', fontSize: 16, fontWeight: '600'}}>Decline Job</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Additional Charge Modal */}
      <Modal
        visible={showAdditionalModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAdditionalModal(false)}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
          }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#1F2937'}}>Request Additional Charge</Text>
              <TouchableOpacity onPress={() => setShowAdditionalModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{
              backgroundColor: '#FEF3C7',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Icon name="information-circle" size={20} color="#F59E0B" />
              <Text style={{fontSize: 13, color: '#92400E', marginLeft: 8, flex: 1}}>
                Use this for extra materials, additional repairs, or scope changes discovered during the job.
              </Text>
            </View>

            <Text style={{fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8}}>
              Additional Amount (₱) *
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
              <Text style={{fontSize: 18, color: '#F59E0B', fontWeight: '700'}}>₱</Text>
              <TextInput
                style={{flex: 1, fontSize: 18, color: '#1F2937', paddingVertical: 14, paddingHorizontal: 8}}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={additionalAmount}
                onChangeText={setAdditionalAmount}
              />
            </View>

            <Text style={{fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8}}>
              Reason for Additional Charge *
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
                height: 100,
                textAlignVertical: 'top',
                marginBottom: 20,
              }}
              placeholder="e.g., Additional wiring needed, extra materials..."
              multiline
              value={additionalReason}
              onChangeText={setAdditionalReason}
            />

            {additionalAmount && (
              <View style={{backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 16}}>
                <Text style={{fontSize: 13, color: '#6B7280'}}>Client will pay additional:</Text>
                <Text style={{fontSize: 20, fontWeight: '700', color: '#00B14F'}}>
                  {APP_CONFIG.CURRENCY_SYMBOL}{(parseFloat(additionalAmount || 0) * (1 + APP_CONFIG.SERVICE_FEE_PERCENTAGE / 100)).toLocaleString()} <Text style={{fontSize: 12, fontWeight: '400'}}>(incl. {APP_CONFIG.SERVICE_FEE_PERCENTAGE}% fee)</Text>
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
              onPress={handleRequestAdditional}
              disabled={isUpdating}>
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{color: '#FFFFFF', fontSize: 16, fontWeight: '700'}}>Send Request to Client</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Discount Modal */}
      <Modal
        visible={showDiscountModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDiscountModal(false)}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <View style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
          }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#1F2937'}}>Give Discount</Text>
              <TouchableOpacity onPress={() => setShowDiscountModal(false)}>
                <Icon name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            <View style={{
              backgroundColor: isDark ? '#064E3B' : '#D1FAE5',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Icon name="heart" size={20} color="#10B981" />
              <Text style={{fontSize: 13, color: isDark ? '#6EE7B7' : '#065F46', marginLeft: 8, flex: 1}}>
                Job was easier than expected? Give the client a discount as a goodwill gesture!
              </Text>
            </View>

            <View style={{
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}>
              <Text style={{fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280'}}>Current Price</Text>
              <Text style={{fontSize: 20, fontWeight: '700', color: isDark ? '#F9FAFB' : '#1F2937'}}>
                ₱{(jobData?.providerPrice || jobData?.totalAmount || 0).toLocaleString()}
              </Text>
            </View>

            <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? '#D1D5DB' : '#374151', marginBottom: 8}}>
              Discount Amount (₱) *
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? '#374151' : '#F9FAFB',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#10B981',
              paddingHorizontal: 12,
              marginBottom: 16,
            }}>
              <Text style={{fontSize: 18, color: '#10B981', fontWeight: '700'}}>-₱</Text>
              <TextInput
                style={{flex: 1, fontSize: 18, color: isDark ? '#F9FAFB' : '#1F2937', paddingVertical: 14, paddingHorizontal: 8}}
                placeholder="Enter discount"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                keyboardType="numeric"
                value={discountAmount}
                onChangeText={setDiscountAmount}
              />
            </View>

            <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? '#D1D5DB' : '#374151', marginBottom: 8}}>
              Reason (Optional)
            </Text>
            <TextInput
              style={{
                backgroundColor: isDark ? '#374151' : '#F9FAFB',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isDark ? '#4B5563' : '#E5E7EB',
                padding: 12,
                fontSize: 14,
                color: isDark ? '#F9FAFB' : '#1F2937',
                marginBottom: 20,
              }}
              placeholder="e.g., Quick fix, simple job..."
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={discountReason}
              onChangeText={setDiscountReason}
            />

            {discountAmount && (
              <View style={{backgroundColor: isDark ? '#064E3B' : '#D1FAE5', borderRadius: 12, padding: 12, marginBottom: 16}}>
                <Text style={{fontSize: 13, color: isDark ? '#6EE7B7' : '#065F46'}}>New price after discount:</Text>
                <Text style={{fontSize: 20, fontWeight: '700', color: '#10B981'}}>
                  ₱{(((jobData?.providerPrice || jobData?.totalAmount || 0) - parseFloat(discountAmount || 0)) * 1.05).toLocaleString()}
                </Text>
                <Text style={{fontSize: 12, color: isDark ? '#6EE7B7' : '#065F46', marginTop: 4}}>
                  You'll receive: ₱{((jobData?.providerPrice || jobData?.totalAmount || 0) - parseFloat(discountAmount || 0)).toLocaleString()}
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={{
                backgroundColor: '#10B981',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
              }}
              onPress={handleOfferDiscount}
              disabled={isUpdating}>
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{color: '#FFFFFF', fontSize: 16, fontWeight: '700'}}>Apply Discount</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ProviderJobDetailsScreen;
