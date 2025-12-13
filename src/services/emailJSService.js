/**
 * EmailJS Service for GSS Maasin
 * Sends emails directly from the app without backend
 */

const EMAILJS_SERVICE_ID = 'service_lkj52eb';
const EMAILJS_TEMPLATE_ID = 'template_ai6l56u';
const EMAILJS_PUBLIC_KEY = 'iC39I71dBYX0IRiXg';

/**
 * Send email using EmailJS REST API
 */
const sendEmailJS = async (templateParams) => {
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: templateParams,
      }),
    });

    if (response.ok) {
      console.log('[EmailJS] Email sent successfully');
      return {success: true};
    } else {
      const errorText = await response.text();
      console.log('[EmailJS] Failed to send email:', errorText);
      return {success: false, error: errorText};
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
  return sendEmailJS({
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
  return sendEmailJS({
    email: email,
    code: code,
    passcode: code,
    time: '10 minutes',
  });
};

export default {
  sendVerificationCode,
  sendPasswordResetCode,
};
