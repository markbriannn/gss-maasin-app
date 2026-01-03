import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {collection, query, where, getDocs} from 'firebase/firestore';
import {db} from '../../config/firebase';
import {useAuth} from '../../context/AuthContext';

const {width, height} = Dimensions.get('window');
const MAP_HEIGHT = height * 0.35;

const FILTERS = [
  {id: 'recommended', label: 'Recommended', icon: 'sparkles'},
  {id: 'cheapest', label: 'Cheapest', icon: 'cash-outline'},
  {id: 'nearest', label: 'Nearest', icon: 'navigate-outline'},
  {id: 'highest_rated', label: 'Top Rated', icon: 'star'},
];

const getCategoryIcon = (category) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('electric')) return '⚡';
  if (cat.includes('plumb')) return '🔧';
  if (cat.includes('carpent')) return '🪚';
  if (cat.includes('clean')) return '🧹';
  if (cat.includes('paint')) return '🎨';
  if (cat.includes('aircon')) return '❄️';
  return '🛠️';
};

const getTierStyle = (tier) => {
  switch (tier) {
    case 'diamond': return {bg: '#06B6D4', label: 'DIAMOND'};
    case 'platinum': return {bg: '#6366F1', label: 'PLATINUM'};
    case 'gold': return {bg: '#F59E0B', label: 'GOLD'};
    case 'silver': return {bg: '#9CA3AF', label: 'SILVER'};
    default: return null;
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getEstimatedArrival = (distance) => {
  const avgSpeed = 30;
  const minutes = Math.round((distance / avgSpeed) * 60);
  if (minutes < 5) return '< 5 mins';
  if (minutes < 60) return `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
};

const SelectProviderScreen = ({navigation, route}) => {
  const {user} = useAuth();
  const mapRef = useRef(null);
  const {serviceCategory, clientLocation, clientAddress} = route.params || {};

  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('recommended');
  const [selectedProvider, setSelectedProvider] = useState(null);

  const clientLat = clientLocation?.latitude || user?.latitude || 10.1332;
  const clientLng = clientLocation?.longitude || user?.longitude || 124.8358;

  useEffect(() => {
    if (serviceCategory) {
      fetchProviders();
    }
  }, [serviceCategory]);

  useEffect(() => {
    applyFilter();
  }, [providers, activeFilter]);

  const fetchProviders = async () => {
    try {
      const providersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'PROVIDER'),
        where('serviceCategory', '==', serviceCategory),
        where('status', '==', 'approved'),
      );

      const snapshot = await getDocs(providersQuery);
      const providersList = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const distance = calculateDistance(
          clientLat,
          clientLng,
          data.latitude || 0,
          data.longitude || 0,
        );

        providersList.push({
          id: doc.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          serviceCategory: data.serviceCategory || '',
          profilePhoto: data.profilePhoto,
          rating: data.rating || data.averageRating || 0,
          reviewCount: data.reviewCount || 0,
          completedJobs: data.completedJobs || 0,
          fixedPrice: data.fixedPrice || data.hourlyRate || 0,
          priceType: data.priceType || 'per_job',
          distance: distance,
          estimatedArrival: getEstimatedArrival(distance),
          isOnline: data.isOnline || false,
          latitude: data.latitude,
          longitude: data.longitude,
          tier: data.tier || 'bronze',
          responseTime: data.responseTime || 5,
        });
      });

      setProviders(providersList);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    let sorted = [...providers];

    switch (activeFilter) {
      case 'cheapest':
        sorted.sort((a, b) => a.fixedPrice - b.fixedPrice);
        break;
      case 'nearest':
        sorted.sort((a, b) => a.distance - b.distance);
        break;
      case 'highest_rated':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'recommended':
      default:
        sorted.sort((a, b) => {
          const scoreA = a.rating * 2 + a.completedJobs * 0.1 - a.distance * 0.5;
          const scoreB = b.rating * 2 + b.completedJobs * 0.1 - b.distance * 0.5;
          return scoreB - scoreA;
        });
        break;
    }

    setFilteredProviders(sorted);
  };

  const handleSelectProvider = (provider) => {
    setSelectedProvider(provider);
    if (mapRef.current && provider.latitude && provider.longitude) {
      mapRef.current.fitToCoordinates(
        [
          {latitude: clientLat, longitude: clientLng},
          {latitude: provider.latitude, longitude: provider.longitude},
        ],
        {edgePadding: {top: 50, right: 50, bottom: 50, left: 50}, animated: true},
      );
    }
  };

  const handleBookProvider = () => {
    if (selectedProvider) {
      navigation.navigate('BookService', {
        provider: selectedProvider,
        providerId: selectedProvider.id,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B14F" />
        <Text style={styles.loadingText}>Finding providers...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: clientLat,
            longitude: clientLng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}>
          {/* Client Marker */}
          <Marker
            coordinate={{latitude: clientLat, longitude: clientLng}}
            title="Your Location">
            <View style={styles.clientMarker}>
              <View style={styles.clientMarkerInner} />
            </View>
          </Marker>

          {/* Selected Provider Marker */}
          {selectedProvider?.latitude && selectedProvider?.longitude && (
            <Marker
              coordinate={{
                latitude: selectedProvider.latitude,
                longitude: selectedProvider.longitude,
              }}
              title={selectedProvider.name}>
              <View style={styles.providerMarker}>
                <Text style={styles.providerMarkerIcon}>
                  {getCategoryIcon(selectedProvider.serviceCategory)}
                </Text>
              </View>
            </Marker>
          )}
        </MapView>

        {/* Location Bar */}
        <View style={styles.locationBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.locationInfo}>
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, {backgroundColor: '#00B14F'}]} />
              <Text style={styles.locationText} numberOfLines={1}>
                {clientAddress || 'Your Location'}
              </Text>
            </View>
            <Icon name="arrow-forward" size={16} color="#9CA3AF" />
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, {backgroundColor: '#3B82F6'}]} />
              <Text style={styles.locationText} numberOfLines={1}>
                {selectedProvider?.name || 'Select Provider'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}>
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                activeFilter === filter.id && styles.filterButtonActive,
              ]}
              onPress={() => setActiveFilter(filter.id)}>
              <Icon
                name={filter.icon}
                size={16}
                color={activeFilter === filter.id ? '#FFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter.id && styles.filterTextActive,
                ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Provider List */}
        <ScrollView
          style={styles.providerList}
          contentContainerStyle={{paddingBottom: selectedProvider ? 140 : 20}}>
          {filteredProviders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="person-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No providers available</Text>
              <Text style={styles.emptySubtitle}>
                No {serviceCategory} providers are currently available
              </Text>
            </View>
          ) : (
            filteredProviders.map((provider, index) => {
              const isSelected = selectedProvider?.id === provider.id;
              const isTopPick = index === 0 && activeFilter === 'recommended';
              const tierStyle = getTierStyle(provider.tier);

              return (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.providerCard,
                    isSelected && styles.providerCardSelected,
                  ]}
                  onPress={() => handleSelectProvider(provider)}
                  activeOpacity={0.7}>
                  {isTopPick && (
                    <View style={styles.topPickBadge}>
                      <Icon name="sparkles" size={12} color="#FFF" />
                      <Text style={styles.topPickText}>TOP PICK</Text>
                    </View>
                  )}

                  <View style={styles.providerContent}>
                    {/* Photo */}
                    <View style={styles.photoContainer}>
                      {provider.profilePhoto ? (
                        <Image
                          source={{uri: provider.profilePhoto}}
                          style={styles.providerPhoto}
                        />
                      ) : (
                        <View style={styles.providerPhotoPlaceholder}>
                          <Text style={styles.categoryIcon}>
                            {getCategoryIcon(provider.serviceCategory)}
                          </Text>
                        </View>
                      )}
                      {provider.isOnline && <View style={styles.onlineDot} />}
                    </View>

                    {/* Info */}
                    <View style={styles.providerInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.providerName} numberOfLines={1}>
                          {provider.name}
                        </Text>
                        {tierStyle && (
                          <View
                            style={[
                              styles.tierBadge,
                              {backgroundColor: tierStyle.bg},
                            ]}>
                            <Text style={styles.tierText}>{tierStyle.label}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.statsRow}>
                        <Icon name="star" size={14} color="#F59E0B" />
                        <Text style={styles.rating}>
                          {provider.rating.toFixed(1)}
                        </Text>
                        <Text style={styles.reviewCount}>
                          ({provider.reviewCount})
                        </Text>
                        <Text style={styles.statDivider}>•</Text>
                        <Icon name="checkmark-circle" size={14} color="#00B14F" />
                        <Text style={styles.jobCount}>
                          {provider.completedJobs} jobs
                        </Text>
                      </View>

                      <View style={styles.distanceRow}>
                        <Icon name="time-outline" size={14} color="#6B7280" />
                        <Text style={styles.distanceText}>
                          {provider.estimatedArrival}
                        </Text>
                        <Text style={styles.statDivider}>•</Text>
                        <Icon name="location-outline" size={14} color="#6B7280" />
                        <Text style={styles.distanceText}>
                          {provider.distance.toFixed(1)} km
                        </Text>
                      </View>
                    </View>

                    {/* Price */}
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>
                        ₱{provider.fixedPrice.toLocaleString()}
                      </Text>
                      <Text style={styles.priceType}>
                        {provider.priceType === 'per_hour' ? 'per hour' : 'fixed'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Book Button */}
        {selectedProvider && (
          <View style={styles.bookContainer}>
            <View style={styles.selectedInfo}>
              {selectedProvider.profilePhoto ? (
                <Image
                  source={{uri: selectedProvider.profilePhoto}}
                  style={styles.selectedPhoto}
                />
              ) : (
                <View style={styles.selectedPhotoPlaceholder}>
                  <Text>{getCategoryIcon(selectedProvider.serviceCategory)}</Text>
                </View>
              )}
              <View style={styles.selectedDetails}>
                <Text style={styles.selectedName}>{selectedProvider.name}</Text>
                <Text style={styles.selectedArrival}>
                  {selectedProvider.estimatedArrival} away
                </Text>
              </View>
              <Text style={styles.selectedPrice}>
                ₱{selectedProvider.fixedPrice.toLocaleString()}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.bookButton}
              onPress={handleBookProvider}
              activeOpacity={0.8}>
              <Text style={styles.bookButtonText}>
                Book {selectedProvider.firstName}
              </Text>
              <Icon name="chevron-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFF'},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF'},
  loadingText: {marginTop: 16, fontSize: 16, color: '#6B7280'},

  // Map
  mapContainer: {height: MAP_HEIGHT},
  map: {flex: 1},
  clientMarker: {width: 24, height: 24, borderRadius: 12, backgroundColor: '#00B14F', justifyContent: 'center', alignItems: 'center'},
  clientMarkerInner: {width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF'},
  providerMarker: {width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4},
  providerMarkerIcon: {fontSize: 20},

  // Location Bar
  locationBar: {position: 'absolute', top: 50, left: 16, right: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4},
  backButton: {padding: 8, marginRight: 8},
  locationInfo: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8},
  locationRow: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6},
  locationDot: {width: 10, height: 10, borderRadius: 5},
  locationText: {fontSize: 13, color: '#374151', flex: 1},

  // Bottom Sheet
  bottomSheet: {flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, shadowColor: '#000', shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8},
  handleContainer: {alignItems: 'center', paddingVertical: 12},
  handle: {width: 48, height: 5, backgroundColor: '#D1D5DB', borderRadius: 3},

  // Filters
  filterContainer: {paddingHorizontal: 16, paddingBottom: 12, gap: 8},
  filterButton: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F3F4F6'},
  filterButtonActive: {backgroundColor: '#00B14F'},
  filterText: {fontSize: 13, fontWeight: '600', color: '#6B7280'},
  filterTextActive: {color: '#FFF'},

  // Provider List
  providerList: {flex: 1, paddingHorizontal: 16},
  emptyContainer: {alignItems: 'center', paddingVertical: 60},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 16},
  emptySubtitle: {fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center'},

  // Provider Card
  providerCard: {backgroundColor: '#FFF', borderRadius: 16, borderWidth: 2, borderColor: '#F3F4F6', marginBottom: 12, overflow: 'hidden'},
  providerCardSelected: {borderColor: '#00B14F', backgroundColor: '#F0FDF4'},
  topPickBadge: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00B14F', paddingHorizontal: 12, paddingVertical: 4},
  topPickText: {fontSize: 10, fontWeight: '700', color: '#FFF'},
  providerContent: {flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12},

  // Photo
  photoContainer: {position: 'relative'},
  providerPhoto: {width: 56, height: 56, borderRadius: 16},
  providerPhotoPlaceholder: {width: 56, height: 56, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center'},
  categoryIcon: {fontSize: 24},
  onlineDot: {position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#00B14F', borderWidth: 2, borderColor: '#FFF'},

  // Info
  providerInfo: {flex: 1},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4},
  providerName: {fontSize: 16, fontWeight: '700', color: '#1F2937', flex: 1},
  tierBadge: {paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4},
  tierText: {fontSize: 8, fontWeight: '700', color: '#FFF'},
  statsRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4},
  rating: {fontSize: 13, fontWeight: '600', color: '#1F2937'},
  reviewCount: {fontSize: 12, color: '#6B7280'},
  statDivider: {color: '#D1D5DB', marginHorizontal: 2},
  jobCount: {fontSize: 12, color: '#6B7280'},
  distanceRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  distanceText: {fontSize: 12, color: '#6B7280'},

  // Price
  priceContainer: {alignItems: 'flex-end'},
  price: {fontSize: 20, fontWeight: '700', color: '#1F2937'},
  priceType: {fontSize: 11, color: '#6B7280'},

  // Book Button
  bookContainer: {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', shadowColor: '#000', shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8},
  selectedInfo: {flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12},
  selectedPhoto: {width: 40, height: 40, borderRadius: 12},
  selectedPhotoPlaceholder: {width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center'},
  selectedDetails: {flex: 1},
  selectedName: {fontSize: 15, fontWeight: '600', color: '#1F2937'},
  selectedArrival: {fontSize: 13, color: '#6B7280'},
  selectedPrice: {fontSize: 18, fontWeight: '700', color: '#00B14F'},
  bookButton: {backgroundColor: '#00B14F', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  bookButtonText: {fontSize: 16, fontWeight: '700', color: '#FFF'},
});

export default SelectProviderScreen;
