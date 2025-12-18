import {useState, useEffect, useMemo, useCallback, useRef} from 'react';
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
  Image,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import {SERVICE_CATEGORIES} from '../../config/constants';
import locationService from '../../services/locationService';
import {mapStyles} from '../../css/mapStyles';
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

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const PANEL_MIN_HEIGHT = 200;
const PANEL_MID_HEIGHT = SCREEN_HEIGHT * 0.5;
const PANEL_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

// Badge configurations
const BADGES = {
  elite: {icon: 'trophy', label: 'Elite Pro', color: '#F59E0B', bg: '#FEF3C7'},
  top: {icon: 'ribbon', label: 'Top Rated', color: '#8B5CF6', bg: '#EDE9FE'},
  trusted: {icon: 'shield-checkmark', label: 'Trusted', color: '#10B981', bg: '#D1FAE5'},
  rising: {icon: 'flame', label: 'Rising Star', color: '#EF4444', bg: '#FEE2E2'},
};

const getProviderBadge = (provider) => {
  if (provider.completedJobs >= 50) return BADGES.elite;
  if (provider.completedJobs >= 20) return BADGES.top;
  if (provider.rating >= 4.5 && provider.reviewCount >= 5) return BADGES.trusted;
  if (provider.rating >= 4.0) return BADGES.rising;
  return null;
};

