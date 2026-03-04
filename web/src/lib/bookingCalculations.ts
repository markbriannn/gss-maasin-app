/**
 * Centralized booking price calculations
 * Handles additional charges consistently across the app
 */

export interface AdditionalCharge {
  id: string;
  description: string;
  reason?: string;
  amount: number;
  total?: number;
  systemFee?: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface Booking {
  providerPrice?: number;
  fixedPrice?: number;
  totalAmount?: number;
  price?: number;
  additionalCharges?: AdditionalCharge[];
  discount?: number;
  discountAmount?: number;
  upfrontPaidAmount?: number;
  systemFee?: number;
}

/**
 * Calculate total with additional charges
 */
export const calculateBookingTotal = (booking: Booking | null): number => {
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
 */
export const calculateProviderEarnings = (booking: Booking | null): number => {
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
 */
export const calculateClientTotal = (booking: Booking | null): number => {
  if (!booking) return 0;

  const providerEarnings = calculateProviderEarnings(booking);
  const systemFee = Math.round(providerEarnings * 0.05); // 5% system fee
  
  return providerEarnings + systemFee;
};

/**
 * Get additional charges summary
 */
export interface ChargesSummary {
  approved: {
    count: number;
    total: number;
    items: AdditionalCharge[];
  };
  pending: {
    count: number;
    total: number;
    items: AdditionalCharge[];
  };
  rejected: {
    count: number;
    items: AdditionalCharge[];
  };
  hasAny: boolean;
  hasPending: boolean;
}

export const getAdditionalChargesSummary = (additionalCharges: AdditionalCharge[] = []): ChargesSummary => {
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
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateAdditionalCharge = (amount: number | string, description: string): ValidationResult => {
  const errors: string[] = [];
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
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
 */
export const createAdditionalCharge = (amount: number | string, description: string): AdditionalCharge => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const systemFee = Math.round(numAmount * 0.05); // 5% system fee
  const total = numAmount + systemFee;

  return {
    id: Date.now().toString(),
    description: description.trim(),
    reason: description.trim(),
    amount: numAmount,
    total,
    systemFee,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };
};

/**
 * Calculate upfront payment (50% of base price)
 */
export const calculateUpfrontPayment = (booking: Booking | null): number => {
  if (!booking) return 0;

  const basePrice = booking.providerPrice || booking.fixedPrice || booking.totalAmount || booking.price || 0;
  const systemFee = Math.round(basePrice * 0.05);
  const clientTotal = basePrice + systemFee;

  return Math.round(clientTotal * 0.5); // 50% upfront
};

/**
 * Calculate completion payment (50% + additional charges)
 */
export const calculateCompletionPayment = (booking: Booking | null): number => {
  if (!booking) return 0;

  const basePrice = booking.providerPrice || booking.fixedPrice || booking.totalAmount || booking.price || 0;
  const systemFee = Math.round(basePrice * 0.05);
  const clientTotal = basePrice + systemFee;
  const upfrontPaid = booking.upfrontPaidAmount || Math.round(clientTotal * 0.5);

  // Get approved additional charges
  const approvedCharges = (booking.additionalCharges || [])
    .filter(charge => charge.status === 'approved')
    .reduce((sum, charge) => sum + (charge.total || charge.amount || 0), 0);

  // Remaining 50% + additional charges
  return (clientTotal - upfrontPaid) + approvedCharges;
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number): string => {
  return `₱${(amount || 0).toLocaleString()}`;
};
