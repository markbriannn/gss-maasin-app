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
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import {collection, query, where, getDocs} from 'firebase/firestore';
import {db} from '../../config/firebase';
import {useAuth} from '../../context/AuthContext';

const {width, height} = Dimensions.get('window');
const MAP_HEIGHT = height * 0.38;

const FILTERS = [
  {id: 'recommended', label: 'Recommended', icon: 'car'},
  {id: 'cheapest', label: 'Cheapest', icon: 'wallet-outline'},
  {id: 'nearest', label: 'Fastest', icon: 'location'},
];

const getServiceImage = (category) => {
  // Return placeholder - in production, use actual service images
  return null;
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

const getEstimatedTime = (distance) => {
  const avgSpeed = 30;
  const minutes = Math.round((distance / avgSpeed) * 60);
  const minTime = Math.max(4, minutes - 5);
  const maxTime = minutes + 10;
  return `Est. ${minTime} - ${maxTime} mins away`;
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
          serviceCategory: data.serviceCategory || '',
          profilePhoto: data.profilePhoto,
          rating: data.rating || data.averageRating || 0,
          completedJobs: data.completedJobs || 0,
          fixedPrice: data.fixedPrice || data.hourlyRate || 0,
          priceType: data.priceType || 'per_job',
          distance: distance,
          estimatedTime: getEstimatedTime(distance),
          isOnline: data.isOnline || false,
          latitude: data.latitude,
          longitude: data.longitude,
          tier: data.tier || 'bronze',
          yearsExperience: data.yearsExperience || 1,
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
      default:
        sorted.sort((a, b) => {
          const scoreA = a.rating * 2 + a.completedJobs * 0.1 - a.distance * 0.5;
          const scoreB = b.rating * 2 + b.completedJobs * 0.1 - b.distance * 0.5;
          return scoreB - scoreA;
        });
    }
    setFilteredProviders(sorted);
  };

  const handleSelectProvider = (provider) => {
    // Toggle selection - if already selected, unselect
    if (selectedProvider?.id === provider.id) {
      setSelectedProvider(null);
      // Reset map to client location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: clientLat,
          longitude: clientLng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 300);
      }
      return;
    }
    
    setSelectedProvider(provider);
    if (mapRef.current && provider.latitude && provider.longitude) {
      mapRef.current.fitToCoordinates(
        [
          {latitude: clientLat, longitude: clientLng},
          {latitude: provider.latitude, longitude: provider.longitude},
        ],
        {edgePadding: {top: 80, right: 50, bottom: 50, left: 50}, animated: true},
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

      {/* Map Section */}
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
          {/* Client Location Marker */}
          <Marker coordinate={{latitude: clientLat, longitude: clientLng}}>
            <View style={styles.clientMarker}>
              <View style={styles.clientMarkerDot} />
            </View>
          </Marker>

          {/* Provider Marker */}
          {selectedProvider?.latitude && selectedProvider?.longitude && (
            <>
              <Marker
                coordinate={{
                  latitude: selectedProvider.latitude,
                  longitude: selectedProvider.longitude,
                }}>
                <View style={styles.providerMarker}>
                  <Icon name="construct" size={16} color="#FFF" />
                </View>
              </Marker>
              <Polyline
                coordinates={[
                  {latitude: clientLat, longitude: clientLng},
                  {latitude: selectedProvider.latitude, longitude: selectedProvider.longitude},
                ]}
                strokeColor="#1A73E8"
                strokeWidth={4}
              />
            </>
          )}
        </MapView>

        {/* Top Location Bar */}
        <View style={styles.locationBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Icon name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.locationContent}>
            <Text style={styles.locationFrom} numberOfLines={1}>
              {clientAddress || 'Your Location'}
            </Text>
            <Icon name="arrow-forward" size={14} color="#9CA3AF" style={{marginHorizontal: 8}} />
            <Text style={styles.locationTo} numberOfLines={1}>
              {selectedProvider?.name || 'Select Provider'}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.handle} />

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterBtn,
                activeFilter === filter.id && styles.filterBtnActive,
              ]}
              onPress={() => setActiveFilter(filter.id)}>
              <Icon
                name={filter.icon}
                size={16}
                color={activeFilter === filter.id ? '#FFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.filterLabel,
                  activeFilter === filter.id && styles.filterLabelActive,
                ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Provider List */}
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={{paddingBottom: selectedProvider ? 130 : 20}}
          showsVerticalScrollIndicator={false}>
          {filteredProviders.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="person-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No providers available</Text>
              <Text style={styles.emptyText}>Try again later</Text>
            </View>
          ) : (
            filteredProviders.map((provider) => {
              const isSelected = selectedProvider?.id === provider.id;
              const isBusy = !provider.isOnline;

              return (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.providerCard,
                    isSelected && styles.providerCardSelected,
                    isBusy && styles.providerCardBusy,
                  ]}
                  onPress={() => handleSelectProvider(provider)}
                  activeOpacity={0.7}
                  disabled={isBusy}>
                  <View style={styles.cardContent}>
                    {/* Service Image/Avatar */}
                    <View style={styles.avatarContainer}>
                      {provider.profilePhoto ? (
                        <Image source={{uri: provider.profilePhoto}} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Icon name="construct" size={28} color="#00B14F" />
                        </View>
                      )}
                    </View>

                    {/* Provider Info */}
                    <View style={styles.infoContainer}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.providerName, isBusy && styles.textMuted]}>
                          {provider.serviceCategory}
                        </Text>
                        <Icon name="star" size={14} color="#F59E0B" style={{marginLeft: 6}} />
                        <Text style={styles.ratingText}>{provider.rating.toFixed(1)}</Text>
                        <TouchableOpacity style={styles.infoIcon}>
                          <Icon name="information-circle-outline" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.estimatedTime, isBusy && styles.textMuted]}>
                        {isBusy ? 'Currently busy. Try again later.' : provider.estimatedTime}
                      </Text>

                      {!isBusy && provider.completedJobs > 50 && (
                        <View style={styles.badgeRow}>
                          <View style={styles.ecoBadge}>
                            <Icon name="checkmark-circle" size={12} color="#00B14F" />
                            <Text style={styles.ecoBadgeText}>
                              {provider.completedJobs}+ jobs done
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Price */}
                    <View style={styles.priceContainer}>
                      <Text style={[styles.priceText, isBusy && styles.textMuted]}>
                        ₱{provider.fixedPrice.toLocaleString()}
                      </Text>
                      {!isBusy && provider.priceType === 'per_job' && (
                        <Text style={styles.priceLabel}>Estimate</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Bottom Action */}
        {selectedProvider && (
          <View style={styles.bottomAction}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentMethod}>
                <Icon name="cash-outline" size={20} color="#00B14F" />
                <Text style={styles.paymentText}>Cash</Text>
              </View>
              <TouchableOpacity style={styles.offersBtn}>
                <Icon name="pricetag" size={16} color="#6B7280" />
                <Text style={styles.offersText}>Offers</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.bookBtn} onPress={handleBookProvider}>
              <Text style={styles.bookBtnText}>
                Book {selectedProvider.serviceCategory}
              </Text>
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
  loadingText: {marginTop: 12, fontSize: 15, color: '#6B7280'},

  // Map
  mapContainer: {height: MAP_HEIGHT},
  map: {flex: 1},
  clientMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  clientMarkerDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF'},
  providerMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  // Location Bar
  locationBar: {
    position: 'absolute',
    top: 44,
    left: 12,
    right: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  closeBtn: {padding: 8},
  locationContent: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  locationFrom: {flex: 1, fontSize: 14, color: '#1F2937', fontWeight: '500'},
  locationTo: {flex: 1, fontSize: 14, color: '#1F2937', fontWeight: '500'},

  // Bottom Sheet
  bottomSheet: {
    flex: 1,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  filterBtnActive: {backgroundColor: '#1F2937'},
  filterLabel: {fontSize: 13, fontWeight: '600', color: '#6B7280'},
  filterLabelActive: {color: '#FFF'},

  // List
  listContainer: {flex: 1},
  emptyState: {alignItems: 'center', paddingVertical: 60},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12},
  emptyText: {fontSize: 14, color: '#9CA3AF', marginTop: 4},

  // Provider Card
  providerCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#FFF',
  },
  providerCardSelected: {
    borderColor: '#00B14F',
    backgroundColor: '#F0FDF4',
  },
  providerCardBusy: {opacity: 0.6},
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },

  // Avatar
  avatarContainer: {marginRight: 12},
  avatar: {width: 56, height: 56, borderRadius: 12},
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info
  infoContainer: {flex: 1},
  nameRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 4},
  providerName: {fontSize: 16, fontWeight: '700', color: '#1F2937'},
  ratingText: {fontSize: 13, color: '#1F2937', fontWeight: '500', marginLeft: 2},
  infoIcon: {marginLeft: 4},
  estimatedTime: {fontSize: 13, color: '#6B7280', marginBottom: 4},
  textMuted: {color: '#9CA3AF'},
  badgeRow: {flexDirection: 'row', alignItems: 'center'},
  ecoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  ecoBadgeText: {fontSize: 11, color: '#059669', fontWeight: '500'},

  // Price
  priceContainer: {alignItems: 'flex-end', marginLeft: 8},
  priceText: {fontSize: 16, fontWeight: '700', color: '#1F2937'},
  priceLabel: {fontSize: 11, color: '#9CA3AF'},

  // Bottom Action
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethod: {flexDirection: 'row', alignItems: 'center', gap: 8},
  paymentText: {fontSize: 14, fontWeight: '500', color: '#1F2937'},
  offersBtn: {flexDirection: 'row', alignItems: 'center', gap: 6},
  offersText: {fontSize: 14, color: '#6B7280'},
  bookBtn: {
    backgroundColor: '#00B14F',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookBtnText: {fontSize: 16, fontWeight: '700', color: '#FFF'},
});

export default SelectProviderScreen;
