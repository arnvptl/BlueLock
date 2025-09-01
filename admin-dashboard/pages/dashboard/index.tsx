import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  FolderOpen, 
  Database, 
  Coins, 
  BarChart3,
  Calendar,
  MapPin,
  Users
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import apiClient from '@/lib/api';
import { DashboardStats } from '@/types';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState('30d');

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    () => apiClient.getDashboardStats(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch CO2 chart data
  const { data: co2Data, isLoading: co2Loading } = useQuery(
    ['co2-chart', timeRange],
    () => apiClient.getCO2ChartData(timeRange),
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  // Fetch tokens chart data
  const { data: tokensData, isLoading: tokensLoading } = useQuery(
    ['tokens-chart', timeRange],
    () => apiClient.getTokensChartData(timeRange),
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  const dashboardStats = stats?.data as DashboardStats;

  // Mock data for demonstration
  const mockStats: DashboardStats = {
    totalProjects: 156,
    verifiedProjects: 89,
    pendingProjects: 23,
    totalCO2Sequestered: 12450.75,
    totalTokensIssued: 9875.50,
    totalMRVData: 342,
    verifiedMRVData: 298,
    pendingMRVData: 44,
  };

  const mockCO2Data = [
    { date: '2024-01-01', value: 1200 },
    { date: '2024-01-02', value: 1350 },
    { date: '2024-01-03', value: 1100 },
    { date: '2024-01-04', value: 1500 },
    { date: '2024-01-05', value: 1400 },
    { date: '2024-01-06', value: 1600 },
    { date: '2024-01-07', value: 1450 },
  ];

  const mockTokensData = [
    { date: '2024-01-01', value: 950 },
    { date: '2024-01-02', value: 1100 },
    { date: '2024-01-03', value: 900 },
    { date: '2024-01-04', value: 1200 },
    { date: '2024-01-05', value: 1150 },
    { date: '2024-01-06', value: 1300 },
    { date: '2024-01-07', value: 1250 },
  ];

  const projectTypeData = [
    { name: 'Mangrove', value: 45, color: '#22c55e' },
    { name: 'Seagrass', value: 32, color: '#3b82f6' },
    { name: 'Saltmarsh', value: 28, color: '#f59e0b' },
    { name: 'Kelp', value: 15, color: '#8b5cf6' },
    { name: 'Other', value: 8, color: '#ef4444' },
  ];

  const statsCards = [
    {
      title: 'Total Projects',
      value: dashboardStats?.totalProjects || mockStats.totalProjects,
      change: '+12%',
      changeType: 'positive' as const,
      icon: FolderOpen,
      color: 'primary',
    },
    {
      title: 'Verified Projects',
      value: dashboardStats?.verifiedProjects || mockStats.verifiedProjects,
      change: '+8%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'success',
    },
    {
      title: 'CO₂ Sequestered (tons)',
      value: (dashboardStats?.totalCO2Sequestered || mockStats.totalCO2Sequestered).toLocaleString(),
      change: '+15%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'primary',
    },
    {
      title: 'Tokens Issued',
      value: (dashboardStats?.totalTokensIssued || mockStats.totalTokensIssued).toLocaleString(),
      change: '+18%',
      changeType: 'positive' as const,
      icon: Coins,
      color: 'secondary',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Overview of Blue Carbon MRV system performance
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {card.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg bg-${card.color}-100`}>
                    <Icon className={`w-6 h-6 text-${card.color}-600`} />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  {card.changeType === 'positive' ? (
                    <TrendingUp className="w-4 h-4 text-success-600 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-error-600 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    card.changeType === 'positive' ? 'text-success-600' : 'text-error-600'
                  }`}>
                    {card.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">from last month</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CO2 Sequestration Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">CO₂ Sequestration Trend</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Tons CO₂</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={co2Data?.data || mockCO2Data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Tokens Issued Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Carbon Credits Issued</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-secondary-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Tokens</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tokensData?.data || mockTokensData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Types Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Types Distribution</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4">
              {projectTypeData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{item.value} projects</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: 'Project verified', project: 'Mangrove Restoration - Kerala', time: '2 hours ago' },
              { action: 'MRV data uploaded', project: 'Seagrass Monitoring - Tamil Nadu', time: '4 hours ago' },
              { action: 'Carbon credits minted', project: 'Saltmarsh Project - Gujarat', time: '6 hours ago' },
              { action: 'New project registered', project: 'Kelp Farm - Maharashtra', time: '1 day ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.project}</p>
                </div>
                <span className="text-sm text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