const ClientHomeScreen = ({navigation}) => {
  const {unreadCount} = useNotifications();
  const {isDark, theme} = useTheme();
  const {user} = useAuth();
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [sortBy, setSortBy] = useState('recommended');
  const [showSortModal, setShowSortModal] = useState(false);
  
  // Bottom sheet animation
  const panelHeight = useRef(new Animated.Value(PANEL_MID_HEIGHT)).current;
  const panelOpacity = useRef(new Animated.Value(1)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => panelHeight.extractOffset(),
      onPanResponderMove: (_, gestureState) => panelHeight.setValue(-gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        panelHeight.flattenOffset();
        let snapTo = PANEL_MID_HEIGHT;
        if (gestureState.vy < -0.5) snapTo = PANEL_MAX_HEIGHT;
        else if (gestureState.vy > 0.5) snapTo = PANEL_MIN_HEIGHT;
        else {
          const draggedHeight = PANEL_MID_HEIGHT - gestureState.dy;
          if (draggedHeight > (PANEL_MID_HEIGHT + PANEL_MAX_HEIGHT) / 2) snapTo = PANEL_MAX_HEIGHT;
          else if (draggedHeight < (PANEL_MIN_HEIGHT + PANEL_MID_HEIGHT) / 2) snapTo = PANEL_MIN_HEIGHT;
        }
        Animated.spring(panelHeight, {toValue: snapTo, useNativeDriver: false, tension: 50, friction: 10}).start();
      },
    })
  ).current;
  
  const [region, setRegion] = useState({
    latitude: 10.1335, longitude: 124.8513, latitudeDelta: 0.0922, longitudeDelta: 0.0421,
  });
  const [providers, setProviders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const searchInputRef = useRef(null);
  const mapRef = useRef(null);
  const cardScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeScreen();
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const userId = user?.uid || user?.id;
    if (!userId) return;
    try {
      const favQuery = query(collection(db, 'favorites'), where('userId', '==', userId));
      const snapshot = await getDocs(favQuery);
      setFavoriteIds(snapshot.docs.map(d => d.data().providerId));
    } catch (error) {
      console.log('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (providerId) => {
    const userId = user?.uid || user?.id;
    if (!userId) return;
    const isFavorite = favoriteIds.includes(providerId);
    const favoriteDocId = `${userId}_${providerId}`;
    try {
      if (isFavorite) {
        await deleteDoc(doc(db, 'favorites', favoriteDocId));
        setFavoriteIds(prev => prev.filter(id => id !== providerId));
      } else {
        await setDoc(doc(db, 'favorites', favoriteDocId), {userId, providerId, createdAt: new Date()});
        setFavoriteIds(prev => [...prev, providerId]);
      }
    } catch (error) {
      console.log('Error toggling favorite:', error);
    }
  };

  // Real-time listener for providers
  useEffect(() => {
    let isMounted = true;
    const providersQuery = query(collection(db, 'users'), where('role', '==', 'PROVIDER'));

    const unsubscribe = onSnapshot(providersQuery, (snapshot) => {
      if (!isMounted) return;
      const providersList = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isApproved = data.providerStatus === 'approved' || data.status === 'approved';
        const isSuspended = data.status === 'suspended' || data.providerStatus === 'suspended';
        if (!isApproved || isSuspended) return;
        if (!data.isOnline) return;
        if (selectedCategory && data.serviceCategory !== selectedCategory) return;
        
        let distance = null;
        if (userLocation && data.latitude && data.longitude) {
          distance = calculateDistance(userLocation.latitude, userLocation.longitude, data.latitude, data.longitude);
        }
        
        providersList.push({
          id: docSnap.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Provider',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email,
          phone: data.phone,
          serviceCategory: data.serviceCategory,
          profilePhoto: data.profilePhoto,
          latitude: data.latitude || (userLocation ? userLocation.latitude + (Math.random() - 0.5) * 0.02 : region.latitude),
          longitude: data.longitude || (userLocation ? userLocation.longitude + (Math.random() - 0.5) * 0.02 : region.longitude),
          rating: data.rating || data.averageRating || 0,
          reviewCount: data.reviewCount || 0,
          distance: distance !== null ? distance.toFixed(1) : null,
          priceType: data.priceType || 'per_job',
          fixedPrice: data.fixedPrice || 0,
          hourlyRate: data.hourlyRate || data.fixedPrice || 200,
          isOnline: data.isOnline || false,
          bio: data.bio || '',
          barangay: data.barangay,
          completedJobs: data.completedJobs || 0,
          responseTime: data.responseTime || Math.floor(Math.random() * 10) + 2,
          status: data.status,
          providerStatus: data.providerStatus,
          ...data,
        });
      });
      
      // Sort providers
      providersList.sort((a, b) => {
        switch (sortBy) {
          case 'rating': return b.rating - a.rating;
          case 'price': return (a.fixedPrice || a.hourlyRate) - (b.fixedPrice || b.hourlyRate);
          case 'distance':
            if (!a.distance && !b.distance) return 0;
            if (!a.distance) return 1;
            if (!b.distance) return -1;
            return parseFloat(a.distance) - parseFloat(b.distance);
          case 'jobs': return b.completedJobs - a.completedJobs;
          default: // recommended
            const scoreA = (a.rating * 2) + (a.completedJobs * 0.1) - ((a.responseTime || 10) * 0.05);
            const scoreB = (b.rating * 2) + (b.completedJobs * 0.1) - ((b.responseTime || 10) * 0.05);
            return scoreB - scoreA;
        }
      });
      
      setProviders(providersList);
      setIsLoading(false);
    }, (error) => {
      console.log('Error listening to providers:', error);
      if (isMounted) setIsLoading(false);
    });

    return () => { isMounted = false; unsubscribe(); };
  }, [selectedCategory, userLocation, sortBy]);

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return provider.name?.toLowerCase().includes(q) || provider.serviceCategory?.toLowerCase().includes(q) ||
        provider.barangay?.toLowerCase().includes(q) || provider.bio?.toLowerCase().includes(q);
    });
  }, [providers, searchQuery]);

  const initializeScreen = async () => {
    setIsLoading(true);
    try {
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);
      setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.0922, longitudeDelta: 0.0421,
        }, 500);
      }, 100);
    } catch (error) {
      console.error('Error initializing:', error);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const handleCategorySelect = (category) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  const handleProviderPress = useCallback((provider) => {
    setSelectedProvider(provider);
    Animated.sequence([
      Animated.timing(cardScale, {toValue: 0.95, duration: 100, useNativeDriver: true}),
      Animated.timing(cardScale, {toValue: 1, duration: 100, useNativeDriver: true}),
    ]).start(() => navigation.navigate('ProviderProfile', {providerId: provider.id}));
  }, [navigation, cardScale]);

  const handleMyLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.0922, longitudeDelta: 0.0421,
      }, 500);
    }
  };

  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isSearchExpanded) { setIsSearchExpanded(false); setSearchQuery(''); }
    else { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 100); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeScreen();
    setRefreshing(false);
  }, []);

  const onlineCount = providers.length;

  // Sort options
  const sortOptions = [
    {id: 'recommended', label: 'Recommended', icon: 'sparkles'},
    {id: 'rating', label: 'Highest Rated', icon: 'star'},
    {id: 'distance', label: 'Nearest', icon: 'navigate'},
    {id: 'price', label: 'Lowest Price', icon: 'pricetag'},
    {id: 'jobs', label: 'Most Experienced', icon: 'trophy'},
  ];

  return (
    <SafeAreaView style={[mapStyles.container, {backgroundColor: isDark ? theme.colors.background : '#F9FAFB'}]} edges={['top']}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={mapStyles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={isDark ? darkMapStyle : []}>
        {filteredProviders.map((provider) => (
          <Marker
            key={provider.id}
            coordinate={{latitude: provider.latitude, longitude: provider.longitude}}
            tracksViewChanges={false}
            onPress={() => handleProviderPress(provider)}>
            <View style={styles.markerContainer}>
              <View style={[styles.markerOuter, selectedProvider?.id === provider.id && styles.markerSelected]}>
                {provider.profilePhoto ? (
                  <FastImage source={{uri: provider.profilePhoto}} style={styles.markerImage} resizeMode={FastImage.resizeMode.cover} />
                ) : (
                  <View style={styles.markerPlaceholder}>
                    <Text style={styles.markerInitial}>{provider.firstName?.[0] || 'P'}</Text>
                  </View>
                )}
              </View>
              {provider.isOnline && <View style={styles.markerOnline} />}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Premium Header */}
      <View style={styles.headerContainer}>
        {/* Search Bar */}
        <Animated.View style={[styles.searchContainer, {width: isSearchExpanded ? SCREEN_WIDTH - 32 : 52}]}>
          <TouchableOpacity onPress={toggleSearch} style={styles.searchIconBtn}>
            <Icon name="search" size={22} color="#00B14F" />
          </TouchableOpacity>
          {isSearchExpanded && (
            <>
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, isDark && {color: theme.colors.text}]}
                placeholder="Search providers, services..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={() => {setSearchQuery(''); setIsSearchExpanded(false);}} style={styles.searchCloseBtn}>
                <Icon name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* Notification Button */}
        <TouchableOpacity style={styles.notifButton} onPress={() => navigation.navigate('Notifications')}>
          <Icon name="notifications" size={22} color="#374151" />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Live Status Banner */}
      <View style={styles.liveBanner}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>{onlineCount} providers online</Text>
        <Text style={styles.liveSeparator}>•</Text>
        <Text style={styles.liveText}>Avg. 5 min response</Text>
      </View>

      {/* Category Pills */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {SERVICE_CATEGORIES.map((category) => {
            const isActive = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryPill, isActive && {backgroundColor: category.color}]}
                onPress={() => handleCategorySelect(category.id)}
                activeOpacity={0.7}>
                <Icon name={category.icon} size={18} color={isActive ? '#FFFFFF' : category.color} />
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* My Location Button */}
      <TouchableOpacity style={styles.myLocationBtn} onPress={handleMyLocation}>
        <Icon name="locate" size={22} color="#00B14F" />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, isDark && {backgroundColor: theme.colors.card}, {height: panelHeight}]}>
        {/* Handle */}
        <View {...panResponder.panHandlers} style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Sheet Header */}
        <View style={styles.sheetHeader}>
          <View>
            <Text style={[styles.sheetTitle, isDark && {color: theme.colors.text}]}>Find a Provider</Text>
            <Text style={styles.sheetSubtitle}>{filteredProviders.length} available near you</Text>
          </View>
          <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
            <Icon name="options-outline" size={18} color="#00B14F" />
            <Text style={styles.sortButtonText}>{sortOptions.find(s => s.id === sortBy)?.label}</Text>
            <Icon name="chevron-down" size={14} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Provider List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ProviderCardSkeleton />
            <ProviderCardSkeleton />
            <ProviderCardSkeleton />
          </View>
        ) : filteredProviders.length > 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.providerList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} tintColor="#00B14F" />}>
            {filteredProviders.map((provider, index) => {
              const badge = getProviderBadge(provider);
              const isFavorite = favoriteIds.includes(provider.id);
              const price = provider.fixedPrice || provider.hourlyRate || 0;
              
              return (
                <AnimatedListItem key={provider.id} index={index} delay={60}>
                  <TouchableOpacity
                    style={[styles.providerCard, isDark && {backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}
                    onPress={() => handleProviderPress(provider)}
                    activeOpacity={0.9}>
                    {/* Card Header with Gradient */}
                    <View style={styles.cardHeader}>
                      {/* Profile Photo */}
                      <View style={styles.photoContainer}>
                        {provider.profilePhoto ? (
                          <FastImage source={{uri: provider.profilePhoto}} style={styles.providerPhoto} resizeMode={FastImage.resizeMode.cover} />
                        ) : (
                          <View style={[styles.providerPhoto, styles.photoPlaceholder]}>
                            <Text style={styles.photoInitials}>{provider.firstName?.[0]}{provider.lastName?.[0]}</Text>
                          </View>
                        )}
                        {provider.isOnline && <View style={styles.onlineIndicator}><View style={styles.onlineDot} /></View>}
                        {(provider.status === 'approved' || provider.providerStatus === 'approved') && (
                          <View style={styles.verifiedBadge}>
                            <Icon name="checkmark-circle" size={12} color="#FFFFFF" />
                          </View>
                        )}
                      </View>

                      {/* Provider Info */}
                      <View style={styles.providerInfo}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.providerName, isDark && {color: theme.colors.text}]} numberOfLines={1}>
                            {provider.name}
                          </Text>
                          {badge && (
                            <View style={[styles.badge, {backgroundColor: badge.bg}]}>
                              <Icon name={badge.icon} size={10} color={badge.color} />
                              <Text style={[styles.badgeText, {color: badge.color}]}>{badge.label}</Text>
                            </View>
                          )}
                        </View>
                        
                        {/* Category Tag */}
                        <View style={styles.categoryTag}>
                          <Text style={styles.categoryTagText}>{provider.serviceCategory}</Text>
                        </View>

                        {/* Stats Row */}
                        <View style={styles.statsRow}>
                          <View style={styles.statItem}>
                            <Icon name="star" size={14} color={provider.rating > 0 ? '#F59E0B' : '#D1D5DB'} />
                            <Text style={styles.statText}>
                              {provider.rating > 0 ? provider.rating.toFixed(1) : 'New'}
                            </Text>
                            {provider.reviewCount > 0 && <Text style={styles.statSubtext}>({provider.reviewCount})</Text>}
                          </View>
                          <View style={styles.statDivider} />
                          <View style={styles.statItem}>
                            <Icon name="briefcase-outline" size={14} color="#6B7280" />
                            <Text style={styles.statText}>{provider.completedJobs}</Text>
                            <Text style={styles.statSubtext}>jobs</Text>
                          </View>
                          <View style={styles.statDivider} />
                          <View style={styles.statItem}>
                            <Icon name="time-outline" size={14} color="#6B7280" />
                            <Text style={styles.statText}>~{provider.responseTime}m</Text>
                          </View>
                        </View>

                        {/* Location */}
                        <View style={styles.locationRow}>
                          <Icon name="location-outline" size={14} color="#00B14F" />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {provider.barangay ? `Brgy. ${provider.barangay}` : 'Maasin City'}
                            {provider.distance && ` • ${provider.distance} km`}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Card Footer */}
                    <View style={styles.cardFooter}>
                      <View style={styles.priceContainer}>
                        <Text style={[styles.priceAmount, isDark && {color: theme.colors.text}]}>₱{price.toLocaleString()}</Text>
                        <Text style={styles.priceType}>/{provider.priceType === 'per_hire' ? 'hire' : 'job'}</Text>
                      </View>
                      
                      <View style={styles.actionButtons}>
                        <TouchableOpacity style={[styles.actionBtn, styles.favoriteBtn, isFavorite && styles.favoriteBtnActive]} onPress={() => toggleFavorite(provider.id)}>
                          <Icon name={isFavorite ? 'heart' : 'heart-outline'} size={18} color={isFavorite ? '#EF4444' : '#9CA3AF'} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.messageBtn]} onPress={() => navigation.navigate('Chat', {providerId: provider.id, providerName: provider.name})}>
                          <Icon name="chatbubble-outline" size={18} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.bookButton}
                          onPress={() => navigation.navigate('HireProvider', {providerId: provider.id, provider})}>
                          <Text style={styles.bookButtonText}>Book Now</Text>
                          <Icon name="arrow-forward" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                </AnimatedListItem>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="search-outline" size={48} color="#D1D5DB" />
            </View>
            <Text style={[styles.emptyTitle, isDark && {color: theme.colors.text}]}>
              {searchQuery ? `No results for "${searchQuery}"` : 'No providers available'}
            </Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or search</Text>
            {(searchQuery || selectedCategory) && (
              <TouchableOpacity style={styles.clearButton} onPress={() => {setSearchQuery(''); setSelectedCategory(null);}}>
                <Text style={styles.clearButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>

      {/* Sort Modal */}
      {showSortModal && (
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
          <View style={[styles.sortModal, isDark && {backgroundColor: theme.colors.card}]}>
            <View style={styles.sortModalHeader}>
              <Text style={[styles.sortModalTitle, isDark && {color: theme.colors.text}]}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.sortOption, sortBy === option.id && styles.sortOptionActive]}
                onPress={() => {setSortBy(option.id); setShowSortModal(false);}}>
                <Icon name={option.icon} size={20} color={sortBy === option.id ? '#00B14F' : '#6B7280'} />
                <Text style={[styles.sortOptionText, sortBy === option.id && styles.sortOptionTextActive, isDark && {color: theme.colors.text}]}>
                  {option.label}
                </Text>
                {sortBy === option.id && <Icon name="checkmark-circle" size={20} color="#00B14F" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const darkMapStyle = [
  {elementType: 'geometry', stylers: [{color: '#242f3e'}]},
  {elementType: 'labels.text.stroke', stylers: [{color: '#242f3e'}]},
  {elementType: 'labels.text.fill', stylers: [{color: '#746855'}]},
];

const styles = {
  // Header
  headerContainer: {
    position: 'absolute', top: 8, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10,
  },
  searchContainer: {
    height: 52, backgroundColor: '#FFFFFF', borderRadius: 26, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  searchIconBtn: {padding: 4},
  searchInput: {flex: 1, fontSize: 15, color: '#1F2937', marginLeft: 10, paddingVertical: 0},
  searchCloseBtn: {padding: 4},
  notifButton: {
    width: 52, height: 52, backgroundColor: '#FFFFFF', borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  notifBadge: {
    position: 'absolute', top: 8, right: 8, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  notifBadgeText: {fontSize: 10, fontWeight: '700', color: '#FFFFFF'},

  // Live Banner
  liveBanner: {
    position: 'absolute', top: 70, left: 16, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0, 177, 79, 0.95)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    shadowColor: '#00B14F', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  liveDot: {width: 8, height: 8, backgroundColor: '#FFFFFF', borderRadius: 4, marginRight: 8},
  liveText: {fontSize: 12, fontWeight: '600', color: '#FFFFFF'},
  liveSeparator: {marginHorizontal: 6, color: 'rgba(255,255,255,0.6)'},

  // Categories
  categoryContainer: {position: 'absolute', top: 110, left: 0, right: 0, zIndex: 5},
  categoryScroll: {paddingHorizontal: 16, paddingVertical: 8},
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 24, marginRight: 10, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  categoryText: {fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 8},
  categoryTextActive: {color: '#FFFFFF'},

  // My Location
  myLocationBtn: {
    position: 'absolute', right: 16, bottom: PANEL_MID_HEIGHT + 16, width: 52, height: 52, backgroundColor: '#FFFFFF',
    borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },

  // Map Markers
  markerContainer: {alignItems: 'center'},
  markerOuter: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6, borderWidth: 3, borderColor: '#00B14F',
  },
  markerSelected: {borderColor: '#F59E0B', transform: [{scale: 1.1}]},
  markerImage: {width: 40, height: 40, borderRadius: 20},
  markerPlaceholder: {width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center'},
  markerInitial: {fontSize: 16, fontWeight: '700', color: '#6B7280'},
  markerOnline: {position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, backgroundColor: '#10B981', borderRadius: 7, borderWidth: 2, borderColor: '#FFFFFF'},

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: '#000', shadowOffset: {width: 0, height: -8}, shadowOpacity: 0.15, shadowRadius: 24, elevation: 20,
  },
  handleContainer: {alignItems: 'center', paddingVertical: 12},
  handle: {width: 40, height: 5, backgroundColor: '#E5E7EB', borderRadius: 3},
  sheetHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12},
  sheetTitle: {fontSize: 22, fontWeight: '700', color: '#111827'},
  sheetSubtitle: {fontSize: 13, color: '#6B7280', marginTop: 2},
  sortButton: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12},
  sortButtonText: {fontSize: 13, fontWeight: '600', color: '#374151', marginHorizontal: 6},

  // Provider List
  loadingContainer: {paddingHorizontal: 20},
  providerList: {paddingHorizontal: 16, paddingBottom: 100},
  providerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  cardHeader: {flexDirection: 'row', padding: 16},
  photoContainer: {position: 'relative', marginRight: 14},
  providerPhoto: {width: 72, height: 72, borderRadius: 18},
  photoPlaceholder: {backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center'},
  photoInitials: {fontSize: 22, fontWeight: '700', color: '#9CA3AF'},
  onlineIndicator: {position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, backgroundColor: '#FFFFFF', borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  onlineDot: {width: 12, height: 12, backgroundColor: '#10B981', borderRadius: 6},
  verifiedBadge: {position: 'absolute', top: -4, right: -4, width: 22, height: 22, backgroundColor: '#3B82F6', borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF'},
  providerInfo: {flex: 1},
  nameRow: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4},
  providerName: {fontSize: 17, fontWeight: '700', color: '#111827', marginRight: 8},
  badge: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10},
  badgeText: {fontSize: 10, fontWeight: '700', marginLeft: 3},
  categoryTag: {backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8},
  categoryTagText: {fontSize: 11, fontWeight: '600', color: '#059669'},
  statsRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  statItem: {flexDirection: 'row', alignItems: 'center'},
  statText: {fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 4},
  statSubtext: {fontSize: 12, color: '#9CA3AF', marginLeft: 2},
  statDivider: {width: 1, height: 14, backgroundColor: '#E5E7EB', marginHorizontal: 10},
  locationRow: {flexDirection: 'row', alignItems: 'center'},
  locationText: {fontSize: 12, color: '#6B7280', marginLeft: 4, flex: 1},

  // Card Footer
  cardFooter: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FAFAFA'},
  priceContainer: {flexDirection: 'row', alignItems: 'baseline'},
  priceAmount: {fontSize: 22, fontWeight: '700', color: '#111827'},
  priceType: {fontSize: 13, color: '#6B7280', marginLeft: 2},
  actionButtons: {flexDirection: 'row', alignItems: 'center'},
  actionBtn: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: '#F3F4F6'},
  favoriteBtn: {borderWidth: 1, borderColor: '#E5E7EB'},
  favoriteBtnActive: {backgroundColor: '#FEE2E2', borderColor: '#FECACA'},
  messageBtn: {borderWidth: 1, borderColor: '#E5E7EB'},
  bookButton: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#00B14F', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14},
  bookButtonText: {fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginRight: 6},

  // Empty State
  emptyContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 60},
  emptyIconContainer: {width: 100, height: 100, backgroundColor: '#F3F4F6', borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8},
  emptySubtitle: {fontSize: 14, color: '#6B7280', textAlign: 'center'},
  clearButton: {marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#00B14F', borderRadius: 12},
  clearButtonText: {fontSize: 14, fontWeight: '600', color: '#FFFFFF'},

  // Sort Modal
  modalOverlay: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  sortModal: {backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40},
  sortModalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'},
  sortModalTitle: {fontSize: 18, fontWeight: '700', color: '#111827'},
  sortOption: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16},
  sortOptionActive: {backgroundColor: '#F0FDF4'},
  sortOptionText: {flex: 1, fontSize: 15, color: '#374151', marginLeft: 14},
  sortOptionTextActive: {color: '#00B14F', fontWeight: '600'},
};

export default ClientHomeScreen;
