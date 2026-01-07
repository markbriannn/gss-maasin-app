import React, {useState, useEffect, useCallback, useRef, memo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import {SERVICE_CATEGORIES} from '../../config/constants';
import locationService from '../../services/locationService';
import {db} from '../../config/firebase';
import {collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDocs} from 'firebase/firestore';
import {useNotifications} from '../../context/NotificationContext';
import {useAuth} from '../../context/AuthContext';
import FastImage from 'react-native-fast-image';
import {GestureDetector, Gesture} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.45;
const GOOGLE_MAPS_API_KEY = 'AIzaSyBpGzpP1vVxZBIsw6gzkUPPDABSl8FktL4';

// Bottom sheet snap points
const SNAP_POINTS = {
  MIN: SCREEN_HEIGHT * 0.35,  // Collapsed - show just handle and filters
  MID: SCREEN_HEIGHT * 0.55,  // Middle position
  MAX: SCREEN_HEIGHT * 0.85,  // Expanded - almost full screen
};

// Memoized Marker Component to prevent re-renders
const ProviderMarker = memo(({provider, isSelected, onPress}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  return (
    <Marker
      identifier={provider.id}
      coordinate={{latitude: provider.latitude, longitude: provider.longitude}}
      onPress={onPress}
      tracksViewChanges={!imageLoaded}>
      <View style={[styles.marker, isSelected && styles.markerSelected]}>
        {provider.profilePhoto ? (
          <Image 
            source={{uri: provider.profilePhoto}} 
            style={styles.markerImg}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <Text style={styles.markerInitial}>
            {provider.name?.charAt(0)?.toUpperCase() || 'P'}
          </Text>
        )}
      </View>
    </Marker>
  );
}, (prev, next) => {
  return prev.provider.id === next.provider.id && 
         prev.isSelected === next.isSelected &&
         prev.provider.latitude === next.provider.latitude &&
         prev.provider.longitude === next.provider.longitude &&
         prev.provider.profilePhoto === next.provider.profilePhoto;
});

const FILTERS = [
  {id: 'recommended', label: 'Recommended', icon: 'car'},
  {id: 'cheapest', label: 'Cheapest', icon: 'wallet-outline'},
  {id: 'nearest', label: 'Nearest', icon: 'location'},
];

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getEstimatedTime = (distance) => {
  const minutes = Math.round((distance / 30) * 60);
  const minTime = Math.max(4, minutes - 5);
  const maxTime = minutes + 10;
  return `Est. ${minTime} - ${maxTime} mins away`;
};

// Decode Google polyline
const decodePolyline = (encoded) => {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push({latitude: lat / 1e5, longitude: lng / 1e5});
  }
  return points;
};

// Fetch directions - use OSRM (works from client-side)
const fetchDirections = async (origin, destination) => {
  // Validate inputs
  if (!origin?.latitude || !origin?.longitude || 
      !destination?.latitude || !destination?.longitude) {
    return [origin, destination];
  }

  try {
    // Use OSRM - it's free and works from client-side
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      const points = data.routes[0].geometry.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
      if (points.length > 1) {
        return points;
      }
    }
  } catch (e) {
    console.log('OSRM error:', e.message);
  }

  // Fallback - return straight line
  return [origin, destination];
};

