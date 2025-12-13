import React, {useState, useMemo} from 'react';
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
  FlatList,
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

const BookServiceScreen = ({navigation, route}) => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const {providerId, providerName, provider} = route.params || {};
  
  // Get provider name from either direct param or provider object
  const displayProviderName = providerName || provider?.name;
  const actualProviderId = providerId || provider?.id;
  const providerService = provider?.service || '';
  const providerFixedPrice = provider?.fixedPrice || provider?.hourlyRate || 0;
  
  // If hiring a specific provider, auto-fill their service category
  const [formData, setFormData] = useState({
    serviceCategory: providerService,
    title: '',
    description: '',
    scheduledDate: null,
    scheduledTime: null,
    estimatedDuration: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]); // For images and videos
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [priceNote, setPriceNote] = useState(''); // Reason for custom price
  
  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Generate dates for the calendar
  const calendarDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate next 60 days
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour <= 21; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const date = new Date();
        date.setHours(hour, min, 0, 0);
        slots.push(date);
      }
    }
    return slots;
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs camera access to take photos',
            buttonPositive: 'OK',
          }
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
      'Add Photo/Video',
      'Choose how you want to add media',
      [
        {
          text: 'Take Photo',
          onPress: () => handleCameraCapture('photo'),
        },
        {
          text: 'Record Video',
          onPress: () => handleCameraCapture('video'),
        },
        {
          text: 'Choose from Gallery',
          onPress: handlePickFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleCameraCapture = async (mediaType) => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required');
      return;
    }

    const options = {
      mediaType: mediaType === 'video' ? 'video' : 'photo',
      videoQuality: 'medium',
      durationLimit: 30, // 30 seconds max for video
      saveToPhotos: false,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to capture');
        return;
      }
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setMediaFiles(prev => [...prev, {
          uri: asset.uri,
          type: asset.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
          fileName: asset.fileName || `${mediaType}_${Date.now()}`,
          isVideo: mediaType === 'video',
        }]);
      }
    });
  };

  const handlePickFromGallery = () => {
    const options = {
      mediaType: 'mixed', // Allow both photos and videos
      selectionLimit: 5 - mediaFiles.length, // Max 5 files total
    };

    launchImageLibrary(options, (response) => {
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
        setMediaFiles(prev => [...prev, ...newFiles].slice(0, 5)); // Max 5 files
      }
    });
  };

  const handleRemoveMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Date picker handler
  const handleDateSelect = (date) => {
    setFormData({...formData, scheduledDate: date});
    setShowDatePicker(false);
  };

  // Time picker handler
  const handleTimeSelect = (time) => {
    setFormData({...formData, scheduledTime: time});
    setShowTimePicker(false);
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (time) => {
    if (!time) return '';
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format date for calendar display
  const formatCalendarDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
      full: date,
    };
  };

  const handleSubmit = async () => {
    if (!formData.serviceCategory || !formData.title || !formData.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate custom price if used
    if (useCustomPrice && (!customPrice || parseFloat(customPrice) <= 0)) {
      Alert.alert('Error', 'Please enter a valid offer price');
      return;
    }

    setIsLoading(true);
    try {
      // Determine if using custom price or provider's fixed price
      const isCustomOffer = useCustomPrice && customPrice;
      const offeredPrice = isCustomOffer ? parseFloat(customPrice) : providerFixedPrice;
      const systemFee = offeredPrice * 0.05; // 5% system fee
      const totalAmount = offeredPrice + systemFee;

      const jobData = {
        ...formData,
        scheduledDate: formData.scheduledDate ? formData.scheduledDate.toISOString().split('T')[0] : '',
        scheduledTime: formData.scheduledTime ? formatTime(formData.scheduledTime) : '',
        clientId: user?.uid || user?.id,
        clientName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Client',
        providerId: actualProviderId || null,
        providerName: displayProviderName || null,
        status: isCustomOffer ? 'pending_negotiation' : 'pending', // Different status for offers
        // Pricing breakdown
        providerFixedPrice: providerFixedPrice, // Original provider price
        offeredPrice: offeredPrice, // Client's offered price (same as providerFixedPrice if not custom)
        providerPrice: isCustomOffer ? null : offeredPrice, // Final agreed price (null if negotiating)
        priceType: provider?.priceType || 'per_job',
        systemFee: systemFee,
        systemFeePercentage: 5,
        totalAmount: totalAmount,
        // Negotiation fields
        isNegotiable: isCustomOffer,
        priceNote: priceNote || null, // Client's reason for custom price
        negotiationHistory: isCustomOffer ? [{
          type: 'client_offer',
          amount: offeredPrice,
          note: priceNote,
          timestamp: new Date().toISOString(),
          by: 'client',
        }] : [],
        // Include client's location data for the service address
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
        mediaFiles: mediaFiles.map(f => ({
          uri: f.uri,
          type: f.type,
          isVideo: f.isVideo,
        })),
      };

      const createdJob = await jobService.createJobRequest(jobData);
      
      // Send SMS/Email confirmation to client (async, don't wait)
      smsEmailService.sendBookingConfirmation(
        {...jobData, id: createdJob?.id || 'N/A'},
        user,
        {name: displayProviderName || 'Provider'}
      ).catch(err => console.log('SMS/Email notification failed:', err));
      
      // Send booking confirmation email via EmailJS (async)
      if (user?.email) {
        sendBookingConfirmation(user.email, jobData.clientName, {
          serviceCategory: jobData.serviceCategory,
          title: jobData.title,
          scheduledDate: jobData.scheduledDate,
          scheduledTime: jobData.scheduledTime,
          providerName: displayProviderName || 'Provider',
          totalAmount: totalAmount,
        }).catch(err => console.log('Email notification failed:', err));
      }
      
      Alert.alert(
        'Success',
        isCustomOffer 
          ? 'Your offer has been sent to the provider. They will review and respond.'
          : 'Service request submitted successfully. You will receive a confirmation SMS/Email.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Bookings'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create job request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
      <View style={{flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB', backgroundColor: isDark ? theme.colors.card : '#FFFFFF'}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={[globalStyles.heading3, {marginLeft: 16, flex: 1, color: isDark ? theme.colors.text : '#1F2937'}]}>
          Book Service
        </Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
        {displayProviderName && (
          <View style={{
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
            
            {/* Pricing Breakdown */}
            {(provider?.fixedPrice || provider?.hourlyRate) && (
              <View style={{
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: isDark ? '#065F46' : '#BBF7D0',
              }}>
                <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 12}}>
                  Price Breakdown
                </Text>
                
                {/* Provider's Fixed Price */}
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                  <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563'}}>
                    Provider's Price ({provider?.priceType === 'per_hire' ? 'per hire' : 'per job'})
                  </Text>
                  <Text style={{fontSize: 14, fontWeight: '500', color: isDark ? theme.colors.text : '#1F2937'}}>
                    ₱{providerFixedPrice.toLocaleString()}
                  </Text>
                </View>

                {/* Custom Price Offer Toggle */}
                <TouchableOpacity
                  onPress={() => setUseCustomPrice(!useCustomPrice)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: useCustomPrice ? (isDark ? '#78350F' : '#FEF3C7') : (isDark ? theme.colors.card : '#F3F4F6'),
                    padding: 12,
                    borderRadius: 8,
                    marginVertical: 12,
                    borderWidth: 1,
                    borderColor: useCustomPrice ? '#F59E0B' : (isDark ? theme.colors.border : '#E5E7EB'),
                  }}>
                  <Icon 
                    name={useCustomPrice ? 'checkbox' : 'square-outline'} 
                    size={20} 
                    color={useCustomPrice ? '#F59E0B' : (isDark ? theme.colors.textSecondary : '#6B7280')} 
                  />
                  <View style={{marginLeft: 10, flex: 1}}>
                    <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>
                      Make a different offer
                    </Text>
                    <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>
                      For small jobs or budget negotiation
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Custom Price Input */}
                {useCustomPrice && (
                  <View style={{marginBottom: 12}}>
                    <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 6}}>
                      Your Offer Price (₱)
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#F59E0B',
                      paddingHorizontal: 12,
                    }}>
                      <Text style={{fontSize: 16, color: '#F59E0B', fontWeight: '600'}}>₱</Text>
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 16,
                          color: isDark ? theme.colors.text : '#1F2937',
                          paddingVertical: 10,
                          paddingHorizontal: 8,
                        }}
                        placeholder="Enter your offer"
                        placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
                        keyboardType="numeric"
                        value={customPrice}
                        onChangeText={setCustomPrice}
                      />
                    </View>
                    <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#374151', marginTop: 10, marginBottom: 6}}>
                      Reason for offer (optional)
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isDark ? theme.colors.border : '#E5E7EB',
                        padding: 10,
                        fontSize: 14,
                        color: isDark ? theme.colors.text : '#1F2937',
                      }}
                      placeholder="e.g., Small job, just a quick fix..."
                      placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
                      value={priceNote}
                      onChangeText={setPriceNote}
                    />
                  </View>
                )}

                {/* Calculated Totals */}
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                  <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563'}}>System Fee (5%)</Text>
                  <Text style={{fontSize: 14, fontWeight: '500', color: isDark ? theme.colors.text : '#1F2937'}}>
                    ₱{(((useCustomPrice && customPrice ? parseFloat(customPrice) : providerFixedPrice) || 0) * 0.05).toLocaleString()}
                  </Text>
                </View>
                <View style={{
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? '#065F46' : '#BBF7D0',
                }}>
                  <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937'}}>Total</Text>
                  <Text style={{fontSize: 16, fontWeight: '700', color: useCustomPrice ? '#F59E0B' : '#00B14F'}}>
                    ₱{(((useCustomPrice && customPrice ? parseFloat(customPrice) : providerFixedPrice) || 0) * 1.05).toLocaleString()}
                  </Text>
                </View>

                {useCustomPrice && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 12,
                  }}>
                    <Icon name="information-circle" size={18} color="#F59E0B" />
                    <Text style={{fontSize: 12, color: isDark ? '#FCD34D' : '#92400E', marginLeft: 8, flex: 1}}>
                      The provider can accept, counter, or decline your offer.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Only show category picker if not hiring a specific provider */}
        {!providerService && (
          <>
            <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8}}>
              Service Category *
            </Text>
            <View style={[authStyles.inputContainer, {marginBottom: 16}, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
              <Icon name="construct-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
              <Picker
                selectedValue={formData.serviceCategory}
                onValueChange={(value) => setFormData({...formData, serviceCategory: value})}
                style={{flex: 1, color: isDark ? theme.colors.text : '#1F2937'}}
                dropdownIconColor={isDark ? theme.colors.text : '#1F2937'}>
                <Picker.Item label="Select a service" value="" />
                {SERVICE_CATEGORIES.map((category) => (
                  <Picker.Item key={category.id} label={category.name} value={category.name} />
                ))}
              </Picker>
            </View>
          </>
        )}

        <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8}}>
          Service Title *
        </Text>
        <View style={[authStyles.inputContainer, {marginBottom: 16}, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
          <Icon name="create-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && {color: theme.colors.text}]}
            placeholder="e.g., Fix broken outlet"
            placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
            value={formData.title}
            onChangeText={(text) => setFormData({...formData, title: text})}
          />
        </View>

        <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8}}>
          Description *
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
            height: 120,
            textAlignVertical: 'top',
            marginBottom: 16,
          }}
          placeholder="Describe the work needed..."
          placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
          multiline
          numberOfLines={6}
          value={formData.description}
          onChangeText={(text) => setFormData({...formData, description: text})}
        />

        {/* Photo/Video Upload Section */}
        <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8}}>
          Photos/Videos (Optional)
        </Text>
        <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', marginBottom: 12}}>
          Add up to 5 photos or videos to show the problem
        </Text>
        
        <View style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16}}>
          {/* Display uploaded media */}
          {mediaFiles.map((file, index) => (
            <View key={index} style={{
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
                <Image
                  source={{uri: file.uri}}
                  style={{width: '100%', height: '100%'}}
                  resizeMode="cover"
                />
              ) : (
                <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                  <Icon name="image-outline" size={24} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
                </View>
              )}
              {file.isVideo && (
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
          
          {/* Add Media Button */}
          {mediaFiles.length < 5 && (
            <TouchableOpacity
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: isDark ? theme.colors.border : '#E5E7EB',
                borderStyle: 'dashed',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isDark ? theme.colors.card : '#F9FAFB',
              }}
              onPress={handleAddMedia}>
              <Icon name="camera-outline" size={28} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
              <Text style={{fontSize: 10, color: isDark ? theme.colors.textSecondary : '#9CA3AF', marginTop: 4}}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8}}>
          Preferred Date (Optional)
        </Text>
        <TouchableOpacity 
          style={[authStyles.inputContainer, {marginBottom: 16}, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}
          onPress={() => setShowDatePicker(true)}>
          <Icon name="calendar-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
          <Text style={[authStyles.input, {paddingVertical: 14}, isDark && {color: theme.colors.text}, !formData.scheduledDate && {color: isDark ? theme.colors.textSecondary : '#9CA3AF'}]}>
            {formData.scheduledDate ? formatDate(formData.scheduledDate) : 'Select date'}
          </Text>
          <Icon name="chevron-down" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
        </TouchableOpacity>

        <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#374151', marginBottom: 8}}>
          Preferred Time (Optional)
        </Text>
        <TouchableOpacity 
          style={[authStyles.inputContainer, {marginBottom: 16}, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}
          onPress={() => setShowTimePicker(true)}>
          <Icon name="time-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
          <Text style={[authStyles.input, {paddingVertical: 14}, isDark && {color: theme.colors.text}, !formData.scheduledTime && {color: isDark ? theme.colors.textSecondary : '#9CA3AF'}]}>
            {formData.scheduledTime ? formatTime(formData.scheduledTime) : 'Select time'}
          </Text>
          <Icon name="chevron-down" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary, {marginTop: 24}]}
          onPress={handleSubmit}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>
              Submit Request
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <View style={{
            backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 30,
          }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB'}}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={{fontSize: 16, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{fontSize: 18, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>Select Date</Text>
              <TouchableOpacity onPress={() => {
                if (formData.scheduledDate) setShowDatePicker(false);
              }}>
                <Text style={{fontSize: 16, color: '#00B14F', fontWeight: '600'}}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={calendarDates}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{padding: 16}}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({item}) => {
                const dateInfo = formatCalendarDate(item);
                const isSelected = formData.scheduledDate && 
                  formData.scheduledDate.toDateString() === item.toDateString();
                const isToday = new Date().toDateString() === item.toDateString();
                
                return (
                  <TouchableOpacity
                    onPress={() => handleDateSelect(item)}
                    style={{
                      width: 70,
                      height: 90,
                      marginRight: 10,
                      borderRadius: 12,
                      backgroundColor: isSelected ? '#00B14F' : (isDark ? theme.colors.background : '#F3F4F6'),
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: isToday && !isSelected ? 2 : 0,
                      borderColor: '#00B14F',
                    }}>
                    <Text style={{fontSize: 12, color: isSelected ? '#FFFFFF' : (isDark ? theme.colors.textSecondary : '#6B7280')}}>
                      {dateInfo.day}
                    </Text>
                    <Text style={{fontSize: 24, fontWeight: '700', color: isSelected ? '#FFFFFF' : (isDark ? theme.colors.text : '#1F2937'), marginVertical: 4}}>
                      {dateInfo.date}
                    </Text>
                    <Text style={{fontSize: 12, color: isSelected ? '#FFFFFF' : (isDark ? theme.colors.textSecondary : '#6B7280')}}>
                      {dateInfo.month}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <View style={{
            backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '60%',
            paddingBottom: 30,
          }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB'}}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={{fontSize: 16, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{fontSize: 18, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>Select Time</Text>
              <TouchableOpacity onPress={() => {
                if (formData.scheduledTime) setShowTimePicker(false);
              }}>
                <Text style={{fontSize: 16, color: '#00B14F', fontWeight: '600'}}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={{padding: 16}}>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'}}>
                {timeSlots.map((time, index) => {
                  const isSelected = formData.scheduledTime && 
                    formData.scheduledTime.getHours() === time.getHours() &&
                    formData.scheduledTime.getMinutes() === time.getMinutes();
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleTimeSelect(time)}
                      style={{
                        width: '30%',
                        paddingVertical: 12,
                        marginBottom: 10,
                        borderRadius: 8,
                        backgroundColor: isSelected ? '#00B14F' : (isDark ? theme.colors.background : '#F3F4F6'),
                        alignItems: 'center',
                      }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: isSelected ? '600' : '400',
                        color: isSelected ? '#FFFFFF' : (isDark ? theme.colors.text : '#1F2937'),
                      }}>
                        {formatTime(time)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BookServiceScreen;
