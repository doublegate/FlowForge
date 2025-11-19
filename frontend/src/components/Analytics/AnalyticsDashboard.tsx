/**
 * Analytics Dashboard Component
 *
 * Displays comprehensive analytics and insights:
 * - User workflow statistics
 * - Activity timeline
 * - Popular actions
 * - Workflow performance metrics
 *
 * @component
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Star,
  GitFork,
  Activity,
  Calendar,
  Zap
} from 'lucide-react';
import api from '../../services/api';

interface Analytics {
  workflows: {
    total: number;
    published: number;
    private: number;
    public: number;
    totalViews: number;
    totalStars: number;
    totalForks: number;
  };
  versions: {
    total: number;
  };
  activity: {
    lastWeek: number;
    lastMonth: number;
  };
}

interface WorkflowAnalytics {
  workflow: {
    id: string;
    name: string;
    stats: {
      views: number;
      stars: number;
      forks: number;
      uses: number;
      clones: number;
    };
    currentVersion: number;
    visibility: string;
    isPublished: boolean;
  };
  versions: {
    total: number;
    recent: Array<{
      version: number;
      changeType: string;
      summary: string;
      date: string;
      nodeCount: number;
    }>;
    nodeCountTrend: Array<{
      version: number;
      count: number;
      date: string;
    }>;
  };
  topActions: Array<{
    action: string;
    count: number;
  }>;
  collaborators: number;
  stars: number;
  forks: number;
}

interface AnalyticsDashboardProps {
  workflowId?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ workflowId }) => {
  const [overview, setOverview] = useState<Analytics | null>(null);
  const [workflowStats, setWorkflowStats] = useState<WorkflowAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow'>('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [workflowId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch overview analytics
      const overviewResponse = await api.get('/analytics/overview');
      setOverview(overviewResponse.data);

      // Fetch workflow-specific analytics if workflowId provided
      if (workflowId) {
        const workflowResponse = await api.get(`/analytics/workflows/${workflowId}`);
        setWorkflowStats(workflowResponse.data);
        setActiveTab('workflow');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number | string;
    trend?: number;
    color: string;
  }> = ({ icon, label, value, trend, color }) => (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Analytics Dashboard
        </h2>

        {workflowId && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('workflow')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'workflow'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Workflow Details
            </button>
          </div>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<Activity className="w-6 h-6 text-blue-600" />}
              label="Total Workflows"
              value={overview.workflows.total}
              color="bg-blue-50"
            />
            <StatCard
              icon={<Eye className="w-6 h-6 text-purple-600" />}
              label="Total Views"
              value={overview.workflows.totalViews.toLocaleString()}
              color="bg-purple-50"
            />
            <StatCard
              icon={<Star className="w-6 h-6 text-yellow-600" />}
              label="Total Stars"
              value={overview.workflows.totalStars}
              color="bg-yellow-50"
            />
            <StatCard
              icon={<GitFork className="w-6 h-6 text-green-600" />}
              label="Total Forks"
              value={overview.workflows.totalForks}
              color="bg-green-50"
            />
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workflow Breakdown */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Workflow Distribution
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Published</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-green-200 rounded-full" style={{ width: `${(overview.workflows.published / overview.workflows.total) * 100}px` }}></div>
                    <span className="font-bold text-gray-900">{overview.workflows.published}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Public</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-blue-200 rounded-full" style={{ width: `${(overview.workflows.public / overview.workflows.total) * 100}px` }}></div>
                    <span className="font-bold text-gray-900">{overview.workflows.public}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Private</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-gray-200 rounded-full" style={{ width: `${(overview.workflows.private / overview.workflows.total) * 100}px` }}></div>
                    <span className="font-bold text-gray-900">{overview.workflows.private}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Activity
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Last 7 Days</span>
                    <span className="font-bold text-gray-900">{overview.activity.lastWeek} updates</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(overview.activity.lastWeek / overview.activity.lastMonth) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Last 30 Days</span>
                    <span className="font-bold text-gray-900">{overview.activity.lastMonth} updates</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full w-full"></div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm text-gray-600">Total Versions</div>
                  <div className="text-2xl font-bold text-gray-900">{overview.versions.total}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Details Tab */}
      {activeTab === 'workflow' && workflowStats && (
        <div>
          {/* Workflow Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              icon={<Eye className="w-5 h-5 text-blue-600" />}
              label="Views"
              value={workflowStats.workflow.stats.views}
              color="bg-blue-50"
            />
            <StatCard
              icon={<Star className="w-5 h-5 text-yellow-600" />}
              label="Stars"
              value={workflowStats.workflow.stats.stars}
              color="bg-yellow-50"
            />
            <StatCard
              icon={<GitFork className="w-5 h-5 text-green-600" />}
              label="Forks"
              value={workflowStats.workflow.stats.forks}
              color="bg-green-50"
            />
            <StatCard
              icon={<Zap className="w-5 h-5 text-purple-600" />}
              label="Uses"
              value={workflowStats.workflow.stats.uses}
              color="bg-purple-50"
            />
            <StatCard
              icon={<Activity className="w-5 h-5 text-red-600" />}
              label="Versions"
              value={workflowStats.workflow.currentVersion}
              color="bg-red-50"
            />
          </div>

          {/* Top Actions */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-bold mb-4">Most Used Actions</h3>
            <div className="space-y-2">
              {workflowStats.topActions.slice(0, 10).map((action, index) => (
                <div key={action.action} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                    <span className="text-gray-900">{action.action}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${(action.count / workflowStats.topActions[0].count) * 100}px` }}
                    ></div>
                    <span className="font-bold text-gray-700 w-8 text-right">{action.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Version History Preview */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h3 className="text-lg font-bold mb-4">Recent Versions</h3>
            <div className="space-y-3">
              {workflowStats.versions.recent.map((version) => (
                <div key={version.version} className="flex items-center justify-between border-l-4 border-blue-500 pl-4 py-2">
                  <div>
                    <div className="font-medium text-gray-900">v{version.version}</div>
                    <div className="text-sm text-gray-600">{version.summary}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {version.nodeCount} nodes
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
