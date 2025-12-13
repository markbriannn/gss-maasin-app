import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
} from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import {SERVICE_CATEGORIES} from '../../config/constants';
import locationService from '../../services/locationService';
import {mapStyles} from '../../css/mapStyles';
import {globalStyles} from '../../css/globalStyles';
import {db} from '../../config/firebase';
import {collection, query, where, getDocs} from 'firebase/firestore';
import {useNotifications} from '../../context/NotificationContext';
import {useTheme} from '../../context/ThemeContext';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const ClientHomeScreen = ({navigation}) => {
  const {unreadCount} = useNotifications();
  const {isDark, theme} = useTheme();
  const [region, setRegion] = useState({
    latitude: 10.1335,
    longitude: 124.8513,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [providers, setProviders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  // Reload providers when category changes
  useEffect(() => {
    if (userLocation) {
      loadNearbyProviders(userLocation);
    }
  }, [selectedCategory]);

  // Filter providers based on search query - memoized to prevent unnecessary re-renders
  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        provider.name?.toLowerCase().includes(q) ||
        provider.serviceCategory?.toLowerCase().includes(q) ||
        provider.barangay?.toLowerCase().includes(q) ||
        provider.bio?.toLowerCase().includes(q)
      );
    });
  }, [providers, searchQuery]);

  const initializeScreen = async () => {
    setIsLoading(true);
    try {
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);
      setRegion((prev) => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
      // Load providers after getting location
      await loadNearbyProviders(location);
    } catch (error) {
      console.error('Error initializing:', error);
      // Still try to load providers even without location
      await loadNearbyProviders(null);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);
      setRegion((prev) => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
      return location;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  const loadNearbyProviders = async (currentLocation) => {
    setIsLoading(true);
    try {
      // Fetch all providers from Firebase, then filter by status
      const providersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'PROVIDER')
      );
      
      const querySnapshot = await getDocs(providersQuery);
      const providersList = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Check if provider is approved (check both status fields)
        const isApproved = data.providerStatus === 'approved' || data.status === 'approved';
        if (!isApproved) {
          return;
        }
        
        // Filter by category if selected
        if (selectedCategory && data.serviceCategory !== selectedCategory) {
          return;
        }
        
        // Calculate distance if user location is available and provider has coordinates
        let distance = null;
        const providerLat = data.latitude;
        const providerLng = data.longitude;
        
        if (currentLocation && providerLat && providerLng) {
          distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            providerLat,
            providerLng
          );
        }
        
        providersList.push({
          id: doc.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Provider',
          email: data.email,
          phone: data.phone,
          serviceCategory: data.serviceCategory,
          latitude: providerLat || (currentLocation ? currentLocation.latitude + (Math.random() - 0.5) * 0.02 : region.latitude),
          longitude: providerLng || (currentLocation ? currentLocation.longitude + (Math.random() - 0.5) * 0.02 : region.longitude),
          rating: data.rating || null,
          reviewCount: data.reviewCount || 0,
          distance: distance !== null ? distance.toFixed(1) : null,
          hasRealLocation: !!(providerLat && providerLng),
          // New pricing fields
          priceType: data.priceType || 'per_job',
          fixedPrice: data.fixedPrice || 0,
          // Legacy support
          hourlyRate: data.hourlyRate || data.fixedPrice || 200,
          isOnline: data.isOnline || false,
          bio: data.bio || '',
          ...data,
        });
      });
      
      // Sort by distance (providers without distance go to end)
      providersList.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return parseFloat(a.distance) - parseFloat(b.distance);
      });
      
      setProviders(providersList);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate distance between two coordinates in km
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  const handleProviderPress = useCallback((provider) => {
    navigation.navigate('ProviderProfile', {providerId: provider.id});
  }, [navigation]);

  const handleMyLocation = () => {
    if (userLocation) {
      setRegion({
        ...region,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });
    }
  };

  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isSearchExpanded) {
      // Collapse search
      setIsSearchExpanded(false);
      setSearchQuery('');
    } else {
      // Expand search
      setIsSearchExpanded(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const closeSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchExpanded(false);
    setSearchQuery('');
  };

  return (
    <SafeAreaView style={mapStyles.container} edges={['top']}>
      <MapView
        style={mapStyles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}>

        {filteredProviders.map((provider) => (
          <Marker
            key={provider.id}
            coordinate={{
              latitude: provider.latitude,
              longitude: provider.longitude,
            }}
            tracksViewChanges={false}
            onPress={() => handleProviderPress(provider)}>
            <View style={mapStyles.providerMarker}>
              <Icon name="person" size={24} color="#FFFFFF" />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Expandable Search */}
      <View style={{position: 'absolute', top: 8, left: 16, zIndex: 10}}>
        <View style={{
          width: isSearchExpanded ? SCREEN_WIDTH - 90 : 48,
          height: 48,
          backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
          borderRadius: 24,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 5,
          overflow: 'hidden',
        }}>
          <TouchableOpacity onPress={toggleSearch} style={{padding: 2}}>
            <Icon name="search" size={22} color="#00B14F" />
          </TouchableOpacity>
          {isSearchExpanded && (
            <>
              <TextInput
                ref={searchInputRef}
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: isDark ? theme.colors.text : '#1F2937',
                  marginLeft: 10,
                  paddingVertical: 0,
                }}
                placeholder="Search providers..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={closeSearch} style={{padding: 4}}>
                <Icon name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={mapStyles.categoryChipsContainer} pointerEvents="box-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={mapStyles.categoryChipsScroll}>
          {SERVICE_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                mapStyles.categoryChip,
                selectedCategory === category.id && mapStyles.categoryChipActive,
              ]}
              onPress={() => handleCategorySelect(category.id)}>
              <Icon
                name={category.icon}
                size={16}
                color={
                  selectedCategory === category.id ? '#FFFFFF' : category.color
                }
                style={mapStyles.categoryChipIcon}
              />
              <Text
                style={[
                  mapStyles.categoryChipText,
                  selectedCategory === category.id &&
                    mapStyles.categoryChipTextActive,
                ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[mapStyles.bottomPanel, isDark && {backgroundColor: theme.colors.card}]}>
        <View style={mapStyles.panelHandle} />
        <View style={mapStyles.panelContent}>
          <Text style={[mapStyles.panelTitle, isDark && {color: theme.colors.text}]}>Find a Provider</Text>
          
          {isLoading ? (
            <ActivityIndicator size="large" color="#00B14F" />
          ) : filteredProviders.length > 0 ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredProviders.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={[mapStyles.providerCard, isDark && {backgroundColor: theme.colors.background, borderColor: theme.colors.border}]}
                  onPress={() => handleProviderPress(provider)}>
                  <View style={[mapStyles.providerPhoto, isDark && {backgroundColor: theme.colors.border}]}>
                    <Icon name="person" size={32} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  </View>
                  <View style={mapStyles.providerInfo}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[mapStyles.providerName, isDark && {color: theme.colors.text}]}>{provider.name}</Text>
                      {(provider.status === 'approved' || provider.providerStatus === 'approved') && (
                        <View style={{
                          backgroundColor: '#3B82F6',
                          borderRadius: 8,
                          paddingHorizontal: 5,
                          paddingVertical: 2,
                          marginLeft: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}>
                          <Icon name="checkmark-circle" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <View style={mapStyles.providerRating}>
                      <Icon name="star" size={16} color={provider.rating ? "#F59E0B" : "#D1D5DB"} />
                      <Text style={mapStyles.providerRatingText}>
                        {provider.rating ? `${provider.rating.toFixed(1)} (${provider.reviewCount} reviews)` : 'New Provider'}
                      </Text>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                      <Icon name="location-outline" size={14} color="#6B7280" />
                      <Text style={mapStyles.providerDistance}>
                        {provider.barangay 
                          ? `Brgy. ${provider.barangay}${provider.distance ? ` • ${provider.distance} km` : ''}`
                          : provider.distance 
                            ? `${provider.distance} km away`
                            : 'Nearby'
                        }
                      </Text>
                    </View>
                  </View>
                  <View style={mapStyles.providerActions}>
                    <TouchableOpacity 
                      style={mapStyles.viewProfileButton}
                      onPress={() => navigation.navigate('ProviderProfile', {
                        providerId: provider.id,
                        provider: provider
                      })}>
                      <Text style={mapStyles.viewProfileButtonText}>
                        View Profile
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={mapStyles.hireButton}
                      onPress={() => navigation.navigate('HireProvider', {
                        providerId: provider.id,
                        provider: provider
                      })}>
                      <Text style={mapStyles.hireButtonText}>Hire Now</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={globalStyles.centerContainer}>
              <Icon name="search-outline" size={48} color="#D1D5DB" />
              <Text style={[globalStyles.bodyMedium, {marginTop: 12, textAlign: 'center'}]}>
                {searchQuery ? `No providers found for "${searchQuery}"` : 'No providers found in your area'}
              </Text>
              {searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{marginTop: 8}}>
                  <Text style={{color: '#00B14F', fontWeight: '600'}}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={[mapStyles.floatingButtonContainer, mapStyles.myLocationButton]} pointerEvents="box-none">
        <TouchableOpacity
          style={mapStyles.floatingButton}
          onPress={handleMyLocation}>
          <Icon name="locate" size={24} color="#00B14F" />
        </TouchableOpacity>
      </View>

      <View style={[mapStyles.floatingButtonContainer, mapStyles.notificationButton]} pointerEvents="box-none">
        <TouchableOpacity 
          style={mapStyles.floatingButton}
          onPress={() => navigation.navigate('Notifications')}>
          <Icon name="notifications" size={24} color="#6B7280" />
          {unreadCount > 0 && (
            <View style={mapStyles.notificationBadge}>
              <Text style={mapStyles.notificationBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ClientHomeScreen;