const ClientHomeScreen = ({navigation}) => {
  const {unreadCount} = useNotifications();
  const {user} = useAuth();
  const mapRef = useRef(null);
  
  const [providers, setProviders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeFilter, setActiveFilter] = useState('recommended');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [region, setRegion] = useState({
    latitude: 10.1335, longitude: 124.8513, latitudeDelta: 0.05, longitudeDelta: 0.05,
  });

  useEffect(() => {
    initLocation();
    loadFavorites();
  }, []);

  const initLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);
      setRegion({...region, latitude: location.latitude, longitude: location.longitude});
    } catch (e) {
      console.log('Location error:', e);
    }
  };

  const loadFavorites = async () => {
    const userId = user?.uid || user?.id;
    if (!userId) return;
    try {
      const snapshot = await getDocs(query(collection(db, 'favorites'), where('userId', '==', userId)));
      setFavoriteIds(snapshot.docs.map(d => d.data().providerId));
    } catch (e) {}
  };

  const toggleFavorite = async (providerId) => {
    const userId = user?.uid || user?.id;
    if (!userId) return;
    const isFav = favoriteIds.includes(providerId);
    try {
      if (isFav) {
        await deleteDoc(doc(db, 'favorites', `${userId}_${providerId}`));
        setFavoriteIds(prev => prev.filter(id => id !== providerId));
      } else {
        await setDoc(doc(db, 'favorites', `${userId}_${providerId}`), {userId, providerId, createdAt: new Date()});
        setFavoriteIds(prev => [...prev, providerId]);
      }
    } catch (e) {}
  };

  // Real-time providers
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'PROVIDER'));
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const isApproved = d.providerStatus === 'approved' || d.status === 'approved';
        if (!isApproved || !d.isOnline) return;
        if (selectedCategory && d.serviceCategory !== selectedCategory) return;
        
        const dist = userLocation ? calculateDistance(userLocation.latitude, userLocation.longitude, d.latitude || 0, d.longitude || 0) : 10;
        
        list.push({
          id: docSnap.id,
          name: `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Provider',
          serviceCategory: d.serviceCategory || 'Service',
          profilePhoto: d.profilePhoto,
          rating: d.rating || d.averageRating || 0,
          reviewCount: d.reviewCount || 0,
          completedJobs: d.completedJobs || 0,
          fixedPrice: d.fixedPrice || d.hourlyRate || 0,
          distance: dist,
          estimatedTime: getEstimatedTime(dist),
          isOnline: d.isOnline,
          latitude: d.latitude,
          longitude: d.longitude,
          barangay: d.barangay,
        });
      });
      
      // Sort
      list.sort((a, b) => {
        if (activeFilter === 'cheapest') return a.fixedPrice - b.fixedPrice;
        if (activeFilter === 'nearest') return a.distance - b.distance;
        return (b.rating * 2 + b.completedJobs * 0.1) - (a.rating * 2 + a.completedJobs * 0.1);
      });
      
      setProviders(list);
    });
    return () => unsub();
  }, [selectedCategory, userLocation, activeFilter]);

  const handleSelectProvider = async (provider) => {
    try {
      setSelectedProvider(provider);
      setRouteCoordinates([]); // Clear old route
      
      // Fit map to show both user and provider
      if (mapRef.current && provider.latitude && provider.longitude) {
        const coords = [
          {
            latitude: userLocation?.latitude || region.latitude, 
            longitude: userLocation?.longitude || region.longitude
          },
          {
            latitude: provider.latitude, 
            longitude: provider.longitude
          }
        ];
        
        // Validate coordinates before fitting
        const validCoords = coords.filter(c => 
          c.latitude && c.longitude && 
          !isNaN(c.latitude) && !isNaN(c.longitude)
        );
        
        if (validCoords.length === 2) {
          mapRef.current.fitToCoordinates(validCoords, {
            edgePadding: {top: 100, right: 50, bottom: 50, left: 50}, 
            animated: true
          });
        }
      }
      
      // Fetch actual road directions
      if (userLocation?.latitude && userLocation?.longitude && 
          provider.latitude && provider.longitude) {
        const route = await fetchDirections(
          {latitude: userLocation.latitude, longitude: userLocation.longitude},
          {latitude: provider.latitude, longitude: provider.longitude}
        );
        if (route && route.length > 0) {
          setRouteCoordinates(route);
        }
      }
    } catch (error) {
      console.log('Error selecting provider:', error);
    }
  };

  const handleBook = () => {
    if (selectedProvider) {
      navigation.navigate('HireProvider', {provider: selectedProvider, providerId: selectedProvider.id});
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initLocation();
    setRefreshing(false);
  }, []);

  const onlineCount = providers.length;

  // Bottom sheet animation
  const translateY = useSharedValue(SCREEN_HEIGHT - SNAP_POINTS.MID);
  const context = useSharedValue({y: 0});

  // Drag gesture for handle - hold and drag to move
  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = {y: translateY.value};
    })
    .onUpdate((event) => {
      // Move sheet as you drag
      const newY = context.value.y + event.translationY;
      translateY.value = Math.max(
        SCREEN_HEIGHT - SNAP_POINTS.MAX,
        Math.min(SCREEN_HEIGHT - SNAP_POINTS.MIN, newY)
      );
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      const currentY = translateY.value;
      const currentHeight = SCREEN_HEIGHT - currentY;
      
      // Snap based on velocity or position
      if (velocity > 500) {
        // Fast swipe down - collapse
        translateY.value = withSpring(SCREEN_HEIGHT - SNAP_POINTS.MIN, {damping: 15, stiffness: 150});
      } else if (velocity < -500) {
        // Fast swipe up - expand
        translateY.value = withSpring(SCREEN_HEIGHT - SNAP_POINTS.MAX, {damping: 15, stiffness: 150});
      } else {
        // Snap to nearest point
        const snapPoints = [SNAP_POINTS.MIN, SNAP_POINTS.MID, SNAP_POINTS.MAX];
        const closest = snapPoints.reduce((prev, curr) => 
          Math.abs(curr - currentHeight) < Math.abs(prev - currentHeight) ? curr : prev
        );
        translateY.value = withSpring(SCREEN_HEIGHT - closest, {damping: 15, stiffness: 150});
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton={false}>
          {providers.map((p) => {
            // Validate coordinates before rendering marker
            if (!p.latitude || !p.longitude || isNaN(p.latitude) || isNaN(p.longitude)) {
              return null;
            }
            return (
              <ProviderMarker
                key={p.id}
                provider={p}
                isSelected={selectedProvider?.id === p.id}
                onPress={() => handleSelectProvider(p)}
              />
            );
          })}
          
          {/* Route line when provider selected */}
          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#1A73E8"
              strokeWidth={5}
            />
          )}
        </MapView>

        {/* Header */}
        <SafeAreaView style={styles.header} edges={['top']}>
          <TouchableOpacity style={styles.searchBtn}>
            <Icon name="search" size={22} color="#00B14F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
            <Icon name="notifications" size={22} color="#374151" />
            {unreadCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
            )}
          </TouchableOpacity>
        </SafeAreaView>

        {/* Live Banner */}
        <View style={styles.liveBanner}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{onlineCount} providers online</Text>
          <Text style={styles.liveSep}>•</Text>
          <Text style={styles.liveText}>Avg. 5 min response</Text>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
          {SERVICE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catPill, selectedCategory === cat.id && {backgroundColor: cat.color}]}
              onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}>
              <Icon name={cat.icon} size={18} color={selectedCategory === cat.id ? '#FFF' : cat.color} />
              <Text style={[styles.catText, selectedCategory === cat.id && {color: '#FFF'}]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* My Location */}
        <TouchableOpacity style={styles.locBtn} onPress={() => userLocation && mapRef.current?.animateToRegion({latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05}, 500)}>
          <Icon name="locate" size={22} color="#00B14F" />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.sheet, animatedSheetStyle]}>
        {/* Draggable Handle - Hold and drag to move up/down */}
        <GestureDetector gesture={gesture}>
          <Animated.View style={styles.handleArea}>
            <View style={styles.handle} />
          </Animated.View>
        </GestureDetector>

        {/* Filters */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterBtn, activeFilter === f.id && styles.filterActive]}
              onPress={() => setActiveFilter(f.id)}>
              <Icon name={f.icon} size={16} color={activeFilter === f.id ? '#FFF' : '#6B7280'} />
              <Text style={[styles.filterText, activeFilter === f.id && {color: '#FFF'}]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

          {/* Provider List */}
          <ScrollView
          style={styles.list}
          contentContainerStyle={{paddingBottom: selectedProvider ? 140 : 20}}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />}>
          {providers.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="person-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No providers available</Text>
              <Text style={styles.emptyText}>Try selecting a different category</Text>
            </View>
          ) : (
            providers.map((provider) => {
              const isSelected = selectedProvider?.id === provider.id;
              const isFav = favoriteIds.includes(provider.id);

              return (
                <TouchableOpacity
                  key={provider.id}
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => handleSelectProvider(provider)}
                  activeOpacity={0.7}>
                  <View style={styles.cardRow}>
                    {/* Avatar */}
                    <View style={styles.avatarWrap}>
                      {provider.profilePhoto ? (
                        <FastImage source={{uri: provider.profilePhoto}} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Icon name="construct" size={28} color="#00B14F" />
                        </View>
                      )}
                    </View>

                    {/* Info */}
                    <View style={styles.info}>
                      <View style={styles.nameRow}>
                        <Text style={styles.providerName}>{provider.name}</Text>
                      </View>
                      <View style={styles.serviceRow}>
                        <Text style={styles.serviceName}>{provider.serviceCategory}</Text>
                        <Icon name="star" size={14} color="#F59E0B" style={{marginLeft: 6}} />
                        <Text style={styles.rating}>{provider.rating.toFixed(1)}</Text>
                        <TouchableOpacity style={{marginLeft: 4}}>
                          <Icon name="information-circle-outline" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.estTime}>{provider.estimatedTime}</Text>
                      {provider.completedJobs > 20 && (
                        <View style={styles.jobsBadge}>
                          <Icon name="checkmark-circle" size={12} color="#00B14F" />
                          <Text style={styles.jobsBadgeText}>{provider.completedJobs}+ jobs done</Text>
                        </View>
                      )}
                    </View>

                    {/* Price */}
                    <View style={styles.priceWrap}>
                      <Text style={styles.price}>₱{provider.fixedPrice.toLocaleString()}</Text>
                      <Text style={styles.priceLabel}>Estimate</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Bottom Action */}
        {selectedProvider && (
          <View style={styles.bottomBar}>
            <View style={styles.payRow}>
              <View style={styles.payMethod}>
                <Icon name="cash-outline" size={20} color="#00B14F" />
                <Text style={styles.payText}>Cash</Text>
              </View>
              <TouchableOpacity style={styles.offersBtn}>
                <Icon name="pricetag" size={16} color="#6B7280" />
                <Text style={styles.offersText}>Offers</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
              <Text style={styles.bookText}>Contact Us</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFF'},
  
  // Map
  mapContainer: {flex: 1},
  map: {flex: 1},
  marker: {width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#00B14F', overflow: 'hidden'},
  markerSelected: {borderColor: '#F59E0B', transform: [{scale: 1.15}]},
  markerImg: {width: 38, height: 38, borderRadius: 19},
  markerInitial: {fontSize: 18, fontWeight: '700', color: '#00B14F'},

  // Header
  header: {position: 'absolute', top: 0, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between'},
  searchBtn: {width: 48, height: 48, backgroundColor: '#FFF', borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8},
  notifBtn: {width: 48, height: 48, backgroundColor: '#FFF', borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8},
  badge: {position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, backgroundColor: '#EF4444', borderRadius: 9, justifyContent: 'center', alignItems: 'center'},
  badgeText: {fontSize: 10, fontWeight: '700', color: '#FFF'},

  // Live Banner
  liveBanner: {position: 'absolute', top: 60, left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#00B14F', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20},
  liveDot: {width: 8, height: 8, backgroundColor: '#FFF', borderRadius: 4, marginRight: 8},
  liveText: {fontSize: 12, fontWeight: '600', color: '#FFF'},
  liveSep: {marginHorizontal: 6, color: 'rgba(255,255,255,0.6)'},

  // Categories
  catScroll: {position: 'absolute', top: 100, left: 0, right: 0},
  catContent: {paddingHorizontal: 16},
  catPill: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4},
  catText: {fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 6},

  // Location Button
  locBtn: {position: 'absolute', right: 16, bottom: 80, width: 48, height: 48, backgroundColor: '#FFF', borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8},

  // Bottom Sheet
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleArea: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 60,
    height: 6,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
  },

  // Filters
  filterRow: {flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8},
  filterBtn: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: '#F3F4F6', gap: 6, borderWidth: 1, borderColor: '#E5E7EB'},
  filterActive: {backgroundColor: '#1F2937', borderColor: '#1F2937'},
  filterText: {fontSize: 13, fontWeight: '600', color: '#6B7280'},

  // List
  list: {flex: 1, paddingHorizontal: 16},
  empty: {alignItems: 'center', paddingVertical: 60, backgroundColor: '#F9FAFB', borderRadius: 12, marginTop: 8},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12},
  emptyText: {fontSize: 14, color: '#9CA3AF', marginTop: 4},

  // Card
  card: {marginBottom: 8, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#FFF'},
  cardSelected: {borderColor: '#00B14F', backgroundColor: '#F0FDF4'},
  cardRow: {flexDirection: 'row', alignItems: 'center', padding: 12},

  // Avatar
  avatarWrap: {marginRight: 12},
  avatar: {width: 56, height: 56, borderRadius: 12},
  avatarPlaceholder: {width: 56, height: 56, borderRadius: 12, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center'},

  // Info
  info: {flex: 1},
  nameRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 2},
  providerName: {fontSize: 16, fontWeight: '700', color: '#1F2937'},
  serviceRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 4},
  serviceName: {fontSize: 13, fontWeight: '500', color: '#00B14F'},
  rating: {fontSize: 13, fontWeight: '500', color: '#1F2937', marginLeft: 2},
  estTime: {fontSize: 13, color: '#6B7280', marginBottom: 4},
  jobsBadge: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start', gap: 4},
  jobsBadgeText: {fontSize: 11, color: '#059669', fontWeight: '500'},

  // Price
  priceWrap: {alignItems: 'flex-end', marginLeft: 8},
  price: {fontSize: 16, fontWeight: '700', color: '#1F2937'},
  priceLabel: {fontSize: 11, color: '#9CA3AF'},

  // Bottom Bar
  bottomBar: {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#F3F4F6'},
  payRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  payMethod: {flexDirection: 'row', alignItems: 'center', gap: 8},
  payText: {fontSize: 14, fontWeight: '500', color: '#1F2937'},
  offersBtn: {flexDirection: 'row', alignItems: 'center', gap: 6},
  offersText: {fontSize: 14, color: '#6B7280'},
  bookBtn: {backgroundColor: '#00B14F', borderRadius: 12, paddingVertical: 16, alignItems: 'center'},
  bookText: {fontSize: 16, fontWeight: '700', color: '#FFF'},
});

export default ClientHomeScreen;
