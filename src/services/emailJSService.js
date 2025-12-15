/**
 * EmailJS Service for GSS Maasin
 * Sends emails directly from the app without backend
 */

const EMAILJS_SERVICE_ID = 'service_lkj52eb';
const EMAILJS_OTP_TEMPLATE_ID = 'template_zae2z8b';
const EMAILJS_NOTIFICATION_TEMPLATE_ID = 'template_738r616';
const EMAILJS_PUBLIC_KEY = 'iC39I71dBYX0IRiXg';
const EMAILJS_PRIVATE_KEY = 'z2GJT7xQMAIk_XwxAeFgK';

/**
 * Send email using EmailJS REST API
 */
const sendEmailJS = async (templateId, templateParams) => {
  try {
    console.log('[EmailJS] Sending email...');
    console.log('[EmailJS] Template ID:', templateId);
    console.log('[EmailJS] Params:', JSON.stringify(templateParams));
    
    const payload = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: templateParams,
    };
    
    console.log('[EmailJS] Full payload:', JSON.stringify(payload));
    
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('[EmailJS] Response status:', response.status);
    console.log('[EmailJS] Response:', responseText);

    if (response.ok) {
      console.log('[EmailJS] Email sent successfully');
      return {success: true};
    } else {
      console.log('[EmailJS] Failed to send email:', responseText);
      return {success: false, error: responseText};
    }
  } catch (error) {
    console.log('[EmailJS] Error sending email:', error.message);
    return {success: false, error: error.message};
  }
};

/**
 * Send verification code email
 */
export const sendVerificationCode = async (email, code) => {
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
export const sendPasswordResetCode = async (email, code) => {
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
export const sendNotificationEmail = async (email, name, subject, message, details = '') => {
  return sendEmailJS(EMAILJS_NOTIFICATION_TEMPLATE_ID, {
    email: email,
    name: name || 'User',
    subject: subject,
    message: message,
    details: details,
  });
};

/**
 * Send booking confirmation email
 */
export const sendBookingConfirmation = async (email, clientName, booking) => {
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
export const sendJobAcceptedEmail = async (email, clientName, booking, provider) => {
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
export const sendPaymentReceipt = async (email, clientName, payment) => {
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
export const sendProviderApprovalEmail = async (email, providerName, approved) => {
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

/**
 * Send job rejection email to client
 */
export const sendJobRejectionEmail = async (email, clientName, booking, reason) => {
  const details = `
Service: ${booking.serviceCategory || 'Service'}
Date: ${booking.scheduledDate || 'N/A'}
${reason ? `Reason: ${reason}` : ''}
  `.trim();

  return sendNotificationEmail(
    email,
    clientName,
    'Booking Update',
    'We\'re sorry, but your service request could not be processed at this time. Please try booking again or contact support.',
    details
  );
};

export default {
  sendVerificationCode,
  sendPasswordResetCode,
  sendNotificationEmail,
  sendBookingConfirmation,
  sendJobAcceptedEmail,
  sendPaymentReceipt,
  sendProviderApprovalEmail,
  sendJobRejectionEmail,
};
