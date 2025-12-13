import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const STORAGE_KEYS = {
  USER: '@user',
  AUTH_TOKEN: '@auth_token',
  SETTINGS: '@settings',
  RECENT_SEARCHES: '@recent_searches',
  FAVORITES: '@favorites',
  CACHE_PREFIX: '@cache_',
};

class StorageService {
  async setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      return false;
    }
  }

  async getItem(key) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return null;
    }
  }

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  }

  async clear() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  async setSecure(key, value) {
    try {
      await Keychain.setGenericPassword(key, value, {service: key});
      return true;
    } catch (error) {
      console.error(`Error storing secure ${key}:`, error);
      return false;
    }
  }

  async getSecure(key) {
    try {
      const credentials = await Keychain.getGenericPassword({service: key});
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error(`Error retrieving secure ${key}:`, error);
      return null;
    }
  }

  async removeSecure(key) {
    try {
      await Keychain.resetGenericPassword({service: key});
      return true;
    } catch (error) {
      console.error(`Error removing secure ${key}:`, error);
      return false;
    }
  }

  async setUser(user) {
    return await this.setItem(STORAGE_KEYS.USER, user);
  }

  async getUser() {
    return await this.getItem(STORAGE_KEYS.USER);
  }

  async removeUser() {
    return await this.removeItem(STORAGE_KEYS.USER);
  }

  async setAuthToken(token) {
    return await this.setSecure(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  async getAuthToken() {
    return await this.getSecure(STORAGE_KEYS.AUTH_TOKEN);
  }

  async removeAuthToken() {
    return await this.removeSecure(STORAGE_KEYS.AUTH_TOKEN);
  }

  async setSettings(settings) {
    return await this.setItem(STORAGE_KEYS.SETTINGS, settings);
  }

  async getSettings() {
    return await this.getItem(STORAGE_KEYS.SETTINGS);
  }

  async addRecentSearch(search) {
    try {
      const recentSearches = (await this.getItem(STORAGE_KEYS.RECENT_SEARCHES)) || [];
      const filtered = recentSearches.filter((s) => s !== search);
      const updated = [search, ...filtered].slice(0, 10);
      await this.setItem(STORAGE_KEYS.RECENT_SEARCHES, updated);
      return updated;
    } catch (error) {
      console.error('Error adding recent search:', error);
      return [];
    }
  }

  async getRecentSearches() {
    return (await this.getItem(STORAGE_KEYS.RECENT_SEARCHES)) || [];
  }

  async clearRecentSearches() {
    return await this.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
  }

  async addFavorite(providerId) {
    try {
      const favorites = (await this.getItem(STORAGE_KEYS.FAVORITES)) || [];
      if (!favorites.includes(providerId)) {
        favorites.push(providerId);
        await this.setItem(STORAGE_KEYS.FAVORITES, favorites);
      }
      return favorites;
    } catch (error) {
      console.error('Error adding favorite:', error);
      return [];
    }
  }

  async removeFavorite(providerId) {
    try {
      const favorites = (await this.getItem(STORAGE_KEYS.FAVORITES)) || [];
      const updated = favorites.filter((id) => id !== providerId);
      await this.setItem(STORAGE_KEYS.FAVORITES, updated);
      return updated;
    } catch (error) {
      console.error('Error removing favorite:', error);
      return [];
    }
  }

  async getFavorites() {
    return (await this.getItem(STORAGE_KEYS.FAVORITES)) || [];
  }

  async isFavorite(providerId) {
    const favorites = await this.getFavorites();
    return favorites.includes(providerId);
  }

  async setCache(key, data, expiryMinutes = 60) {
    try {
      const cacheData = {
        data,
        expiry: Date.now() + expiryMinutes * 60 * 1000,
      };
      await this.setItem(STORAGE_KEYS.CACHE_PREFIX + key, cacheData);
      return true;
    } catch (error) {
      console.error(`Error caching ${key}:`, error);
      return false;
    }
  }

  async getCache(key) {
    try {
      const cacheData = await this.getItem(STORAGE_KEYS.CACHE_PREFIX + key);
      if (cacheData && cacheData.expiry > Date.now()) {
        return cacheData.data;
      }
      return null;
    } catch (error) {
      console.error(`Error retrieving cache ${key}:`, error);
      return null;
    }
  }

  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(STORAGE_KEYS.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }
}

export default new StorageService();
