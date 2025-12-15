/**
 * Centralized Error Handler
 * Converts technical errors to user-friendly messages
 */

// Error code mappings for Firebase and common errors
const ERROR_MESSAGES = {
  // Firebase Auth Errors
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password is too weak. Use at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/invalid-credential': 'Invalid login credentials. Please try again.',
  'auth/requires-recent-login': 'Please log in again to continue.',
  
  // Firestore Errors
  'permission-denied': 'You don\'t have permission to perform this action.',
  'not-found': 'The requested data was not found.',
  'already-exists': 'This item already exists.',
  'resource-exhausted': 'Too many requests. Please wait a moment.',
  'failed-precondition': 'Operation failed. Please try again.',
  'aborted': 'Operation was cancelled. Please try again.',
  'unavailable': 'Service temporarily unavailable. Please try again.',
  'data-loss': 'Data error occurred. Please contact support.',
  
  // Network Errors
  'NETWORK_ERROR': 'No internet connection. Please check your network.',
  'TIMEOUT': 'Request timed out. Please try again.',
  'SERVER_ERROR': 'Server error. Please try again later.',
  
  // Storage Errors
  'storage/unauthorized': 'You don\'t have permission to upload files.',
  'storage/canceled': 'Upload was cancelled.',
  'storage/unknown': 'An error occurred while uploading. Please try again.',
  'storage/object-not-found': 'File not found.',
  'storage/quota-exceeded': 'Storage quota exceeded. Please contact support.',
  
  // Payment Errors
  'payment/failed': 'Payment failed. Please try again or use a different method.',
  'payment/cancelled': 'Payment was cancelled.',
  'payment/insufficient-funds': 'Insufficient funds. Please try a different payment method.',
  
  // Location Errors
  'location/permission-denied': 'Location permission denied. Please enable it in settings.',
  'location/unavailable': 'Unable to get your location. Please try again.',
  'location/timeout': 'Location request timed out. Please try again.',
};

// Default messages by error type
const DEFAULT_MESSAGES = {
  auth: 'Authentication failed. Please try again.',
  firestore: 'Unable to load data. Please try again.',
  storage: 'File operation failed. Please try again.',
  network: 'Connection error. Please check your internet.',
  payment: 'Payment error. Please try again.',
  location: 'Location error. Please try again.',
  default: 'Something went wrong. Please try again.',
};

/**
 * Get user-friendly error message
 * @param {Error|string} error - The error object or message
 * @param {string} context - Optional context (auth, firestore, etc.)
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error, context = 'default') => {
  if (!error) return DEFAULT_MESSAGES.default;
  
  // Handle string errors
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || error;
  }
  
  // Get error code
  const errorCode = error.code || error.message || '';
  
  // Check for specific error code
  if (ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }
  
  // Check for partial matches
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorCode.includes(key)) {
      return message;
    }
  }
  
  // Check for network errors
  if (
    errorCode.includes('network') ||
    errorCode.includes('Network') ||
    error.message?.includes('network') ||
    error.message?.includes('Network')
  ) {
    return DEFAULT_MESSAGES.network;
  }
  
  // Return context-specific default
  return DEFAULT_MESSAGES[context] || DEFAULT_MESSAGES.default;
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error) => {
  if (!error) return false;
  const errorStr = (error.code || error.message || '').toLowerCase();
  return (
    errorStr.includes('network') ||
    errorStr.includes('timeout') ||
    errorStr.includes('unavailable') ||
    errorStr.includes('offline')
  );
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error) => {
  if (!error) return false;
  const errorCode = error.code || '';
  const retryableCodes = [
    'unavailable',
    'resource-exhausted',
    'aborted',
    'TIMEOUT',
    'NETWORK_ERROR',
  ];
  return retryableCodes.some(code => errorCode.includes(code));
};

/**
 * Log error for debugging (can be extended to send to analytics)
 */
export const logError = (error, context = '', additionalInfo = {}) => {
  console.error(`[${context}] Error:`, {
    code: error?.code,
    message: error?.message,
    ...additionalInfo,
  });
};

export default {
  getErrorMessage,
  isNetworkError,
  isRetryableError,
  logError,
};
