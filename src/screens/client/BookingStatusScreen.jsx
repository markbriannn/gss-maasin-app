import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
  Image,
  Alert,
  Animated,
  Share,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import {db} from '../../config/firebase';
import {doc, onSnapshot, updateDoc, getDoc} from 'firebase/firestore';
import {SERVICE_CATEGORIES} from '../../config/constants';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const BookingStatusScreen = ({navigation, route}) => {
  const {bookingId, booking: initialBooking} = route.params || {};
  const mapRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const [booking, setBooking] = useState(initialBooking || null);
  const [providerLocation, setProviderLocation] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);

  // Animate progress bar
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // Listen to booking updates
  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'bookings', bookingId),
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = {...docSnap.data(), id: docSnap.id};
          setBooking(data);

          // Only navigate to tracking when provider starts traveling
          if (data.status === 'traveling') {
            navigation.replace('Tracking', {jobId: bookingId, job: data});
            return;
          }

          // Fetch provider info and location from their user document
          if (data.providerId && !providerInfo) {
            try {
              const providerDoc = await getDoc(doc(db, 'users', data.providerId));
              if (providerDoc.exists()) {
                const pData = providerDoc.data();
                setProviderInfo({
                  id: providerDoc.id,
                  name: `${pData.firstName || ''} ${pData.lastName || ''}`.trim() || 'Provider',
                  photo: pData.profilePhoto,
                  serviceCategory: pData.serviceCategory,
                });
                
                // Get provider's current location
                if (pData.latitude && pData.longitude) {
                  const provLoc = {
                    latitude: pData.latitude,
                    longitude: pData.longitude,
                  };
                  setProviderLocation(provLoc);
                  
                  // Fit map to show both client and provider
                  if (data.latitude && data.longitude && mapRef.current) {
                    setTimeout(() => {
                      mapRef.current?.fitToCoordinates(
                        [provLoc, {latitude: data.latitude, longitude: data.longitude}],
                        {edgePadding: {top: 80, right: 50, bottom: 350, left: 50}, animated: true}
                      );
                    }, 500);
                  }
                }
              }
            } catch (e) {
              console.log('Error fetching provider:', e);
            }
          }

          // Update provider location from booking if available
          if (data.providerLocation) {
            setProviderLocation({
              latitude: data.providerLocation.latitude,
              longitude: data.providerLocation.longitude,
            });
          }
        }
      }
    );

    return () => unsubscribe();
  }, [bookingId, navigation]);

  // Listen to provider's real-time location updates
  useEffect(() => {
    const providerId = booking?.providerId;
    if (!providerId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', providerId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.latitude && data.longitude) {
            setProviderLocation({
              latitude: data.latitude,
              longitude: data.longitude,
            });
            
            // Update provider info
            setProviderInfo(prev => ({
              ...prev,
              name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || prev?.name || 'Provider',
              photo: data.profilePhoto || prev?.photo,
            }));
          }
        }
      }
    );

    return () => unsubscribe();
  }, [booking?.providerId]);

  // Fetch route
  useEffect(() => {
    if (booking?.latitude && booking?.longitude && providerLocation) {
      fetchRoute();
    }
  }, [booking, providerLocation]);

  const fetchRoute = async () => {
    if (!booking || !providerLocation) return;
    
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${providerLocation.longitude},${providerLocation.latitude};${booking.longitude},${booking.latitude}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes?.[0]) {
        const points = data.routes[0].geometry.coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoordinates(points);
      }
    } catch (e) {
      console.log('Route error:', e);
    }
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelledBy: 'client',
              });
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  const handleShareTrip = async () => {
    try {
      await Share.share({
        message: `I'm booking a ${booking?.serviceCategory || 'service'} at ${booking?.address || 'my location'}. Booking ID: ${bookingId}`,
      });
    } catch (e) {}
  };

  const handleSafety = () => {
    Alert.alert(
      'Safety Features',
      'Emergency contacts and safety features will be available once a provider accepts your booking.',
      [{text: 'OK'}]
    );
  };

  const getStatusText = () => {
    switch (booking?.status) {
      case 'pending':
        return {title: 'Finding you a Provider', subtitle: 'Connecting you with providers nearby'};
      case 'accepted':
        return {title: 'Provider Found!', subtitle: 'Waiting for provider to start traveling'};
      case 'traveling':
        return {title: 'Provider En Route', subtitle: 'Your provider is coming to you'};
      default:
        return {title: 'Processing', subtitle: 'Please wait...'};
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const status = getStatusText();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: booking?.latitude || 10.1301,
          longitude: booking?.longitude || 124.8447,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation>
        {/* Client Location Marker (Destination) - Same style as ClientHomeScreen */}
        {booking?.latitude && (
          <Marker
            coordinate={{latitude: booking.latitude, longitude: booking.longitude}}
            title="Your Location"
            tracksViewChanges={false}>
            <View style={styles.clientMarker}>
              <Icon name="home" size={20} color="#EF4444" />
            </View>
          </Marker>
        )}

        {/* Provider Marker - Same style as ClientHomeScreen */}
        {providerLocation && (
          <Marker 
            coordinate={providerLocation} 
            title={providerInfo?.name || 'Provider'}
            tracksViewChanges={true}>
            <View style={styles.providerMarker}>
              {providerInfo?.photo ? (
                <Image 
                  source={{uri: providerInfo.photo}} 
                  style={styles.providerMarkerImg}
                />
              ) : (
                <Text style={styles.providerMarkerInitial}>
                  {providerInfo?.name?.charAt(0)?.toUpperCase() || 'P'}
                </Text>
              )}
            </View>
          </Marker>
        )}

        {/* Route Line - Same blue color as ClientHomeScreen */}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#1A73E8"
            strokeWidth={5}
          />
        )}
      </MapView>

      {/* Back Button */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.locateBtn} onPress={() => {
          if (booking?.latitude) {
            mapRef.current?.animateToRegion({
              latitude: booking.latitude,
              longitude: booking.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            });
          }
        }}>
          <Icon name="locate" size={24} color="#1F2937" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <View style={styles.sheet}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusContent}>
            <View style={{flex: 1}}>
              <Text style={styles.statusTitle}>{status.title}</Text>
              <Text style={styles.statusSubtitle}>{status.subtitle}</Text>
            </View>
            {/* Show provider photo if available, otherwise show car icon */}
            {providerInfo?.photo ? (
              <Image
                source={{uri: providerInfo.photo}}
                style={styles.providerPhoto}
              />
            ) : (
              <Image
                source={{uri: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png'}}
                style={styles.statusIcon}
              />
            )}
          </View>
          
          {/* Show provider name if accepted */}
          {booking?.status === 'accepted' && providerInfo?.name && (
            <View style={styles.providerInfoRow}>
              <Icon name="person" size={16} color="#00B14F" />
              <Text style={styles.providerInfoText}>{providerInfo.name}</Text>
              {providerInfo?.serviceCategory && (
                <>
                  <Text style={styles.providerInfoSep}>•</Text>
                  <Text style={styles.providerInfoText}>{providerInfo.serviceCategory}</Text>
                </>
              )}
            </View>
          )}
          
          {/* Progress Bar */}
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressBar, {width: progressWidth}]} />
          </View>
          <Text style={styles.tipText}>
            {booking?.status === 'accepted' 
              ? 'Provider is preparing to come to you...'
              : 'Did you know... You can book multiple services at once!'}
          </Text>
        </View>

        {/* Service Categories Row */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}>
          {SERVICE_CATEGORIES.slice(0, 6).map((cat) => (
            <View key={cat.id} style={styles.categoryItem}>
              <View style={[styles.categoryIcon, {backgroundColor: cat.color + '20'}]}>
                <Icon name={cat.icon} size={24} color={cat.color} />
              </View>
              <Text style={styles.categoryLabel}>{cat.name}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Booking Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailDot}>
              <View style={styles.greenDot} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Pickup</Text>
              <Text style={styles.detailAddress} numberOfLines={2}>
                {booking?.address || 'Your current location'}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailDivider} />
          
          <View style={styles.detailRow}>
            <View style={styles.detailDot}>
              <View style={styles.redDot} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Service Location</Text>
              <Text style={styles.detailAddress} numberOfLines={2}>
                {booking?.serviceAddress || booking?.address || 'Service at your location'}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Method - Pay First with GCash/Maya */}
        <View style={styles.paymentCard}>
          <View style={styles.paymentRow}>
            <Icon name="wallet-outline" size={24} color="#00B14F" />
            <Text style={styles.paymentText}>
              {booking?.paymentMethod === 'maya' ? 'Maya' : 'GCash'}
            </Text>
            <View style={styles.paidTag}>
              <Text style={styles.paidText}>Pay First</Text>
            </View>
          </View>
          <Text style={styles.paymentAmount}>
            ₱{booking?.totalAmount?.toLocaleString() || booking?.price?.toLocaleString() || '0'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShareTrip}>
            <Icon name="share-social-outline" size={22} color="#374151" />
            <Text style={styles.actionText}>Share trip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleSafety}>
            <Icon name="shield-checkmark-outline" size={22} color="#374151" />
            <Text style={styles.actionText}>Safety</Text>
          </TouchableOpacity>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelBooking}>
          <Text style={styles.cancelText}>Cancel order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  map: {
    height: SCREEN_HEIGHT * 0.4,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  locateBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  // Client marker - red border like destination
  clientMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#EF4444',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  // Provider marker - same style as ClientHomeScreen (green border, profile photo)
  providerMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#00B14F',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  providerMarkerImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  providerMarkerInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00B14F',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  statusCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusIcon: {
    width: 60,
    height: 60,
  },
  providerPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#00B14F',
  },
  providerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  providerInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 6,
  },
  providerInfoSep: {
    marginHorizontal: 6,
    color: '#9CA3AF',
  },
  progressBg: {
    height: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00B14F',
    borderRadius: 3,
  },
  tipText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  categoriesScroll: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingRight: 16,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 60,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailDot: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 4,
  },
  greenDot: {
    width: 12,
    height: 12,
    backgroundColor: '#00B14F',
    borderRadius: 6,
  },
  redDot: {
    width: 12,
    height: 12,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  detailAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  detailDivider: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginLeft: 11,
    marginVertical: 4,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  freeTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  freeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  paidTag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  paidText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default BookingStatusScreen;
