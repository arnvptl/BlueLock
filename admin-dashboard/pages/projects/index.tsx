import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  MapPin,
  Calendar,
  Users,
  FolderOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import apiClient from '@/lib/api';
import { Project, TableFilters } from '@/types';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TableFilters>({});
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch projects
  const { data: projectsData, isLoading } = useQuery(
    ['projects', filters],
    () => apiClient.getProjects(filters),
    {
      keepPreviousData: true,
    }
  );

  // Verification mutation
  const verifyMutation = useMutation(
    (data: { projectId: string; isVerified: boolean; verificationNotes?: string }) =>
      apiClient.verifyProject(data),
    {
      onSuccess: () => {
        toast.success('Project verification updated successfully');
        queryClient.invalidateQueries(['projects']);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update project verification');
      },
    }
  );

  // Rejection mutation
  const rejectMutation = useMutation(
    (data: { projectId: string; reason: string }) =>
      apiClient.rejectProject(data.projectId, data.reason),
    {
      onSuccess: () => {
        toast.success('Project rejected successfully');
        queryClient.invalidateQueries(['projects']);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to reject project');
      },
    }
  );

  // Mock data for demonstration
  const mockProjects: Project[] = [
    {
      _id: '1',
      projectId: 'BC001',
      name: 'Mangrove Restoration - Kerala',
      description: 'Large-scale mangrove restoration project in Kerala coastal areas',
      location: 'Kerala, India',
      area: 1500,
      areaUnit: 'hectares',
      projectType: 'mangrove',
      owner: {
        address: '0x1234567890abcdef',
        name: 'Kerala Coastal Authority',
        email: 'kca@kerala.gov.in',
        organization: 'Kerala Coastal Authority',
      },
      status: 'active',
      verificationStatus: {
        isVerified: true,
        verifiedBy: 'admin@nccr.gov.in',
        verifiedAt: '2024-01-15T10:30:00Z',
        verificationNotes: 'Project meets all verification criteria',
      },
      carbonData: {
        totalCO2Sequestered: 2500.5,
        lastMeasurementDate: '2024-01-20T00:00:00Z',
        measurementFrequency: 'monthly',
      },
      blockchainData: {
        contractAddress: '0xabcdef1234567890',
        transactionHash: '0x1234567890abcdef',
        blockNumber: 12345678,
        isOnChain: true,
      },
      documents: [],
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
    },
    {
      _id: '2',
      projectId: 'BC002',
      name: 'Seagrass Monitoring - Tamil Nadu',
      description: 'Comprehensive seagrass monitoring and restoration project',
      location: 'Tamil Nadu, India',
      area: 800,
      areaUnit: 'hectares',
      projectType: 'seagrass',
      owner: {
        address: '0xabcdef1234567890',
        name: 'Tamil Nadu Fisheries Department',
        email: 'fisheries@tn.gov.in',
        organization: 'Tamil Nadu Fisheries Department',
      },
      status: 'draft',
      verificationStatus: {
        isVerified: false,
      },
      carbonData: {
        totalCO2Sequestered: 1200.75,
        lastMeasurementDate: '2024-01-18T00:00:00Z',
        measurementFrequency: 'quarterly',
      },
      blockchainData: {
        isOnChain: false,
      },
      documents: [],
      createdAt: '2024-01-12T00:00:00Z',
      updatedAt: '2024-01-12T00:00:00Z',
    },
  ];

  const projects = projectsData?.data?.projects || mockProjects;
  const total = projectsData?.data?.total || mockProjects.length;

  const handleVerify = async (projectId: string, isVerified: boolean, notes?: string) => {
    await verifyMutation.mutateAsync({ projectId, isVerified, verificationNotes: notes });
  };

  const handleReject = async (projectId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      await rejectMutation.mutateAsync({ projectId, reason });
    }
  };

  const handleExport = async () => {
    try {
      const blob = await apiClient.exportProjects('csv', filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Projects exported successfully');
    } catch (error) {
      toast.error('Failed to export projects');
    }
  };

  const getStatusBadge = (status: string, isVerified: boolean) => {
    if (isVerified) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </span>
      );
    }
    
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            <Clock className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800">
            <XCircle className="w-3 h-3 mr-1" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and verify blue carbon projects
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="verified">Verified</option>
                  <option value="suspended">Suspended</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Type
                </label>
                <select
                  value={filters.projectType || ''}
                  onChange={(e) => setFilters({ ...filters, projectType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Types</option>
                  <option value="mangrove">Mangrove</option>
                  <option value="seagrass">Seagrass</option>
                  <option value="saltmarsh">Saltmarsh</option>
                  <option value="kelp">Kelp</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({})}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Registered Projects ({total})
              </h3>
              <div className="flex items-center space-x-2">
                {isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CO₂ Sequestered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {project.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {project.projectId}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{project.location}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {project.area} {project.areaUnit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {project.projectType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.carbonData.totalCO2Sequestered.toLocaleString()} tons
                      </div>
                      <div className="text-xs text-gray-500">
                        Last: {new Date(project.carbonData.lastMeasurementDate || project.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(project.status, project.verificationStatus.isVerified)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedProject(project)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!project.verificationStatus.isVerified && project.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleVerify(project.projectId, true)}
                              disabled={verifyMutation.isLoading}
                              className="text-success-600 hover:text-success-900 disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(project.projectId)}
                              disabled={rejectMutation.isLoading}
                              className="text-error-600 hover:text-error-900 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {projects.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <FolderOpen className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-500">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </div>
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Project Details - {selectedProject.name}
                </h3>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Basic Information</h4>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Project ID:</span>
                      <span className="ml-2 font-medium">{selectedProject.projectId}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 font-medium capitalize">{selectedProject.projectType}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Location:</span>
                      <span className="ml-2 font-medium">{selectedProject.location}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Area:</span>
                      <span className="ml-2 font-medium">{selectedProject.area} {selectedProject.areaUnit}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Owner Information</h4>
                  <div className="mt-2 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <span className="ml-2 font-medium">{selectedProject.owner.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="ml-2 font-medium">{selectedProject.owner.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Organization:</span>
                      <span className="ml-2 font-medium">{selectedProject.owner.organization}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Carbon Data</h4>
                  <div className="mt-2 text-sm">
                    <div>
                      <span className="text-gray-500">Total CO₂ Sequestered:</span>
                      <span className="ml-2 font-medium">{selectedProject.carbonData.totalCO2Sequestered.toLocaleString()} tons</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Measurement:</span>
                      <span className="ml-2 font-medium">
                        {new Date(selectedProject.carbonData.lastMeasurementDate || selectedProject.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedProject.verificationStatus.isVerified && (
                  <div>
                    <h4 className="font-medium text-gray-900">Verification Details</h4>
                    <div className="mt-2 text-sm">
                      <div>
                        <span className="text-gray-500">Verified By:</span>
                        <span className="ml-2 font-medium">{selectedProject.verificationStatus.verifiedBy}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Verified At:</span>
                        <span className="ml-2 font-medium">
                          {new Date(selectedProject.verificationStatus.verifiedAt!).toLocaleString()}
                        </span>
                      </div>
                      {selectedProject.verificationStatus.verificationNotes && (
                        <div>
                          <span className="text-gray-500">Notes:</span>
                          <span className="ml-2 font-medium">{selectedProject.verificationStatus.verificationNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedProject(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
