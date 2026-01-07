/**
 * Email Service for GSS Maasin Mobile
 * Uses backend Brevo API for reliable email delivery
 */

import {API_CONFIG} from '../config/config';

/**
 * Send email via backend API (Brevo)
 */
const sendViaBackend = async (endpoint, data) => {
  try {
    console.log('[Email] Sending via backend:', endpoint);
    
    const baseUrl = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
    
    const response = await fetch(`${baseUrl}/api/email${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('[Email] Sent successfully');
      return {success: true};
    } else {
      console.log('[Email] Failed:', result.error);
      return {success: false, error: result.error || 'Failed to send email'};
    }
  } catch (error) {
    console.log('[Email] Error:', error.message);
    return {success: false, error: error.message};
  }
};

/**
 * Send verification code email
 */
export const sendVerificationCode = async (email, code) => {
  return sendViaBackend('/verification-code', {email, code});
};

/**
 * Send password reset code
 */
export const sendPasswordResetCode = async (email, code) => {
  return sendViaBackend('/password-reset', {email, code});
};

/**
 * Send booking confirmation email
 */
export const sendBookingConfirmation = async (email, clientName, booking) => {
  return sendViaBackend('/booking-confirmation', {
    clientEmail: email,
    booking: {
      ...booking,
      clientName,
    },
  });
};

/**
 * Send job accepted email to client
 */
export const sendJobAcceptedEmail = async (email, clientName, booking, provider) => {
  return sendViaBackend('/job-accepted', {
    clientEmail: email,
    booking,
    provider,
  });
};

/**
 * Send payment receipt email
 */
export const sendPaymentReceipt = async (email, clientName, payment) => {
  return sendViaBackend('/payment-receipt', {
    clientEmail: email,
    payment,
  });
};

/**
 * Send provider approval email
 */
export const sendProviderApprovalEmail = async (email, providerName, approved) => {
  return sendViaBackend('/provider-approval', {
    providerEmail: email,
    providerName,
    approved,
  });
};

/**
 * Send job rejection email
 */
export const sendJobRejectionEmail = async (email, clientName, booking, reason) => {
  return sendViaBackend('/job-rejection', {
    clientEmail: email,
    booking,
    reason,
  });
};

/**
 * Send general notification email
 */
export const sendNotificationEmail = async (email, name, subject, message, details = '') => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #00B14F; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">GSS Maasin</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F2937;">${subject}</h2>
        <p style="color: #4B5563;">Hi ${name},</p>
        <p style="color: #4B5563;">${message}</p>
        ${details ? `<div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; white-space: pre-line;">${details}</div>` : ''}
      </div>
    </div>
  `;
  
  return sendViaBackend('/send', {to: email, subject, html});
};

export default {
  sendVerificationCode,
  sendPasswordResetCode,
  sendBookingConfirmation,
  sendJobAcceptedEmail,
  sendPaymentReceipt,
  sendProviderApprovalEmail,
  sendJobRejectionEmail,
  sendNotificationEmail,
};
