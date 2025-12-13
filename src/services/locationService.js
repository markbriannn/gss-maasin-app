import Geolocation from 'react-native-geolocation-service';
import {Platform, PermissionsAndroid, Alert, Linking} from 'react-native';
import {PERMISSIONS, request, check, RESULTS} from 'react-native-permissions';
import {MAPS_CONFIG} from '../config/config';

class LocationService {
  constructor() {
    this.watchId = null;
  }

  // Request Location Permission
  async requestLocationPermission() {
    try {
      if (Platform.OS === 'ios') {
        const permission = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return permission === RESULTS.GRANTED;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'GSS needs access to your location to show nearby providers and enable tracking.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  // Check Location Permission
  async checkLocationPermission() {
    try {
      if (Platform.OS === 'ios') {
        const permission = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return permission === RESULTS.GRANTED;
      } else {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted;
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  // Get Current Location
  async getCurrentLocation() {
    return new Promise(async (resolve, reject) => {
      const hasPermission = await this.checkLocationPermission();
      
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          this.showLocationPermissionAlert();
          reject(new Error('Location permission denied'));
          return;
        }
      }

      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          console.error('Error getting current location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  // Watch Location (continuous tracking)
  watchLocation(callback, errorCallback) {
    this.watchId = Geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        console.error('Error watching location:', error);
        if (errorCallback) {
          errorCallback(error);
        }
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds
        fastestInterval: 2000,
        forceRequestLocation: true,
        showLocationDialog: true,
      }
    );

    return this.watchId;
  }

  // Stop Watching Location
  stopWatchingLocation() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Calculate Distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return parseFloat(distance.toFixed(2)); // Returns distance in km
  }

  toRad(value) {
    return (value * Math.PI) / 180;
  }

  // Format Distance for Display
  formatDistance(distanceInKm) {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)} m away`;
    }
    return `${distanceInKm.toFixed(1)} km away`;
  }

  // Get Address from Coordinates (Reverse Geocoding)
  async getAddressFromCoordinates(latitude, longitude) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${MAPS_CONFIG.API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const addressComponents = result.address_components;

        // Extract barangay, city, province
        let barangay = '';
        let city = '';
        let province = '';
        let street = '';

        addressComponents.forEach((component) => {
          if (component.types.includes('sublocality') || 
              component.types.includes('neighborhood')) {
            barangay = component.long_name;
          }
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
          if (component.types.includes('administrative_area_level_2')) {
            province = component.long_name;
          }
          if (component.types.includes('route')) {
            street = component.long_name;
          }
        });

        return {
          formattedAddress: result.formatted_address,
          street,
          barangay,
          city,
          province,
          components: addressComponents,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting address from coordinates:', error);
      return null;
    }
  }

  // Get Coordinates from Address (Geocoding)
  async getCoordinatesFromAddress(address) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${MAPS_CONFIG.API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting coordinates from address:', error);
      return null;
    }
  }

  // Show Location Permission Alert
  showLocationPermissionAlert() {
    Alert.alert(
      'Location Permission Required',
      'GSS needs access to your location to show nearby providers and enable tracking features. Please enable location permission in Settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  }

  // Get Default Maasin City Location
  getDefaultLocation() {
    return {
      latitude: MAPS_CONFIG.DEFAULT_LATITUDE,
      longitude: MAPS_CONFIG.DEFAULT_LONGITUDE,
    };
  }
}

export default new LocationService();
