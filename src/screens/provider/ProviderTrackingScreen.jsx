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
import {doc, onSnapshot, getDoc, updateDoc} from 'firebase/firestore';
import locationService from '../../services/locationService';
import {useAuth} from '../../context/AuthContext';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBpGzpP1vVxZBIsw6gzkUPPDABSl8FktL4';
const ANIMATION_DURATION = 1000; // 1 second smooth animation
const FIRESTORE_UPDATE_INTERVAL = 15000; // Only write to Firestore every 15 seconds (saves quota)
const MIN_DISTANCE_FOR_UPDATE = 20; // Only update if moved at least 20 meters

const ProviderTrackingScreen = ({navigation, route}) => {
  const {jobId, job} = route.params || {};
  const {user} = useAuth();
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const locationWatchId = useRef(null);
  const lastFirestoreUpdate = useRef(0); // Track last Firestore write time
  const lastWrittenLocation = useRef(null); // Track last written location
  
  const [isLoading, setIsLoading] = useState(true);
  const [jobData, setJobData] = useState(job || null);
  const [providerLocation, setProviderLocation] = useState(null);
  const [clientLocation, setClientLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
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

  // Listen to job updates
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

          // Get client location from booking
          if (data.latitude && data.longitude) {
            setClientLocation({
              latitude: data.latitude,
              longitude: data.longitude,
            });
          }

          // Fetch client info
          if (data.clientId && !clientInfo) {
            try {
              const clientDoc = await getDoc(doc(db, 'users', data.clientId));
              if (clientDoc.exists()) {
                const cData = clientDoc.data();
                setClientInfo({
                  id: clientDoc.id,
                  name: `${cData.firstName || ''} ${cData.lastName || ''}`.trim() || 'Client',
                  phone: cData.phone,
                  photo: cData.profilePhoto,
                  address: data.address || cData.address,
                });
              }
            } catch (e) {
              console.log('Error fetching client:', e);
            }
          }
        }
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId, job?.id]);

  // Watch provider's location and update in real-time with smooth animation
  useEffect(() => {
    // Helper function to check if we should write to Firestore
    const shouldWriteToFirestore = (newLoc) => {
      const now = Date.now();
      const timeSinceLastWrite = now - lastFirestoreUpdate.current;
      
      // Always write if enough time has passed
      if (timeSinceLastWrite >= FIRESTORE_UPDATE_INTERVAL) {
        return true;
      }
      
      // Also write if moved significantly (even if time hasn't passed)
      if (lastWrittenLocation.current) {
        const distanceMoved = locationService.calculateDistance(
          lastWrittenLocation.current.latitude,
          lastWrittenLocation.current.longitude,
          newLoc.latitude,
          newLoc.longitude
        ) * 1000; // Convert km to meters
        
        if (distanceMoved >= MIN_DISTANCE_FOR_UPDATE && timeSinceLastWrite >= 5000) {
          return true;
        }
      }
      
      return false;
    };

    // Helper function to write location to Firestore
    const writeLocationToFirestore = async (location) => {
      const docId = jobId || job?.id;
      try {
        if (user?.uid) {
          await updateDoc(doc(db, 'users', user.uid), {
            latitude: location.latitude,
            longitude: location.longitude,
            lastLocationUpdate: new Date(),
          });
        }

        if (docId) {
          await updateDoc(doc(db, 'bookings', docId), {
            providerLocation: {
              latitude: location.latitude,
              longitude: location.longitude,
              updatedAt: new Date(),
            },
          });
        }
        
        lastFirestoreUpdate.current = Date.now();
        lastWrittenLocation.current = location;
      } catch (e) {
        console.log('Error updating location:', e);
      }
    };

    const startLocationTracking = async () => {
      try {
        // Get initial location
        const location = await locationService.getCurrentLocation();
        const initialLoc = {
          latitude: location.latitude,
          longitude: location.longitude,
        };
        
        // Set initial position immediately (no animation for first position)
        providerCoordinate.setValue({
          latitude: initialLoc.latitude,
          longitude: initialLoc.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
        setProviderLocation(initialLoc);

        // Write initial location to Firestore
        await writeLocationToFirestore(initialLoc);
      } catch (error) {
        console.log('Error getting location:', error);
        const defaultLoc = locationService.getDefaultLocation();
        providerCoordinate.setValue({
          latitude: defaultLoc.latitude,
          longitude: defaultLoc.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
        setProviderLocation(defaultLoc);
      }
    };

    startLocationTracking();

    // Set up location watching with smooth animation
    locationWatchId.current = locationService.watchLocation(
      async (location) => {
        const newLoc = {
          latitude: location.latitude,
          longitude: location.longitude,
        };
        
        // Always animate marker smoothly (local update - no Firestore cost)
        animateMarker(newLoc);

        // Only write to Firestore if throttle conditions are met (saves quota!)
        if (shouldWriteToFirestore(newLoc)) {
          await writeLocationToFirestore(newLoc);
        }
      },
      (error) => console.log('Location watch error:', error)
    );

    return () => {
      if (locationWatchId.current) {
        locationService.stopWatchingLocation();
      }
    };
  }, [user?.uid, jobId, job?.id]);

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

  const handleCallClient = () => {
    if (clientInfo?.phone) {
      Linking.openURL(`tel:${clientInfo.phone}`);
    } else {
      Alert.alert('Not Available', 'Client phone number not available');
    }
  };

  const handleMessageClient = () => {
    if (!jobData?.clientId) {
      Alert.alert('Not Available', 'Client information not available');
      return;
    }
    navigation.navigate('Chat', {
      recipient: {
        id: jobData.clientId,
        name: clientInfo?.name || 'Client',
        role: 'CLIENT',
      },
      jobId: jobData.id || jobId,
      jobTitle: jobData.title || jobData.serviceCategory || 'Service Request',
    });
  };

  const handleOpenGoogleMaps = () => {
    if (clientLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${clientLocation.latitude},${clientLocation.longitude}`;
      Linking.openURL(url);
    }
  };

  const getStatusText = () => {
    switch (jobData?.status) {
      case 'traveling': return 'Navigating to client';
      case 'arrived': return 'You have arrived';
      case 'in_progress': return 'Work in progress';
      default: return 'Navigate to client';
    }
  };

  const getStatusColor = () => {
    switch (jobData?.status) {
      case 'traveling': return '#3B82F6';
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
          <Text style={{marginTop: 16, color: '#6B7280'}}>Loading navigation...</Text>
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
            Navigate to Client
          </Text>
          <Text style={{fontSize: 13, color: '#FFFFFF', opacity: 0.9}}>
            {getStatusText()}
          </Text>
        </View>
        <TouchableOpacity onPress={handleOpenGoogleMaps}>
          <Icon name="navigate-circle" size={28} color="#FFFFFF" />
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
        {/* Animated Provider (You) Marker */}
        {providerLocation && (
          <Marker.Animated
            ref={markerRef}
            coordinate={providerCoordinate}
            title="Your Location"
            anchor={{x: 0.5, y: 0.5}}
            flat={true}
            rotation={heading}>
            <View style={{alignItems: 'center'}}>
              <View style={{
                backgroundColor: '#3B82F6',
                padding: 10,
                borderRadius: 25,
                borderWidth: 3,
                borderColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
                transform: [{rotate: `${heading}deg`}],
              }}>
                <Icon name="car" size={22} color="#FFFFFF" />
              </View>
              <View style={{
                backgroundColor: '#3B82F6',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 10,
                marginTop: 6,
              }}>
                <Text style={{fontSize: 11, color: '#FFFFFF', fontWeight: '700'}}>You</Text>
              </View>
            </View>
          </Marker.Animated>
        )}

        {/* Client Marker */}
        {clientLocation && (
          <Marker 
            coordinate={clientLocation} 
            title={clientInfo?.name || 'Client'}
            tracksViewChanges={false}>
            <View style={{alignItems: 'center'}}>
              <View style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                borderWidth: 3,
                borderColor: '#EF4444',
                backgroundColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
              }}>
                {clientInfo?.photo ? (
                  <Image 
                    source={{uri: clientInfo.photo}} 
                    style={{width: 44, height: 44, borderRadius: 22}} 
                  />
                ) : (
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: '#EF4444',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Icon name="location" size={22} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <View style={{
                backgroundColor: '#EF4444',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 10,
                marginTop: 6,
              }}>
                <Text style={{fontSize: 11, color: '#FFFFFF', fontWeight: '700'}}>
                  {clientInfo?.name?.split(' ')[0] || 'Client'}
                </Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Route Line */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#00B14F"
            strokeWidth={5}
          />
        )}
      </MapView>

      {/* Recenter Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          right: 16,
          top: 80,
          backgroundColor: '#FFFFFF',
          padding: 12,
          borderRadius: 12,
          elevation: 4,
        }}
        onPress={fitMapToMarkers}>
        <Icon name="locate" size={24} color="#00B14F" />
      </TouchableOpacity>

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
        elevation: 10,
      }}>
        {/* Client Info */}
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
            {clientInfo?.photo ? (
              <Image source={{uri: clientInfo.photo}} style={{width: 56, height: 56}} />
            ) : (
              <Icon name="person" size={28} color="#6B7280" />
            )}
          </View>
          <View style={{flex: 1, marginLeft: 12}}>
            <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937'}}>
              {clientInfo?.name || 'Client'}
            </Text>
            <Text style={{fontSize: 13, color: '#6B7280', marginTop: 2}} numberOfLines={1}>
              {clientInfo?.address || jobData?.address || 'Client location'}
            </Text>
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
            onPress={handleCallClient}>
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
            onPress={handleMessageClient}>
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

export default ProviderTrackingScreen;
