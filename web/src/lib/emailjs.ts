/**
 * Email Service for GSS Maasin Web
 * Uses backend Gmail SMTP for reliable email delivery
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://gss-maasin-app.onrender.com';

interface EmailResponse {
  success: boolean;
  error?: string;
}

/**
 * Send email via backend API
 */
const sendViaBackend = async (endpoint: string, data: Record<string, unknown>): Promise<EmailResponse> => {
  try {
    console.log('[Email] Sending via backend:', endpoint);
    
    const response = await fetch(`${API_URL}/api/email${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('[Email] Sent successfully');
      return { success: true };
    } else {
      console.log('[Email] Failed:', result.error);
      return { success: false, error: result.error || 'Failed to send email' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('[Email] Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
};

/**
 * Send verification code email
 */
export const sendVerificationCode = async (email: string, code: string): Promise<EmailResponse> => {
  return sendViaBackend('/verification-code', { email, code });
};

/**
 * Send password reset code
 */
export const sendPasswordResetCode = async (email: string, code: string): Promise<EmailResponse> => {
  return sendViaBackend('/password-reset', { email, code });
};

/**
 * Send general notification email
 */
export const sendNotificationEmail = async (
  email: string, 
  name: string, 
  subject: string, 
  message: string, 
  details: string = ''
): Promise<EmailResponse> => {
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
  
  return sendViaBackend('/send', { to: email, subject, html });
};

interface Booking {
  serviceCategory?: string;
  title?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  providerName?: string;
  totalAmount?: number;
}

interface Provider {
  name?: string;
  phone?: string;
}

interface Payment {
  serviceName?: string;
  amount?: number;
  paymentMethod?: string;
  bookingId?: string;
}

/**
 * Send booking confirmation email
 */
export const sendBookingConfirmation = async (
  email: string, 
  clientName: string, 
  booking: Booking
): Promise<EmailResponse> => {
  return sendViaBackend('/booking-confirmation', { 
    clientEmail: email, 
    booking: {
      ...booking,
      clientName,
    }
  });
};

/**
 * Send job accepted email to client
 */
export const sendJobAcceptedEmail = async (
  email: string, 
  clientName: string, 
  booking: Booking, 
  provider: Provider
): Promise<EmailResponse> => {
  return sendViaBackend('/job-accepted', { 
    clientEmail: email, 
    booking,
    provider 
  });
};

/**
 * Send payment receipt email
 */
export const sendPaymentReceipt = async (
  email: string, 
  clientName: string, 
  payment: Payment
): Promise<EmailResponse> => {
  return sendViaBackend('/payment-receipt', { 
    clientEmail: email, 
    payment 
  });
};

/**
 * Send provider approval email
 */
export const sendProviderApprovalEmail = async (
  email: string, 
  providerName: string, 
  approved: boolean
): Promise<EmailResponse> => {
  return sendViaBackend('/provider-approval', { 
    providerEmail: email, 
    providerName, 
    approved 
  });
};

export default {
  sendVerificationCode,
  sendPasswordResetCode,
  sendNotificationEmail,
  sendBookingConfirmation,
  sendJobAcceptedEmail,
  sendPaymentReceipt,
  sendProviderApprovalEmail,
};
