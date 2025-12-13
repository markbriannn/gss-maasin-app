import {
  API_BASE_URL,
  SOCKET_URL,
  GOOGLE_MAPS_API_KEY,
} from '@env';

// API Configuration
export const API_CONFIG = {
  BASE_URL: API_BASE_URL || 'http://localhost:3001/api',
  TIMEOUT: 30000,
  SOCKET_URL: SOCKET_URL || 'http://localhost:3001',
};

// Google Maps Configuration
export const MAPS_CONFIG = {
  API_KEY: GOOGLE_MAPS_API_KEY,
  DEFAULT_LATITUDE: 10.1301,
  DEFAULT_LONGITUDE: 124.8447,
  DEFAULT_ZOOM: 14,
  PROVIDER_SEARCH_RADIUS: 10,
};

// App Configuration
export const APP_CONFIG = {
  NAME: 'GSS Maasin',
  VERSION: '1.0.0',
  MIN_WITHDRAWAL_AMOUNT: 500,
  LOCATION_UPDATE_INTERVAL: 5000,
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024,
  MAX_VIDEO_SIZE: 50 * 1024 * 1024,
  MAX_PHOTOS_PER_JOB: 5,
  SESSION_TIMEOUT: 30 * 60 * 1000,
};

// Feature Flags
export const FEATURES = {
  BIOMETRIC_AUTH: true,
  SOCIAL_LOGIN: true,
  DARK_MODE: true,
  OFFLINE_MODE: true,
};
