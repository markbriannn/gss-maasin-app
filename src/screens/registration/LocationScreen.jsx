import {useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Picker} from '@react-native-picker/picker';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';
import {locationStyles as styles} from '../../css/profileStyles';
import {MAASIN_BARANGAYS} from '../../config/constants';
import locationService from '../../services/locationService';

const LocationScreen = ({navigation, route}) => {
  const mapRef = useRef(null);
  const [formData, setFormData] = useState({
    barangay: '',
    streetAddress: '',
    houseNumber: '',
    landmark: '',
    latitude: 10.1335,
    longitude: 124.8513,
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const geocodingAbortRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  // Find matching barangay from our list
  const findMatchingBarangay = (barangayName) => {
    if (!barangayName) return '';

    const normalizedName = barangayName.toLowerCase().trim();

    // Try exact match first
    const exactMatch = MAASIN_BARANGAYS.find((b) => b.toLowerCase() === normalizedName);
    if (exactMatch) return exactMatch;

    // Try partial match
    const partialMatch = MAASIN_BARANGAYS.find(
      (b) => normalizedName.includes(b.toLowerCase()) || b.toLowerCase().includes(normalizedName),
    );
    if (partialMatch) return partialMatch;

    // Try removing common prefixes/suffixes
    const cleanedName = normalizedName
      .replace(/^(brgy\.?|barangay)\s*/i, '')
      .replace(/,.*$/, '')
      .trim();

    const cleanMatch = MAASIN_BARANGAYS.find(
      (b) =>
        b.toLowerCase() === cleanedName ||
        cleanedName.includes(b.toLowerCase()) ||
        b.toLowerCase().includes(cleanedName),
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

      console.log(
        'Geocoding response:',
        JSON.stringify(data.results?.[0]?.address_components, null, 2),
      );

      if (data.results && data.results.length > 0) {
        let streetNumber = '';
        let route = '';
        let barangay = '';
        let neighborhood = '';
        let sublocality = '';

        // Check all results for barangay info
        for (const result of data.results) {
          const addressComponents = result.address_components;

          for (const component of addressComponents) {
            // Get street info
            if (component.types.includes('street_number')) {
              streetNumber = streetNumber || component.long_name;
            }
            if (component.types.includes('route')) {
              route = route || component.long_name;
            }

            // Try different types that might contain barangay
            if (
              component.types.includes('sublocality_level_1') ||
              component.types.includes('sublocality')
            ) {
              sublocality = sublocality || component.long_name;
            }
            if (component.types.includes('neighborhood')) {
              neighborhood = neighborhood || component.long_name;
            }
            if (
              component.types.includes('political') &&
              component.long_name.toLowerCase().includes('brgy')
            ) {
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
        const detectedBarangay =
          barangay ||
          findMatchingBarangay(sublocality) ||
          findMatchingBarangay(neighborhood) ||
          findMatchingBarangay(data.results[0].formatted_address);

        // Filter out "Unnamed Road" - let user fill it in manually
        const cleanStreetAddress = route && !route.toLowerCase().includes('unnamed') ? route : '';
        
        return {
          streetAddress: cleanStreetAddress,
          houseNumber: streetNumber || '',
          fullAddress: data.results[0].formatted_address,
          barangay: detectedBarangay,
          rawSublocality: sublocality,
          rawNeighborhood: neighborhood,
        };
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
        const {latitude, longitude} = location;

        // Update map region - removed setRegion since it's not defined
        // Animate map to new location
        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          1000,
        );

        // Get address and barangay from Google API
        const addressData = await getAddressFromCoordinates(latitude, longitude);

        const detectedBarangay = addressData?.barangay || '';

        setFormData({
          ...formData,
          latitude,
          longitude,
          barangay: detectedBarangay,
          streetAddress: addressData?.streetAddress || '',
          houseNumber: addressData?.houseNumber || '',
        });

        if (detectedBarangay) {
          Alert.alert(
            'Location Found',
            `Your location has been detected.\nBarangay: ${detectedBarangay}${
              addressData?.streetAddress ? `\nStreet: ${addressData.streetAddress}` : ''
            }\n\nPlease verify the barangay is correct.`,
            [{text: 'OK'}],
          );
        } else {
          Alert.alert(
            'Location Found',
            `Your location has been detected but we couldn't identify your barangay automatically.\n\nPlease select your barangay from the list below.`,
            [{text: 'OK'}],
          );
        }
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not get your current location. Please enable location services and try again.',
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Handle map press to set location
  const handleMapPress = async (event) => {
    // Ignore if already navigated
    if (hasNavigatedRef.current) return;
    
    const {latitude, longitude} = event.nativeEvent.coordinate;

    // Update coordinates immediately
    setFormData((prev) => ({
      ...prev,
      latitude,
      longitude,
    }));

    // Get address in background (don't block)
    setIsGeocoding(true);
    try {
      const addressData = await getAddressFromCoordinates(latitude, longitude);
      if (!geocodingAbortRef.current && !hasNavigatedRef.current) {
        setFormData((prev) => ({
          ...prev,
          barangay: addressData?.barangay || prev.barangay,
          streetAddress: addressData?.streetAddress || prev.streetAddress,
        }));
      }
    } finally {
      if (!hasNavigatedRef.current) {
        setIsGeocoding(false);
      }
    }
  };

  // Handle marker drag end
  const handleMarkerDragEnd = async (event) => {
    // Ignore if already navigated
    if (hasNavigatedRef.current) return;
    
    const {latitude, longitude} = event.nativeEvent.coordinate;

    // Update coordinates immediately
    setFormData((prev) => ({
      ...prev,
      latitude,
      longitude,
    }));

    // Get address in background (don't block)
    setIsGeocoding(true);
    try {
      const addressData = await getAddressFromCoordinates(latitude, longitude);
      if (!geocodingAbortRef.current && !hasNavigatedRef.current) {
        setFormData((prev) => ({
          ...prev,
          barangay: addressData?.barangay || prev.barangay,
          streetAddress: addressData?.streetAddress || prev.streetAddress,
        }));
      }
    } finally {
      if (!hasNavigatedRef.current) {
        setIsGeocoding(false);
      }
    }
  };

  const handleNext = () => {
    // Prevent any navigation if already navigated
    if (hasNavigatedRef.current) {
      console.log('[LocationScreen] Already navigated, ignoring');
      return;
    }

    // Validate required fields
    if (!formData.barangay || !formData.streetAddress) {
      Alert.alert('Required Fields', 'Please select your barangay and enter your street address.');
      return;
    }

    // Prevent navigation if still loading or geocoding
    if (isLoadingLocation || isGeocoding) {
      Alert.alert('Please Wait', 'Location is still being processed. Please wait a moment.');
      return;
    }

    // Abort any pending geocoding
    geocodingAbortRef.current = true;

    // Mark as navigated - this will persist until component remounts
    hasNavigatedRef.current = true;

    // Get existing params and merge with location data
    const params = {
      ...(route?.params || {}),
      location: {
        barangay: formData.barangay,
        streetAddress: formData.streetAddress,
        houseNumber: formData.houseNumber,
        landmark: formData.landmark,
        latitude: formData.latitude,
        longitude: formData.longitude,
      },
    };
    
    console.log('[LocationScreen] Navigating to Password with params:', params);
    console.log('[LocationScreen] Current navigation state:', JSON.stringify(navigation.getState()));
    
    // Use navigate with key to ensure unique screen
    navigation.navigate({
      name: 'Password',
      params,
      key: `Password-${Date.now()}`,
    });
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '70%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 5 of 7</Text>
        <Text style={authStyles.title}>Set Your Location</Text>
        <Text style={authStyles.subtitle}>Where are you located in Maasin City?</Text>

        {/* Use Current Location Button */}
        <TouchableOpacity
          style={styles.currentLocationButton}
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
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: 10.1335,
              longitude: 124.8513,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton={false}>
            <Marker
              coordinate={{
                latitude: formData.latitude,
                longitude: formData.longitude,
              }}
              draggable
              onDragEnd={handleMarkerDragEnd}>
              <View style={styles.markerContainer}>
                <Icon name="location" size={40} color="#00B14F" />
              </View>
            </Marker>
          </MapView>
          <Text style={styles.mapHint}>Tap on map or drag marker to set your exact location</Text>
        </View>

        {/* Barangay Picker */}
        <Text style={styles.fieldLabel}>Barangay *</Text>
        <View style={styles.pickerContainer}>
          <Icon name="location-outline" size={20} color="#6B7280" style={styles.fieldIcon} />
          <Picker
            selectedValue={formData.barangay}
            onValueChange={(value) => {
              if (!hasNavigatedRef.current) {
                setFormData({...formData, barangay: value});
              }
            }}
            style={styles.picker}>
            <Picker.Item label="Select Barangay" value="" />
            {MAASIN_BARANGAYS.map((barangay) => (
              <Picker.Item key={barangay} label={barangay} value={barangay} />
            ))}
          </Picker>
        </View>

        {/* Street Address */}
        <Text style={styles.fieldLabel}>Street Address *</Text>
        <View style={styles.inputContainer}>
          <Icon name="navigate-outline" size={20} color="#6B7280" style={styles.fieldIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Rizal Street, Purok 1"
            placeholderTextColor="#9CA3AF"
            value={formData.streetAddress}
            onChangeText={(text) => setFormData({...formData, streetAddress: text})}
          />
        </View>

        {/* House/Building Number */}
        <Text style={styles.fieldLabel}>House/Building Number</Text>
        <View style={styles.inputContainer}>
          <Icon name="home-outline" size={20} color="#6B7280" style={styles.fieldIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="e.g., 123, Bldg. A"
            placeholderTextColor="#9CA3AF"
            value={formData.houseNumber}
            onChangeText={(text) => setFormData({...formData, houseNumber: text})}
          />
        </View>

        {/* Landmark */}
        <Text style={styles.fieldLabel}>Nearby Landmark (Optional)</Text>
        <View style={styles.inputContainer}>
          <Icon name="flag-outline" size={20} color="#6B7280" style={styles.fieldIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Near Maasin Cathedral"
            placeholderTextColor="#9CA3AF"
            value={formData.landmark}
            onChangeText={(text) => setFormData({...formData, landmark: text})}
          />
        </View>

        {/* Address Summary */}
        {formData.barangay && formData.streetAddress && (
          <View style={styles.addressSummary}>
            <Icon name="checkmark-circle" size={20} color="#00B14F" />
            <Text style={styles.addressSummaryText}>
              {formData.houseNumber ? `${formData.houseNumber}, ` : ''}
              {formData.streetAddress}, {formData.barangay}, Maasin City
              {formData.landmark ? ` (Near ${formData.landmark})` : ''}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.continueButton,
            (!formData.barangay || !formData.streetAddress || isLoadingLocation || isGeocoding) && styles.continueButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!formData.barangay || !formData.streetAddress || isLoadingLocation || isGeocoding}>
          {isLoadingLocation || isGeocoding ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={[styles.continueButtonText, {marginLeft: 8}]}>
                {isLoadingLocation ? 'Getting location...' : 'Processing...'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <Icon name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LocationScreen;