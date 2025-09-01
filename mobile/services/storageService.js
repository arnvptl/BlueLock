import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

class StorageService {
  // User data storage
  async setUserToken(token) {
    try {
      await AsyncStorage.setItem(config.STORAGE_KEYS.USER_TOKEN, token);
    } catch (error) {
      console.error('Error storing user token:', error);
    }
  }

  async getUserToken() {
    try {
      return await AsyncStorage.getItem(config.STORAGE_KEYS.USER_TOKEN);
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  }

  async setUserProfile(profile) {
    try {
      await AsyncStorage.setItem(config.STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Error storing user profile:', error);
    }
  }

  async getUserProfile() {
    try {
      const profile = await AsyncStorage.getItem(config.STORAGE_KEYS.USER_PROFILE);
      return profile ? JSON.parse(profile) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Offline data storage
  async saveOfflineData(key, data) {
    try {
      const offlineData = await this.getOfflineData();
      offlineData[key] = {
        data,
        timestamp: new Date().toISOString(),
      };
      await AsyncStorage.setItem(config.STORAGE_KEYS.OFFLINE_DATA, JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }

  async getOfflineData(key = null) {
    try {
      const offlineData = await AsyncStorage.getItem(config.STORAGE_KEYS.OFFLINE_DATA);
      const parsed = offlineData ? JSON.parse(offlineData) : {};
      return key ? parsed[key] : parsed;
    } catch (error) {
      console.error('Error getting offline data:', error);
      return key ? null : {};
    }
  }

  async removeOfflineData(key) {
    try {
      const offlineData = await this.getOfflineData();
      delete offlineData[key];
      await AsyncStorage.setItem(config.STORAGE_KEYS.OFFLINE_DATA, JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error removing offline data:', error);
    }
  }

  async clearOfflineData() {
    try {
      await AsyncStorage.removeItem(config.STORAGE_KEYS.OFFLINE_DATA);
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }

  // Projects cache
  async cacheProjects(projects) {
    try {
      await this.saveOfflineData(config.STORAGE_KEYS.PROJECTS_CACHE, projects);
    } catch (error) {
      console.error('Error caching projects:', error);
    }
  }

  async getCachedProjects() {
    try {
      const cached = await this.getOfflineData(config.STORAGE_KEYS.PROJECTS_CACHE);
      return cached ? cached.data : [];
    } catch (error) {
      console.error('Error getting cached projects:', error);
      return [];
    }
  }

  async addCachedProject(project) {
    try {
      const projects = await this.getCachedProjects();
      const existingIndex = projects.findIndex(p => p.projectId === project.projectId);
      
      if (existingIndex >= 0) {
        projects[existingIndex] = project;
      } else {
        projects.push(project);
      }
      
      await this.cacheProjects(projects);
    } catch (error) {
      console.error('Error adding cached project:', error);
    }
  }

  async updateCachedProject(projectId, updates) {
    try {
      const projects = await this.getCachedProjects();
      const projectIndex = projects.findIndex(p => p.projectId === projectId);
      
      if (projectIndex >= 0) {
        projects[projectIndex] = { ...projects[projectIndex], ...updates };
        await this.cacheProjects(projects);
      }
    } catch (error) {
      console.error('Error updating cached project:', error);
    }
  }

  // MRV data cache
  async cacheMRVData(mrvData) {
    try {
      await this.saveOfflineData(config.STORAGE_KEYS.MRV_CACHE, mrvData);
    } catch (error) {
      console.error('Error caching MRV data:', error);
    }
  }

  async getCachedMRVData() {
    try {
      const cached = await this.getOfflineData(config.STORAGE_KEYS.MRV_CACHE);
      return cached ? cached.data : [];
    } catch (error) {
      console.error('Error getting cached MRV data:', error);
      return [];
    }
  }

  async addCachedMRVData(mrvData) {
    try {
      const mrvList = await this.getCachedMRVData();
      const existingIndex = mrvList.findIndex(m => m.mrvId === mrvData.mrvId);
      
      if (existingIndex >= 0) {
        mrvList[existingIndex] = mrvData;
      } else {
        mrvList.push(mrvData);
      }
      
      await this.cacheMRVData(mrvList);
    } catch (error) {
      console.error('Error adding cached MRV data:', error);
    }
  }

  // Settings storage
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(config.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async getSettings() {
    try {
      const settings = await AsyncStorage.getItem(config.STORAGE_KEYS.SETTINGS);
      return settings ? JSON.parse(settings) : {};
    } catch (error) {
      console.error('Error getting settings:', error);
      return {};
    }
  }

  async updateSetting(key, value) {
    try {
      const settings = await this.getSettings();
      settings[key] = value;
      await this.saveSettings(settings);
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  }

  // Sync queue management
  async addToSyncQueue(action, data) {
    try {
      const queue = await this.getSyncQueue();
      queue.push({
        id: Date.now().toString(),
        action,
        data,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      });
      await AsyncStorage.setItem(config.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }

  async getSyncQueue() {
    try {
      const queue = await AsyncStorage.getItem(config.STORAGE_KEYS.SYNC_QUEUE);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  async removeFromSyncQueue(itemId) {
    try {
      const queue = await this.getSyncQueue();
      const filteredQueue = queue.filter(item => item.id !== itemId);
      await AsyncStorage.setItem(config.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(filteredQueue));
    } catch (error) {
      console.error('Error removing from sync queue:', error);
    }
  }

  async clearSyncQueue() {
    try {
      await AsyncStorage.removeItem(config.STORAGE_KEYS.SYNC_QUEUE);
    } catch (error) {
      console.error('Error clearing sync queue:', error);
    }
  }

  // Utility methods
  async clearAllData() {
    try {
      const keys = [
        config.STORAGE_KEYS.USER_TOKEN,
        config.STORAGE_KEYS.USER_PROFILE,
        config.STORAGE_KEYS.OFFLINE_DATA,
        config.STORAGE_KEYS.SYNC_QUEUE,
        config.STORAGE_KEYS.SETTINGS,
        config.STORAGE_KEYS.PROJECTS_CACHE,
        config.STORAGE_KEYS.MRV_CACHE,
      ];
      
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }

  async getStorageSize() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return 0;
    }
  }

  async cleanupOldData(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    try {
      const offlineData = await this.getOfflineData();
      const now = new Date().getTime();
      const cleanedData = {};
      
      Object.keys(offlineData).forEach(key => {
        const item = offlineData[key];
        const itemAge = now - new Date(item.timestamp).getTime();
        
        if (itemAge < maxAge) {
          cleanedData[key] = item;
        }
      });
      
      await AsyncStorage.setItem(config.STORAGE_KEYS.OFFLINE_DATA, JSON.stringify(cleanedData));
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  // Data validation
  async validateStoredData() {
    try {
      const validation = {
        userToken: false,
        userProfile: false,
        offlineData: false,
        syncQueue: false,
        settings: false,
      };

      // Check user token
      const token = await this.getUserToken();
      validation.userToken = !!token;

      // Check user profile
      const profile = await this.getUserProfile();
      validation.userProfile = !!profile;

      // Check offline data
      const offlineData = await this.getOfflineData();
      validation.offlineData = Object.keys(offlineData).length > 0;

      // Check sync queue
      const syncQueue = await this.getSyncQueue();
      validation.syncQueue = syncQueue.length > 0;

      // Check settings
      const settings = await this.getSettings();
      validation.settings = Object.keys(settings).length > 0;

      return validation;
    } catch (error) {
      console.error('Error validating stored data:', error);
      return {};
    }
  }
}

export default new StorageService();
