import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import Geolocation from 'react-native-geolocation-service';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBpGzpP1vVxZBIsw6gzkUPPDABSl8FktL4';

const DirectionsScreen = ({navigation, route}) => {
  const {destination, destinationName, jobTitle} = route.params || {};
  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [steps, setSteps] = useState([]);
  const [showSteps, setShowSteps] = useState(false);

  // Default to Maasin City center (on land) if no destination
  // Coordinates: Maasin City Hall area
  const parseCoord = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val);
    return null;
  };
  
  const destLat = parseCoord(destination?.latitude);
  const destLng = parseCoord(destination?.longitude);
  
  const destinationCoords = {
    latitude: (destLat && !isNaN(destLat)) ? destLat : 10.1335,
    longitude: (destLng && !isNaN(destLng)) ? destLng : 124.8513,
  };
  
  console.log('DirectionsScreen - Received destination:', destination);
  console.log('DirectionsScreen - Using coords:', destinationCoords);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        setCurrentLocation({latitude, longitude});
        setIsLoading(false);

        // Get directions from Google Directions API
        fetchDirections({latitude, longitude}, destinationCoords);

        // Fit map to show both points
        setTimeout(() => {
          fitMapToMarkers({latitude, longitude});
        }, 500);
      },
      error => {
        console.log('Location error:', error);
        // Use default location (Maasin City center - on land)
        const defaultLocation = {latitude: 10.1335, longitude: 124.8513};
        setCurrentLocation(defaultLocation);
        setIsLoading(false);
        fetchDirections(defaultLocation, destinationCoords);
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  };

  const fitMapToMarkers = origin => {
    if (mapRef.current) {
      mapRef.current.fitToCoordinates([origin, destinationCoords], {
        edgePadding: {top: 100, right: 50, bottom: 250, left: 50},
        animated: true,
      });
    }
  };

  // Decode Google's encoded polyline
  const decodePolyline = encoded => {
    const points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  };

  // Fetch directions using OSRM (free, no API key needed)
  const fetchDirectionsOSRM = async (origin, dest) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson&steps=true`;
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
        setDistance(route.distance / 1000);
        // Duration in seconds, convert to minutes
        setDuration(Math.round(route.duration / 60));

        // Extract turn-by-turn steps from OSRM
        if (route.legs?.[0]?.steps) {
          const directionSteps = route.legs[0].steps.map((step, index) => ({
            id: index,
            instruction: step.name || step.maneuver?.type || 'Continue',
            distance: `${(step.distance / 1000).toFixed(1)} km`,
            duration: `${Math.round(step.duration / 60)} min`,
            maneuver: step.maneuver?.type || 'straight',
          }));
          setSteps(directionSteps);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.log('OSRM routing failed:', error);
      return false;
    }
  };

  // Fetch directions from Google Directions API
  const fetchDirections = async (origin, dest) => {
    // Try OSRM first (free, no API key)
    const osrmSuccess = await fetchDirectionsOSRM(origin, dest);
    if (osrmSuccess) return;

    // Fallback to Google Directions API
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        // Decode the polyline for accurate route
        const points = decodePolyline(route.overview_polyline.points);
        setRouteCoordinates(points);

        // Set distance and duration from API
        setDistance(leg.distance.value / 1000); // Convert meters to km
        setDuration(Math.round(leg.duration.value / 60)); // Convert seconds to minutes

        // Extract turn-by-turn steps
        const directionSteps = leg.steps.map((step, index) => ({
          id: index,
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
          distance: step.distance.text,
          duration: step.duration.text,
          maneuver: step.maneuver || 'straight',
        }));
        setSteps(directionSteps);
      } else {
        console.log('Directions API error:', data.status);
        // Fallback to straight line
        fallbackToStraightLine(origin, dest);
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
      // Fallback to straight line
      fallbackToStraightLine(origin, dest);
    }
  };

  // Fallback to straight line if API fails
  const fallbackToStraightLine = (origin, dest) => {
    setRouteCoordinates([origin, dest]);

    // Calculate distance using Haversine formula
    const dist = calculateDistance(
      origin.latitude,
      origin.longitude,
      dest.latitude,
      dest.longitude,
    );
    setDistance(dist);

    // Estimate duration (assuming 30 km/h average speed)
    const durationMins = Math.round((dist / 30) * 60);
    setDuration(durationMins);
  };

  // Haversine formula to calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = deg => deg * (Math.PI / 180);

  const handleRecenter = () => {
    if (currentLocation && mapRef.current) {
      fitMapToMarkers(currentLocation);
    }
  };

  const handleOpenExternalMaps = () => {
    Alert.alert(
      'Open in Maps App',
      'Would you like to open directions in Google Maps for turn-by-turn navigation?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Open',
          onPress: () => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationCoords.latitude},${destinationCoords.longitude}`;
            Linking.openURL(url);
          },
        },
      ],
    );
  };

  // Get icon for maneuver type
  const getManeuverIcon = maneuver => {
    if (maneuver?.includes('left')) return 'arrow-back';
    if (maneuver?.includes('right')) return 'arrow-forward';
    if (maneuver?.includes('uturn')) return 'return-down-back';
    if (maneuver?.includes('roundabout')) return 'sync';
    return 'arrow-up';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#FFFFFF'}}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color="#00B14F" />
          <Text style={{marginTop: 16, color: '#6B7280'}}>
            Getting your location...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#FFFFFF'}} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#00B14F',
        }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{flex: 1, marginLeft: 16}}>
          <Text style={{fontSize: 18, fontWeight: '600', color: '#FFFFFF'}}>
            Directions
          </Text>
          <Text
            style={{fontSize: 13, color: '#FFFFFF', opacity: 0.9}}
            numberOfLines={1}>
            {jobTitle || 'To Client Location'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleOpenExternalMaps}>
          <Icon name="open-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={{flex: 1}}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: currentLocation?.latitude || 10.1335,
          longitude: currentLocation?.longitude || 124.8513,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}>
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker coordinate={currentLocation} title="Your Location">
            <View
              style={{
                backgroundColor: '#3B82F6',
                padding: 8,
                borderRadius: 20,
                borderWidth: 3,
                borderColor: '#FFFFFF',
              }}>
              <Icon name="navigate" size={20} color="#FFFFFF" />
            </View>
          </Marker>
        )}

        {/* Destination Marker */}
        <Marker
          coordinate={destinationCoords}
          title={destinationName || 'Client Location'}>
          <View style={{alignItems: 'center'}}>
            <View
              style={{
                backgroundColor: '#EF4444',
                padding: 8,
                borderRadius: 20,
                borderWidth: 3,
                borderColor: '#FFFFFF',
              }}>
              <Icon name="location" size={20} color="#FFFFFF" />
            </View>
          </View>
        </Marker>

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
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
        onPress={handleRecenter}>
        <Icon name="locate" size={24} color="#00B14F" />
      </TouchableOpacity>

      {/* Bottom Info Card */}
      <View
        style={{
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
          maxHeight: showSteps ? '60%' : 'auto',
        }}>
        {/* Destination Info */}
        <View
          style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
          <View
            style={{
              backgroundColor: '#FEE2E2',
              padding: 10,
              borderRadius: 12,
            }}>
            <Icon name="location" size={24} color="#EF4444" />
          </View>
          <View style={{flex: 1, marginLeft: 12}}>
            <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937'}}>
              {destinationName || 'Client Location'}
            </Text>
            <Text style={{fontSize: 13, color: '#6B7280', marginTop: 2}}>
              Destination
            </Text>
          </View>
        </View>

        {/* Distance & Duration */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#F3F4F6',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}>
          <View style={{flex: 1, alignItems: 'center'}}>
            <Icon name="speedometer-outline" size={24} color="#00B14F" />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#1F2937',
                marginTop: 4,
              }}>
              {distance ? `${distance.toFixed(1)} km` : '--'}
            </Text>
            <Text style={{fontSize: 12, color: '#6B7280'}}>Distance</Text>
          </View>
          <View style={{width: 1, backgroundColor: '#E5E7EB'}} />
          <View style={{flex: 1, alignItems: 'center'}}>
            <Icon name="time-outline" size={24} color="#3B82F6" />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#1F2937',
                marginTop: 4,
              }}>
              {duration ? `${duration} min` : '--'}
            </Text>
            <Text style={{fontSize: 12, color: '#6B7280'}}>Est. Time</Text>
          </View>
        </View>

        {/* Turn-by-turn Steps Toggle */}
        {steps.length > 0 && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              marginBottom: 8,
            }}
            onPress={() => setShowSteps(!showSteps)}>
            <Icon
              name={showSteps ? 'chevron-down' : 'chevron-up'}
              size={20}
              color="#00B14F"
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#00B14F',
                marginLeft: 4,
              }}>
              {showSteps ? 'Hide' : 'Show'} Directions ({steps.length} steps)
            </Text>
          </TouchableOpacity>
        )}

        {/* Turn-by-turn Steps List */}
        {showSteps && steps.length > 0 && (
          <ScrollView
            style={{maxHeight: 200, marginBottom: 16}}
            showsVerticalScrollIndicator={false}>
            {steps.map((step, index) => (
              <View
                key={step.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  paddingVertical: 10,
                  borderBottomWidth: index < steps.length - 1 ? 1 : 0,
                  borderBottomColor: '#E5E7EB',
                }}>
                <View
                  style={{
                    backgroundColor: '#E8F5E9',
                    padding: 8,
                    borderRadius: 8,
                    marginRight: 12,
                  }}>
                  <Icon
                    name={getManeuverIcon(step.maneuver)}
                    size={18}
                    color="#00B14F"
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text
                    style={{fontSize: 14, color: '#1F2937', lineHeight: 20}}>
                    {step.instruction}
                  </Text>
                  <Text style={{fontSize: 12, color: '#6B7280', marginTop: 2}}>
                    {step.distance} • {step.duration}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Action Buttons */}
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
            onPress={handleOpenExternalMaps}>
            <Icon name="navigate-circle-outline" size={20} color="#1F2937" />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#1F2937',
                marginLeft: 8,
              }}>
              Google Maps
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
            onPress={() => navigation.goBack()}>
            <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#FFFFFF',
                marginLeft: 8,
              }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default DirectionsScreen;
