import axios from 'axios';
import {API_BASE_URL} from '@env';

const API_URL = API_BASE_URL || null;

/**
 * SMS and Email Notification Service
 * Sends booking confirmations, status updates via SMS and Email
 * 
 * NOTE: This service requires a backend API to actually send SMS/emails.
 * If no backend is configured, notifications are logged but not sent.
 * To enable real notifications, set API_BASE_URL in your .env file.
 */
class SMSEmailService {
  constructor() {
    this.apiUrl = API_URL;
    this.isConfigured = !!API_URL;
  }

  /**
   * Send SMS notification
   * @param {string} phoneNumber - Recipient phone number (Philippine format)
   * @param {string} message - SMS message content
   */
  async sendSMS(phoneNumber, message) {
    // Format Philippine phone number
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    
    // If no backend configured, just log and return success (dev mode)
    if (!this.isConfigured) {
      console.log('[SMS - Dev Mode] Would send to:', formattedPhone);
      console.log('[SMS - Dev Mode] Message:', message);
      return {success: true, devMode: true};
    }
    
    try {
      const response = await axios.post(`${this.apiUrl}/notifications/sms`, {
        to: formattedPhone,
        message: message,
      }, {timeout: 10000});
      
      console.log('SMS sent successfully:', response.data);
      return {success: true, data: response.data};
    } catch (error) {
      // Don't spam console with network errors in dev
      console.log('[SMS] Failed to send (backend unavailable):', formattedPhone);
      return {success: false, error: error.message};
    }
  }

  /**
   * Send Email notification
   * @param {string} email - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} body - Email body (HTML supported)
   */
  async sendEmail(email, subject, body) {
    // If no backend configured, just log and return success (dev mode)
    if (!this.isConfigured) {
      console.log('[Email - Dev Mode] Would send to:', email);
      console.log('[Email - Dev Mode] Subject:', subject);
      return {success: true, devMode: true};
    }
    
    try {
      const response = await axios.post(`${this.apiUrl}/notifications/email`, {
        to: email,
        subject: subject,
        html: body,
      }, {timeout: 10000});
      
      console.log('Email sent successfully:', response.data);
      return {success: true, data: response.data};
    } catch (error) {
      // Don't spam console with network errors in dev
      console.log('[Email] Failed to send (backend unavailable):', email);
      return {success: false, error: error.message};
    }
  }

  /**
   * Format Philippine phone number to international format
   */
  formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with +63
    if (cleaned.startsWith('0')) {
      cleaned = '63' + cleaned.substring(1);
    }
    
    // If doesn't start with 63, add it
    if (!cleaned.startsWith('63')) {
      cleaned = '63' + cleaned;
    }
    
