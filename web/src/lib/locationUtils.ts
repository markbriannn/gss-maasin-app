/**
 * Location and Distance Utilities (TypeScript)
 * Centralized location-related calculations
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MobileCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
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
 */
export const formatDistance = (distanceKm: number): string => {
  if (!distanceKm || distanceKm === 999) return 'N/A';
  
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  
  return `${distanceKm.toFixed(1)}km`;
};

/**
 * Get estimated job time from average minutes
 */
export const getEstimatedJobTime = (avgMinutes?: number): string | null => {
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
 */
export const calculateETA = (distanceKm: number, avgSpeedKmh: number = 30): number => {
  if (!distanceKm || distanceKm === 999) return 0;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
};

/**
 * Format ETA for display
 */
export const formatETA = (minutes: number): string => {
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
 */
export const decodePolyline = (encoded: string): MobileCoordinates[] => {
  if (!encoded) return [];
  
  const poly: MobileCoordinates[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
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
 */
export const isWithinServiceArea = (lat: number, lng: number): boolean => {
  // Maasin City approximate bounds
  const MAASIN_CENTER = { lat: 10.1335, lng: 124.8513 };
  const MAX_DISTANCE_KM = 15; // 15km radius
  
  const distance = calculateDistance(lat, lng, MAASIN_CENTER.lat, MAASIN_CENTER.lng);
  return distance <= MAX_DISTANCE_KM;
};

/**
 * Get default center coordinates (Maasin City)
 */
export const getDefaultCenter = (): Coordinates => ({
  lat: 10.1335,
  lng: 124.8513,
});

/**
 * Get tier styling configuration
 */
export interface TierStyle {
  bg: string;
  label: string;
  color?: string;
}

export const getTierStyle = (tier?: string): TierStyle => {
  switch (tier?.toLowerCase()) {
    case 'diamond':
      return { bg: 'from-cyan-400 to-blue-500', label: 'DIAMOND', color: '#06B6D4' };
    case 'platinum':
      return { bg: 'from-gray-300 to-gray-500', label: 'PLATINUM', color: '#9CA3AF' };
    case 'gold':
      return { bg: 'from-yellow-400 to-yellow-600', label: 'GOLD', color: '#FBBF24' };
    case 'silver':
      return { bg: 'from-gray-200 to-gray-400', label: 'SILVER', color: '#D1D5DB' };
    case 'bronze':
    default:
      return { bg: 'from-amber-600 to-amber-800', label: 'BRONZE', color: '#D97706' };
  }
};
