import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Image,
  Alert,
  Animated,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import {db} from '../../config/firebase';
import {doc, onSnapshot, updateDoc, getDoc} from 'firebase/firestore';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const BookingStatusScreen = ({navigation, route}) => {
  const {bookingId, booking: initialBooking} = route.params || {};
  const mapRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const [booking, setBooking] = useState(initialBooking || null);
  const [providerLocation, setProviderLocation] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [showProviderModal, setShowProviderModal] = useState(false);

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

          // Navigate to tracking when provider starts traveling
          if (data.status === 'traveling') {
            navigation.replace('Tracking', {jobId: bookingId, job: data});
            return;
          }

          // Navigate to JobDetails when provider marks work as done (client needs to confirm)
          if (data.status === 'pending_completion' || data.status === 'pending_payment' || data.status === 'payment_received') {
            navigation.replace('JobDetails', {jobId: bookingId, job: data});
            return;
          }

          // Navigate to JobDetails when job is completed
          if (data.status === 'completed') {
            navigation.replace('JobDetails', {jobId: bookingId, job: data});
            return;
          }

          // Set provider info from booking data first (in case we can't fetch from users)
          if (!providerInfo && (data.providerName || data.providerId)) {
            setProviderInfo(prev => ({
              ...prev,
              name: data.providerName || prev?.name || 'Provider',
              photo: data.providerPhoto || prev?.photo,
              serviceCategory: data.serviceCategory || prev?.serviceCategory,
              rating: data.providerRating || prev?.rating,
              reviewCount: data.providerReviewCount || prev?.reviewCount,
              barangay: data.providerBarangay || prev?.barangay,
            }));
          }

          // Fetch provider info and location from their user document
          if (data.providerId) {
            try {
              const providerDoc = await getDoc(doc(db, 'users', data.providerId));
              if (providerDoc.exists()) {
                const pData = providerDoc.data();
                setProviderInfo({
                  id: providerDoc.id,
                  name: `${pData.firstName || ''} ${pData.lastName || ''}`.trim() || data.providerName || 'Provider',
                  photo: pData.profilePhoto || data.providerPhoto,
                  serviceCategory: pData.serviceCategory || data.serviceCategory,
                  rating: pData.rating || pData.averageRating || 0,
                  reviewCount: pData.reviewCount || 0,
                  barangay: pData.barangay,
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

  const getStatusText = () => {
    // Check admin approval first for pending status
    if (booking?.status === 'pending') {
      if (!booking?.adminApproved) {
        return {title: 'Awaiting Admin Confirmation', subtitle: 'Your booking is being reviewed'};
      }
      return {title: 'Awaiting Provider Confirmation', subtitle: 'Waiting for a provider to accept'};
    }
    
    switch (booking?.status) {
      case 'accepted':
        return {title: 'Provider Confirmed', subtitle: 'Provider is preparing to come to you'};
      case 'traveling':
        return {title: 'Provider On The Way', subtitle: 'Your provider is coming to you'};
      case 'arrived':
        return {title: 'Provider Arrived', subtitle: 'Your provider has arrived at your location'};
      case 'in_progress':
        return {title: 'Work In Progress', subtitle: 'Provider is working on your service'};
      default:
        return {title: 'Processing', subtitle: 'Please wait...'};
    }
  };

  const handleNavigateToDetails = () => {
    navigation.navigate('JobDetails', {jobId: bookingId, job: booking});
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
            title={providerInfo?.name || booking?.providerName || 'Provider'}
            onPress={() => setShowProviderModal(true)}
            tracksViewChanges={true}>
            <View style={styles.providerMarker}>
              {(providerInfo?.photo || booking?.providerPhoto) ? (
                <Image 
                  source={{uri: providerInfo?.photo || booking?.providerPhoto}} 
                  style={styles.providerMarkerImg}
                />
              ) : (
                <Text style={styles.providerMarkerInitial}>
                  {(providerInfo?.name || booking?.providerName)?.charAt(0)?.toUpperCase() || 'P'}
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
        {/* Status Card - Tappable to navigate to Job Details */}
        <TouchableOpacity 
          style={styles.statusCard} 
          onPress={handleNavigateToDetails}
          activeOpacity={0.7}>
          <View style={styles.statusContent}>
            <View style={{flex: 1}}>
              <Text style={styles.statusTitle}>{status.title}</Text>
              <Text style={styles.statusSubtitle}>{status.subtitle}</Text>
            </View>
            {/* Provider Photo */}
            {(providerInfo?.photo || booking?.providerPhoto) ? (
              <Image
                source={{uri: providerInfo?.photo || booking?.providerPhoto}}
                style={styles.providerPhoto}
              />
            ) : (
              <View style={styles.statusIconContainer}>
                <Icon name="person" size={28} color="#00B14F" />
              </View>
            )}
          </View>
          
          {/* Provider Name */}
          {(providerInfo?.name || booking?.providerName) && (
            <View style={styles.providerInfoRow}>
              <Icon name="person" size={16} color="#00B14F" />
              <Text style={styles.providerInfoText}>
                {providerInfo?.name || booking?.providerName}
              </Text>
              {(providerInfo?.serviceCategory || booking?.serviceCategory) && (
                <>
                  <Text style={styles.providerInfoSep}>•</Text>
                  <Text style={styles.providerInfoText}>
                    {providerInfo?.serviceCategory || booking?.serviceCategory}
                  </Text>
                </>
              )}
            </View>
          )}
          
          {/* Progress Bar */}
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressBar, {width: progressWidth}]} />
          </View>
          
          {/* Tap hint */}
          <View style={styles.tapHintRow}>
            <Text style={styles.tipText}>
              {booking?.status === 'accepted' 
                ? 'Provider is preparing to come to you...'
                : booking?.adminApproved 
                  ? 'Waiting for provider to accept...'
                  : 'Admin will review your booking shortly...'}
            </Text>
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>Tap for details</Text>
              <Icon name="chevron-forward" size={14} color="#6B7280" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Booking Details - Service Location Only */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailDot}>
              <View style={styles.greenDot} />
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

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelBooking}>
          <Text style={styles.cancelText}>Cancel order</Text>
        </TouchableOpacity>
      </View>

      {/* Provider Status Modal - Shows when tapping provider marker on map */}
      <Modal
        visible={showProviderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProviderModal(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowProviderModal(false)}>
          <View style={styles.providerModal}>
            {/* Provider Photo */}
            <View style={styles.modalPhotoWrap}>
              {(providerInfo?.photo || booking?.providerPhoto) ? (
                <Image 
                  source={{uri: providerInfo?.photo || booking?.providerPhoto}} 
                  style={styles.modalPhoto}
                />
              ) : (
                <View style={styles.modalPhotoPlaceholder}>
                  <Icon name="person" size={40} color="#00B14F" />
                </View>
              )}
              <View style={styles.modalOnlineDot} />
            </View>

            {/* Provider Name */}
            <Text style={styles.modalName}>
              {providerInfo?.name || booking?.providerName || 'Provider'}
            </Text>

            {/* Provider Details - Reviews and Location */}
            <View style={styles.modalDetailsRow}>
              <Text style={styles.modalDetailText}>
                {booking?.providerReviewCount || providerInfo?.reviewCount || 0} review{(booking?.providerReviewCount || providerInfo?.reviewCount || 0) !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Location/Barangay */}
            {(providerInfo?.barangay || booking?.providerBarangay) && (
              <Text style={styles.modalLocationText}>
                {providerInfo?.barangay || booking?.providerBarangay}
              </Text>
            )}

            {/* Service Category */}
            <View style={styles.modalServiceRow}>
              <Icon name="construct" size={16} color="#00B14F" />
              <Text style={styles.modalServiceText}>
                {booking?.serviceCategory || providerInfo?.serviceCategory || 'Service'}
              </Text>
            </View>

            {/* Status with Loading */}
            <View style={styles.modalStatusCard}>
              <ActivityIndicator size="small" color="#00B14F" style={{marginRight: 12}} />
              <View style={{flex: 1}}>
                <Text style={styles.modalStatusTitle}>{status.title}</Text>
                <Text style={styles.modalStatusSubtitle}>{status.subtitle}</Text>
              </View>
            </View>

            {/* View Details Button */}
            <TouchableOpacity 
              style={styles.modalViewBtn}
              onPress={() => {
                setShowProviderModal(false);
                handleNavigateToDetails();
              }}>
              <Text style={styles.modalViewText}>View Booking Details</Text>
              <Icon name="chevron-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  statusIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
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
    flex: 1,
  },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 2,
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
  // Provider Status Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  providerModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalPhotoWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  modalPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#00B14F',
  },
  modalPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#00B14F',
  },
  modalOnlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00B14F',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  modalName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalDetailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalDetailSep: {
    marginHorizontal: 8,
    color: '#D1D5DB',
  },
  modalLocationText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  modalServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  modalServiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00B14F',
  },
  modalStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  modalStatusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  modalStatusSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B14F',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    gap: 8,
  },
  modalViewText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default BookingStatusScreen;
