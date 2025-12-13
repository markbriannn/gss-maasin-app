import {API_BASE_URL} from '@env';

const BASE_URL = API_BASE_URL || 'https://gss-maasin-app.onrender.com/api';

/**
 * Send booking confirmation email to client
 */
export const sendBookingConfirmationEmail = async (clientEmail, booking) => {
  try {
    const response = await fetch(`${BASE_URL}/email/booking-confirmation`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({clientEmail, booking}),
    });
    const data = await response.json();
    console.log('[Email] Booking confirmation sent:', data);
    return data;
  } catch (error) {
    console.log('[Email] Failed to send booking confirmation:', error.message);
    return {success: false, error: error.message};
  }
};

/**
 * Send job accepted notification to client
 */
export const sendJobAcceptedEmail = async (clientEmail, booking, provider) => {
  try {
    const response = await fetch(`${BASE_URL}/email/job-accepted`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({clientEmail, booking, provider}),
    });
    const data = await response.json();
    console.log('[Email] Job accepted notification sent:', data);
    return data;
  } catch (error) {
    console.log('[Email] Failed to send job accepted email:', error.message);
    return {success: false, error: error.message};
  }
};

/**
 * Send payment receipt to client
 */
export const sendPaymentReceiptEmail = async (clientEmail, payment) => {
  try {
    const response = await fetch(`${BASE_URL}/email/payment-receipt`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({clientEmail, payment}),
    });
    const data = await response.json();
    console.log('[Email] Payment receipt sent:', data);
    return data;
  } catch (error) {
    console.log('[Email] Failed to send payment receipt:', error.message);
    return {success: false, error: error.message};
  }
};

/**
 * Send provider approval notification
 */
export const sendProviderApprovalEmail = async (providerEmail, providerName, approved) => {
  try {
    const response = await fetch(`${BASE_URL}/email/provider-approval`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({providerEmail, providerName, approved}),
    });
    const data = await response.json();
    console.log('[Email] Provider approval sent:', data);
    return data;
  } catch (error) {
    console.log('[Email] Failed to send provider approval:', error.message);
    return {success: false, error: error.message};
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, resetCode) => {
  try {
    const response = await fetch(`${BASE_URL}/email/send`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        to: email,
        subject: 'GSS Maasin - Password Reset Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #00B14F; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">GSS Maasin</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #1F2937;">Password Reset Request</h2>
              <p style="color: #4B5563;">You requested to reset your password. Use the code below:</p>
              
              <div style="background: #00B14F; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0;">
                  ${resetCode}
                </p>
              </div>
              
              <p style="color: #6B7280; font-size: 14px;">
                This code expires in 10 minutes. If you didn't request this, please ignore this email.
              </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #9CA3AF; font-size: 12px;">
              <p>GSS Maasin - General Service System</p>
            </div>
          </div>
        `,
      }),
    });
    const data = await response.json();
    console.log('[Email] Password reset sent:', data);
    return data;
  } catch (error) {
    console.log('[Email] Failed to send password reset:', error.message);
    return {success: false, error: error.message};
  }
};

/**
 * Send email verification code
 */
export const sendEmailVerificationCode = async (email, code) => {
  try {
    const response = await fetch(`${BASE_URL}/email/send`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        to: email,
        subject: 'GSS Maasin - Verify Your Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #00B14F; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">GSS Maasin</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #1F2937;">Verify Your Email</h2>
              <p style="color: #4B5563;">Welcome to GSS Maasin! Please use the code below to verify your email address:</p>
              
              <div style="background: #00B14F; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0;">
                  ${code}
                </p>
              </div>
              
              <p style="color: #6B7280; font-size: 14px;">
                This code expires in 10 minutes. If you didn't create an account, please ignore this email.
              </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #9CA3AF; font-size: 12px;">
              <p>GSS Maasin - General Service System</p>
              <p>Maasin City, Southern Leyte</p>
            </div>
          </div>
        `,
      }),
    });
    const data = await response.json();
    console.log('[Email] Verification code sent:', data);
    return data;
  } catch (error) {
    console.log('[Email] Failed to send verification code:', error.message);
    return {success: false, error: error.message};
  }
};

/**
 * Send job rejection notification to client
 */
export const sendJobRejectionEmail = async (clientEmail, booking, reason = null) => {
  try {
    const response = await fetch(`${BASE_URL}/email/job-rejection`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({clientEmail, booking, reason}),
    });
    const data = await response.json();
    console.log('[Email] Job rejection sent:', data);
    return data;
  } catch (error) {
    console.log('[Email] Failed to send job rejection:', error.message);
    return {success: false, error: error.message};
  }
};

export default {
  sendBookingConfirmationEmail,
  sendJobAcceptedEmail,
  sendPaymentReceiptEmail,
  sendProviderApprovalEmail,
  sendPasswordResetEmail,
  sendJobRejectionEmail,
  sendEmailVerificationCode,
};
