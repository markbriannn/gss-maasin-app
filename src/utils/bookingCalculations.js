/**
 * Centralized booking price calculations
 * Handles additional charges consistently across the app
 */

/**
 * Calculate total with additional charges
 * @param {Object} booking - The booking object
 * @param {number} booking.providerPrice - Provider's base price
 * @param {number} booking.fixedPrice - Fixed price (fallback)
 * @param {number} booking.totalAmount - Total amount (fallback)
 * @param {number} booking.price - Price (fallback)
 * @param {Array} booking.additionalCharges - Array of additional charges
 * @param {number} booking.discount - Discount amount (for old bookings)
 * @returns {number} Total amount
 */
export const calculateBookingTotal = (booking) => {
  if (!booking) return 0;

  // Get base price
  const basePrice = booking.providerPrice || booking.fixedPrice || booking.totalAmount || booking.price || 0;

  // Get approved additional charges
  const approvedCharges = (booking.additionalCharges || [])
    .filter(charge => charge.status === 'approved')
    .reduce((sum, charge) => sum + (charge.total || charge.amount || 0), 0);

  // Get discount (for backward compatibility with old bookings)
  const discount = booking.discountAmount || booking.discount || 0;

  return basePrice + approvedCharges - discount;
};

/**
 * Calculate provider earnings (what provider receives)
 * @param {Object} booking - The booking object
 * @returns {number} Provider earnings
 */
export const calculateProviderEarnings = (booking) => {
  if (!booking) return 0;

  // Provider earnings = base price + approved charges (no system fee)
  const basePrice = booking.providerPrice || booking.fixedPrice || booking.price || 0;
  
  const approvedCharges = (booking.additionalCharges || [])
    .filter(charge => charge.status === 'approved')
    .reduce((sum, charge) => sum + (charge.amount || 0), 0);

  return basePrice + approvedCharges;
};

/**
 * Calculate client total (what client pays including system fee)
 * @param {Object} booking - The booking object
 * @returns {number} Client total
 */
export const calculateClientTotal = (booking) => {
  if (!booking) return 0;

  const providerEarnings = calculateProviderEarnings(booking);
  const systemFee = providerEarnings * 0.05; // 5% system fee (exact, no rounding)
  
  return providerEarnings + systemFee;
};

/**
 * Get additional charges summary
 * @param {Array} additionalCharges - Array of additional charges
 * @returns {Object} Summary with counts and totals
 */
export const getAdditionalChargesSummary = (additionalCharges = []) => {
  const approved = additionalCharges.filter(c => c.status === 'approved');
  const pending = additionalCharges.filter(c => c.status === 'pending');
  const rejected = additionalCharges.filter(c => c.status === 'rejected');

  const approvedTotal = approved.reduce((sum, c) => sum + (c.total || c.amount || 0), 0);
  const pendingTotal = pending.reduce((sum, c) => sum + (c.total || c.amount || 0), 0);

  return {
    approved: {
      count: approved.length,
      total: approvedTotal,
      items: approved,
    },
    pending: {
      count: pending.length,
      total: pendingTotal,
      items: pending,
    },
    rejected: {
      count: rejected.length,
      items: rejected,
    },
    hasAny: additionalCharges.length > 0,
    hasPending: pending.length > 0,
  };
};

/**
 * Validate additional charge data
 * @param {number} amount - Charge amount
 * @param {string} description - Charge description
 * @returns {Object} Validation result
 */
export const validateAdditionalCharge = (amount, description) => {
  const errors = [];

  if (!amount || isNaN(amount) || amount <= 0) {
    errors.push('Please enter a valid amount greater than 0');
  }

  if (!description || description.trim().length === 0) {
    errors.push('Please enter a description');
  }

  if (description && description.trim().length > 100) {
    errors.push('Description must be 100 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Create additional charge object
 * @param {number} amount - Charge amount
 * @param {string} description - Charge description
 * @returns {Object} Additional charge object
 */
export const createAdditionalCharge = (amount, description) => {
  const systemFee = parseFloat(amount) * 0.05; // 5% system fee (exact, no rounding)
  const total = parseFloat(amount) + systemFee;

  return {
    id: Date.now().toString(),
    description: description.trim(),
    reason: description.trim(),
    amount: parseFloat(amount),
    total,
    systemFee,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };
};

/**
 * Calculate upfront payment (50% of base price)
 * Rounds to 2 decimal places to match PayMongo's centavo rounding
 * @param {Object} booking - The booking object
 * @returns {number} Upfront payment amount
 */
export const calculateUpfrontPayment = (booking) => {
  if (!booking) return 0;

  // Use providerPrice first (doesn't include system fee), fallback to totalAmount if needed
  const providerPrice = booking.providerPrice || booking.fixedPrice || booking.price || 0;
  
  // If we have providerPrice, calculate total with system fee
  if (providerPrice > 0) {
    const systemFee = providerPrice * 0.05; // Exact calculation
    const clientTotal = providerPrice + systemFee;
    // Round upfront to 2 decimals (matches PayMongo centavo rounding)
    return Math.round((clientTotal * 0.5) * 100) / 100;
  }
  
  // Fallback: if totalAmount is already set (includes system fee), use it directly
  const clientTotal = booking.totalAmount || 0;
  // Round upfront to 2 decimals (matches PayMongo centavo rounding)
  return Math.round((clientTotal * 0.5) * 100) / 100;
};

/**
 * Calculate completion payment (50% + additional charges)
 * Uses exact difference from upfront to avoid rounding errors
 * @param {Object} booking - The booking object
 * @returns {number} Completion payment amount
 */
export const calculateCompletionPayment = (booking) => {
  if (!booking) return 0;

  // Use providerPrice first (doesn't include system fee), fallback to totalAmount if needed
  const providerPrice = booking.providerPrice || booking.fixedPrice || booking.price || 0;
  
  let clientTotal = 0;
  
  // If we have providerPrice, calculate total with system fee
  if (providerPrice > 0) {
    const systemFee = providerPrice * 0.05; // Exact calculation
    clientTotal = providerPrice + systemFee;
  } else {
    // Fallback: if totalAmount is already set (includes system fee), use it directly
    clientTotal = booking.totalAmount || 0;
  }
  
  // Use stored upfront amount if available, otherwise calculate it
  const upfrontPaid = booking.upfrontPaidAmount || calculateUpfrontPayment(booking);

  // Get approved additional charges
  const approvedCharges = (booking.additionalCharges || [])
    .filter(charge => charge.status === 'approved')
    .reduce((sum, charge) => sum + (charge.total || charge.amount || 0), 0);

  // Remaining = exact difference from total (avoids rounding errors)
  const remaining = clientTotal - upfrontPaid;
  
  // Return remaining + additional charges, rounded to 2 decimals
  return Math.round((remaining + approvedCharges) * 100) / 100;
};

/**
 * Format currency with exact decimal places
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return `₱${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
