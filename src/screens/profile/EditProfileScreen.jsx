import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Picker} from '@react-native-picker/picker';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {authStyles} from '../../css/authStyles';
import {editProfileStyles as styles} from '../../css/profileStyles';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {MAASIN_BARANGAYS, APP_CONFIG} from '../../config/constants';
import locationService from '../../services/locationService';
import {db} from '../../config/firebase';
import {doc, updateDoc} from 'firebase/firestore';
import {uploadProfilePhoto as uploadToCloudinary} from '../../services/imageUploadService';

const EditProfileScreen = ({navigation}) => {
  const {user, updateUser} = useAuth();
  const {isDark, theme} = useTheme();
  const mapRef = useRef(null);
  const isProvider = user?.role === 'PROVIDER';
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || user?.phone || '',
    // Location fields
    barangay: user?.location?.barangay || user?.barangay || '',
    streetAddress: user?.location?.streetAddress || user?.streetAddress || '',
    houseNumber: user?.location?.houseNumber || user?.houseNumber || '',
    landmark: user?.location?.landmark || user?.landmark || '',
    latitude: user?.location?.latitude || user?.latitude || 10.1335,
    longitude: user?.location?.longitude || user?.longitude || 124.8513,
    // Provider-specific fields
    fixedPrice: user?.fixedPrice || user?.hourlyRate || '',
    priceType: user?.priceType || 'per_job',
    experience: user?.experience || '',
  });
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || user?.photo || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [region, setRegion] = useState({
    latitude: formData.latitude,
    longitude: formData.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const handleChangePhoto = () => {
    Alert.alert('Change Profile Photo', 'Choose an option', [
      {text: 'Take Photo', onPress: handleTakePhoto},
      {text: 'Choose from Gallery', onPress: handleChooseFromGallery},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleTakePhoto = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'We need access to your camera to take a profile photo.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Camera permission is required.');
          return;
        }
      }

      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.7,
        maxWidth: 500,
        maxHeight: 500,
      });

      if (result?.assets && result.assets.length > 0) {
        await uploadProfilePhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 500,
        maxHeight: 500,
      });

      if (result?.assets && result.assets.length > 0) {
        await uploadProfilePhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const uploadProfilePhoto = async (photo) => {
    setIsUploadingPhoto(true);
    try {
      const userId = user?.uid || user?.id;
      if (!userId) throw new Error('User not found');

      // Upload to Cloudinary (free tier - no Firebase Storage needed)
      const downloadUrl = await uploadToCloudinary(photo.uri, userId);

      // Update Firestore with the new photo URL
      await updateDoc(doc(db, 'users', userId), {
        profilePhoto: downloadUrl,
        photo: downloadUrl,
      });

      setProfilePhoto(downloadUrl);
      Alert.alert('Success', 'Profile photo updated!');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Could not upload photo. Please check your internet connection and try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const useCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        const {latitude, longitude} = location;
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
        
        // Get address from coordinates (including barangay)
        const addressData = await getAddressFromCoordinates(latitude, longitude);
        
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          barangay: addressData?.barangay || prev.barangay,
          streetAddress: addressData?.streetAddress || prev.streetAddress,
          houseNumber: addressData?.houseNumber || prev.houseNumber,
        }));
        
        // Show what was detected
        const detectedParts = [];
        if (addressData?.barangay) detectedParts.push(`Barangay: ${addressData.barangay}`);
        if (addressData?.streetAddress) detectedParts.push(`Street: ${addressData.streetAddress}`);
        if (addressData?.houseNumber) detectedParts.push(`House/Bldg: ${addressData.houseNumber}`);
        
        if (detectedParts.length > 0) {
          Alert.alert(
            'Location Found',
            `Your location has been detected:\n\n${detectedParts.join('\n')}\n\nPlease verify the information is correct.`,
            [{text: 'OK'}]
          );
        } else {
          Alert.alert(
            'Location Updated',
            'Your GPS coordinates have been saved. Please fill in your address details manually.',
            [{text: 'OK'}]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get your location. Please enable location services and try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Find matching barangay from our list
  const findMatchingBarangay = (barangayName) => {
    if (!barangayName) return '';
    
    const normalizedName = barangayName.toLowerCase().trim();
    
    // Try exact match first
    const exactMatch = MAASIN_BARANGAYS.find(
      b => b.toLowerCase() === normalizedName
    );
    if (exactMatch) return exactMatch;
    
    // Try partial match
    const partialMatch = MAASIN_BARANGAYS.find(
      b => normalizedName.includes(b.toLowerCase()) || b.toLowerCase().includes(normalizedName)
    );
    if (partialMatch) return partialMatch;
    
    // Try removing common prefixes/suffixes
    const cleanedName = normalizedName
      .replace(/^(brgy\.?|barangay)\s*/i, '')
      .replace(/,.*$/, '')
      .trim();
    
    const cleanMatch = MAASIN_BARANGAYS.find(
      b => b.toLowerCase() === cleanedName || 
           cleanedName.includes(b.toLowerCase()) || 
           b.toLowerCase().includes(cleanedName)
    );
    
    return cleanMatch || '';
  };

  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyC-qP1WOx8JSM6DfcAkIEmKQ8AQiAtiL9k&language=en`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        let streetNumber = '';
        let route = '';
        let barangay = '';
        let neighborhood = '';
        let sublocality = '';
        
        // Check all results for address info
        for (const result of data.results) {
          for (const component of result.address_components) {
            // Get street info
            if (component.types.includes('street_number')) {
              streetNumber = streetNumber || component.long_name;
            }
            if (component.types.includes('route')) {
              route = route || component.long_name;
            }
            
            // Try different types that might contain barangay
            if (component.types.includes('sublocality_level_1') || 
                component.types.includes('sublocality')) {
              sublocality = sublocality || component.long_name;
            }
            if (component.types.includes('neighborhood')) {
              neighborhood = neighborhood || component.long_name;
            }
            if (component.types.includes('political') && 
                component.long_name.toLowerCase().includes('brgy')) {
              barangay = barangay || component.long_name;
            }
            
            // Check if the component name matches any barangay
            const matchedBarangay = findMatchingBarangay(component.long_name);
            if (matchedBarangay && !barangay) {
              barangay = matchedBarangay;
            }
          }
        }
        
        // Try to find barangay from various fields
        const detectedBarangay = barangay || 
          findMatchingBarangay(sublocality) || 
          findMatchingBarangay(neighborhood) ||
          findMatchingBarangay(data.results[0].formatted_address);
        
        return {
          streetAddress: route || '',
          houseNumber: streetNumber || '',
          barangay: detectedBarangay || '',
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const userId = user?.uid || user?.id;
      if (userId) {
        // Base update data
        const updateData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phoneNumber,
          phoneNumber: formData.phoneNumber,
          barangay: formData.barangay,
          streetAddress: formData.streetAddress,
          houseNumber: formData.houseNumber,
          landmark: formData.landmark,
          latitude: formData.latitude,
          longitude: formData.longitude,
          location: {
            barangay: formData.barangay,
            streetAddress: formData.streetAddress,
            houseNumber: formData.houseNumber,
            landmark: formData.landmark,
            latitude: formData.latitude,
            longitude: formData.longitude,
          },
        };
        
        // Add provider-specific fields
        if (isProvider) {
          updateData.fixedPrice = parseFloat(formData.fixedPrice) || 0;
          updateData.priceType = formData.priceType;
          updateData.experience = formData.experience;
        }
        
        // Remove undefined fields (Firestore rejects undefined)
        Object.keys(updateData).forEach((k) => {
          if (typeof updateData[k] === 'undefined') delete updateData[k];
        });

        // Update in Firestore
        await updateDoc(doc(db, 'users', userId), updateData);
      }
      
      await updateUser({
        ...formData,
        location: {
          barangay: formData.barangay,
          streetAddress: formData.streetAddress,
          houseNumber: formData.houseNumber,
          landmark: formData.landmark,
          latitude: formData.latitude,
          longitude: formData.longitude,
        },
        ...(isProvider && {
          fixedPrice: parseFloat(formData.fixedPrice) || 0,
          priceType: formData.priceType,
          experience: formData.experience,
        }),
      });
      
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Format full address for display
  const getFullAddress = () => {
    const parts = [];
    if (formData.houseNumber) parts.push(formData.houseNumber);
    if (formData.streetAddress) parts.push(formData.streetAddress);
    if (formData.barangay) parts.push(formData.barangay);
    parts.push('Maasin City');
    if (formData.landmark) parts.push(`(Near ${formData.landmark})`);
    return parts.join(', ');
  };

  return (
    <SafeAreaView style={[authStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
      <View style={[styles.header, isDark && {backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && {color: theme.colors.text}]}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          <Text style={styles.saveButton}>
            {isLoading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity onPress={handleChangePhoto} disabled={isUploadingPhoto}>
            <View style={styles.photoContainer}>
              {isUploadingPhoto ? (
                <ActivityIndicator size="large" color="#00B14F" />
              ) : profilePhoto ? (
                <Image source={{uri: profilePhoto}} style={styles.profileImage} />
              ) : (
                <Icon name="person" size={50} color="#9CA3AF" />
              )}
              <View style={styles.cameraIconContainer}>
                <Icon name="camera" size={16} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleChangePhoto} disabled={isUploadingPhoto}>
            <Text style={styles.changePhotoText}>
              {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Personal Info Section */}
        <Text style={[styles.sectionTitle, isDark && {color: theme.colors.text}]}>Personal Information</Text>
        
        <View style={[authStyles.inputContainer, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
          <Icon name="person-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && {color: theme.colors.text}]}
            placeholder="First Name"
            placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
            value={formData.firstName}
            onChangeText={(text) => setFormData({...formData, firstName: text})}
          />
        </View>

        <View style={[authStyles.inputContainer, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
          <Icon name="person-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && {color: theme.colors.text}]}
            placeholder="Last Name"
            placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
            value={formData.lastName}
            onChangeText={(text) => setFormData({...formData, lastName: text})}
          />
        </View>

        <View style={[authStyles.inputContainer, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
          <Icon name="mail-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && {color: theme.colors.text}]}
            placeholder="Email"
            placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
          />
        </View>

        <View style={[authStyles.inputContainer, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
          <Icon name="call-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && {color: theme.colors.text}]}
            placeholder="Phone Number"
            placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
            keyboardType="phone-pad"
            value={formData.phoneNumber}
            onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
          />
        </View>

        {/* Provider Pricing Section - Only show for providers */}
        {isProvider && (
          <>
            <Text style={[styles.sectionTitle, isDark && {color: theme.colors.text}]}>Service Pricing</Text>
            
            {/* Fixed Price Input */}
            <Text style={[styles.fieldLabel, isDark && {color: theme.colors.textSecondary}]}>Service Price (₱)</Text>
            <View style={[authStyles.inputContainer, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
              <Icon name="cash-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
              <TextInput
                style={[authStyles.input, isDark && {color: theme.colors.text}]}
                placeholder="e.g., 500"
                placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
                keyboardType="numeric"
                value={String(formData.fixedPrice)}
                onChangeText={(text) => setFormData({...formData, fixedPrice: text.replace(/[^0-9.]/g, '')})}
              />
            </View>

            {/* Price Type Picker */}
            <Text style={[styles.fieldLabel, isDark && {color: theme.colors.textSecondary}]}>Price Type</Text>
            <View style={[styles.pickerContainer, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
              <Icon name="pricetag-outline" size={20} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
              <Picker
                selectedValue={formData.priceType}
                onValueChange={(value) => setFormData({...formData, priceType: value})}
                style={[styles.picker, isDark && {color: theme.colors.text}]}
                dropdownIconColor={isDark ? theme.colors.text : '#1F2937'}>
                <Picker.Item label="Per Job (fixed total)" value="per_job" />
                <Picker.Item label="Per Hire (per session)" value="per_hire" />
              </Picker>
            </View>

            {/* Experience Input */}
            <Text style={[styles.fieldLabel, isDark && {color: theme.colors.textSecondary}]}>Years of Experience</Text>
            <View style={[authStyles.inputContainer, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
              <Icon name="ribbon-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
              <TextInput
                style={[authStyles.input, isDark && {color: theme.colors.text}]}
                placeholder="e.g., 3 years"
                placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
                value={formData.experience}
                onChangeText={(text) => setFormData({...formData, experience: text})}
              />
            </View>

            {/* Pricing Info */}
            <View style={[styles.pricingInfoBox, isDark && {backgroundColor: theme.colors.card}]}>
              <Icon name="information-circle" size={20} color="#3B82F6" />
              <Text style={[styles.pricingInfoText, isDark && {color: theme.colors.textSecondary}]}>
                Clients will see your price displayed as "{APP_CONFIG.CURRENCY_SYMBOL}{formData.fixedPrice || '0'} {formData.priceType === 'per_job' ? 'per job' : 'per hire'}". A {APP_CONFIG.SERVICE_FEE_PERCENTAGE}% system fee will be added when clients book your service.
              </Text>
            </View>
          </>
        )}

        {/* Location Section */}
        <Text style={[styles.sectionTitle, isDark && {color: theme.colors.text}]}>Location</Text>

        {/* Use Current Location Button */}
        <TouchableOpacity 
          style={[styles.currentLocationButton, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}
          onPress={useCurrentLocation}
          disabled={isLoadingLocation}>
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color="#00B14F" />
          ) : (
            <>
              <Icon name="locate" size={20} color="#00B14F" />
              <Text style={styles.currentLocationText}>Use My Current Location</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Map */}
        <View style={[styles.mapContainer, isDark && {borderColor: theme.colors.border}]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            onRegionChangeComplete={setRegion}
            showsUserLocation>
            <Marker
              coordinate={{
                latitude: formData.latitude,
                longitude: formData.longitude,
              }}
              draggable
              onDragEnd={(e) => {
                const {latitude, longitude} = e.nativeEvent.coordinate;
                setFormData(prev => ({...prev, latitude, longitude}));
              }}>
              <Icon name="location" size={40} color="#00B14F" />
            </Marker>
          </MapView>
        </View>

        {/* Barangay Picker */}
        <Text style={[styles.fieldLabel, isDark && {color: theme.colors.textSecondary}]}>Barangay</Text>
        <View style={[styles.pickerContainer, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
          <Icon name="location-outline" size={20} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
          <Picker
            selectedValue={formData.barangay}
            onValueChange={(value) => setFormData({...formData, barangay: value})}
            style={[styles.picker, isDark && {color: theme.colors.text}]}
            dropdownIconColor={isDark ? theme.colors.text : '#1F2937'}>
            <Picker.Item label="Select Barangay" value="" />
            {MAASIN_BARANGAYS.map((barangay) => (
              <Picker.Item key={barangay} label={barangay} value={barangay} />
            ))}
          </Picker>
        </View>

        {/* Street Address */}
        <Text style={[styles.fieldLabel, isDark && {color: theme.colors.textSecondary}]}>Street Address</Text>
        <View style={[authStyles.inputContainer, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
          <Icon name="navigate-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && {color: theme.colors.text}]}
            placeholder="e.g., Rizal Street, Purok 1"
            placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
            value={formData.streetAddress}
            onChangeText={(text) => setFormData({...formData, streetAddress: text})}
          />
        </View>

        {/* House/Building Number */}
        <Text style={[styles.fieldLabel, isDark && {color: theme.colors.textSecondary}]}>House/Building Number</Text>
        <View style={[authStyles.inputContainer, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
          <Icon name="home-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && {color: theme.colors.text}]}
            placeholder="e.g., 123, Bldg. A"
            placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
            value={formData.houseNumber}
            onChangeText={(text) => setFormData({...formData, houseNumber: text})}
          />
        </View>

        {/* Landmark */}
        <Text style={[styles.fieldLabel, isDark && {color: theme.colors.textSecondary}]}>Nearby Landmark (Optional)</Text>
        <View style={[authStyles.inputContainer, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
          <Icon name="flag-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={authStyles.inputIcon} />
          <TextInput
            style={[authStyles.input, isDark && {color: theme.colors.text}]}
            placeholder="e.g., Near Maasin Cathedral"
            placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
            value={formData.landmark}
            onChangeText={(text) => setFormData({...formData, landmark: text})}
          />
        </View>

        {/* Address Preview */}
        {(formData.barangay || formData.streetAddress) && (
          <View style={[styles.addressPreview, isDark && {backgroundColor: theme.colors.card}]}>
            <Icon name="checkmark-circle" size={20} color="#00B14F" />
            <Text style={[styles.addressPreviewText, isDark && {color: theme.colors.text}]}>{getFullAddress()}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;

