import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';
import {
  ApiResponse,
  Project,
  MRVData,
  CarbonCredit,
  DashboardStats,
  LoginCredentials,
  User,
  ProjectVerificationForm,
  MRVVerificationForm,
  TableFilters,
} from '@/types';

class ApiClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  private removeAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private handleApiError(error: any) {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    
    if (error.response?.status === 401) {
      this.removeAuthToken();
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      toast.error('Access denied. You do not have permission to perform this action.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else {
      toast.error(message);
    }
  }

  // Authentication
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.api.post('/auth/login', credentials);
    const { data } = response.data;
    this.setAuthToken(data.token);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    } finally {
      this.removeAuthToken();
    }
  }

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.api.get('/auth/profile');
    return response.data;
  }

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await this.api.get('/dashboard/stats');
    return response.data;
  }

  async getCO2ChartData(timeRange: string = '30d'): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/dashboard/co2-chart?range=${timeRange}`);
    return response.data;
  }

  async getTokensChartData(timeRange: string = '30d'): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/dashboard/tokens-chart?range=${timeRange}`);
    return response.data;
  }

  // Projects
  async getProjects(filters?: TableFilters): Promise<ApiResponse<{ projects: Project[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.projectType) params.append('projectType', filters.projectType);
    if (filters?.dateRange?.start) params.append('startDate', filters.dateRange.start);
    if (filters?.dateRange?.end) params.append('endDate', filters.dateRange.end);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await this.api.get(`/projects?${params.toString()}`);
    return response.data;
  }

  async getProject(projectId: string): Promise<ApiResponse<Project>> {
    const response = await this.api.get(`/projects/${projectId}`);
    return response.data;
  }

  async verifyProject(data: ProjectVerificationForm): Promise<ApiResponse<Project>> {
    const response = await this.api.post(`/projects/${data.projectId}/verify`, data);
    return response.data;
  }

  async rejectProject(projectId: string, reason: string): Promise<ApiResponse<Project>> {
    const response = await this.api.post(`/projects/${projectId}/reject`, { reason });
    return response.data;
  }

  // MRV Data
  async getMRVData(filters?: TableFilters): Promise<ApiResponse<{ mrvData: MRVData[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateRange?.start) params.append('startDate', filters.dateRange.start);
    if (filters?.dateRange?.end) params.append('endDate', filters.dateRange.end);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await this.api.get(`/mrv?${params.toString()}`);
    return response.data;
  }

  async getMRVDetails(mrvId: string): Promise<ApiResponse<MRVData>> {
    const response = await this.api.get(`/mrv/${mrvId}`);
    return response.data;
  }

  async verifyMRVData(data: MRVVerificationForm): Promise<ApiResponse<MRVData>> {
    const response = await this.api.post(`/mrv/${data.mrvId}/verify`, data);
    return response.data;
  }

  async rejectMRVData(mrvId: string, reason: string): Promise<ApiResponse<MRVData>> {
    const response = await this.api.post(`/mrv/${mrvId}/reject`, { reason });
    return response.data;
  }

  // Carbon Credits
  async getCarbonCredits(filters?: TableFilters): Promise<ApiResponse<{ credits: CarbonCredit[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.dateRange?.start) params.append('startDate', filters.dateRange.start);
    if (filters?.dateRange?.end) params.append('endDate', filters.dateRange.end);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await this.api.get(`/credits?${params.toString()}`);
    return response.data;
  }

  async getProjectCredits(projectId: string): Promise<ApiResponse<CarbonCredit[]>> {
    const response = await this.api.get(`/credits/project/${projectId}`);
    return response.data;
  }

  async getTotalSupply(): Promise<ApiResponse<{ totalSupply: number }>> {
    const response = await this.api.get('/credits/supply');
    return response.data;
  }

  // Blockchain
  async getBlockchainInfo(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/blockchain/info');
    return response.data;
  }

  async getTransactionStatus(txHash: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/blockchain/transaction/${txHash}`);
    return response.data;
  }

  // Export
  async exportProjects(format: 'csv' | 'excel' = 'csv', filters?: TableFilters): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.projectType) params.append('projectType', filters.projectType);
    if (filters?.dateRange?.start) params.append('startDate', filters.dateRange.start);
    if (filters?.dateRange?.end) params.append('endDate', filters.dateRange.end);

    const response = await this.api.get(`/export/projects?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async exportMRVData(format: 'csv' | 'excel' = 'csv', filters?: TableFilters): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateRange?.start) params.append('startDate', filters.dateRange.start);
    if (filters?.dateRange?.end) params.append('endDate', filters.dateRange.end);

    const response = await this.api.get(`/export/mrv?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    const response = await this.api.get('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
