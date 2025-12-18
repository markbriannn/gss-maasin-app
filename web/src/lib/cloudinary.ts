/**
 * Cloudinary Image Upload Service for GSS Maasin Web
 * Free tier: 25GB storage + 25GB bandwidth/month
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dvyxswc6o';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'servease_uploads';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Upload image to Cloudinary
 * @param file - File object from input
 * @param folder - Folder name (e.g., 'profiles', 'chats', 'documents')
 * @returns Promise with the secure URL
 */
export const uploadImage = async (file: File, folder: string = 'uploads'): Promise<UploadResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Upload failed');
    }

    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Upload image from base64 string
 */
export const uploadBase64Image = async (base64: string, folder: string = 'uploads'): Promise<UploadResult> => {
  try {
    const formData = new FormData();
    formData.append('file', base64);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Upload failed');
    }

    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = async (file: File, userId: string): Promise<string> => {
  const result = await uploadImage(file, `profiles/${userId}`);
  return result.url;
};

/**
 * Upload chat image
 */
export const uploadChatImage = async (file: File, conversationId: string): Promise<string> => {
  const result = await uploadImage(file, `chats/${conversationId}`);
  return result.url;
};

/**
 * Upload document (ID, certificates, etc.)
 */
export const uploadDocument = async (file: File, userId: string): Promise<string> => {
  const result = await uploadImage(file, `documents/${userId}`);
  return result.url;
};

/**
 * Get optimized image URL with transformations
 */
export const getOptimizedUrl = (url: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
} = {}): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  const { width, height, quality = 80, format = 'auto' } = options;
  
  const transformations: string[] = [];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push(`q_${quality}`);
  transformations.push(`f_${format}`);
  
  // Insert transformations into URL
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
  }
  
  return url;
};

/**
 * Check if Cloudinary is configured
 */
export const isCloudinaryConfigured = (): boolean => {
  return CLOUD_NAME !== 'YOUR_CLOUD_NAME' && UPLOAD_PRESET !== 'YOUR_UPLOAD_PRESET';
};

export default {
  uploadImage,
  uploadBase64Image,
  uploadProfilePhoto,
  uploadChatImage,
  uploadDocument,
  getOptimizedUrl,
  isCloudinaryConfigured,
};
