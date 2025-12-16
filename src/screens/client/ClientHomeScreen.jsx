import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  RefreshControl,
  Animated,
  PanResponder,
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
import {collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDocs} from 'firebase/firestore';
import {useNotifications} from '../../context/NotificationContext';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import FastImage from 'react-native-fast-image';
import {
  AnimatedCard,
  AnimatedListItem,
  AnimatedButton,
  PulsingDot,
  ProviderCardSkeleton,
} from '../../components/animations';
// Badges shown in provider profile, not in compact card view

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Bottom sheet heights
const PANEL_MIN_HEIGHT = 180;
const PANEL_MID_HEIGHT = SCREEN_HEIGHT * 0.45;
const PANEL_MAX_HEIGHT = SCREEN_HEIGHT * 0.75;

const ClientHomeScreen = ({navigation}) => {
  const {unreadCount} = useNotifications();
  const {isDark, theme} = useTheme();
  const {user} = useAuth();
  const [favoriteIds, setFavoriteIds] = useState([]);
  
  // Bottom sheet animation
  const panelHeight = useRef(new Animated.Value(PANEL_MID_HEIGHT)).current;
  const lastGestureDy = useRef(0);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true); // true when panel is at mid or max height
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        panelHeight.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        // Invert dy because dragging up should increase height
        const newHeight = -gestureState.dy;
        panelHeight.setValue(newHeight);
        lastGestureDy.current = gestureState.dy;
      },
      onPanResponderRelease: (_, gestureState) => {
        panelHeight.flattenOffset();
        
        // Get current value
        let currentHeight = PANEL_MID_HEIGHT;
        panelHeight.addListener(({value}) => {
          currentHeight = value;
        });
        
        // Determine snap point based on velocity and direction
        let snapTo = PANEL_MID_HEIGHT;
        
        if (gestureState.vy < -0.5) {
          // Fast swipe up - go to max
          snapTo = PANEL_MAX_HEIGHT;
        } else if (gestureState.vy > 0.5) {
          // Fast swipe down - go to min
          snapTo = PANEL_MIN_HEIGHT;
        } else {
          // Slow drag - snap to nearest
          const draggedHeight = PANEL_MID_HEIGHT - gestureState.dy;
          if (draggedHeight > (PANEL_MID_HEIGHT + PANEL_MAX_HEIGHT) / 2) {
            snapTo = PANEL_MAX_HEIGHT;
          } else if (draggedHeight < (PANEL_MIN_HEIGHT + PANEL_MID_HEIGHT) / 2) {
            snapTo = PANEL_MIN_HEIGHT;
          } else {
            snapTo = PANEL_MID_HEIGHT;
          }
        }
        
        // Update panel expanded state
        setIsPanelExpanded(snapTo !== PANEL_MIN_HEIGHT);
        
        Animated.spring(panelHeight, {
          toValue: snapTo,
          useNativeDriver: false,
          tension: 50,
          friction: 10,
        }).start();
      },
    })
  ).current;
  
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
  const [refreshing, setRefreshing] = useState(false);
  const searchInputRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    initializeScreen();
    loadFavorites();
  }, []);

  // Load user's favorites
  const loadFavorites = async () => {
    const userId = user?.uid || user?.id;
    if (!userId) return;
    
    try {
      const favQuery = query(
        collection(db, 'favorites'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(favQuery);
      const ids = snapshot.docs.map(d => d.data().providerId);
      setFavoriteIds(ids);
    } catch (error) {
      console.log('Error loading favorites:', error);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (providerId) => {
    const userId = user?.uid || user?.id;
    if (!userId) return;
    
    const isFavorite = favoriteIds.includes(providerId);
    const favoriteDocId = `${userId}_${providerId}`;
    
    try {
      if (isFavorite) {
        // Remove from favorites
        await deleteDoc(doc(db, 'favorites', favoriteDocId));
        setFavoriteIds(prev => prev.filter(id => id !== providerId));
      } else {
        // Add to favorites
        await setDoc(doc(db, 'favorites', favoriteDocId), {
          userId,
          providerId,
          createdAt: new Date(),
        });
        setFavoriteIds(prev => [...prev, providerId]);
      }
    } catch (error) {
      console.log('Error toggling favorite:', error);
    }
  };

  // Real-time listener for providers
  useEffect(() => {
    // Query all providers
    const providersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'PROVIDER')
    );

    const unsubscribe = onSnapshot(providersQuery, (snapshot) => {
      const providersList = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Check if provider is approved and not suspended
        const isApproved = data.providerStatus === 'approved' || data.status === 'approved';
        const isSuspended = data.status === 'suspended' || data.providerStatus === 'suspended';
        if (!isApproved || isSuspended) return;
        
        // Only show online providers
        if (!data.isOnline) return;
        
        // Filter by category if selected
        if (selectedCategory && data.serviceCategory !== selectedCategory) return;
        
        // Calculate distance
        let distance = null;
        const providerLat = data.latitude;
        const providerLng = data.longitude;
        
        if (userLocation && providerLat && providerLng) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
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
          profilePhoto: data.profilePhoto,
          latitude: providerLat || (userLocation ? userLocation.latitude + (Math.random() - 0.5) * 0.02 : region.latitude),
          longitude: providerLng || (userLocation ? userLocation.longitude + (Math.random() - 0.5) * 0.02 : region.longitude),
          rating: data.rating || data.averageRating || null,
          reviewCount: data.reviewCount || 0,
          distance: distance !== null ? distance.toFixed(1) : null,
          hasRealLocation: !!(providerLat && providerLng),
          priceType: data.priceType || 'per_job',
          fixedPrice: data.fixedPrice || 0,
          hourlyRate: data.hourlyRate || data.fixedPrice || 200,
          isOnline: data.isOnline || false,
          bio: data.bio || '',
          barangay: data.barangay,
          ...data,
        });
      });
      
      // Sort by distance
      providersList.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return parseFloat(a.distance) - parseFloat(b.distance);
      });
      
      setProviders(providersList);
      setIsLoading(false);
    }, (error) => {
      console.log('Error listening to providers:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedCategory, userLocation]);

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
      // Use animateToRegion after a short delay to ensure map is ready
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }, 500);
        }
      }, 100);
    } catch (error) {
      console.error('Error initializing:', error);
      // Use default location
      setUserLocation(null);
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
    if (userLocation && mapRef.current) {
      // Use animateToRegion instead of setRegion to avoid re-render blinking
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 500);
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

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeScreen();
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView style={mapStyles.container} edges={['top']}>
      <MapView
        ref={mapRef}
        style={mapStyles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
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
            tracksViewChanges={!!provider.profilePhoto}
            onPress={() => handleProviderPress(provider)}>
            <View style={[mapStyles.providerMarker, {overflow: 'hidden'}]}>
              {provider.profilePhoto ? (
                <FastImage
                  source={{uri: provider.profilePhoto, priority: FastImage.priority.high}}
                  style={{width: 38, height: 38, borderRadius: 19}}
                  resizeMode={FastImage.resizeMode.cover}
                />
              ) : (
                <Icon name="person" size={24} color="#FFFFFF" />
              )}
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

      {/* My Location button - rendered BEFORE panel so it goes behind when panel expands */}
      <View style={[mapStyles.floatingButtonContainer, mapStyles.myLocationButton, {zIndex: 1}]} pointerEvents="box-none">
        <TouchableOpacity
          style={mapStyles.floatingButton}
          onPress={handleMyLocation}>
          <Icon name="locate" size={24} color="#00B14F" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[mapStyles.bottomPanel, isDark && {backgroundColor: theme.colors.card}, {height: panelHeight, zIndex: 2}]}>
        <View {...panResponder.panHandlers}>
          <View style={mapStyles.panelHandle} />
        </View>
        <View style={[mapStyles.panelContent, {flex: 1}]}>
          <Text style={[mapStyles.panelTitle, isDark && {color: theme.colors.text}]}>Find a Provider</Text>
          
          {isLoading ? (
            <View>
              <ProviderCardSkeleton />
              <ProviderCardSkeleton />
              <ProviderCardSkeleton />
            </View>
          ) : filteredProviders.length > 0 ? (
            <ScrollView 
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#00B14F']}
                  tintColor="#00B14F"
                />
              }>
              {filteredProviders.map((provider, index) => (
                <AnimatedListItem key={provider.id} index={index} delay={80}>
                  <AnimatedCard
                    style={[mapStyles.providerCard, isDark && {backgroundColor: theme.colors.background, borderColor: theme.colors.border}]}
                    onPress={() => handleProviderPress(provider)}>
                    <View style={{position: 'relative'}}>
                      <View style={[mapStyles.providerPhoto, isDark && {backgroundColor: theme.colors.border}]}>
                        {provider.profilePhoto ? (
                          <FastImage
                            source={{uri: provider.profilePhoto, priority: FastImage.priority.normal}}
                            style={{width: 56, height: 56, borderRadius: 28}}
                            resizeMode={FastImage.resizeMode.cover}
                          />
                        ) : (
                          <Icon name="person" size={32} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        )}
                        {/* Online indicator with pulse */}
                        {provider.isOnline && (
                          <View style={{position: 'absolute', bottom: 0, right: 0}}>
                            <PulsingDot size={12} color="#10B981" />
                          </View>
                        )}
                      </View>
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
                      {/* Service Category */}
                      {provider.serviceCategory && (
                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                          <View style={{
                            backgroundColor: '#D1FAE5',
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}>
                            <Text style={{fontSize: 11, color: '#059669', fontWeight: '600'}}>
                              {provider.serviceCategory}
                            </Text>
                          </View>
                        </View>
                      )}
                      <View style={mapStyles.providerRating}>
                        <Icon name="star" size={16} color={(provider.rating > 0 || provider.reviewCount > 0) ? "#F59E0B" : "#D1D5DB"} />
                        <Text style={mapStyles.providerRatingText}>
                          {(provider.rating > 0 || provider.reviewCount > 0) 
                            ? `${(provider.rating || 0).toFixed(1)} (${provider.reviewCount || 0} ${provider.reviewCount === 1 ? 'review' : 'reviews'})` 
                            : 'New Provider'}
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
                    <View style={{alignItems: 'flex-end'}}>
                      {/* Top row: Heart + View Profile */}
                      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                        <TouchableOpacity
                          style={{
                            padding: 6,
                            borderRadius: 8,
                            backgroundColor: isDark ? theme.colors.surface : '#F9FAFB',
                            borderWidth: 1,
                            borderColor: favoriteIds.includes(provider.id) ? '#EF4444' : (isDark ? theme.colors.border : '#E5E7EB'),
                            marginRight: 6,
                          }}
                          onPress={() => toggleFavorite(provider.id)}>
                          <Icon 
                            name={favoriteIds.includes(provider.id) ? 'heart' : 'heart-outline'} 
                            size={16} 
                            color={favoriteIds.includes(provider.id) ? '#EF4444' : '#9CA3AF'} 
                          />
                        </TouchableOpacity>
                        <AnimatedButton 
                          style={mapStyles.viewProfileButton}
                          onPress={() => navigation.navigate('ProviderProfile', {
                            providerId: provider.id,
                            provider: provider
                          })}>
                          <Text style={mapStyles.viewProfileButtonText}>
                            View Profile
                          </Text>
                        </AnimatedButton>
                      </View>
                      {/* Bottom row: Contact Us */}
                      <AnimatedButton 
                        style={[mapStyles.hireButton, {width: '100%'}]}
                        onPress={() => navigation.navigate('HireProvider', {
                          providerId: provider.id,
                          provider: provider
                        })}>
                        <Text style={mapStyles.hireButtonText}>Contact Us</Text>
                      </AnimatedButton>
                    </View>
                  </AnimatedCard>
                </AnimatedListItem>
              ))}
            </ScrollView>
          ) : (
            <View style={[globalStyles.centerContainer, {backgroundColor: 'transparent'}]}>
              <Icon name="search-outline" size={48} color={isDark ? theme.colors.textSecondary : '#D1D5DB'} />
              <Text style={[globalStyles.bodyMedium, {marginTop: 12, textAlign: 'center', color: isDark ? theme.colors.textSecondary : '#6B7280'}]}>
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
      </Animated.View>

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
