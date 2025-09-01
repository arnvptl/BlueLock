// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: string;
}

// Project Types
export interface Project {
  _id: string;
  projectId: string;
  name: string;
  description?: string;
  location: string;
  area: number;
  areaUnit: 'sqm' | 'hectares' | 'acres' | 'sqkm';
  projectType: 'mangrove' | 'seagrass' | 'saltmarsh' | 'kelp' | 'other';
  owner: {
    address: string;
    name?: string;
    email?: string;
    organization?: string;
  };
  status: 'draft' | 'active' | 'verified' | 'suspended' | 'completed';
  verificationStatus: {
    isVerified: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    verificationNotes?: string;
  };
  carbonData: {
    totalCO2Sequestered: number;
    lastMeasurementDate?: string;
    measurementFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  };
  blockchainData: {
    contractAddress?: string;
    transactionHash?: string;
    blockNumber?: number;
    isOnChain: boolean;
  };
  documents: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    uploadedAt: string;
  }>;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// MRV Data Types
export interface MRVData {
  _id: string;
  mrvId: string;
  projectId: string;
  measurementData: {
    co2Sequestered: number;
    unit: 'tons' | 'kg' | 'metric_tons';
    measurementDate: string;
    measurementMethod: 'satellite' | 'ground_survey' | 'aerial_survey' | 'sensor_network' | 'other';
    measurementLocation?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  environmentalData?: {
    temperature?: number;
    humidity?: number;
    salinity?: number;
    ph?: number;
    notes?: string;
  };
  reporter: {
    address: string;
    name?: string;
    email?: string;
    organization?: string;
  };
  verificationStatus: {
    isVerified: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    verificationNotes?: string;
  };
  qualityControl: {
    qualityScore?: number;
    qualityFactors?: string[];
    qualityNotes?: string;
  };
  blockchainData: {
    transactionHash?: string;
    blockNumber?: number;
    isOnChain: boolean;
    onChainTimestamp?: string;
  };
  attachments: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    uploadedAt: string;
  }>;
  metadata?: Record<string, any>;
  status: 'draft' | 'submitted' | 'under_review' | 'verified' | 'rejected' | 'on_chain';
  createdAt: string;
  updatedAt: string;
}

// Carbon Credit Types
export interface CarbonCredit {
  projectId: string;
  recipientAddress: string;
  amount: number;
  mintReason?: string;
  mrvDataIds: string[];
  blockchainData: {
    transactionHash: string;
    blockNumber: number;
    isOnChain: boolean;
    onChainTimestamp: string;
  };
  mintedBy: string;
  mintedAt: string;
}

// Dashboard Analytics Types
export interface DashboardStats {
  totalProjects: number;
  verifiedProjects: number;
  pendingProjects: number;
  totalCO2Sequestered: number;
  totalTokensIssued: number;
  totalMRVData: number;
  verifiedMRVData: number;
  pendingMRVData: number;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  category?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'verifier' | 'viewer';
  organization?: string;
  permissions: string[];
  lastLogin?: string;
  createdAt: string;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Table Types
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
}

export interface TableFilters {
  search?: string;
  status?: string;
  projectType?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Form Types
export interface ProjectVerificationForm {
  projectId: string;
  isVerified: boolean;
  verificationNotes?: string;
}

export interface MRVVerificationForm {
  mrvId: string;
  isVerified: boolean;
  verificationNotes?: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

// API Error Types
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}
