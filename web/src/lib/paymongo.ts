/**
 * PayMongo Payment Service for GSS Maasin Web
 * Handles GCash, Maya, and Card payments
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com/api';
const PAYMONGO_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY || 'pk_test_QMSTsXHBLpmimdTNTjL8Kh2W';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gss-maasin.vercel.app';

// Get the base URL for redirects - always use production URL
const getBaseUrl = () => {
  return APP_URL;
};

export type PaymentMethod = 'gcash' | 'maya' | 'card' | 'cash';

interface PaymentSourceResponse {
  success: boolean;
  checkoutUrl?: string;
  sourceId?: string;
  error?: string;
}

interface PaymentIntentResponse {
  success: boolean;
  clientKey?: string;
  paymentIntentId?: string;
  error?: string;
}

interface CreatePaymentParams {
  amount: number;
  description: string;
  bookingId: string;
  clientId: string;
  providerId: string;
  paymentMethod: PaymentMethod;
  successUrl?: string;
  failedUrl?: string;
}

/**
 * Create a payment source for GCash or Maya
 * This redirects user to the payment provider's page
 */
export const createPaymentSource = async (params: CreatePaymentParams): Promise<PaymentSourceResponse> => {
  try {
    const { amount, description, bookingId, paymentMethod, successUrl, failedUrl } = params;
    
    // Use backend API to create source (keeps secret key secure)
    const baseUrl = getBaseUrl();
    const response = await fetch(`${API_URL}/payments/create-source`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100, // Convert to centavos
        type: paymentMethod, // 'gcash' or 'maya'
        description,
        bookingId,
        redirect: {
          success: successUrl || `${baseUrl}/client/bookings/${bookingId}?payment=success`,
          failed: failedUrl || `${baseUrl}/client/bookings/${bookingId}?payment=failed`,
        },
      }),
    });

    const data = await response.json();

    if (data.success && data.checkoutUrl) {
      return {
        success: true,
        checkoutUrl: data.checkoutUrl,
        sourceId: data.sourceId,
      };
    }

    return {
      success: false,
      error: data.error || 'Failed to create payment source',
    };
  } catch (error) {
    console.error('PayMongo source error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }
};

/**
 * Create a payment intent for card payments
 */
export const createPaymentIntent = async (params: CreatePaymentParams): Promise<PaymentIntentResponse> => {
  try {
    const { amount, description, bookingId } = params;
    
    const response = await fetch(`${API_URL}/payments/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100, // Convert to centavos
        description,
        bookingId,
        paymentMethodAllowed: ['card'],
      }),
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        clientKey: data.clientKey,
        paymentIntentId: data.paymentIntentId,
      };
    }

    return {
      success: false,
      error: data.error || 'Failed to create payment intent',
    };
  } catch (error) {
    console.error('PayMongo intent error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }
};

/**
 * Check payment status
 */
export const checkPaymentStatus = async (sourceId: string): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_URL}/payments/status/${sourceId}`);
    const data = await response.json();

    return {
      success: true,
      status: data.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check status',
    };
  }
};

/**
 * Process payment - main function to handle all payment types
 */
export const processPayment = async (params: CreatePaymentParams): Promise<{
  success: boolean;
  redirectUrl?: string;
  error?: string;
}> => {
  const { paymentMethod } = params;

  if (paymentMethod === 'cash') {
    // Cash payments don't need PayMongo
    return { success: true };
  }

  if (paymentMethod === 'gcash' || paymentMethod === 'maya') {
    const result = await createPaymentSource(params);
    if (result.success && result.checkoutUrl) {
      return {
        success: true,
        redirectUrl: result.checkoutUrl,
      };
    }
    return {
      success: false,
      error: result.error,
    };
  }

  if (paymentMethod === 'card') {
    const result = await createPaymentIntent(params);
    if (result.success) {
      // For card payments, you'd typically use PayMongo.js to handle the card form
      // This returns the client key for the frontend to use
      return {
        success: true,
      };
    }
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: false,
    error: 'Invalid payment method',
  };
};

/**
 * Get PayMongo public key (for PayMongo.js integration)
 */
export const getPublicKey = (): string => {
  return PAYMONGO_PUBLIC_KEY;
};

export default {
  createPaymentSource,
  createPaymentIntent,
  checkPaymentStatus,
  processPayment,
  getPublicKey,
};