    return '+' + cleaned;
  }

  // ========== BOOKING NOTIFICATIONS ==========

  /**
   * Send booking confirmation to client
   */
  async sendBookingConfirmation(booking, client, provider) {
    const smsMessage = `GSS Maasin: Your booking for ${booking.serviceCategory} with ${provider.name} is confirmed! Date: ${booking.scheduledDate} at ${booking.scheduledTime}. Total: ₱${booking.totalAmount?.toLocaleString()}. Job ID: ${booking.id?.slice(-6)}`;
    
    const emailSubject = `Booking Confirmed - ${booking.serviceCategory}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #00B14F; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">GSS Maasin</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1F2937;">Booking Confirmed! ✅</h2>
          <p>Hi ${client.firstName || 'there'},</p>
          <p>Your service booking has been confirmed. Here are the details:</p>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Service:</strong> ${booking.serviceCategory}</p>
            <p><strong>Provider:</strong> ${provider.name}</p>
            <p><strong>Date:</strong> ${booking.scheduledDate}</p>
            <p><strong>Time:</strong> ${booking.scheduledTime}</p>
            <p><strong>Location:</strong> ${booking.address || 'As specified'}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">
            <p><strong>Total Amount:</strong> <span style="color: #00B14F; font-size: 18px;">₱${booking.totalAmount?.toLocaleString()}</span></p>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">Job ID: ${booking.id}</p>
          
          <p>The provider will contact you soon. You can also message them directly through the app.</p>
          
          <p style="margin-top: 30px;">Thank you for using GSS Maasin!</p>
        </div>
        <div style="background: #1F2937; padding: 15px; text-align: center;">
          <p style="color: #9CA3AF; margin: 0; font-size: 12px;">© 2024 GSS Maasin. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send both SMS and Email
    const results = await Promise.allSettled([
      client.phone ? this.sendSMS(client.phone, smsMessage) : Promise.resolve({success: false}),
      client.email ? this.sendEmail(client.email, emailSubject, emailBody) : Promise.resolve({success: false}),
    ]);

    return {
      sms: results[0].status === 'fulfilled' ? results[0].value : {success: false},
      email: results[1].status === 'fulfilled' ? results[1].value : {success: false},
    };
  }

  /**
   * Notify provider about new job request
   */
  async notifyProviderNewJob(booking, provider) {
    const smsMessage = `GSS Maasin: New job request! ${booking.serviceCategory} on ${booking.scheduledDate}. Client: ${booking.clientName}. Price: ₱${booking.totalAmount?.toLocaleString()}. Open app to accept.`;
    
    if (provider.phone) {
      return this.sendSMS(provider.phone, smsMessage);
    }
    return {success: false, error: 'No phone number'};
  }

  /**
   * Notify client when job is accepted
   */
  async notifyJobAccepted(booking, client, provider) {
    const smsMessage = `GSS Maasin: Great news! ${provider.name} accepted your ${booking.serviceCategory} booking for ${booking.scheduledDate}. They will arrive at ${booking.scheduledTime}.`;
    
    if (client.phone) {
      return this.sendSMS(client.phone, smsMessage);
    }
    return {success: false, error: 'No phone number'};
  }

  /**
   * Notify about job start
   */
  async notifyJobStarted(booking, client) {
    const smsMessage = `GSS Maasin: Your ${booking.serviceCategory} service has started! The provider is now working on your job.`;
    
    if (client.phone) {
      return this.sendSMS(client.phone, smsMessage);
    }
    return {success: false, error: 'No phone number'};
  }

  /**
   * Notify about job completion
   */
  async notifyJobCompleted(booking, client, provider) {
    const smsMessage = `GSS Maasin: Your ${booking.serviceCategory} job is complete! Total: ₱${booking.totalAmount?.toLocaleString()}. Please rate ${provider.name} in the app. Thank you!`;
    
    const emailSubject = `Job Completed - Please Leave a Review`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #00B14F; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">GSS Maasin</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1F2937;">Job Completed! 🎉</h2>
          <p>Hi ${client.firstName || 'there'},</p>
          <p>Your ${booking.serviceCategory} service has been completed by ${provider.name}.</p>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Service:</strong> ${booking.serviceCategory}</p>
            <p><strong>Provider:</strong> ${provider.name}</p>
            <p><strong>Total Paid:</strong> <span style="color: #00B14F; font-size: 18px;">₱${booking.totalAmount?.toLocaleString()}</span></p>
          </div>
          
          <div style="background: #FEF3C7; padding: 20px; border-radius: 10px; text-align: center;">
            <p style="margin: 0 0 10px 0;"><strong>⭐ How was your experience?</strong></p>
            <p style="margin: 0; color: #92400E;">Please open the app to leave a review for ${provider.name}. Your feedback helps other clients!</p>
          </div>
          
          <p style="margin-top: 30px;">Thank you for using GSS Maasin!</p>
        </div>
        <div style="background: #1F2937; padding: 15px; text-align: center;">
          <p style="color: #9CA3AF; margin: 0; font-size: 12px;">© 2024 GSS Maasin. All rights reserved.</p>
        </div>
      </div>
    `;

    const results = await Promise.allSettled([
      client.phone ? this.sendSMS(client.phone, smsMessage) : Promise.resolve({success: false}),
      client.email ? this.sendEmail(client.email, emailSubject, emailBody) : Promise.resolve({success: false}),
    ]);

    return {
      sms: results[0].status === 'fulfilled' ? results[0].value : {success: false},
      email: results[1].status === 'fulfilled' ? results[1].value : {success: false},
    };
  }

  /**
   * Notify about job cancellation
   */
  async notifyJobCancelled(booking, recipient, cancelledBy, reason) {
    const byText = cancelledBy === 'client' ? 'The client' : 'The provider';
    const smsMessage = `GSS Maasin: ${byText} cancelled the ${booking.serviceCategory} booking for ${booking.scheduledDate}.${reason ? ` Reason: ${reason}` : ''} We apologize for any inconvenience.`;
    
    if (recipient.phone) {
      return this.sendSMS(recipient.phone, smsMessage);
    }
    return {success: false, error: 'No phone number'};
  }

  // ========== PROVIDER ACCOUNT NOTIFICATIONS ==========

  /**
   * Notify provider about account approval
   */
  async notifyProviderApproved(provider) {
    const smsMessage = `GSS Maasin: Congratulations ${provider.firstName}! Your provider account has been approved. You can now receive job requests. Open the app to get started!`;
    
    const emailSubject = `Welcome to GSS Maasin - Account Approved!`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #00B14F; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">GSS Maasin</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1F2937;">Welcome to GSS Maasin! 🎉</h2>
          <p>Hi ${provider.firstName || 'there'},</p>
          <p>Great news! Your provider account has been <strong style="color: #00B14F;">approved</strong>.</p>
          
          <div style="background: #D1FAE5; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 18px; color: #065F46;">✅ You're now ready to receive job requests!</p>
          </div>
          
          <h3>Next Steps:</h3>
          <ol style="color: #4B5563;">
            <li>Complete your profile with a professional photo</li>
            <li>Set your service price and availability</li>
            <li>Wait for job requests from clients</li>
            <li>Provide excellent service and earn great reviews!</li>
          </ol>
          
          <p style="margin-top: 30px;">Welcome aboard!</p>
          <p><strong>The GSS Maasin Team</strong></p>
        </div>
        <div style="background: #1F2937; padding: 15px; text-align: center;">
          <p style="color: #9CA3AF; margin: 0; font-size: 12px;">© 2024 GSS Maasin. All rights reserved.</p>
        </div>
      </div>
    `;

    const results = await Promise.allSettled([
      provider.phone ? this.sendSMS(provider.phone, smsMessage) : Promise.resolve({success: false}),
      provider.email ? this.sendEmail(provider.email, emailSubject, emailBody) : Promise.resolve({success: false}),
    ]);

    return {
      sms: results[0].status === 'fulfilled' ? results[0].value : {success: false},
      email: results[1].status === 'fulfilled' ? results[1].value : {success: false},
    };
  }

  /**
   * Notify provider about account rejection
   */
  async notifyProviderRejected(provider, reason = '') {
    const smsMessage = `GSS Maasin: We're sorry, your provider application was not approved.${reason ? ` Reason: ${reason}` : ''} Please contact support for more information.`;
    
    const emailSubject = `GSS Maasin - Application Status Update`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #00B14F; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">GSS Maasin</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1F2937;">Application Status Update</h2>
          <p>Hi ${provider.firstName || 'there'},</p>
          <p>Thank you for your interest in becoming a service provider on GSS Maasin.</p>
          
          <div style="background: #FEE2E2; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px; color: #991B1B;">Unfortunately, we were unable to approve your application at this time.</p>
            ${reason ? `<p style="margin: 10px 0 0 0; color: #7F1D1D;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          
          <h3>What you can do:</h3>
          <ul style="color: #4B5563;">
            <li>Review and update your submitted documents</li>
            <li>Ensure all information is accurate and complete</li>
            <li>Contact our support team for clarification</li>
            <li>Reapply after addressing any issues</li>
          </ul>
          
          <p style="margin-top: 30px;">If you have questions, please contact us at support@gssmaasin.com</p>
          <p><strong>The GSS Maasin Team</strong></p>
        </div>
        <div style="background: #1F2937; padding: 15px; text-align: center;">
          <p style="color: #9CA3AF; margin: 0; font-size: 12px;">© 2024 GSS Maasin. All rights reserved.</p>
        </div>
      </div>
    `;

    const results = await Promise.allSettled([
      provider.phone ? this.sendSMS(provider.phone, smsMessage) : Promise.resolve({success: false}),
      provider.email ? this.sendEmail(provider.email, emailSubject, emailBody) : Promise.resolve({success: false}),
    ]);

    return {
      sms: results[0].status === 'fulfilled' ? results[0].value : {success: false},
      email: results[1].status === 'fulfilled' ? results[1].value : {success: false},
    };
  }

  // ========== BOOKING/JOB REQUEST NOTIFICATIONS ==========

  /**
   * Notify client when their booking request is approved by admin
   */
  async notifyBookingApproved(booking, client, provider) {
    const smsMessage = `GSS Maasin: Your ${booking.serviceCategory || 'service'} request has been approved! ${provider?.name || 'The provider'} will review and accept your booking soon. Job ID: ${booking.id?.slice(-6)}`;
    
    const emailSubject = `Booking Request Approved - ${booking.serviceCategory || 'Service'}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #00B14F; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">GSS Maasin</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1F2937;">Booking Request Approved! ✅</h2>
          <p>Hi ${client.firstName || 'there'},</p>
          <p>Great news! Your service request has been <strong style="color: #00B14F;">approved</strong> by our team.</p>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Service:</strong> ${booking.serviceCategory || 'Service'}</p>
            <p><strong>Provider:</strong> ${provider?.name || 'Assigned Provider'}</p>
            <p><strong>Date:</strong> ${booking.scheduledDate || 'TBD'}</p>
            <p><strong>Time:</strong> ${booking.scheduledTime || 'TBD'}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">
            <p><strong>Amount:</strong> <span style="color: #00B14F; font-size: 18px;">₱${(booking.totalAmount || booking.amount || 0).toLocaleString()}</span></p>
          </div>
          
          <div style="background: #DBEAFE; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 0; color: #1E40AF;">⏳ <strong>Next Step:</strong> The provider will review your request and accept it shortly. You'll receive a notification once confirmed.</p>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">Job ID: ${booking.id}</p>
          
          <p style="margin-top: 30px;">Thank you for using GSS Maasin!</p>
        </div>
        <div style="background: #1F2937; padding: 15px; text-align: center;">
          <p style="color: #9CA3AF; margin: 0; font-size: 12px;">© 2024 GSS Maasin. All rights reserved.</p>
        </div>
      </div>
    `;

    const results = await Promise.allSettled([
      client.phone ? this.sendSMS(client.phone, smsMessage) : Promise.resolve({success: false}),
      client.email ? this.sendEmail(client.email, emailSubject, emailBody) : Promise.resolve({success: false}),
    ]);

    return {
      sms: results[0].status === 'fulfilled' ? results[0].value : {success: false},
      email: results[1].status === 'fulfilled' ? results[1].value : {success: false},
    };
  }

  /**
   * Notify client when their booking request is rejected by admin
   */
  async notifyBookingRejected(booking, client, reason = '') {
    const smsMessage = `GSS Maasin: We're sorry, your ${booking.serviceCategory || 'service'} request was not approved.${reason ? ` Reason: ${reason}` : ''} Please try again or contact support.`;
    
    const emailSubject = `Booking Request Update - ${booking.serviceCategory || 'Service'}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #00B14F; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">GSS Maasin</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1F2937;">Booking Request Update</h2>
          <p>Hi ${client.firstName || 'there'},</p>
          <p>Thank you for using GSS Maasin.</p>
          
          <div style="background: #FEE2E2; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px; color: #991B1B;">Unfortunately, your service request could not be approved at this time.</p>
            ${reason ? `<p style="margin: 10px 0 0 0; color: #7F1D1D;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Service:</strong> ${booking.serviceCategory || 'Service'}</p>
            <p><strong>Date:</strong> ${booking.scheduledDate || 'TBD'}</p>
            <p style="color: #6B7280; font-size: 14px;">Job ID: ${booking.id}</p>
          </div>
          
          <h3>What you can do:</h3>
          <ul style="color: #4B5563;">
            <li>Submit a new booking request with updated details</li>
            <li>Try a different service provider</li>
            <li>Contact our support team for assistance</li>
          </ul>
          
          <p style="margin-top: 30px;">We apologize for any inconvenience. Thank you for your understanding.</p>
          <p><strong>The GSS Maasin Team</strong></p>
        </div>
        <div style="background: #1F2937; padding: 15px; text-align: center;">
          <p style="color: #9CA3AF; margin: 0; font-size: 12px;">© 2024 GSS Maasin. All rights reserved.</p>
        </div>
      </div>
    `;

    const results = await Promise.allSettled([
      client.phone ? this.sendSMS(client.phone, smsMessage) : Promise.resolve({success: false}),
      client.email ? this.sendEmail(client.email, emailSubject, emailBody) : Promise.resolve({success: false}),
    ]);

    return {
      sms: results[0].status === 'fulfilled' ? results[0].value : {success: false},
      email: results[1].status === 'fulfilled' ? results[1].value : {success: false},
    };
  }

  /**
   * Notify provider about new approved job request
   */
  async notifyProviderNewApprovedJob(booking, provider, client) {
    const smsMessage = `GSS Maasin: New job request! ${booking.serviceCategory || 'Service'} from ${client?.name || 'a client'} on ${booking.scheduledDate || 'TBD'}. Amount: ₱${(booking.totalAmount || booking.amount || 0).toLocaleString()}. Open app to accept!`;
    
    const emailSubject = `New Job Request - ${booking.serviceCategory || 'Service'}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #00B14F; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">GSS Maasin</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1F2937;">New Job Request! 🔔</h2>
          <p>Hi ${provider.firstName || 'there'},</p>
          <p>You have a new job request waiting for your review.</p>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Service:</strong> ${booking.serviceCategory || 'Service'}</p>
            <p><strong>Client:</strong> ${client?.name || 'Client'}</p>
            <p><strong>Date:</strong> ${booking.scheduledDate || 'TBD'}</p>
            <p><strong>Time:</strong> ${booking.scheduledTime || 'TBD'}</p>
            <p><strong>Location:</strong> ${booking.location || booking.address || 'See app for details'}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">
            <p><strong>Amount:</strong> <span style="color: #00B14F; font-size: 20px;">₱${(booking.totalAmount || booking.amount || 0).toLocaleString()}</span></p>
          </div>
          
          <div style="background: #FEF3C7; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 0; color: #92400E;">⚡ <strong>Action Required:</strong> Open the app to view details and accept this job.</p>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">Job ID: ${booking.id}</p>
        </div>
        <div style="background: #1F2937; padding: 15px; text-align: center;">
          <p style="color: #9CA3AF; margin: 0; font-size: 12px;">© 2024 GSS Maasin. All rights reserved.</p>
        </div>
      </div>
    `;

    const results = await Promise.allSettled([
      provider.phone ? this.sendSMS(provider.phone, smsMessage) : Promise.resolve({success: false}),
      provider.email ? this.sendEmail(provider.email, emailSubject, emailBody) : Promise.resolve({success: false}),
    ]);

    return {
      sms: results[0].status === 'fulfilled' ? results[0].value : {success: false},
      email: results[1].status === 'fulfilled' ? results[1].value : {success: false},
    };
  }

  /**
   * Send OTP via SMS for phone verification
   */
  async sendOTP(phoneNumber, otp) {
    const smsMessage = `GSS Maasin: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    return this.sendSMS(phoneNumber, smsMessage);
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email, resetLink) {
    const emailSubject = `Reset Your GSS Maasin Password`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #00B14F; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">GSS Maasin</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1F2937;">Password Reset Request</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #00B14F; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.</p>
          
          <p style="margin-top: 30px;">Stay safe!</p>
          <p><strong>The GSS Maasin Team</strong></p>
        </div>
        <div style="background: #1F2937; padding: 15px; text-align: center;">
          <p style="color: #9CA3AF; margin: 0; font-size: 12px;">© 2024 GSS Maasin. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail(email, emailSubject, emailBody);
  }
}

export default new SMSEmailService();
