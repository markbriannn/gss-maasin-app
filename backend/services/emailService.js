const { Resend } = require('resend');

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Default from email (use your verified domain later)
const FROM_EMAIL = process.env.FROM_EMAIL || 'GSS Maasin <onboarding@resend.dev>';

/**
 * Send a generic email
 */
const sendEmail = async (to, subject, html, text = null) => {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: subject,
      html: html,
      text: text || subject,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send booking confirmation to client
 */
const sendBookingConfirmation = async (clientEmail, booking) => {
  const subject = `Booking Confirmed - ${booking.serviceCategory}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #00B14F; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">GSS Maasin</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F2937;">Booking Confirmed! ✓</h2>
        <p style="color: #4B5563;">Your service request has been submitted successfully.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #00B14F; margin-top: 0;">${booking.serviceCategory}</h3>
          <p><strong>Date:</strong> ${booking.scheduledDate || 'TBD'}</p>
          <p><strong>Time:</strong> ${booking.scheduledTime || 'TBD'}</p>
          <p><strong>Location:</strong> ${booking.address || 'Maasin City'}</p>
          <p><strong>Amount:</strong> ₱${(booking.totalAmount || 0).toLocaleString()}</p>
        </div>
        
        <p style="color: #6B7280; font-size: 14px;">
          We'll notify you once a provider accepts your request.
        </p>
      </div>
      <div style="padding: 20px; text-align: center; color: #9CA3AF; font-size: 12px;">
        <p>GSS Maasin - General Service System</p>
        <p>Maasin City, Southern Leyte</p>
      </div>
    </div>
  `;
  
  return sendEmail(clientEmail, subject, html);
};

/**
 * Send job accepted notification to client
 */
const sendJobAcceptedNotification = async (clientEmail, booking, provider) => {
  const subject = `Provider Assigned - ${booking.serviceCategory}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #00B14F; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">GSS Maasin</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F2937;">Great News! 🎉</h2>
        <p style="color: #4B5563;">A provider has accepted your service request.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #00B14F; margin-top: 0;">Provider Details</h3>
          <p><strong>Name:</strong> ${provider.name || 'Provider'}</p>
          <p><strong>Service:</strong> ${booking.serviceCategory}</p>
          <p><strong>Contact:</strong> ${provider.phone || 'Available in app'}</p>
        </div>
        
        <p style="color: #6B7280; font-size: 14px;">
          Open the GSS Maasin app to track your provider and communicate with them.
        </p>
      </div>
    </div>
  `;
  
  return sendEmail(clientEmail, subject, html);
};

/**
 * Send provider approval notification
 */
const sendProviderApprovalNotification = async (providerEmail, providerName, approved) => {
  const subject = approved 
    ? 'Welcome to GSS Maasin - Account Approved!' 
    : 'GSS Maasin - Application Update';
  
  const html = approved ? `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #00B14F; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">GSS Maasin</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F2937;">Congratulations, ${providerName}! 🎉</h2>
        <p style="color: #4B5563;">Your provider account has been approved!</p>
        
        <div style="background: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="color: #065F46; font-size: 18px; font-weight: bold; margin: 0;">
            ✓ You can now receive job requests
          </p>
        </div>
        
        <p style="color: #6B7280; font-size: 14px;">
          Open the GSS Maasin app to start accepting jobs and earning!
        </p>
      </div>
    </div>
  ` : `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #00B14F; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">GSS Maasin</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F2937;">Application Update</h2>
        <p style="color: #4B5563;">
          Thank you for your interest in becoming a GSS Maasin provider.
          Unfortunately, we couldn't approve your application at this time.
        </p>
        <p style="color: #6B7280; font-size: 14px;">
          Please contact support for more information.
        </p>
      </div>
    </div>
  `;
  
  return sendEmail(providerEmail, subject, html);
};

/**
 * Send payment receipt
 */
const sendPaymentReceipt = async (clientEmail, payment) => {
  const subject = `Payment Receipt - ₱${(payment.amount || 0).toLocaleString()}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #00B14F; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">GSS Maasin</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F2937;">Payment Successful ✓</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> ₱${(payment.amount || 0).toLocaleString()}</p>
          <p><strong>Method:</strong> ${payment.method || 'Online Payment'}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Reference:</strong> ${payment.referenceId || payment.id || 'N/A'}</p>
        </div>
        
        <p style="color: #6B7280; font-size: 14px;">
          Thank you for using GSS Maasin!
        </p>
      </div>
    </div>
  `;
  
  return sendEmail(clientEmail, subject, html);
};

/**
 * Send job rejection notification to client
 */
const sendJobRejectionNotification = async (clientEmail, booking, reason = null) => {
  const subject = `Booking Update - ${booking.serviceCategory || 'Service Request'}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #00B14F; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">GSS Maasin</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F2937;">Booking Update</h2>
        <p style="color: #4B5563;">
          We're sorry, but your service request could not be processed at this time.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Service:</strong> ${booking.serviceCategory || 'Service Request'}</p>
          <p><strong>Date:</strong> ${booking.scheduledDate || 'N/A'}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        
        <p style="color: #6B7280; font-size: 14px;">
          Please try booking again or contact support for assistance.
        </p>
      </div>
      <div style="padding: 20px; text-align: center; color: #9CA3AF; font-size: 12px;">
        <p>GSS Maasin - General Service System</p>
      </div>
    </div>
  `;
  
  return sendEmail(clientEmail, subject, html);
};

module.exports = {
  sendEmail,
  sendBookingConfirmation,
  sendJobAcceptedNotification,
  sendProviderApprovalNotification,
  sendPaymentReceipt,
  sendJobRejectionNotification,
};
