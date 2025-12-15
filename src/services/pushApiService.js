// Push API Service - Call backend to send push notifications
import axios from 'axios';
import {API_BASE_URL} from '../config/constants';

const PUSH_API_URL = `${API_BASE_URL}/api/notifications`;

/**
 * Send push notification for new job request to provider
 */
export const notifyProviderNewJob = async (providerId, jobData) => {
  try {
    const response = await axios.post(`${PUSH_API_URL}/new-job`, {
      providerId,
      jobData: {
        jobId: jobData.id,
        title: jobData.title,
        serviceCategory: jobData.serviceCategory,
        clientName: jobData.clientName,
      },
    });
    return response.data;
  } catch (error) {
    console.log('Push notification error (new job):', error.message);
    return { success: false };
  }
};

/**
 * Send push notification when booking is accepted
 */
export const notifyClientBookingAccepted = async (clientId, jobData) => {
  try {
    const response = await axios.post(`${PUSH_API_URL}/booking-accepted`, {
      clientId,
      jobData: {
        jobId: jobData.id,
        title: jobData.title,
        providerName: jobData.providerName,
      },
    });
    return response.data;
  } catch (error) {
    console.log('Push notification error (booking accepted):', error.message);
    return { success: false };
  }
};

/**
 * Send push notification for job status update
 */
export const notifyClientJobStatus = async (clientId, jobData, status) => {
  try {
    const response = await axios.post(`${PUSH_API_URL}/job-status`, {
      clientId,
      jobData: {
        jobId: jobData.id,
        title: jobData.title,
        providerName: jobData.providerName,
      },
      status,
    });
    return response.data;
  } catch (error) {
    console.log('Push notification error (job status):', error.message);
    return { success: false };
  }
};

/**
 * Send push notification for new message
 */
export const notifyNewMessage = async (recipientId, senderName, messagePreview, conversationId) => {
  try {
    const response = await axios.post(`${PUSH_API_URL}/new-message`, {
      recipientId,
      senderName,
      messagePreview,
      conversationId,
    });
    return response.data;
  } catch (error) {
    console.log('Push notification error (new message):', error.message);
    return { success: false };
  }
};

/**
 * Send push notification when provider is approved
 */
export const notifyProviderApproved = async (providerId, providerName) => {
  try {
    const response = await axios.post(`${PUSH_API_URL}/provider-approved`, {
      providerId,
      providerName,
    });
    return response.data;
  } catch (error) {
    console.log('Push notification error (provider approved):', error.message);
    return { success: false };
  }
};

export default {
  notifyProviderNewJob,
  notifyClientBookingAccepted,
  notifyClientJobStatus,
  notifyNewMessage,
  notifyProviderApproved,
};
