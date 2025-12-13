// Image Upload Service - Using Cloudinary (Free tier: 25GB storage + 25GB bandwidth/month)
// 
// SETUP INSTRUCTIONS:
// 1. Go to https://cloudinary.com and create a free account
// 2. Go to Dashboard and copy your "Cloud Name"
// 3. Go to Settings > Upload > Upload Presets > Add Upload Preset
//    - Set "Signing Mode" to "Unsigned"
//    - Note the preset name (or create one like "servease_uploads")
// 4. Add to your .env file:
//    CLOUDINARY_CLOUD_NAME=your_cloud_name
//    CLOUDINARY_UPLOAD_PRESET=servease_uploads

import {CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET} from '@env';

// Fallback values if env vars not set
const CLOUD_NAME = CLOUDINARY_CLOUD_NAME || 'dvyxswc6o';
const UPLOAD_PRESET = CLOUDINARY_UPLOAD_PRESET || 'servease_uploads';

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Upload image to Cloudinary (free tier)
 * @param {string} imageUri - Local image URI from image picker
 * @param {string} folder - Folder name (e.g., 'profiles', 'chats', 'documents')
 * @returns {Promise<string>} - Download URL of uploaded image
 */
export const uploadImage = async (imageUri, folder = 'uploads') => {
  try {
    // Create form data
    const formData = new FormData();
    
    // Get filename from URI
    const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
    
    // Determine file type
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // Append file to form data
    formData.append('file', {
      uri: imageUri,
      type: type,
      name: filename,
    });
    
    // Append upload preset (required for unsigned uploads)
    formData.append('upload_preset', UPLOAD_PRESET);
    
    // Append folder for organization
    formData.append('folder', folder);
    
    // Upload to Cloudinary
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Upload failed');
    }
    
    // Return the secure URL
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = async (imageUri, userId) => {
  return uploadImage(imageUri, `profiles/${userId}`);
};

/**
 * Upload chat image
 */
export const uploadChatImage = async (imageUri, conversationId) => {
  return uploadImage(imageUri, `chats/${conversationId}`);
};

/**
 * Upload document (ID, certificates, etc.)
 */
export const uploadDocument = async (imageUri, userId) => {
  return uploadImage(imageUri, `documents/${userId}`);
};

/**
 * Check if Cloudinary is configured
 */
export const isCloudinaryConfigured = () => {
  return CLOUD_NAME && CLOUD_NAME !== 'YOUR_CLOUD_NAME' && UPLOAD_PRESET && UPLOAD_PRESET !== 'YOUR_UPLOAD_PRESET';
};

export default {
  uploadImage,
  uploadProfilePhoto,
  uploadChatImage,
  uploadDocument,
  isCloudinaryConfigured,
};
