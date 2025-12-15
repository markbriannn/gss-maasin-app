// User Roles
export const USER_ROLES = {
  CLIENT: 'CLIENT',
  PROVIDER: 'PROVIDER',
  ADMIN: 'ADMIN',
};

// Provider Status
export const PROVIDER_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
};

// Job Status
export const JOB_STATUS = {
  PENDING_ADMIN_REVIEW: 'PENDING_ADMIN_REVIEW',
  ADMIN_APPROVED: 'ADMIN_APPROVED',
  PENDING_PROVIDER: 'PENDING_PROVIDER',
  ACCEPTED_BY_PROVIDER: 'ACCEPTED_BY_PROVIDER',
  PROVIDER_TRAVELING: 'PROVIDER_TRAVELING',
  PROVIDER_ARRIVED: 'PROVIDER_ARRIVED',
  JOB_IN_PROGRESS: 'JOB_IN_PROGRESS',
  WORK_COMPLETED: 'WORK_COMPLETED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  JOB_CLOSED: 'JOB_CLOSED',
  CANCELLED: 'CANCELLED',
};

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'CASH',
  GCASH: 'GCASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CREDIT_CARD: 'CREDIT_CARD',
};

// Service Categories (limited to requested set)
export const SERVICE_CATEGORIES = [
  {id: 'electrician', name: 'Electrician', icon: 'flash', color: '#F59E0B'},
  {id: 'plumber', name: 'Plumber', icon: 'water', color: '#3B82F6'},
  {id: 'carpenter', name: 'Carpenter', icon: 'hammer', color: '#8B4513'},
  {id: 'cleaner', name: 'Cleaner', icon: 'sparkles', color: '#10B981'},
];

// Maasin City Barangays (All 70)
export const MAASIN_BARANGAYS = [
  'Abgao', 'Acasia', 'Asuncion', 'Bactul I', 'Bactul II', 'Badiang', 
  'Bagtican', 'Basak', 'Bato I', 'Bato II', 'Batuan', 'Baugo', 
  'Bilibol', 'Bogo', 'Cabadiangan', 'Cabulihan', 'Cagnituan', 'Cambooc', 
  'Cansirong', 'Canturing', 'Canyuom', 'Combado', 'Dongon', 'Gawisan', 
  'Guadalupe', 'Hanginan', 'Hantag', 'Hinapu Daku', 'Hinapu Gamay', 'Ibarra', 
  'Isagani (Pugaling)', 'Laboon', 'Lanao', 'Libertad', 'Libhu', 'Lib-og', 
  'Lonoy', 'Lunas', 'Mahayahay', 'Malapoc Norte', 'Malapoc Sur', 'Mambajao', 
  'Manhilo', 'Mantahan', 'Maria Clara', 'Matin-ao', 'Nasaug', 'Nati', 
  'Nonok Norte', 'Nonok Sur', 'Panan-awan', 'Pansaan', 'Pasay', 'Pinaskohan', 
  'Rizal', 'San Agustin (Lundag)', 'San Isidro', 'San Jose', 'San Rafael', 
  'Santa Cruz', 'Santo Niño', 'Santa Rosa', 'Santo Rosario', 'Soro-soro', 
  'Tagnipa', 'Tam-is', 'Tawid', 'Tigbawan', 'Tomoy-tomoy', 'Tunga-tunga'
];

// Notification Types
export const NOTIFICATION_TYPES = {
  JOB_APPROVED: 'JOB_APPROVED',
  JOB_ACCEPTED: 'JOB_ACCEPTED',
  PROVIDER_TRAVELING: 'PROVIDER_TRAVELING',
  PROVIDER_ARRIVED: 'PROVIDER_ARRIVED',
  WORK_COMPLETED: 'WORK_COMPLETED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  NEW_MESSAGE: 'NEW_MESSAGE',
  NEW_REVIEW: 'NEW_REVIEW',
  WITHDRAWAL_APPROVED: 'WITHDRAWAL_APPROVED',
  ACCOUNT_APPROVED: 'ACCOUNT_APPROVED',
  ADMIN_ANNOUNCEMENT: 'ADMIN_ANNOUNCEMENT',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
  LOCATION_PERMISSION_DENIED: 'Location permission is required to use this feature.',
  CAMERA_PERMISSION_DENIED: 'Camera permission is required to take photos.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  REGISTRATION_SUCCESS: 'Registration successful! Please wait for admin approval.',
  JOB_SUBMITTED: 'Job request submitted successfully!',
  PAYMENT_SUCCESS: 'Payment completed successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
};

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^(\+63|0)[0-9]{10}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};

// Provider Badges
export const PROVIDER_BADGES = [
  {id: 'newcomer', name: 'Newcomer', icon: 'star-outline', requirement: 1},
  {id: 'rising_star', name: 'Rising Star', icon: 'star-half', requirement: 10},
  {id: 'professional', name: 'Professional', icon: 'star', requirement: 50},
  {id: 'expert', name: 'Expert', icon: 'shield-checkmark', requirement: 100},
  {id: 'highly_rated', name: 'Highly Rated', icon: 'thumbs-up', requirement: 4.8},
  {id: 'speedy', name: 'Speedy', icon: 'speedometer', requirement: '10min'},
  {id: 'reliable', name: 'Reliable', icon: 'checkmark-circle', requirement: '98%'},
];

// Withdrawal Status
export const WITHDRAWAL_STATUS = {
  PENDING: 'PENDING_ADMIN_APPROVAL',
  APPROVED: 'APPROVED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
};

// App Configuration
export const APP_CONFIG = {
  SERVICE_FEE_PERCENTAGE: 5,
  MINIMUM_PAYOUT_AMOUNT: 100,
  CURRENCY_SYMBOL: '₱',
  APP_NAME: 'GSS Maasin',
  SUPPORT_EMAIL: 'support@gssmaasin.com',
  DEFAULT_LOCATION: {
    latitude: 10.1347,
    longitude: 124.8413,
    city: 'Maasin City',
    province: 'Southern Leyte',
  },
};
