/**
 * EmailJS Service for GSS Maasin Web
 * Sends emails directly from the app without backend
 */

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_lkj52eb';
const EMAILJS_OTP_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_OTP_TEMPLATE_ID || 'template_zae2z8b';
const EMAILJS_NOTIFICATION_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_NOTIFICATION_TEMPLATE_ID || 'template_738r616';
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'iC39I71dBYX0IRiXg';

interface EmailJSResponse {
  success: boolean;
  error?: string;
}

/**
 * Send email using EmailJS REST API
 */
const sendEmailJS = async (templateId: string, templateParams: Record<string, string>): Promise<EmailJSResponse> => {
  try {
    console.log('[EmailJS] Sending email...');
    
    const payload = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: templateParams,
    };
    
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('[EmailJS] Email sent successfully');
      return { success: true };
    } else {
      const responseText = await response.text();
      console.log('[EmailJS] Failed to send email:', responseText);
      return { success: false, error: responseText };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('[EmailJS] Error sending email:', errorMessage);
    return { success: false, error: errorMessage };
  }
};

/**
 * Send verification code email
 */
export const sendVerificationCode = async (email: string, code: string): Promise<EmailJSResponse> => {
  return sendEmailJS(EMAILJS_OTP_TEMPLATE_ID, {
    email: email,
    code: code,
    passcode: code,
    time: '10 minutes',
  });
};

/**
 * Send password reset code
 */
export const sendPasswordResetCode = async (email: string, code: string): Promise<EmailJSResponse> => {
  return sendEmailJS(EMAILJS_OTP_TEMPLATE_ID, {
    email: email,
    code: code,
    passcode: code,
    time: '10 minutes',
  });
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
): Promise<EmailJSResponse> => {
  return sendEmailJS(EMAILJS_NOTIFICATION_TEMPLATE_ID, {
    email: email,
    name: name || 'User',
    subject: subject,
    message: message,
    details: details,
  });
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
): Promise<EmailJSResponse> => {
  const details = `
Service: ${booking.serviceCategory || booking.title || 'Service'}
Date: ${booking.scheduledDate || 'TBD'}
Time: ${booking.scheduledTime || 'TBD'}
Provider: ${booking.providerName || 'To be assigned'}
Amount: ₱${(booking.totalAmount || 0).toLocaleString()}
  `.trim();

  return sendNotificationEmail(
    email,
    clientName,
    'Booking Confirmed',
    'Your service request has been submitted successfully. We will notify you once a provider accepts your request.',
    details
  );
};

/**
 * Send job accepted email to client
 */
export const sendJobAcceptedEmail = async (
  email: string, 
  clientName: string, 
  booking: Booking, 
  provider: Provider
): Promise<EmailJSResponse> => {
  const details = `
Service: ${booking.serviceCategory || booking.title || 'Service'}
Provider: ${provider?.name || 'Provider'}
Contact: ${provider?.phone || 'Available in app'}
Date: ${booking.scheduledDate || 'TBD'}
Amount: ₱${(booking.totalAmount || 0).toLocaleString()}
  `.trim();

  return sendNotificationEmail(
    email,
    clientName,
    'Provider Assigned',
    'Great news! A provider has accepted your service request. You can now contact them through the app.',
    details
  );
};

/**
 * Send payment receipt email
 */
export const sendPaymentReceipt = async (
  email: string, 
  clientName: string, 
  payment: Payment
): Promise<EmailJSResponse> => {
  const details = `
Service: ${payment.serviceName || 'Service'}
Amount: ₱${(payment.amount || 0).toLocaleString()}
Method: ${payment.paymentMethod || 'Cash'}
Date: ${new Date().toLocaleDateString()}
Reference: ${payment.bookingId || 'N/A'}
  `.trim();

  return sendNotificationEmail(
    email,
    clientName,
    'Payment Successful',
    'Your payment has been processed successfully. Thank you for using GSS Maasin!',
    details
  );
};

/**
 * Send provider approval email
 */
export const sendProviderApprovalEmail = async (
  email: string, 
  providerName: string, 
  approved: boolean
): Promise<EmailJSResponse> => {
  if (approved) {
    return sendNotificationEmail(
      email,
      providerName,
      'Account Approved',
      'Congratulations! Your provider account has been approved. You can now start receiving job requests and earning!',
      'Open the GSS Maasin app to view available jobs.'
    );
  } else {
    return sendNotificationEmail(
      email,
      providerName,
      'Application Update',
      'Thank you for your interest in becoming a GSS Maasin provider. Unfortunately, we could not approve your application at this time.',
      'Please contact support for more information.'
    );
  }
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
