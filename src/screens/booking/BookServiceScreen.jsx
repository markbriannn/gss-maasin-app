import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  PermissionsAndroid,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { authStyles } from '../../css/authStyles';
import { globalStyles } from '../../css/globalStyles';
import { SERVICE_CATEGORIES, MAASIN_BARANGAYS } from '../../config/constants';
import { jobService } from '../../services/jobService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import smsEmailService from '../../services/smsEmailService';
import { sendBookingConfirmation } from '../../services/emailService';
import { attemptBooking, resetBookingLimit } from '../../utils/rateLimiter';
import { uploadImage } from '../../services/imageUploadService';
import locationService from '../../services/locationService';
import paymentService from '../../services/paymentService';
import notificationService from '../../services/notificationService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import voiceInstructions from '../../utils/voiceInstructions';
import PhotoGuideModal from '../../components/PhotoGuideModal';
import QRPaymentModal from '../../components/common/QRPaymentModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const API_URL = 'https://gss-maasin-app.onrender.com/api';

const BookServiceScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { isDark, theme } = useTheme();
  const { providerId, providerName, provider } = route.params || {};
  const mapRef = useRef(null);

  const displayProviderName = providerName || provider?.name;
  const actualProviderId = providerId || provider?.id;
  const providerService = provider?.serviceCategory || provider?.service || '';
  const providerFixedPrice = provider?.serviceCategoryBasePrice || provider?.fixedPrice || provider?.hourlyRate || 0;

  const [serviceCategoryBasePrice, setServiceCategoryBasePrice] = useState(provider?.serviceCategoryBasePrice || 0);

  const [serviceCategory, setServiceCategory] = useState(providerService);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // QR Payment modal state
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [qrPaymentUrl, setQRPaymentUrl] = useState(null);
  const [qrPaymentAmount, setQRPaymentAmount] = useState(0);
  const [currentBookingId, setCurrentBookingId] = useState(null);
  
  const [mediaFiles, setMediaFiles] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Fetch basePrice from serviceCategories collection
  useEffect(() => {
    const fetchCategoryPrice = async () => {
      if (!providerService) return;
      try {
        const q = query(
          collection(db, 'serviceCategories'),
          where('name', '==', providerService)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const categoryData = snapshot.docs[0].data();
          if (categoryData.basePrice) {
            setServiceCategoryBasePrice(categoryData.basePrice);
          }
        }
      } catch (error) {
        console.log('Error fetching service category price:', error);
      }
    };
    fetchCategoryPrice();
  }, [providerService]);

  // Address state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [addressData, setAddressData] = useState({
    barangay: user?.barangay || '',
    streetAddress: user?.streetAddress || '',
    houseNumber: user?.houseNumber || '',
    landmark: user?.landmark || '',
    latitude: user?.latitude || 10.1335,
    longitude: user?.longitude || 124.8513,
  });

  // Find matching barangay from our list
  const findMatchingBarangay = (barangayName) => {
    if (!barangayName) return '';
    const normalizedName = barangayName.toLowerCase().trim();
    const exactMatch = MAASIN_BARANGAYS.find((b) => b.toLowerCase() === normalizedName);
    if (exactMatch) return exactMatch;
    const partialMatch = MAASIN_BARANGAYS.find(
      (b) => normalizedName.includes(b.toLowerCase()) || b.toLowerCase().includes(normalizedName),
    );
    if (partialMatch) return partialMatch;
    const cleanedName = normalizedName.replace(/^(brgy\.?|barangay)\s*/i, '').replace(/,.*$/, '').trim();
    const cleanMatch = MAASIN_BARANGAYS.find(
      (b) => b.toLowerCase() === cleanedName || cleanedName.includes(b.toLowerCase()) || b.toLowerCase().includes(cleanedName),
    );
    return cleanMatch || '';
  };

  // Get address from coordinates using reverse geocoding
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyC-qP1WOx8JSM6DfcAkIEmKQ8AQiAtiL9k&language=en`,
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        let streetNumber = '', route = '', barangay = '', neighborhood = '', sublocality = '';
        for (const result of data.results) {
          for (const component of result.address_components) {
            if (component.types.includes('street_number')) streetNumber = streetNumber || component.long_name;
            if (component.types.includes('route')) route = route || component.long_name;
            if (component.types.includes('sublocality_level_1') || component.types.includes('sublocality')) sublocality = sublocality || component.long_name;
            if (component.types.includes('neighborhood')) neighborhood = neighborhood || component.long_name;
            if (component.types.includes('political') && component.long_name.toLowerCase().includes('brgy')) barangay = barangay || component.long_name;
            const matchedBarangay = findMatchingBarangay(component.long_name);
            if (matchedBarangay && !barangay) barangay = matchedBarangay;
          }
        }
        const detectedBarangay = barangay || findMatchingBarangay(sublocality) || findMatchingBarangay(neighborhood) || findMatchingBarangay(data.results[0].formatted_address);
        const cleanStreetAddress = route && !route.toLowerCase().includes('unnamed') ? route : '';
        return { streetAddress: cleanStreetAddress, houseNumber: streetNumber || '', barangay: detectedBarangay };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Use current location
  const useCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        const { latitude, longitude } = location;
        mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 1000);
        const geocodedAddress = await getAddressFromCoordinates(latitude, longitude);
        setAddressData(prev => ({
          ...prev,
          latitude,
          longitude,
          barangay: geocodedAddress?.barangay || prev.barangay,
          streetAddress: geocodedAddress?.streetAddress || prev.streetAddress,
          houseNumber: geocodedAddress?.houseNumber || prev.houseNumber,
        }));
        if (geocodedAddress?.barangay) {
          Alert.alert('Location Found', `Barangay: ${geocodedAddress.barangay}${geocodedAddress.streetAddress ? `\nStreet: ${geocodedAddress.streetAddress}` : ''}\n\nPlease verify the details.`);
        } else {
          Alert.alert('Location Found', 'Your location has been detected. Please select your barangay from the list.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get your current location. Please enable location services.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Handle map press
  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setAddressData(prev => ({ ...prev, latitude, longitude }));
    setIsGeocoding(true);
    try {
      const geocodedAddress = await getAddressFromCoordinates(latitude, longitude);
      setAddressData(prev => ({
        ...prev,
        barangay: geocodedAddress?.barangay || prev.barangay,
        streetAddress: geocodedAddress?.streetAddress || prev.streetAddress,
        houseNumber: geocodedAddress?.houseNumber || prev.houseNumber,
      }));
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle marker drag end
  const handleMarkerDragEnd = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setAddressData(prev => ({ ...prev, latitude, longitude }));
    setIsGeocoding(true);
    try {
      const geocodedAddress = await getAddressFromCoordinates(latitude, longitude);
      setAddressData(prev => ({
        ...prev,
        barangay: geocodedAddress?.barangay || prev.barangay,
        streetAddress: geocodedAddress?.streetAddress || prev.streetAddress,
        houseNumber: geocodedAddress?.houseNumber || prev.houseNumber,
      }));
    } finally {
      setIsGeocoding(false);
    }
  };

  // Get display address
  const getDisplayAddress = () => {
    if (addressData.barangay && addressData.streetAddress) {
      return `${addressData.houseNumber ? addressData.houseNumber + ', ' : ''}${addressData.streetAddress}, Brgy. ${addressData.barangay}, Maasin City`;
    }
    if (addressData.barangay) {
      return `Brgy. ${addressData.barangay}, Maasin City`;
    }
    if (user?.barangay) {
      return `Brgy. ${user.barangay}, Maasin City`;
    }
    return 'Tap to set your address';
  };

  // Clear old rate limit data on mount (for development)
  useEffect(() => {
    // Reset booking rate limit for this user to avoid "too many attempts" during testing
    if (user?.uid) {
      resetBookingLimit(user.uid).catch(err => console.log('Reset rate limit error:', err));
    }
  }, [user?.uid]);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs camera access to take photos',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleAddMedia = () => {
    Alert.alert(
      '📸 Add Photos',
      'How would you like to add photos?',
      [
        {
          text: '📷 Take Photo Now',
          onPress: () => handleCameraCapture('photo'),
          style: 'default'
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: handlePickFromGallery,
          style: 'default'
        },
        {
          text: '❌ Cancel',
          style: 'cancel'
        }
      ],
      { cancelable: true }
    );
  };

  const handleCameraCapture = async mediaType => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required');
      return;
    }

    const options = {
      mediaType: mediaType === 'video' ? 'video' : 'photo',
      videoQuality: 'medium',
      durationLimit: 30,
      saveToPhotos: false,
    };

    launchCamera(options, response => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to capture');
        return;
      }
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setMediaFiles(prev => [
          ...prev,
          {
            uri: asset.uri,
            type: asset.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
            fileName: asset.fileName || `${mediaType}_${Date.now()}`,
            isVideo: mediaType === 'video',
          },
        ]);
      }
    });
  };

  const handlePickFromGallery = () => {
    const options = {
      mediaType: 'mixed',
      selectionLimit: 5 - mediaFiles.length,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to pick media');
        return;
      }
      if (response.assets) {
        const newFiles = response.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          fileName: asset.fileName || `media_${Date.now()}`,
          isVideo: asset.type?.includes('video'),
        }));
        setMediaFiles(prev => [...prev, ...newFiles].slice(0, 5));
      }
    });
  };

  const handleRemoveMedia = index => {
    Alert.alert(
      'Delete Photo?',
      'Are you sure you want to remove this photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: () => setMediaFiles(prev => prev.filter((_, i) => i !== index)),
          style: 'destructive'
        }
      ]
    );
  };

  const handleSubmit = async () => {
    // Prevent double-click
    if (isLoading || processingPayment) return;

    if (!serviceCategory) {
      Alert.alert('Required', 'Please select a service category');
      return;
    }

    if (mediaFiles.length === 0) {
      Alert.alert('Required', 'Please upload at least one photo or video of the problem');
      return;
    }

    // Check if client already has an active booking with this provider
    if (actualProviderId) {
      try {
        const activeStatuses = ['awaiting_payment', 'pending', 'approved', 'accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion', 'pending_payment', 'payment_received'];
        const existingBookingsQuery = query(
          collection(db, 'bookings'),
          where('clientId', '==', user?.uid || user?.id),
          where('providerId', '==', actualProviderId),
          where('status', 'in', activeStatuses)
        );
        const existingBookingsSnap = await getDocs(existingBookingsQuery);

        if (!existingBookingsSnap.empty) {
          Alert.alert(
            'Active Booking Exists',
            `You already have an active booking with ${displayProviderName || 'this provider'}. Please wait for it to complete or cancel it before booking again.`,
            [{ text: 'OK' }]
          );
          return;
        }
      } catch (checkError) {
        console.log('Error checking existing bookings:', checkError);
        // Continue with booking if check fails
      }
    }

    const rateLimitCheck = await attemptBooking(user?.uid);
    if (!rateLimitCheck.allowed) {
      Alert.alert('Please Wait', rateLimitCheck.message);
      return;
    }

    setIsLoading(true);
    try {
      const systemFee = Math.round(providerFixedPrice * 0.05 * 100) / 100;
      const totalAmount = Math.round((providerFixedPrice + systemFee) * 100) / 100;
      
      // Always use 50/50 split
      const upfrontAmount = Math.round(totalAmount * 0.5 * 100) / 100;
      const remainingAmount = Math.round((totalAmount - upfrontAmount) * 100) / 100;
      const paymentSplitType = '50_50'; // Always 50% upfront, 50% on completion
      
      console.log('[BookService] Payment calculation:', {
        providerFixedPrice,
        systemFee,
        totalAmount,
        upfrontAmount,
        remainingAmount,
        paymentSplitType
      });

      const autoTitle = `${serviceCategory} Service Request`;

      // Upload media files first
      const uploadedMedia = [];
      for (const file of mediaFiles) {
        try {
          const uploadedUrl = await uploadImage(file.uri, `jobs/${user.uid}`, 'document');
          uploadedMedia.push({
            url: uploadedUrl,
            type: file.type,
            isVideo: file.isVideo,
          });
        } catch (uploadError) {
          console.log('Media upload failed:', uploadError);
        }
      }

      const jobData = {
        serviceCategory: serviceCategory,
        title: autoTitle,
        description: additionalNotes || 'See attached photos/videos',
        additionalNotes: additionalNotes,
        clientId: user?.uid || user?.id,
        clientName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Client',
        clientEmail: user?.email,
        clientPhone: user?.phoneNumber,
        providerId: actualProviderId || null,
        providerName: displayProviderName || null,
        // Always use 50/50 split with QR payment
        status: 'awaiting_payment', // Start as awaiting_payment - becomes 'pending' after upfront paid
        paymentSplitType: paymentSplitType, // Always '50_50'
        paymentMethod: 'qrph', // Always QR Ph
        paymentStatus: 'pending', // pending -> partial -> paid -> held -> released
        isPaidUpfront: false,
        upfrontPaidAmount: 0,
        upfrontAmount: upfrontAmount, // Amount to pay upfront
        remainingAmount: remainingAmount, // Amount to pay on completion (0 if 100% upfront)
        escrowAmount: totalAmount, // Total amount held
        providerFixedPrice: providerFixedPrice,
        providerPrice: providerFixedPrice,
        priceType: provider?.priceType || 'per_job',
        systemFee: systemFee,
        systemFeePercentage: 5,
        totalAmount: totalAmount,
        // Use addressData from modal (or fallback to user data)
        streetAddress: addressData.streetAddress || user?.streetAddress || '',
        houseNumber: addressData.houseNumber || user?.houseNumber || '',
        barangay: addressData.barangay || user?.barangay || '',
        landmark: addressData.landmark || user?.landmark || '',
        latitude: addressData.latitude || user?.latitude || null,
        longitude: addressData.longitude || user?.longitude || null,
        address: addressData.barangay
          ? `${addressData.houseNumber ? addressData.houseNumber + ', ' : ''}${addressData.streetAddress ? addressData.streetAddress + ', ' : ''}Brgy. ${addressData.barangay}, Maasin City`
          : user?.barangay
            ? `Brgy. ${user.barangay}, Maasin City`
            : 'Maasin City',
        mediaFiles: uploadedMedia,
        adminApproved: false,
      };

      const createdJob = await jobService.createJobRequest(jobData);
      const bookingId = createdJob?.id;

      // Send FCM push notification to admins about new booking
      const clientName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Client';
      notificationService.pushNewJobToAdmins({ ...jobData, id: bookingId }, clientName)
        .catch(err => console.log('FCM push to admins failed:', err));

      // Now redirect to payment
      setProcessingPayment(true);

      try {
        let paymentResult;

        // Use QRPh endpoint
        const response = await fetch(`${API_URL}/payments/create-qrph-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: upfrontAmount, // Charge 50% upfront
            bookingId: bookingId,
            userId: user?.uid,
            description: `50% Upfront - ${serviceCategory} Service - ${displayProviderName || 'Provider'}`,
            platform: 'mobile',
            paymentType: 'upfront',
          }),
        });
        paymentResult = await response.json();

        if (paymentResult.success && paymentResult.checkoutUrl) {
          // Store booking ID and show QR payment modal
          setCurrentBookingId(bookingId);
          setQRPaymentUrl(paymentResult.checkoutUrl);
          setQRPaymentAmount(upfrontAmount);
          setShowQRPayment(true);
          setProcessingPayment(false);
        } else {
          Alert.alert('Payment Error', paymentResult.error || 'Failed to process payment');
          setProcessingPayment(false);
        }
      } catch (paymentError) {
        console.error('Payment error:', paymentError);
        Alert.alert('Payment Error', 'Failed to connect to payment service');
        setProcessingPayment(false);
      }

      // Send notifications
      smsEmailService
        .sendBookingConfirmation(
          { ...jobData, id: bookingId },
          user,
          { name: displayProviderName || 'Provider' },
        )
        .catch(err => console.log('SMS/Email notification failed:', err));

      if (user?.email) {
        sendBookingConfirmation(user.email, jobData.clientName, {
          serviceCategory: jobData.serviceCategory,
          title: jobData.title,
          providerName: displayProviderName || 'Provider',
          totalAmount: totalAmount,
        }).catch(err => console.log('Email notification failed:', err));
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create job request');
      setIsLoading(false);
      setProcessingPayment(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.container, isDark && { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 20,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? theme.colors.border : '#E5E7EB',
          backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
        }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={[globalStyles.heading3, { marginLeft: 16, flex: 1, color: isDark ? theme.colors.text : '#1F2937' }]}>
          Book Service
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Provider Info Card */}
        {displayProviderName && (
          <View
            style={{
              backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
              padding: 16,
              borderRadius: 12,
              marginBottom: 20,
            }}>
            <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 4 }}>
              Requesting service from
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937' }}>
              {displayProviderName}
            </Text>
            {providerService && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Icon name="construct" size={16} color="#00B14F" />
                <Text style={{ fontSize: 14, color: '#00B14F', fontWeight: '500', marginLeft: 6 }}>
                  {providerService}
                </Text>
              </View>
            )}

            {(serviceCategoryBasePrice || provider?.fixedPrice || provider?.hourlyRate) && (
              <View
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? '#065F46' : '#BBF7D0',
                }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937' }}>
                    Total
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#00B14F' }}>
                    ₱{(Math.round((serviceCategoryBasePrice || providerFixedPrice || 0) * 1.05 * 100) / 100).toLocaleString()}
                  </Text>
                </View>

              </View>
            )}

          </View>
        )}

        {/* Service Address Section */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8 }}>
          Service Address *
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: isDark ? theme.colors.border : '#E5E7EB',
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={() => setShowAddressModal(true)}>
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            <Icon name="location" size={22} color="#00B14F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 2 }}>
              {addressData.barangay ? `Brgy. ${addressData.barangay}` : 'Set your address'}
            </Text>
            <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280' }} numberOfLines={1}>
              {getDisplayAddress()}
            </Text>
          </View>
          <View style={{
            backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#3B82F6' }}>
              {addressData.barangay ? 'Change' : 'Set'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Service Category - only show if not from provider */}
        {!providerService && (
          <>
            <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8 }}>
              Service Category *
            </Text>
            <View
              style={[
                authStyles.inputContainer,
                { marginBottom: 20 },
                isDark && { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}>
              <Icon name="construct-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
              <Picker
                selectedValue={serviceCategory}
                onValueChange={value => setServiceCategory(value)}
                style={{ flex: 1, color: isDark ? theme.colors.text : '#1F2937' }}
                dropdownIconColor={isDark ? theme.colors.text : '#1F2937'}>
                <Picker.Item label="Select a service" value="" />
                {SERVICE_CATEGORIES.map(category => (
                  <Picker.Item key={category.id} label={category.name} value={category.name} />
                ))}
              </Picker>
            </View>
          </>
        )}

        {/* Photo/Video Upload Section - REQUIRED */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8 }}>
          Upload Photos of the Problem *
        </Text>
        <Text style={{ fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280', marginBottom: 16 }}>
          Show us what needs to be fixed
        </Text>

        {/* Voice Instructions Button */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#3B82F6',
            borderRadius: 16,
            padding: 18,
            marginBottom: 12,
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
          }}
          onPress={() => voiceInstructions.speakUploadInstructions()}
        >
          <Icon name="volume-high" size={24} color="#FFF" />
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF', marginLeft: 10 }}>
            🔊 Hear Instructions
          </Text>
        </TouchableOpacity>

        {/* Photo Guide Button */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#10B981',
            borderRadius: 16,
            padding: 18,
            marginBottom: 16,
            shadowColor: '#10B981',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
          }}
          onPress={() => setShowPhotoGuide(true)}
        >
          <Icon name="information-circle" size={24} color="#FFF" />
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF', marginLeft: 10 }}>
            📖 How to Take Good Photos
          </Text>
        </TouchableOpacity>

        {/* Large Upload Button - Only show when no photos */}
        {mediaFiles.length === 0 && (
          <TouchableOpacity
            style={{
              minHeight: 180,
              backgroundColor: '#10B981',
              borderRadius: 20,
              padding: 24,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 8,
            }}
            onPress={handleAddMedia}
            activeOpacity={0.8}
          >
            <Icon name="camera" size={64} color="#FFF" />
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFF', marginTop: 12 }}>
              📸 Add Photos
            </Text>
            <Text style={{ fontSize: 18, color: '#FFF', opacity: 0.9, marginTop: 8, textAlign: 'center' }}>
              Tap to take or choose photos
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="checkmark-circle" size={20} color="#FFF" />
                <Text style={{ fontSize: 16, color: '#FFF', marginLeft: 6 }}>Camera</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="checkmark-circle" size={20} color="#FFF" />
                <Text style={{ fontSize: 16, color: '#FFF', marginLeft: 6 }}>Gallery</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Tips Box */}
        {mediaFiles.length === 0 && (
          <View style={{
            backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            borderWidth: 2,
            borderColor: '#3B82F6',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Icon name="information-circle" size={24} color="#3B82F6" style={{ marginTop: 2 }} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? '#93C5FD' : '#1E40AF', marginBottom: 8 }}>
                  Tips for good photos:
                </Text>
                <Text style={{ fontSize: 14, color: isDark ? '#BFDBFE' : '#1E3A8A', lineHeight: 22 }}>
                  • Get close to the problem{'\n'}
                  • Use good lighting{'\n'}
                  • Take multiple angles{'\n'}
                  • Show the whole area
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Photo Preview Grid - Larger thumbnails (2 columns) */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 12 }}>
          {mediaFiles.map((file, index) => {
            const thumbnailWidth = (SCREEN_WIDTH - 64) / 2; // 2 columns with padding
            return (
              <View
                key={index}
                style={{
                  width: thumbnailWidth,
                  height: thumbnailWidth,
                  borderRadius: 16,
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: isDark ? theme.colors.card : '#F3F4F6',
                  borderWidth: 3,
                  borderColor: '#10B981',
                }}>
                {/* Photo Number Badge */}
                <View style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#10B981',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 2,
                  borderWidth: 2,
                  borderColor: '#FFF',
                }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFF' }}>
                    {index + 1}
                  </Text>
                </View>

                {file.uri ? (
                  <TouchableOpacity activeOpacity={0.8} onPress={() => setPreviewImage(file.uri)}>
                    <Image source={{ uri: file.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </TouchableOpacity>
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Icon name="image-outline" size={48} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
                  </View>
                )}
                {file.isVideo && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Icon name="play-circle" size={48} color="#FFFFFF" />
                  </View>
                )}
                {/* Larger Delete Button */}
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#EF4444',
                    borderRadius: 28,
                    width: 56,
                    height: 56,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 5,
                  }}
                  onPress={() => handleRemoveMedia(index)}>
                  <Icon name="trash" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Add More Button - Larger */}
          {mediaFiles.length > 0 && mediaFiles.length < 5 && (
            <TouchableOpacity
              style={{
                width: (SCREEN_WIDTH - 64) / 2,
                height: (SCREEN_WIDTH - 64) / 2,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: mediaFiles.length === 0 ? '#EF4444' : isDark ? theme.colors.border : '#E5E7EB',
                borderStyle: 'dashed',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isDark ? theme.colors.card : '#F9FAFB',
              }}
              onPress={handleAddMedia}>
              <Icon name="camera-outline" size={28} color={mediaFiles.length === 0 ? '#EF4444' : isDark ? theme.colors.textSecondary : '#9CA3AF'} />
              <Text style={{ fontSize: 10, color: mediaFiles.length === 0 ? '#EF4444' : isDark ? theme.colors.textSecondary : '#9CA3AF', marginTop: 4 }}>
                Add
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Progress Indicator */}
        {mediaFiles.length > 0 && (
          <View style={{
            backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 2,
            borderColor: '#10B981',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#A7F3D0' : '#065F46' }}>
                Photos Added
              </Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10B981' }}>
                {mediaFiles.length}/5
              </Text>
            </View>
            <View style={{
              height: 12,
              backgroundColor: isDark ? '#065F46' : '#D1FAE5',
              borderRadius: 6,
              overflow: 'hidden',
            }}>
              <View style={{
                height: '100%',
                width: `${(mediaFiles.length / 5) * 100}%`,
                backgroundColor: '#10B981',
              }} />
            </View>
          </View>
        )}

        {mediaFiles.length === 0 && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FEE2E2',
            padding: 12,
            borderRadius: 12,
            marginBottom: 16,
          }}>
            <Icon name="alert-circle" size={24} color="#EF4444" />
            <Text style={{ fontSize: 16, color: '#EF4444', marginLeft: 10, flex: 1, fontWeight: '600' }}>
              At least one photo is required
            </Text>
          </View>
        )}

        {/* Additional Notes - OPTIONAL */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8 }}>
          Additional Notes (Optional)
        </Text>
        <TextInput
          style={{
            backgroundColor: isDark ? theme.colors.card : '#F9FAFB',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: isDark ? theme.colors.border : '#E5E7EB',
            padding: 16,
            fontSize: 14,
            color: isDark ? theme.colors.text : '#1F2937',
            height: 100,
            textAlignVertical: 'top',
            marginBottom: 20,
          }}
          placeholder="Any additional details about the problem..."
          placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
          multiline
          numberOfLines={4}
          value={additionalNotes}
          onChangeText={setAdditionalNotes}
        />

        {/* Payment Info Banner */}
        <View style={{
          backgroundColor: isDark ? '#2E1065' : '#F5F3FF',
          padding: 16,
          borderRadius: 12,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: isDark ? '#5B21B6' : '#DDD6FE',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Icon name="shield-checkmark" size={22} color="#7C3AED" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#C4B5FD' : '#6B21A8', marginLeft: 8 }}>
              50/50 Payment Split
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: isDark ? '#C4B5FD' : '#7C3AED', lineHeight: 20 }}>
            • Pay 50% upfront via QR code{'\n'}
            • Pay remaining 50% after service completion{'\n'}
            • Your payment is held securely until job is done
          </Text>
        </View>
          <Text style={{ fontSize: 12, color: isDark ? '#93C5FD' : '#92400E', marginLeft: 8, flex: 1, lineHeight: 18 }}>
            You'll be shown a QR code to scan with any banking or e-wallet app (GCash, Maya, BPI, etc.). Money will be held until the provider completes the job and you confirm.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary, { marginTop: 10 }]}
          onPress={handleSubmit}
          disabled={isLoading || processingPayment}>
          {isLoading || processingPayment ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary, { marginLeft: 8 }]}>
                {processingPayment ? 'Redirecting to Payment...' : 'Processing...'}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="card" size={20} color="#FFFFFF" />
              <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary, { marginLeft: 8 }]}>
                Pay ₱{((providerFixedPrice || 0) * 1.05).toLocaleString()} & Book
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Trust Badges */}
        <View style={{
          backgroundColor: isDark ? theme.colors.card : '#F9FAFB',
          padding: 16,
          borderRadius: 12,
          marginTop: 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Icon name="shield-checkmark" size={18} color="#00B14F" />
            <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', marginLeft: 8 }}>
              Payment held until job completion
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Icon name="checkmark-circle" size={18} color="#00B14F" />
            <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', marginLeft: 8 }}>
              Money released only after you confirm
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="lock-closed" size={18} color="#00B14F" />
            <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', marginLeft: 8 }}>
              100% Secure with PayMongo
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Address Modal */}
      <Modal visible={showAddressModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            flex: 1,
            marginTop: 60,
            backgroundColor: isDark ? theme.colors.background : '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}>
            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? theme.colors.border : '#E5E7EB',
            }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937' }}>
                Update Service Address
              </Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Icon name="close" size={24} color={isDark ? theme.colors.text : '#6B7280'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              {/* Use Current Location Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                  padding: 14,
                  borderRadius: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#00B14F',
                }}
                onPress={useCurrentLocation}
                disabled={isLoadingLocation}>
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color="#00B14F" />
                ) : (
                  <>
                    <Icon name="locate" size={20} color="#00B14F" />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#00B14F', marginLeft: 8 }}>
                      Use My Current Location
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Map */}
              <View style={{
                height: 200,
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: isDark ? theme.colors.border : '#E5E7EB',
              }}>
                <MapView
                  ref={mapRef}
                  style={{ flex: 1 }}
                  provider={PROVIDER_GOOGLE}
                  initialRegion={{
                    latitude: addressData.latitude,
                    longitude: addressData.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  onPress={handleMapPress}
                  showsUserLocation
                  showsMyLocationButton={false}>
                  <Marker
                    coordinate={{
                      latitude: addressData.latitude,
                      longitude: addressData.longitude,
                    }}
                    draggable
                    onDragEnd={handleMarkerDragEnd}>
                    <View>
                      <Icon name="location" size={40} color="#00B14F" />
                    </View>
                  </Marker>
                </MapView>
                {isGeocoding && (
                  <View style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, marginLeft: 6 }}>Getting address...</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 11, color: isDark ? theme.colors.textSecondary : '#9CA3AF', textAlign: 'center', marginBottom: 16 }}>
                Tap on map or drag marker to set your exact location
              </Text>

              {/* Barangay Picker */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8 }}>
                Barangay *
              </Text>
              <View style={{
                backgroundColor: isDark ? theme.colors.card : '#F9FAFB',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isDark ? theme.colors.border : '#E5E7EB',
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Icon name="location-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={{ marginLeft: 12 }} />
                <Picker
                  selectedValue={addressData.barangay}
                  onValueChange={(value) => setAddressData(prev => ({ ...prev, barangay: value }))}
                  style={{ flex: 1, color: isDark ? theme.colors.text : '#1F2937' }}
                  dropdownIconColor={isDark ? theme.colors.text : '#1F2937'}>
                  <Picker.Item label="Select Barangay" value="" />
                  {MAASIN_BARANGAYS.map((barangay) => (
                    <Picker.Item key={barangay} label={barangay} value={barangay} />
                  ))}
                </Picker>
              </View>

              {/* Street Address */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8 }}>
                Street Address *
              </Text>
              <View style={{
                backgroundColor: isDark ? theme.colors.card : '#F9FAFB',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isDark ? theme.colors.border : '#E5E7EB',
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Icon name="navigate-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={{ marginLeft: 12 }} />
                <TextInput
                  style={{ flex: 1, padding: 14, fontSize: 14, color: isDark ? theme.colors.text : '#1F2937' }}
                  placeholder="e.g., Rizal Street, Purok 1"
                  placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
                  value={addressData.streetAddress}
                  onChangeText={(text) => setAddressData(prev => ({ ...prev, streetAddress: text }))}
                />
              </View>

              {/* House/Building Number */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8 }}>
                House/Building Number
              </Text>
              <View style={{
                backgroundColor: isDark ? theme.colors.card : '#F9FAFB',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isDark ? theme.colors.border : '#E5E7EB',
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Icon name="home-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={{ marginLeft: 12 }} />
                <TextInput
                  style={{ flex: 1, padding: 14, fontSize: 14, color: isDark ? theme.colors.text : '#1F2937' }}
                  placeholder="e.g., 123, Bldg. A"
                  placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
                  value={addressData.houseNumber}
                  onChangeText={(text) => setAddressData(prev => ({ ...prev, houseNumber: text }))}
                />
              </View>

              {/* Landmark */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8 }}>
                Nearby Landmark (Optional)
              </Text>
              <View style={{
                backgroundColor: isDark ? theme.colors.card : '#F9FAFB',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isDark ? theme.colors.border : '#E5E7EB',
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Icon name="flag-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={{ marginLeft: 12 }} />
                <TextInput
                  style={{ flex: 1, padding: 14, fontSize: 14, color: isDark ? theme.colors.text : '#1F2937' }}
                  placeholder="e.g., Near Maasin Cathedral"
                  placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
                  value={addressData.landmark}
                  onChangeText={(text) => setAddressData(prev => ({ ...prev, landmark: text }))}
                />
              </View>

              {/* Address Summary */}
              {addressData.barangay && addressData.streetAddress && (
                <View style={{
                  backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Icon name="checkmark-circle" size={20} color="#00B14F" />
                  <Text style={{ fontSize: 13, color: isDark ? '#A7F3D0' : '#065F46', marginLeft: 8, flex: 1 }}>
                    {addressData.houseNumber ? `${addressData.houseNumber}, ` : ''}
                    {addressData.streetAddress}, Brgy. {addressData.barangay}, Maasin City
                    {addressData.landmark ? ` (Near ${addressData.landmark})` : ''}
                  </Text>
                </View>
              )}

              {/* Confirm Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: addressData.barangay && addressData.streetAddress ? '#00B14F' : '#D1D5DB',
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginBottom: 20,
                }}
                onPress={() => {
                  if (!addressData.barangay || !addressData.streetAddress) {
                    Alert.alert('Required', 'Please select your barangay and enter your street address.');
                    return;
                  }
                  setShowAddressModal(false);
                }}
                disabled={!addressData.barangay || !addressData.streetAddress}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                  Confirm Address
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Preview */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setPreviewImage(null)}
        >
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setPreviewImage(null)}
          >
            <Icon name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={{ width: Dimensions.get('window').width - 32, height: Dimensions.get('window').width - 32, borderRadius: 12 }}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

      {/* Photo Guide Modal */}
      <PhotoGuideModal
        visible={showPhotoGuide}
        onClose={() => setShowPhotoGuide(false)}
        isDark={isDark}
      />

      {/* Floating Help Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#3B82F6',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        onPress={() => setShowHelp(true)}
      >
        <Text style={{ fontSize: 32 }}>❓</Text>
      </TouchableOpacity>

      {/* Help Modal */}
      <Modal visible={showHelp} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            flex: 1,
            marginTop: 100,
            backgroundColor: isDark ? theme.colors.background : '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? theme.colors.border : '#E5E7EB',
            }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: isDark ? theme.colors.text : '#1F2937' }}>
                ❓ Need Help?
              </Text>
              <TouchableOpacity
                onPress={() => setShowHelp(false)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDark ? theme.colors.card : '#F3F4F6',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Icon name="close" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              {/* Adding Photos */}
              <View style={{
                backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="camera" size={24} color="#10B981" />
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#A7F3D0' : '#065F46', marginLeft: 10 }}>
                    Adding Photos
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: isDark ? '#6EE7B7' : '#047857', lineHeight: 24 }}>
                  1. Tap the green "Add Photos" button{'\n'}
                  2. Choose "Take Photo" or "Choose from Gallery"{'\n'}
                  3. Make sure photos are clear and well-lit{'\n'}
                  4. You can add up to 5 photos
                </Text>
              </View>

              {/* Describing Problem */}
              <View style={{
                backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="create" size={24} color="#3B82F6" />
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#93C5FD' : '#1E40AF', marginLeft: 10 }}>
                    Describing the Problem
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: isDark ? '#BFDBFE' : '#1E3A8A', lineHeight: 24 }}>
                  • Be specific about what's broken{'\n'}
                  • Mention when the problem started{'\n'}
                  • Include any relevant details{'\n'}
                  • This helps the provider prepare
                </Text>
              </View>

              {/* Payment Security */}
              <View style={{
                backgroundColor: isDark ? '#2E1065' : '#F5F3FF',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="shield-checkmark" size={24} color="#7C3AED" />
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#C4B5FD' : '#5B21B6', marginLeft: 10 }}>
                    Payment Security
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: isDark ? '#DDD6FE' : '#6B21A8', lineHeight: 24 }}>
                  Your payment is protected:{'\n'}
                  • Money is held securely until job is done{'\n'}
                  • Provider gets paid only after you confirm{'\n'}
                  • 100% secure with PayMongo{'\n'}
                  • You can request refund if unsatisfied
                </Text>
              </View>

              {/* Contact Support */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#10B981',
                  borderRadius: 16,
                  padding: 20,
                  alignItems: 'center',
                  marginBottom: 20,
                }}
                onPress={() => {
                  setShowHelp(false);
                  // Navigate to help/support screen if available
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                  📞 Contact Support
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QR Payment Modal */}
      <QRPaymentModal
        visible={showQRPayment}
        checkoutUrl={qrPaymentUrl}
        amount={qrPaymentAmount}
        bookingId={currentBookingId}
        onClose={() => {
          setShowQRPayment(false);
          setQRPaymentUrl(null);
          setQRPaymentAmount(0);
          // Navigate to ClientMain after closing
          navigation.replace('ClientMain');
        }}
        onPaymentComplete={() => {
          // Payment completed, navigate to booking details
          if (currentBookingId) {
            navigation.replace('ClientMain');
            // Could also navigate directly to job details
            // navigation.navigate('JobDetails', { jobId: currentBookingId });
          }
        }}
      />
    </SafeAreaView>
  );
};

export default BookServiceScreen;
