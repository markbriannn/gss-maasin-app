/**
 * Image Optimizer
 * Compresses and resizes images before upload
 * 
 * SETUP: Install react-native-image-resizer
 * npm install react-native-image-resizer
 * cd ios && pod install
 */

import {Image as RNImage} from 'react-native';

// Try to import ImageResizer, fallback gracefully if not installed
let ImageResizer = null;
try {
  ImageResizer = require('react-native-image-resizer').default;
} catch (e) {
  console.warn('react-native-image-resizer not installed. Image optimization disabled.');
}

// Default compression settings
const DEFAULT_OPTIONS = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 80, // 0-100
  format: 'JPEG',
};

// Preset configurations for different use cases
export const IMAGE_PRESETS = {
  profile: {
    maxWidth: 500,
    maxHeight: 500,
    quality: 85,
    format: 'JPEG',
  },
  document: {
    maxWidth: 1200,
    maxHeight: 1600,
    quality: 90,
    format: 'JPEG',
  },
  chat: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 75,
    format: 'JPEG',
  },
  thumbnail: {
    maxWidth: 200,
    maxHeight: 200,
    quality: 70,
    format: 'JPEG',
  },
};

/**
 * Get image dimensions
 */
export const getImageDimensions = (uri) => {
  return new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({width, height}),
      (error) => reject(error)
    );
  });
};

/**
 * Calculate new dimensions maintaining aspect ratio
 */
const calculateDimensions = (originalWidth, originalHeight, maxWidth, maxHeight) => {
  let width = originalWidth;
  let height = originalHeight;
  
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

/**
 * Compress and resize image
 * @param {string} uri - Image URI
 * @param {object} options - Compression options
 * @returns {Promise<object>} Optimized image info
 */
export const optimizeImage = async (uri, options = {}) => {
  // If ImageResizer is not available, return original
  if (!ImageResizer) {
    console.warn('Image optimization skipped: react-native-image-resizer not installed');
    return {uri, skipped: true};
  }
  
  try {
    const settings = {...DEFAULT_OPTIONS, ...options};
    
    // Get original dimensions
    let originalDimensions;
    try {
      originalDimensions = await getImageDimensions(uri);
    } catch {
      // If we can't get dimensions, use defaults
      originalDimensions = {width: settings.maxWidth, height: settings.maxHeight};
    }
    
    // Calculate new dimensions
    const newDimensions = calculateDimensions(
      originalDimensions.width,
      originalDimensions.height,
      settings.maxWidth,
      settings.maxHeight
    );
    
    // Resize and compress
    const result = await ImageResizer.createResizedImage(
      uri,
      newDimensions.width,
      newDimensions.height,
      settings.format,
      settings.quality,
      0, // rotation
      undefined, // outputPath (undefined = temp)
      false, // keepMeta
    );
    
    return {
      uri: result.uri,
      path: result.path,
      name: result.name,
      size: result.size,
      width: result.width,
      height: result.height,
      originalSize: originalDimensions,
      compressionRatio: originalDimensions.width && result.width 
        ? ((originalDimensions.width * originalDimensions.height) / (result.width * result.height)).toFixed(2)
        : 1,
    };
  } catch (error) {
    console.error('Image optimization error:', error);
    // Return original if optimization fails
    return {
      uri,
      error: error.message,
    };
  }
};

/**
 * Optimize image using preset
 */
export const optimizeWithPreset = async (uri, presetName) => {
  const preset = IMAGE_PRESETS[presetName] || DEFAULT_OPTIONS;
  return optimizeImage(uri, preset);
};

/**
 * Batch optimize multiple images
 */
export const optimizeImages = async (uris, options = {}) => {
  const results = await Promise.all(
    uris.map(uri => optimizeImage(uri, options))
  );
  return results;
};

/**
 * Estimate file size after compression (rough estimate)
 */
export const estimateCompressedSize = (originalSize, quality) => {
  // Rough estimation based on quality
  const compressionFactor = quality / 100;
  return Math.round(originalSize * compressionFactor * 0.7);
};

/**
 * Check if image needs optimization
 */
export const needsOptimization = async (uri, maxSizeKB = 500) => {
  try {
    const dimensions = await getImageDimensions(uri);
    const estimatedSize = (dimensions.width * dimensions.height * 3) / 1024; // Rough KB estimate
    return estimatedSize > maxSizeKB || dimensions.width > 1024 || dimensions.height > 1024;
  } catch {
    return true; // Optimize if we can't determine
  }
};

export default {
  optimizeImage,
  optimizeWithPreset,
  optimizeImages,
  getImageDimensions,
  estimateCompressedSize,
  needsOptimization,
  IMAGE_PRESETS,
};
