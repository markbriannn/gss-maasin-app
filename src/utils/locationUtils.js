/**
 * Location and Distance Utilities
 * Centralized location-related calculations
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Return large number if any coordinate is missing
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;

  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distanceKm) => {
  if (!distanceKm || distanceKm === 999) return 'N/A';
  
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  
  return `${distanceKm.toFixed(1)}km`;
};

/**
 * Get estimated job time from average minutes
 * @param {number} avgMinutes - Average job duration in minutes
 * @returns {string|null} Formatted time string or null
 */
export const getEstimatedJobTime = (avgMinutes) => {
  if (!avgMinutes || avgMinutes <= 0) return null;
  
  if (avgMinutes >= 60) {
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  
  return `${avgMinutes}m`;
};

/**
 * Calculate ETA based on distance and average speed
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} avgSpeedKmh - Average speed in km/h (default: 30)
 * @returns {number} ETA in minutes
 */
export const calculateETA = (distanceKm, avgSpeedKmh = 30) => {
  if (!distanceKm || distanceKm === 999) return 0;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
};

/**
 * Format ETA for display
 * @param {number} minutes - ETA in minutes
 * @returns {string} Formatted ETA string
 */
export const formatETA = (minutes) => {
  if (!minutes || minutes <= 0) return 'N/A';
  
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  
  return `${minutes} min`;
};

/**
 * Decode Google Maps polyline to coordinates
 * @param {string} encoded - Encoded polyline string
 * @returns {Array} Array of {latitude, longitude} objects
 */
export const decodePolyline = (encoded) => {
  if (!encoded) return [];
  
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
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

    poly.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return poly;
};

/**
 * Check if location is within service area (Maasin City)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True if within service area
 */
export const isWithinServiceArea = (lat, lng) => {
  // Maasin City approximate bounds
  const MAASIN_CENTER = { lat: 10.1335, lng: 124.8513 };
  const MAX_DISTANCE_KM = 15; // 15km radius
  
  const distance = calculateDistance(lat, lng, MAASIN_CENTER.lat, MAASIN_CENTER.lng);
  return distance <= MAX_DISTANCE_KM;
};

/**
 * Get default center coordinates (Maasin City)
 * @returns {Object} {lat, lng}
 */
export const getDefaultCenter = () => ({
  lat: 10.1335,
  lng: 124.8513,
});
