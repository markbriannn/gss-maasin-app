const axios = require('axios');

const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY || '2edfd7cdc71dd465db606963a70a88f4';
const SEMAPHORE_API_URL = 'https://api.semaphore.co/api/v4/messages';

/**
 * Format Philippine phone number to Semaphore format (without + prefix)
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 63
  if (cleaned.startsWith('0')) {
    cleaned = '63' + cleaned.substring(1);
  }
  
  // If doesn't start with 63, add it
  if (!cleaned.startsWith('63')) {
    cleaned = '63' + cleaned;
  }
  
  return cleaned; // Return without + prefix for Semaphore
}

/**
 * Send SMS via Semaphore API
 */
async function sendSMS(phoneNumber, message) {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  console.log('[SMS] Sending to:', formattedPhone);
  console.log('[SMS] Message:', message);
  
  try {
    const params = new URLSearchParams();
    params.append('apikey', SEMAPHORE_API_KEY);
    params.append('number', formattedPhone);
    params.append('message', message);
    
    const response = await axios.post(SEMAPHORE_API_URL, params.toString(), {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    console.log('[SMS] Semaphore response:', JSON.stringify(response.data));
    
    if (response.data && (Array.isArray(response.data) && response.data[0]?.message_id || response.data.message_id)) {
      return { success: true, data: response.data };
    } else {
      const errorMsg = response.data?.message || response.data?.[0]?.message || 'SMS sending failed';
      console.log('[SMS] Failed:', errorMsg);
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.response?.data || error.message;
    console.log('[SMS] Error:', errorMsg);
    return { success: false, error: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg) };
  }
}

/**
 * Generate 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via SMS
 */
async function sendOTP(phoneNumber) {
  const otp = generateOTP();
  const message = `Your GSS Maasin verification code is ${otp}. Valid for 5 minutes.`;
  
  const result = await sendSMS(phoneNumber, message);
  
  if (result.success) {
    return { success: true, otp };
  } else {
    return { success: false, error: result.error, otp }; // Return OTP anyway for dev/testing
  }
}

/**
 * Send provider approval notification
 */
async function sendProviderApprovalSMS(phoneNumber, providerName, isApproved) {
  const message = isApproved
    ? `GSS Maasin: Congratulations ${providerName}! Your provider account has been approved. You can now receive job requests. Open the app to get started!`
    : `GSS Maasin: We're sorry, your provider application was not approved. Please contact support for more information.`;
  
  return await sendSMS(phoneNumber, message);
}

/**
 * Send provider rejection notification with reason
 */
async function sendProviderRejectionSMS(phoneNumber, providerName, reason = '') {
  const message = `GSS Maasin: We're sorry, your provider application was not approved.${reason ? ` Reason: ${reason}` : ''} Please contact support for more information.`;
  
  return await sendSMS(phoneNumber, message);
}

/**
 * Send booking accepted notification to client
 */
async function sendBookingAcceptedSMS(phoneNumber, clientName, providerName, serviceCategory) {
  const message = `GSS Maasin: Great news ${clientName}! ${providerName} accepted your ${serviceCategory} booking. They will arrive soon. Track them in the app!`;
  
  return await sendSMS(phoneNumber, message);
}

/**
 * Send booking declined notification to client
 */
async function sendBookingDeclinedSMS(phoneNumber, clientName, providerName, serviceCategory) {
  const message = `GSS Maasin: Sorry ${clientName}, ${providerName} declined your ${serviceCategory} booking. We're finding you another provider. Please wait.`;
  
  return await sendSMS(phoneNumber, message);
}

/**
 * Send new job notification to provider
 */
async function sendNewJobSMS(phoneNumber, providerName, serviceCategory, clientName, amount) {
  const message = `GSS Maasin: New job ${providerName}! ${serviceCategory} from ${clientName}. Amount: ₱${amount}. Open app to accept!`;
  
  return await sendSMS(phoneNumber, message);
}

/**
 * Send booking approved by admin notification to client
 */
async function sendBookingApprovedByAdminSMS(phoneNumber, clientName, serviceCategory) {
  const message = `GSS Maasin: Your ${serviceCategory} booking has been approved ${clientName}! The provider will review and accept it soon.`;
  
  return await sendSMS(phoneNumber, message);
}

/**
 * Send booking rejected by admin notification to client
 */
async function sendBookingRejectedByAdminSMS(phoneNumber, clientName, serviceCategory, reason = '') {
  const message = `GSS Maasin: Sorry ${clientName}, your ${serviceCategory} booking was not approved.${reason ? ` Reason: ${reason}` : ''} Please try again or contact support.`;
  
  return await sendSMS(phoneNumber, message);
}

module.exports = {
  sendSMS,
  sendOTP,
  generateOTP,
  sendProviderApprovalSMS,
  sendProviderRejectionSMS,
  sendBookingAcceptedSMS,
  sendBookingDeclinedSMS,
  sendNewJobSMS,
  sendBookingApprovedByAdminSMS,
  sendBookingRejectedByAdminSMS,
  formatPhoneNumber,
};
