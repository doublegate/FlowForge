/**
 * Marketplace Browser Component
 *
 * Public marketplace for discovering and sharing workflows:
 * - Browse public workflows
 * - Filter by category and tags
 * - Sort by stars, recency, usage
 * - Fork workflows
 * - Star favorites
 *
 * @component
 */

import React, { useState, useEffect } from 'react';
import {
  Store,
  Search,
  Star,
  GitFork,
  Eye,
  Filter,
  TrendingUp,
  Clock,
  Zap
} from 'lucide-react';
import api from '../../services/api';

interface Workflow {
  _id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  stats: {
    views: number;
    stars: number;
    forks: number;
    uses: number;
  };
  ownerId: string;
  ownerName: string;
  publishedAt: string;
  isStarred?: boolean;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'ci-cd', label: 'CI/CD' },
  { value: 'deployment', label: 'Deployment' },
  { value: 'testing', label: 'Testing' },
  { value: 'security', label: 'Security' },
  { value: 'automation', label: 'Automation' },
  { value: 'docker', label: 'Docker' },
  { value: 'other', label: 'Other' }
];

const SORT_OPTIONS = [
  { value: 'stars', label: 'Most Stars', icon: Star },
  { value: 'recent', label: 'Recently Published', icon: Clock },
  { value: 'uses', label: 'Most Used', icon: Zap }
];

interface MarketplaceBrowserProps {
  onFork?: (workflow: Workflow) => void;
  onOpen?: (workflow: Workflow) => void;
}

export const MarketplaceBrowser: React.FC<MarketplaceBrowserProps> = ({ onFork, onOpen }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('stars');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchWorkflows();
  }, [selectedCategory, sortBy]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const params: any = {
        limit: 20,
        offset: 0,
        sortBy
      };

      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      if (selectedTags.length > 0) {
        params.tags = selectedTags.join(',');
      }

      const response = await api.get('/workflows/marketplace', { params });
      setWorkflows(response.data.workflows);
      setTotal(response.data.total);

      // Extract unique tags
      const tags = new Set<string>();
      response.data.workflows.forEach((w: Workflow) => {
        w.tags?.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags).sort());
    } catch (error) {
      console.error('Failed to fetch marketplace workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStar = async (workflowId: string) => {
    try {
      const workflow = workflows.find(w => w._id === workflowId);
      if (!workflow) return;

      if (workflow.isStarred) {
        await api.delete(`/workflows/${workflowId}/star`);
      } else {
        await api.post(`/workflows/${workflowId}/star`);
      }

      // Update local state
      setWorkflows(workflows.map(w =>
        w._id === workflowId
          ? {
              ...w,
              isStarred: !w.isStarred,
              stats: {
                ...w.stats,
                stars: w.stats.stars + (w.isStarred ? -1 : 1)
              }
            }
          : w
      ));
    } catch (error) {
      console.error('Failed to star workflow:', error);
    }
  };

  const handleFork = async (workflow: Workflow) => {
    if (!confirm(`Fork "${workflow.name}" to your workflows?`)) {
      return;
    }

    try {
      await api.post(`/workflows/${workflow._id}/fork`);
      alert('Workflow forked successfully!');
      onFork?.(workflow);
    } catch (error) {
      console.error('Failed to fork workflow:', error);
      alert('Failed to fork workflow');
    }
  };

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const WorkflowCard: React.FC<{ workflow: Workflow }> = ({ workflow }) => (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{workflow.name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{workflow.description}</p>
        </div>
        <button
          onClick={() => handleStar(workflow._id)}
          className={`p-2 rounded-lg transition-colors ${
            workflow.isStarred
              ? 'bg-yellow-100 text-yellow-600'
              : 'bg-gray-100 text-gray-400 hover:text-yellow-600'
          }`}
        >
          <Star className={`w-5 h-5 ${workflow.isStarred ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
          {workflow.category}
        </span>
        {workflow.tags?.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          {workflow.stats.views}
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4" />
          {workflow.stats.stars}
        </div>
        <div className="flex items-center gap-1">
          <GitFork className="w-4 h-4" />
          {workflow.stats.forks}
        </div>
        <div className="text-gray-500">
          by {workflow.ownerName}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onOpen?.(workflow)}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          View Details
        </button>
        <button
          onClick={() => handleFork(workflow)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <GitFork className="w-4 h-4" />
          Fork
        </button>
      </div>
    </div>
  );

  return (
    <div className="marketplace-browser">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <Store className="w-6 h-6" />
          Workflow Marketplace
        </h2>
        <p className="text-gray-600">
          Discover and fork {total} public workflows shared by the community
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="relative">
            <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600 font-medium">Filter by tags:</span>
              {allTags.slice(0, 10).map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    if (selectedTags.includes(tag)) {
                      setSelectedTags(selectedTags.filter(t => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Workflows Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Store className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No workflows found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map(workflow => (
            <WorkflowCard key={workflow._id} workflow={workflow} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketplaceBrowser;
