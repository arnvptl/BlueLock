import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from 'react-native-netinfo';
import config from '../config';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: config.API.BASE_URL,
      timeout: config.API.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem(config.STORAGE_KEYS.USER_TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and retry logic
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Clear stored token and redirect to login
          await AsyncStorage.removeItem(config.STORAGE_KEYS.USER_TOKEN);
          await AsyncStorage.removeItem(config.STORAGE_KEYS.USER_PROFILE);
          
          // You can emit an event here to notify the app about logout
          return Promise.reject(error);
        }

        // Handle network errors and retry
        if (error.code === 'NETWORK_ERROR' && !originalRequest._retry) {
          originalRequest._retry = true;
          return this.retryRequest(originalRequest);
        }

        return Promise.reject(error);
      }
    );
  }

  async retryRequest(request, retryCount = 0) {
    if (retryCount >= config.API.RETRY_ATTEMPTS) {
      return Promise.reject(new Error('Max retry attempts reached'));
    }

    await new Promise(resolve => setTimeout(resolve, config.API.RETRY_DELAY * (retryCount + 1)));
    
    try {
      return await this.api(request);
    } catch (error) {
      return this.retryRequest(request, retryCount + 1);
    }
  }

  async isOnline() {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected && netInfo.isInternetReachable;
  }

  // Authentication methods
  async login(credentials) {
    try {
      const response = await this.api.post(config.ENDPOINTS.AUTH.LOGIN, credentials);
      if (response.data.success) {
        await AsyncStorage.setItem(config.STORAGE_KEYS.USER_TOKEN, response.data.token);
        await AsyncStorage.setItem(config.STORAGE_KEYS.USER_PROFILE, JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async verifyToken() {
    try {
      const response = await this.api.get(config.ENDPOINTS.AUTH.VERIFY);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProfile() {
    try {
      const response = await this.api.get(config.ENDPOINTS.AUTH.PROFILE);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Project methods
  async registerProject(projectData) {
    try {
      const formData = new FormData();
      
      // Add project data
      Object.keys(projectData).forEach(key => {
        if (key === 'documents' && projectData[key]) {
          projectData[key].forEach((doc, index) => {
            formData.append('documents', {
              uri: doc.uri,
              type: doc.type,
              name: doc.name,
            });
          });
        } else if (key === 'coordinates') {
          formData.append(key, JSON.stringify(projectData[key]));
        } else {
          formData.append(key, projectData[key]);
        }
      });

      const response = await this.api.post(config.ENDPOINTS.PROJECTS.REGISTER, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProjects(params = {}) {
    try {
      const response = await this.api.get(config.ENDPOINTS.PROJECTS.LIST, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProjectDetails(projectId) {
    try {
      const response = await this.api.get(config.ENDPOINTS.PROJECTS.DETAILS.replace(':id', projectId));
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProject(projectId, updateData) {
    try {
      const response = await this.api.put(config.ENDPOINTS.PROJECTS.UPDATE.replace(':id', projectId), updateData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // MRV methods
  async uploadMRVData(mrvData) {
    try {
      const formData = new FormData();
      
      // Add MRV data
      Object.keys(mrvData).forEach(key => {
        if (key === 'attachments' && mrvData[key]) {
          mrvData[key].forEach((attachment, index) => {
            formData.append('attachments', {
              uri: attachment.uri,
              type: attachment.type,
              name: attachment.name,
            });
          });
        } else if (key === 'coordinates') {
          formData.append(key, JSON.stringify(mrvData[key]));
        } else {
          formData.append(key, mrvData[key]);
        }
      });

      const response = await this.api.post(config.ENDPOINTS.MRV.UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMRVData(params = {}) {
    try {
      const response = await this.api.get(config.ENDPOINTS.MRV.LIST, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMRVDetails(mrvId) {
    try {
      const response = await this.api.get(config.ENDPOINTS.MRV.DETAILS.replace(':id', mrvId));
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Credit methods
  async mintCredits(creditData) {
    try {
      const response = await this.api.post(config.ENDPOINTS.CREDITS.MINT, creditData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCreditBalance(address) {
    try {
      const response = await this.api.get(config.ENDPOINTS.CREDITS.BALANCE, { params: { address } });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTotalSupply() {
    try {
      const response = await this.api.get(config.ENDPOINTS.CREDITS.SUPPLY);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProjectCredits(projectId) {
    try {
      const response = await this.api.get(config.ENDPOINTS.CREDITS.PROJECT_CREDITS.replace(':projectId', projectId));
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Offline support methods
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

  async processSyncQueue() {
    try {
      const queue = await this.getSyncQueue();
      const isOnline = await this.isOnline();
      
      if (!isOnline || queue.length === 0) {
        return;
      }

      const processedQueue = [];
      
      for (const item of queue) {
        try {
          switch (item.action) {
            case 'registerProject':
              await this.registerProject(item.data);
              break;
            case 'uploadMRVData':
              await this.uploadMRVData(item.data);
              break;
            case 'mintCredits':
              await this.mintCredits(item.data);
              break;
            default:
              console.warn('Unknown sync action:', item.action);
          }
        } catch (error) {
          if (item.retryCount < 3) {
            item.retryCount++;
            processedQueue.push(item);
          } else {
            console.error('Max retries reached for sync item:', item);
          }
        }
      }

      await AsyncStorage.setItem(config.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(processedQueue));
    } catch (error) {
      console.error('Error processing sync queue:', error);
    }
  }

  // Error handling
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.error || 'Server error',
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      // Network error
      return {
        message: 'Network error. Please check your connection.',
        status: 0,
        data: null,
      };
    } else {
      // Other error
      return {
        message: error.message || 'An unexpected error occurred',
        status: 0,
        data: null,
      };
    }
  }

  // Logout
  async logout() {
    try {
      await AsyncStorage.removeItem(config.STORAGE_KEYS.USER_TOKEN);
      await AsyncStorage.removeItem(config.STORAGE_KEYS.USER_PROFILE);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
}

export default new ApiService();
