import {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE, AnimatedRegion} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import {db} from '../../config/firebase';
import {doc, onSnapshot, getDoc} from 'firebase/firestore';
import locationService from '../../services/locationService';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBpGzpP1vVxZBIsw6gzkUPPDABSl8FktL4';
const ANIMATION_DURATION = 1000; // 1 second smooth animation

const JobTrackingScreen = ({navigation, route}) => {
  const {jobId, job} = route.params || {};
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [jobData, setJobData] = useState(job || null);
  const [clientLocation, setClientLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const [heading, setHeading] = useState(0);

  // Animated provider location for smooth movement
  const providerCoordinate = useRef(
    new AnimatedRegion({
      latitude: 10.1301,
      longitude: 124.8447,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    })
  ).current;

  const [providerLocation, setProviderLocation] = useState(null);

  // Calculate heading/bearing between two points
  const calculateHeading = (from, to) => {
    if (!from || !to) return 0;
    const lat1 = from.latitude * Math.PI / 180;
    const lat2 = to.latitude * Math.PI / 180;
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  // Animate marker to new position smoothly
  const animateMarker = (newCoordinate) => {
    if (providerLocation) {
      const newHeading = calculateHeading(providerLocation, newCoordinate);
      setHeading(newHeading);
    }

    providerCoordinate.timing({
      latitude: newCoordinate.latitude,
      longitude: newCoordinate.longitude,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();

    setProviderLocation(newCoordinate);
  };

  // Listen to job updates for provider location
  useEffect(() => {
    const docId = jobId || job?.id;
    if (!docId) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'bookings', docId),
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setJobData({...data, id: docSnap.id});

          // Navigate to JobDetails when provider marks work as done (client needs to confirm)
          if (data.status === 'pending_completion' || data.status === 'pending_payment' || data.status === 'payment_received' || data.status === 'completed') {
            navigation.replace('JobDetails', {jobId: docId, job: {...data, id: docSnap.id}});
            return;
          }

          // Get provider location from booking - animate smoothly
          if (data.providerLocation) {
            const newLoc = {
              latitude: data.providerLocation.latitude,
              longitude: data.providerLocation.longitude,
            };
            if (providerLocation) {
              animateMarker(newLoc);
            } else {
              // First time - set immediately
              providerCoordinate.setValue({
                latitude: newLoc.latitude,
                longitude: newLoc.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              });
              setProviderLocation(newLoc);
            }
          }

          // Get client location from booking
          if (data.latitude && data.longitude) {
            setClientLocation({
              latitude: data.latitude,
              longitude: data.longitude,
            });
          }

          // Fetch provider info
          if (data.providerId && !providerInfo) {
            try {
              const providerDoc = await getDoc(doc(db, 'users', data.providerId));
              if (providerDoc.exists()) {
                const pData = providerDoc.data();
                setProviderInfo({
                  id: providerDoc.id,
                  name: `${pData.firstName || ''} ${pData.lastName || ''}`.trim() || 'Provider',
                  phone: pData.phone,
                  photo: pData.profilePhoto,
                });
                
                // Use provider's profile location if booking doesn't have it
                if (!data.providerLocation && pData.latitude && pData.longitude) {
                  const newLoc = {latitude: pData.latitude, longitude: pData.longitude};
                  providerCoordinate.setValue({
                    latitude: newLoc.latitude,
                    longitude: newLoc.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  });
                  setProviderLocation(newLoc);
                }
              }
            } catch (e) {
              console.log('Error fetching provider:', e);
            }
          }
        }
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId, job?.id]);

  // Listen to provider's user document for real-time location updates
  useEffect(() => {
    const providerId = jobData?.providerId || job?.providerId;
    if (!providerId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', providerId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.latitude && data.longitude) {
            const newLoc = {
              latitude: data.latitude,
              longitude: data.longitude,
            };
            
            // Animate to new position smoothly
            animateMarker(newLoc);
            
            setProviderInfo(prev => ({
              ...prev,
              id: docSnap.id,
              name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || prev?.name || 'Provider',
              phone: data.phone || prev?.phone,
              photo: data.profilePhoto || prev?.photo,
            }));
          }
        }
      }
    );

    return () => unsubscribe();
  }, [jobData?.providerId, job?.providerId]);

  // Get client's current location if not in job data
  useEffect(() => {
    const getClientLocation = async () => {
      if (!clientLocation) {
        try {
          const location = await locationService.getCurrentLocation();
          setClientLocation({
            latitude: location.latitude,
            longitude: location.longitude,
          });
        } catch (error) {
          console.log('Error getting client location:', error);
          setClientLocation(locationService.getDefaultLocation());
        }
      }
    };
    getClientLocation();
  }, []);

  // Fetch route when both locations are available
  useEffect(() => {
    if (providerLocation && clientLocation) {
      fetchRoute(providerLocation, clientLocation);
      fitMapToMarkers();
    }
  }, [providerLocation, clientLocation]);

  // Fetch route using OSRM (works from client-side)
  const fetchRoute = async (origin, dest) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes?.[0]) {
        const route = data.routes[0];
        const points = route.geometry.coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        if (points.length > 1) {
          setRouteCoordinates(points);
          setDistance((route.distance / 1000).toFixed(1));
          setDuration(Math.round(route.duration / 60));
          return;
        }
      }
    } catch (e) {
      console.log('OSRM error:', e.message);
    }

    // Fallback - straight line
    setRouteCoordinates([origin, dest]);
    const dist = locationService.calculateDistance(origin.latitude, origin.longitude, dest.latitude, dest.longitude);
    setDistance(dist.toFixed(1));
    setDuration(Math.round((dist / 30) * 60));
  };

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
      lat += (result & 1 ? ~(result >> 1) : result >> 1);
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lng += (result & 1 ? ~(result >> 1) : result >> 1);
      points.push({latitude: lat / 1e5, longitude: lng / 1e5});
    }
    return points;
  };

  const fitMapToMarkers = () => {
    if (mapRef.current && providerLocation && clientLocation) {
      mapRef.current.fitToCoordinates([providerLocation, clientLocation], {
        edgePadding: {top: 100, right: 50, bottom: 280, left: 50},
        animated: true,
      });
    }
  };

  const handleCallProvider = () => {
    if (providerInfo?.phone) {
      Linking.openURL(`tel:${providerInfo.phone}`);
    } else {
      Alert.alert('Not Available', 'Provider phone number not available');
    }
  };

  const handleMessageProvider = () => {
    if (!jobData?.providerId) {
      Alert.alert('Not Available', 'Provider information not available');
      return;
    }
    navigation.navigate('Chat', {
      recipient: {
        id: jobData.providerId,
        name: providerInfo?.name || 'Provider',
        role: 'PROVIDER',
      },
      jobId: jobData.id || jobId,
      jobTitle: jobData.title || jobData.serviceCategory || 'Service Request',
    });
  };

  const getStatusText = () => {
    switch (jobData?.status) {
      case 'traveling': return 'Provider is on the way';
      case 'arrived': return 'Provider has arrived';
      case 'in_progress': return 'Work in progress';
      default: return 'Tracking provider';
    }
  };

  const getStatusColor = () => {
    switch (jobData?.status) {
      case 'traveling': return '#00B14F';
      case 'arrived': return '#10B981';
      case 'in_progress': return '#8B5CF6';
      default: return '#00B14F';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#FFFFFF'}}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color="#00B14F" />
          <Text style={{marginTop: 16, color: '#6B7280'}}>Loading tracking...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!jobData) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#FFFFFF'}}>
        <View style={{padding: 16}}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Icon name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={{marginTop: 16, color: '#6B7280'}}>Job not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#FFFFFF'}} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: getStatusColor(),
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{flex: 1, marginLeft: 16}}>
          <Text style={{fontSize: 18, fontWeight: '600', color: '#FFFFFF'}}>
            Track Provider
          </Text>
          <Text style={{fontSize: 13, color: '#FFFFFF', opacity: 0.9}}>
            {getStatusText()}
          </Text>
        </View>
        <TouchableOpacity onPress={fitMapToMarkers}>
          <Icon name="locate" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={{flex: 1}}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: providerLocation?.latitude || clientLocation?.latitude || 10.1301,
          longitude: providerLocation?.longitude || clientLocation?.longitude || 124.8447,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}>
        
        {/* Provider Marker - Same style as ClientHomeScreen */}
        {providerLocation && (
          <Marker.Animated
            ref={markerRef}
            coordinate={providerCoordinate}
            title={providerInfo?.name || 'Provider'}
            anchor={{x: 0.5, y: 0.5}}
            flat={true}
            rotation={heading}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#FFF',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 3,
              borderColor: '#00B14F',
              overflow: 'hidden',
              elevation: 5,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}>
              {providerInfo?.photo ? (
                <Image 
                  source={{uri: providerInfo.photo}} 
                  style={{width: 38, height: 38, borderRadius: 19}} 
                />
              ) : (
                <Text style={{fontSize: 18, fontWeight: '700', color: '#00B14F'}}>
                  {providerInfo?.name?.charAt(0)?.toUpperCase() || 'P'}
                </Text>
              )}
            </View>
          </Marker.Animated>
        )}

        {/* Client/Destination Marker - Same style as ClientHomeScreen */}
        {clientLocation && (
          <Marker
            coordinate={clientLocation}
            title="Your Location"
            tracksViewChanges={false}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#FFF',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 3,
              borderColor: '#EF4444',
              overflow: 'hidden',
              elevation: 5,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}>
              <Icon name="home" size={22} color="#EF4444" />
            </View>
          </Marker>
        )}

        {/* Route Line - Same blue color as ClientHomeScreen */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#1A73E8"
            strokeWidth={5}
          />
        )}
      </MapView>

      {/* Bottom Card */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: -4},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
      }}>
        {/* Provider Info */}
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
          <View style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#F3F4F6',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
          }}>
            {providerInfo?.photo ? (
              <Image source={{uri: providerInfo.photo}} style={{width: 56, height: 56}} />
            ) : (
              <Icon name="person" size={28} color="#6B7280" />
            )}
          </View>
          <View style={{flex: 1, marginLeft: 12}}>
            <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937'}}>
              {providerInfo?.name || 'Provider'}
            </Text>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <View style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: getStatusColor(),
                marginRight: 6,
              }} />
              <Text style={{fontSize: 13, color: getStatusColor(), fontWeight: '500'}}>
                {getStatusText()}
              </Text>
            </View>
          </View>
        </View>

        {/* ETA Info */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: '#F3F4F6',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}>
          <View style={{flex: 1, alignItems: 'center'}}>
            <Icon name="speedometer-outline" size={24} color="#00B14F" />
            <Text style={{fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 4}}>
              {distance ? `${distance} km` : '--'}
            </Text>
            <Text style={{fontSize: 12, color: '#6B7280'}}>Distance</Text>
          </View>
          <View style={{width: 1, backgroundColor: '#E5E7EB'}} />
          <View style={{flex: 1, alignItems: 'center'}}>
            <Icon name="time-outline" size={24} color="#00B14F" />
            <Text style={{fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 4}}>
              {duration ? `${duration} min` : '--'}
            </Text>
            <Text style={{fontSize: 12, color: '#6B7280'}}>ETA</Text>
          </View>
        </View>

        {/* Contact Buttons */}
        <View style={{flexDirection: 'row'}}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#F3F4F6',
              paddingVertical: 14,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
            onPress={handleCallProvider}>
            <Icon name="call" size={20} color="#00B14F" />
            <Text style={{fontSize: 14, fontWeight: '600', color: '#1F2937', marginLeft: 8}}>
              Call
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#00B14F',
              paddingVertical: 14,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}
            onPress={handleMessageProvider}>
            <Icon name="chatbubble" size={20} color="#FFFFFF" />
            <Text style={{fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginLeft: 8}}>
              Message
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default JobTrackingScreen;
