import React, {useState, useEffect, useRef} from 'react';
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
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import {db} from '../../config/firebase';
import {doc, onSnapshot, getDoc} from 'firebase/firestore';
import locationService from '../../services/locationService';
import {MAPS_CONFIG} from '../../config/config';

const JobTrackingScreen = ({navigation, route}) => {
  const {jobId, job} = route.params || {};
  const mapRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [jobData, setJobData] = useState(job || null);
  const [providerLocation, setProviderLocation] = useState(null);
  const [clientLocation, setClientLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);

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

          // Get provider location from booking
          if (data.providerLocation) {
            setProviderLocation({
              latitude: data.providerLocation.latitude,
              longitude: data.providerLocation.longitude,
            });
          }

          // Get client location from booking or user profile
          if (data.latitude && data.longitude) {
            setClientLocation({
              latitude: data.latitude,
              longitude: data.longitude,
            });
          }

          // Fetch provider info if not already loaded
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
                  // Also get provider's current location from their profile
                  latitude: pData.latitude,
                  longitude: pData.longitude,
                });
                // Use provider's profile location if booking doesn't have it
                if (!data.providerLocation && pData.latitude && pData.longitude) {
                  setProviderLocation({
                    latitude: pData.latitude,
                    longitude: pData.longitude,
                  });
                }
              }
            } catch (e) {
              console.log('Error fetching provider:', e);
            }
          }
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to job:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId, job?.id]);

  // Also listen to provider's user document for real-time location
  useEffect(() => {
    const providerId = jobData?.providerId || job?.providerId;
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
            setProviderInfo(prev => ({
              ...prev,
              id: docSnap.id,
              name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || prev?.name || 'Provider',
              phone: data.phone || prev?.phone,
              photo: data.profilePhoto || prev?.photo,
            }));
          }
        }
      },
      (error) => {
        console.log('Error listening to provider location:', error);
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
          // Use default Maasin City location
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

  // Fetch route using OSRM (free, no API key needed)
  const fetchRouteOSRM = async (origin, dest) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes?.[0]) {
        const route = data.routes[0];
        // OSRM returns [lng, lat], we need {latitude, longitude}
        const points = route.geometry.coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoordinates(points);
        // Distance in meters, convert to km
        setDistance((route.distance / 1000).toFixed(1));
        // Duration in seconds, convert to minutes
        setDuration(Math.round(route.duration / 60));
        return true;
      }
      return false;
    } catch (error) {
      console.log('OSRM routing failed:', error);
      return false;
    }
  };

  const fetchRoute = async (origin, dest) => {
    // Try OSRM first (free, no API key)
    const osrmSuccess = await fetchRouteOSRM(origin, dest);
    if (osrmSuccess) return;

    // Fallback to Google Directions API
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}&mode=driving&key=${MAPS_CONFIG.API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        const points = decodePolyline(route.overview_polyline.points);
        setRouteCoordinates(points);
        setDistance((leg.distance.value / 1000).toFixed(1));
        setDuration(Math.round(leg.duration.value / 60));
      } else {
        // Final fallback to straight line
        setRouteCoordinates([origin, dest]);
        const dist = locationService.calculateDistance(
          origin.latitude, origin.longitude,
          dest.latitude, dest.longitude
        );
        setDistance(dist.toFixed(1));
        setDuration(Math.round((dist / 30) * 60));
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      setRouteCoordinates([origin, dest]);
    }
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
      case 'traveling': return '#3B82F6';
      case 'arrived': return '#10B981';
      case 'in_progress': return '#8B5CF6';
      default: return '#6B7280';
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
          latitude: providerLocation?.latitude || clientLocation?.latitude || MAPS_CONFIG.DEFAULT_LATITUDE,
          longitude: providerLocation?.longitude || clientLocation?.longitude || MAPS_CONFIG.DEFAULT_LONGITUDE,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Provider Marker */}
        {providerLocation && (
          <Marker
            coordinate={providerLocation}
            title={providerInfo?.name || 'Provider'}
            description="Provider's current location"
          >
            <View style={{alignItems: 'center'}}>
              <View style={{
                backgroundColor: '#3B82F6',
                padding: 8,
                borderRadius: 20,
                borderWidth: 3,
                borderColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}>
                <Icon name="car" size={20} color="#FFFFFF" />
              </View>
              <View style={{
                backgroundColor: '#3B82F6',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                marginTop: 4,
              }}>
                <Text style={{fontSize: 10, color: '#FFFFFF', fontWeight: '600'}}>
                  {providerInfo?.name?.split(' ')[0] || 'Provider'}
                </Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Client/Destination Marker */}
        {clientLocation && (
          <Marker
            coordinate={clientLocation}
            title="Your Location"
            description="Destination"
          >
            <View style={{alignItems: 'center'}}>
              <View style={{
                backgroundColor: '#10B981',
                padding: 8,
                borderRadius: 20,
                borderWidth: 3,
                borderColor: '#FFFFFF',
              }}>
                <Icon name="home" size={20} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        )}

        {/* Route Line */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#3B82F6"
            strokeWidth={4}
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
                width: 8,
                height: 8,
                borderRadius: 4,
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
            <Icon name="speedometer-outline" size={24} color="#3B82F6" />
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
            onPress={handleCallProvider}
          >
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
            onPress={handleMessageProvider}
          >
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
