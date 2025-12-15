import {Image} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@image_cache_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 50; // Maximum number of cached images

class ImageCacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.cacheOrder = [];
  }

  // Generate cache key from URL
  getCacheKey(url) {
    return CACHE_PREFIX + url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 100);
  }

  // Prefetch and cache an image
  async prefetch(url) {
    if (!url) return false;

    try {
      // Check memory cache first
      if (this.memoryCache.has(url)) {
        return true;
      }

      // Check AsyncStorage cache
      const cacheKey = this.getCacheKey(url);
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const {timestamp} = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          this.memoryCache.set(url, true);
          return true;
        }
        // Cache expired, remove it
        await AsyncStorage.removeItem(cacheKey);
      }

      // Prefetch the image
      await Image.prefetch(url);
      
      // Store in cache
      await this.storeInCache(url);
      
      return true;
    } catch (error) {
      console.log('Image prefetch failed:', url, error.message);
      return false;
    }
  }

  // Store URL in cache
  async storeInCache(url) {
    try {
      const cacheKey = this.getCacheKey(url);
      
      // Add to memory cache
      this.memoryCache.set(url, true);
      this.cacheOrder.push(url);

      // Enforce max cache size
      if (this.cacheOrder.length > MAX_CACHE_SIZE) {
        const oldestUrl = this.cacheOrder.shift();
        this.memoryCache.delete(oldestUrl);
        await AsyncStorage.removeItem(this.getCacheKey(oldestUrl));
      }

      // Store in AsyncStorage
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        url,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.log('Cache store failed:', error.message);
    }
  }

  // Prefetch multiple images
  async prefetchMultiple(urls) {
    if (!urls || !Array.isArray(urls)) return;
    
    const validUrls = urls.filter(url => url && typeof url === 'string');
    await Promise.all(validUrls.map(url => this.prefetch(url)));
  }

  // Check if image is cached
  isCached(url) {
    return this.memoryCache.has(url);
  }

  // Clear all cached images
  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      this.memoryCache.clear();
      this.cacheOrder = [];
    } catch (error) {
      console.log('Cache clear failed:', error.message);
    }
  }

  // Get cache stats
  async getCacheStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      return {
        memoryCacheSize: this.memoryCache.size,
        storageCacheSize: cacheKeys.length,
      };
    } catch (error) {
      return {memoryCacheSize: 0, storageCacheSize: 0};
    }
  }
}

// Singleton instance
const imageCache = new ImageCacheManager();

// Hook for prefetching images in components
export const usePrefetchImages = (urls) => {
  React.useEffect(() => {
    if (urls && urls.length > 0) {
      imageCache.prefetchMultiple(urls);
    }
  }, [urls]);
};

// Prefetch provider images from a list
export const prefetchProviderImages = (providers) => {
  if (!providers || !Array.isArray(providers)) return;
  
  const imageUrls = providers
    .map(p => p.profileImage || p.photoURL || p.avatar)
    .filter(Boolean);
  
  imageCache.prefetchMultiple(imageUrls);
};

// Prefetch job/booking images
export const prefetchJobImages = (jobs) => {
  if (!jobs || !Array.isArray(jobs)) return;
  
  const imageUrls = jobs.flatMap(job => {
    const urls = [];
    if (job.media) urls.push(...job.media.map(m => m.uri || m));
    if (job.clientPhoto) urls.push(job.clientPhoto);
    if (job.providerPhoto) urls.push(job.providerPhoto);
    return urls;
  }).filter(Boolean);
  
  imageCache.prefetchMultiple(imageUrls);
};

export default imageCache;
