import {useState, useEffect} from 'react';
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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {Picker} from '@react-native-picker/picker';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import {authStyles} from '../../css/authStyles';
import {globalStyles} from '../../css/globalStyles';
import {SERVICE_CATEGORIES} from '../../config/constants';
import {jobService} from '../../services/jobService';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import smsEmailService from '../../services/smsEmailService';
import {sendBookingConfirmation} from '../../services/emailJSService';
import {attemptBooking, resetBookingLimit} from '../../utils/rateLimiter';
import {uploadImage} from '../../services/imageUploadService';

const BookServiceScreen = ({navigation, route}) => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const {providerId, providerName, provider} = route.params || {};

  const displayProviderName = providerName || provider?.name;
  const actualProviderId = providerId || provider?.id;
  const providerService = provider?.service || '';
  const providerFixedPrice = provider?.fixedPrice || provider?.hourlyRate || 0;

  const [serviceCategory, setServiceCategory] = useState(providerService);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [paymentPreference, setPaymentPreference] = useState('pay_later'); // 'pay_first' or 'pay_later'
  const [isLoading, setIsLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);

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
    Alert.alert('Add Photo/Video', 'Choose how you want to add media', [
      {text: 'Take Photo', onPress: () => handleCameraCapture('photo')},
      {text: 'Record Video', onPress: () => handleCameraCapture('video')},
      {text: 'Choose from Gallery', onPress: handlePickFromGallery},
      {text: 'Cancel', style: 'cancel'},
    ]);
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
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!serviceCategory) {
      Alert.alert('Required', 'Please select a service category');
      return;
    }

    if (mediaFiles.length === 0) {
      Alert.alert('Required', 'Please upload at least one photo or video of the problem');
      return;
    }

    const rateLimitCheck = await attemptBooking(user?.uid);
    if (!rateLimitCheck.allowed) {
      Alert.alert('Please Wait', rateLimitCheck.message);
      return;
    }

    setIsLoading(true);
    try {
      const systemFee = providerFixedPrice * 0.05;
      const totalAmount = providerFixedPrice + systemFee;
      const autoTitle = `${serviceCategory} Service Request`;

      const jobData = {
        serviceCategory: serviceCategory,
        title: autoTitle,
        description: additionalNotes || 'See attached photos/videos',
        additionalNotes: additionalNotes,
        clientId: user?.uid || user?.id,
        clientName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Client',
        providerId: actualProviderId || null,
        providerName: displayProviderName || null,
        status: 'pending',
        // Payment preference
        paymentPreference: paymentPreference,
        isPaidUpfront: false,
        upfrontPaidAmount: 0,
        providerFixedPrice: providerFixedPrice,
        providerPrice: providerFixedPrice,
        priceType: provider?.priceType || 'per_job',
        systemFee: systemFee,
        systemFeePercentage: 5,
        totalAmount: totalAmount,
        streetAddress: user?.streetAddress || '',
        houseNumber: user?.houseNumber || '',
        barangay: user?.barangay || '',
        landmark: user?.landmark || '',
        latitude: user?.latitude || null,
        longitude: user?.longitude || null,
        address: user?.barangay
          ? `Brgy. ${user.barangay}, Maasin City`
          : user?.streetAddress
            ? `${user.streetAddress}, Maasin City`
            : 'Maasin City',
        mediaFiles: [],
      };

      // Upload media files to Cloudinary
      if (mediaFiles.length > 0) {
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
            // Continue with other files
          }
        }
        jobData.mediaFiles = uploadedMedia;
      }

      const createdJob = await jobService.createJobRequest(jobData);

      smsEmailService
        .sendBookingConfirmation(
          {...jobData, id: createdJob?.id || 'N/A'},
          user,
          {name: displayProviderName || 'Provider'},
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

      Alert.alert(
        'Success',
        'Your request has been submitted and is pending admin approval. Once approved, the provider will be notified.',
        [{text: 'OK', onPress: () => navigation.navigate('Bookings')}],
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create job request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
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
        <Text style={[globalStyles.heading3, {marginLeft: 16, flex: 1, color: isDark ? theme.colors.text : '#1F2937'}]}>
          Book Service
        </Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
        {/* Provider Info Card */}
        {displayProviderName && (
          <View
            style={{
              backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
              padding: 16,
              borderRadius: 12,
              marginBottom: 20,
            }}>
            <Text style={{fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 4}}>
              Requesting service from
            </Text>
            <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>
              {displayProviderName}
            </Text>
            {providerService && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8}}>
                <Icon name="construct" size={16} color="#00B14F" />
                <Text style={{fontSize: 14, color: '#00B14F', fontWeight: '500', marginLeft: 6}}>
                  {providerService}
                </Text>
              </View>
            )}

            {(provider?.fixedPrice || provider?.hourlyRate) && (
              <View
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? '#065F46' : '#BBF7D0',
                }}>
                <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 12}}>
                  Price Breakdown
                </Text>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                  <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563'}}>
                    Provider's Price
                  </Text>
                  <Text style={{fontSize: 14, fontWeight: '500', color: isDark ? theme.colors.text : '#1F2937'}}>
                    ₱{providerFixedPrice.toLocaleString()}
                  </Text>
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                  <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563'}}>
                    System Fee (5%)
                  </Text>
                  <Text style={{fontSize: 14, fontWeight: '500', color: isDark ? theme.colors.text : '#1F2937'}}>
                    ₱{((providerFixedPrice || 0) * 0.05).toLocaleString()}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: isDark ? '#065F46' : '#BBF7D0',
                  }}>
                  <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937'}}>
                    Total
                  </Text>
                  <Text style={{fontSize: 16, fontWeight: '700', color: '#00B14F'}}>
                    ₱{((providerFixedPrice || 0) * 1.05).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Service Category - only show if not from provider */}
        {!providerService && (
          <>
            <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8}}>
              Service Category *
            </Text>
            <View
              style={[
                authStyles.inputContainer,
                {marginBottom: 20},
                isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border},
              ]}>
              <Icon name="construct-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
              <Picker
                selectedValue={serviceCategory}
                onValueChange={value => setServiceCategory(value)}
                style={{flex: 1, color: isDark ? theme.colors.text : '#1F2937'}}
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
        <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8}}>
          Upload Photos/Videos of the Problem *
        </Text>
        <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', marginBottom: 12}}>
          Add up to 5 photos or videos showing what needs to be fixed
        </Text>

        <View style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20}}>
          {mediaFiles.map((file, index) => (
            <View
              key={index}
              style={{
                width: 80,
                height: 80,
                marginRight: 10,
                marginBottom: 10,
                borderRadius: 8,
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: isDark ? theme.colors.card : '#F3F4F6',
              }}>
              {file.uri ? (
                <Image source={{uri: file.uri}} style={{width: '100%', height: '100%'}} resizeMode="cover" />
              ) : (
                <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                  <Icon name="image-outline" size={24} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
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
                  <Icon name="play-circle" size={30} color="#FFFFFF" />
                </View>
              )}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => handleRemoveMedia(index)}>
                <Icon name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}

          {mediaFiles.length < 5 && (
            <TouchableOpacity
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: mediaFiles.length === 0 ? '#EF4444' : isDark ? theme.colors.border : '#E5E7EB',
                borderStyle: 'dashed',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isDark ? theme.colors.card : '#F9FAFB',
              }}
              onPress={handleAddMedia}>
              <Icon name="camera-outline" size={28} color={mediaFiles.length === 0 ? '#EF4444' : isDark ? theme.colors.textSecondary : '#9CA3AF'} />
              <Text style={{fontSize: 10, color: mediaFiles.length === 0 ? '#EF4444' : isDark ? theme.colors.textSecondary : '#9CA3AF', marginTop: 4}}>
                Add
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {mediaFiles.length === 0 && (
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
            <Icon name="alert-circle" size={16} color="#EF4444" />
            <Text style={{fontSize: 12, color: '#EF4444', marginLeft: 6}}>
              At least one photo or video is required
            </Text>
          </View>
        )}

        {/* Additional Notes - OPTIONAL */}
        <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8}}>
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

        {/* Payment Preference */}
        <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8}}>
          Payment Preference *
        </Text>
        <View style={{flexDirection: 'row', gap: 12, marginBottom: 20}}>
          <TouchableOpacity
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: paymentPreference === 'pay_first' ? '#00B14F' : isDark ? theme.colors.border : '#E5E7EB',
              backgroundColor: paymentPreference === 'pay_first' ? (isDark ? '#064E3B' : '#F0FDF4') : (isDark ? theme.colors.card : '#FFFFFF'),
              alignItems: 'center',
            }}
            onPress={() => setPaymentPreference('pay_first')}>
            <Icon 
              name="card" 
              size={28} 
              color={paymentPreference === 'pay_first' ? '#00B14F' : isDark ? theme.colors.textSecondary : '#6B7280'} 
            />
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: paymentPreference === 'pay_first' ? '#00B14F' : isDark ? theme.colors.text : '#1F2937',
              marginTop: 8,
            }}>
              Pay First
            </Text>
            <Text style={{
              fontSize: 11,
              color: isDark ? theme.colors.textSecondary : '#6B7280',
              textAlign: 'center',
              marginTop: 4,
            }}>
              Pay before service starts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: paymentPreference === 'pay_later' ? '#3B82F6' : isDark ? theme.colors.border : '#E5E7EB',
              backgroundColor: paymentPreference === 'pay_later' ? (isDark ? '#1E3A5F' : '#EFF6FF') : (isDark ? theme.colors.card : '#FFFFFF'),
              alignItems: 'center',
            }}
            onPress={() => setPaymentPreference('pay_later')}>
            <Icon 
              name="time" 
              size={28} 
              color={paymentPreference === 'pay_later' ? '#3B82F6' : isDark ? theme.colors.textSecondary : '#6B7280'} 
            />
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: paymentPreference === 'pay_later' ? '#3B82F6' : isDark ? theme.colors.text : '#1F2937',
              marginTop: 8,
            }}>
              Pay Later
            </Text>
            <Text style={{
              fontSize: 11,
              color: isDark ? theme.colors.textSecondary : '#6B7280',
              textAlign: 'center',
              marginTop: 4,
            }}>
              Pay after job is done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payment Info Note */}
        <View style={{
          backgroundColor: isDark ? '#1E3A5F' : '#FEF3C7',
          padding: 12,
          borderRadius: 8,
          marginBottom: 20,
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}>
          <Icon name="information-circle" size={18} color={isDark ? '#60A5FA' : '#F59E0B'} />
          <Text style={{fontSize: 12, color: isDark ? '#93C5FD' : '#92400E', marginLeft: 8, flex: 1, lineHeight: 18}}>
            {paymentPreference === 'pay_first' 
              ? 'You will pay the base amount upfront. If the provider needs additional materials or finds extra work, you can approve and pay for those separately.'
              : 'You will pay after the job is completed. The provider may request additional charges if extra work or materials are needed.'}
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary, {marginTop: 10}]}
          onPress={handleSubmit}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BookServiceScreen;
