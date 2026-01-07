import axios from 'axios';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { API_BASE_URL } from '@env';
import { Linking, Platform } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';

const PAYMENT_API_URL = API_BASE_URL || 'http://localhost:3001/api';

// Configure axios with timeout and retry
const apiClient = axios.create({
  baseURL: PAYMENT_API_URL,
  timeout: 60000, // 60 second timeout for slow Render cold starts
});

console.log('Payment API URL:', PAYMENT_API_URL);

// Helper to get user-friendly error message
const getErrorMessage = (error) => {
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please check your internet connection and try again.';
  }
  if (error.code === 'ERR_NETWORK' || !error.response) {
    return 'Unable to connect to server. Please check your internet connection.';
  }
  return error.response?.data?.error || error.message || 'An unexpected error occurred';
};

// Retry wrapper for API calls
const withRetry = async (fn, maxRetries = 2, delay = 1000) => {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries && (!error.response || error.response.status >= 500)) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError;
};

export const paymentService = {
  createGCashPayment: async (bookingId, userId, amount, description) => {
    console.log('Creating GCash payment:', { bookingId, userId, amount, description });
    console.log('API URL:', PAYMENT_API_URL);
    try {
      const response = await withRetry(() => 
        apiClient.post('/payments/create-gcash-source', {
          amount,
          bookingId,
          userId,
          description,
        })
      );

      console.log('GCash payment response:', response.data);
      return {
        success: true,
        sourceId: response.data.sourceId,
        checkoutUrl: response.data.checkoutUrl,
        existing: response.data.existing || false,
      };
    } catch (error) {
      console.error('Error creating GCash payment:', error);
      console.error('Error details:', error.response?.data || error.message);
      return { success: false, error: getErrorMessage(error) };
    }
  },

  createPayMayaPayment: async (bookingId, userId, amount, description) => {
    try {
      const response = await withRetry(() =>
        apiClient.post('/payments/create-paymaya-source', {
          amount,
          bookingId,
          userId,
          description,
        })
      );

      return {
        success: true,
        sourceId: response.data.sourceId,
        checkoutUrl: response.data.checkoutUrl,
        existing: response.data.existing || false,
      };
    } catch (error) {
      console.error('Error creating PayMaya payment:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  },

  openPaymentCheckout: async (checkoutUrl) => {
    console.log('Opening checkout URL:', checkoutUrl);
    try {
      // Check if InAppBrowser is available
      if (await InAppBrowser.isAvailable()) {
        // Open in-app browser for better UX - stays inside the app
        const result = await InAppBrowser.open(checkoutUrl, {
          // iOS options
          dismissButtonStyle: 'close',
          preferredBarTintColor: '#00B14F',
          preferredControlTintColor: 'white',
          readerMode: false,
          animated: true,
          modalPresentationStyle: 'fullScreen',
          modalTransitionStyle: 'coverVertical',
          modalEnabled: true,
          enableBarCollapsing: false,
          // Android options
          showTitle: true,
          toolbarColor: '#00B14F',
          secondaryToolbarColor: 'black',
          navigationBarColor: 'black',
          navigationBarDividerColor: 'white',
          enableUrlBarHiding: true,
          enableDefaultShare: false,
          forceCloseOnRedirection: false,
          // Animation
          animations: {
            startEnter: 'slide_in_right',
            startExit: 'slide_out_left',
            endEnter: 'slide_in_left',
            endExit: 'slide_out_right',
          },
          headers: {},
          hasBackButton: true,
          browserPackage: undefined,
          showInRecents: true,
        });
        
        console.log('InAppBrowser result:', result);
        return { success: true, checkoutUrl, result };
      } else {
        // Fallback to external browser if InAppBrowser not available
        await Linking.openURL(checkoutUrl);
        return { success: true, checkoutUrl };
      }
    } catch (error) {
      console.error('Error opening checkout:', error);
      // Fallback to external browser
      try {
        await Linking.openURL(checkoutUrl);
        return { success: true, checkoutUrl, fallback: true };
      } catch (linkError) {
        return { success: false, error: error.message, checkoutUrl };
      }
    }
  },

  checkPaymentStatus: async (bookingId) => {
    try {
      const response = await axios.get(`${PAYMENT_API_URL}/payments/payment-status/${bookingId}`);
      return {
        success: true,
        status: response.data.status,
        amount: response.data.amount,
        type: response.data.type,
        paidAt: response.data.paidAt,
      };
    } catch (error) {
      console.error('Error checking payment status:', error);
      return { success: false, error: error.message };
    }
  },

  // Verify and process payment (fallback when webhook fails)
  verifyAndProcessPayment: async (bookingId) => {
    console.log('Verifying payment for booking:', bookingId);
    try {
      // Use retry wrapper to handle Render cold starts (server may be sleeping)
      const response = await withRetry(
        () => apiClient.post(`/payments/verify-and-process/${bookingId}`),
        3, // 3 retries
        2000 // 2 second delay between retries
      );
      console.log('Verify payment response:', response.data);
      return {
        success: true,
        status: response.data.status,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      // Provide user-friendly error message
      const errorMessage = error.response?.status === 404
        ? 'Payment verification service unavailable. Please try again in a moment.'
        : getErrorMessage(error);
      return { success: false, error: errorMessage, status: 'error' };
    }
  },

  recordCashPayment: async (bookingId, userId, amount, providerId) => {
    try {
      await axios.post(`${PAYMENT_API_URL}/payments/cash-payment`, {
        bookingId,
        userId,
        amount,
        providerId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error recording cash payment:', error);
      return { success: false, error: error.message };
    }
  },

  requestRefund: async (paymentId, amount, reason) => {
    try {
      const response = await axios.post(`${PAYMENT_API_URL}/payments/refund`, {
        paymentId,
        amount,
        reason,
      });

      return {
        success: true,
        refundId: response.data.refundId,
        status: response.data.status,
      };
    } catch (error) {
      console.error('Error requesting refund:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  getTransactionHistory: async (userId, limit = 20) => {
    if (!userId) {
      return { success: true, transactions: [] };
    }
    try {
      const q = query(
        collection(db, 'transactions'),
        where('clientId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const transactions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB - dateA;
        })
        .slice(0, limit);

      return { success: true, transactions };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return { success: false, error: error.message };
    }
  },

  getProviderEarnings: async (providerId, startDate, endDate) => {
    if (!providerId) {
      return { success: true, earnings: 0, bookings: 0, serviceFee: 0 };
    }
    try {
      const q = query(
        collection(db, 'transactions'),
        where('providerId', '==', providerId),
        where('type', '==', 'payment')
      );

      const snapshot = await getDocs(q);
      let totalEarnings = 0;
      let totalBookings = 0;

      snapshot.docs.forEach(doc => {
        const transaction = doc.data();
        const createdAt = transaction.createdAt?.toDate?.() || new Date(transaction.createdAt);

        if ((!startDate || createdAt >= startDate) && (!endDate || createdAt <= endDate)) {
          // Use providerShare if available (already calculated by backend), otherwise calculate
          const earnings = transaction.providerShare || (transaction.amount || 0) * 0.95;
          totalEarnings += earnings;
          totalBookings++;
        }
      });

      return {
        success: true,
        earnings: totalEarnings,
        bookings: totalBookings,
        serviceFee: totalEarnings * 0.0526,
      };
    } catch (error) {
      console.error('Error calculating earnings:', error);
      return { success: false, error: error.message };
    }
  },

  getPaymentMethods: async () => {
    return {
      success: true,
      methods: [
        { id: 'gcash', name: 'GCash', icon: 'wallet', type: 'ewallet' },
        { id: 'paymaya', name: 'PayMaya', icon: 'wallet', type: 'ewallet' },
        { id: 'cash', name: 'Cash', icon: 'cash', type: 'cash' },
      ],
    };
  },

  // Alias for getProviderEarnings - used by WalletScreen
  calculateEarnings: async (providerId, startDate, endDate) => {
    if (!providerId) {
      return { success: true, earnings: 0, bookings: 0, serviceFee: 0 };
    }
    try {
      const q = query(
        collection(db, 'transactions'),
        where('providerId', '==', providerId),
        where('type', '==', 'payment')
      );

      const snapshot = await getDocs(q);
      let totalEarnings = 0;
      let totalBookings = 0;

      snapshot.docs.forEach(doc => {
        const transaction = doc.data();
        const createdAt = transaction.createdAt?.toDate?.() || new Date(transaction.createdAt);

        if ((!startDate || createdAt >= startDate) && (!endDate || createdAt <= endDate)) {
          // Use providerShare if available (already calculated by backend), otherwise calculate
          const earnings = transaction.providerShare || (transaction.amount || 0) * 0.95;
          totalEarnings += earnings;
          totalBookings++;
        }
      });

      return {
        success: true,
        earnings: totalEarnings,
        bookings: totalBookings,
        serviceFee: totalEarnings * 0.0526,
      };
    } catch (error) {
      console.error('Error calculating earnings:', error);
      return { success: false, error: error.message, earnings: 0, bookings: 0 };
    }
  },

  // Process provider payout - now uses backend API
  processProviderPayout: async (providerId, amount, accountDetails = {}) => {
    try {
      const response = await axios.post(`${PAYMENT_API_URL}/payments/request-payout`, {
        providerId,
        amount,
        ...accountDetails,
      });

      return { success: true, payoutId: response.data.payoutId };
    } catch (error) {
      console.error('Error processing payout:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Poll payment status until paid or max attempts reached
  pollPaymentStatus: async (bookingId, maxAttempts = 12, intervalMs = 5000) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await paymentService.checkPaymentStatus(bookingId);
        
        if (result.success && result.status === 'paid') {
          return { success: true, status: 'paid', ...result };
        }
        
        if (result.success && result.status === 'failed') {
          return { success: false, status: 'failed', error: 'Payment failed' };
        }

        // Wait before next attempt
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        console.error('Poll attempt failed:', error);
      }
    }
    
    return { success: false, status: 'timeout', error: 'Payment status check timed out' };
  },

  // Get provider balance from backend
  getProviderBalance: async (providerId) => {
    try {
      const response = await axios.get(`${PAYMENT_API_URL}/payments/provider-balance/${providerId}`);
      return {
        success: true,
        availableBalance: response.data.availableBalance,
        pendingBalance: response.data.pendingBalance,
        totalEarnings: response.data.totalEarnings,
        totalPayouts: response.data.totalPayouts,
      };
    } catch (error) {
      console.error('Error fetching provider balance:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Get payout history
  getPayoutHistory: async (providerId) => {
    try {
      const response = await axios.get(`${PAYMENT_API_URL}/payments/payout-history/${providerId}`);
      return {
        success: true,
        payouts: response.data.payouts,
      };
    } catch (error) {
      console.error('Error fetching payout history:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Admin: Get earnings summary
  getAdminEarnings: async (startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      
      const response = await axios.get(`${PAYMENT_API_URL}/payments/admin/earnings?${params}`);
      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      console.error('Error fetching admin earnings:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Admin: Get pending payouts
  getAdminPayouts: async (status = 'pending') => {
    try {
      const response = await axios.get(`${PAYMENT_API_URL}/payments/admin/payouts?status=${status}`);
      return {
        success: true,
        payouts: response.data.payouts,
      };
    } catch (error) {
      console.error('Error fetching admin payouts:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Admin: Approve payout
  approvePayout: async (payoutId, adminId) => {
    try {
      const response = await axios.post(`${PAYMENT_API_URL}/payments/admin/approve-payout/${payoutId}`, {
        adminId,
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Error approving payout:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Admin: Complete payout (after manual transfer)
  completePayout: async (payoutId, referenceNumber) => {
    try {
      const response = await axios.post(`${PAYMENT_API_URL}/payments/admin/complete-payout/${payoutId}`, {
        referenceNumber,
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Error completing payout:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },
};

export default paymentService;
