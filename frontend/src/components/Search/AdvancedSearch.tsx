import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  X,
  Calendar,
  Tag,
  User,
  Eye,
  ChevronDown,
  Loader2,
  FileText
} from 'lucide-react';
import api from '../../services/api';

/**
 * AdvancedSearch Component
 *
 * Powerful search interface with multiple filters
 *
 * Features:
 * - Full-text search
 * - Category filtering
 * - Tag filtering
 * - Visibility filtering
 * - Owner filtering
 * - Date range filtering
 * - Multiple sort options
 *
 * @component
 * @example
 * <AdvancedSearch
 *   onSelectWorkflow={(workflow) => console.log(workflow)}
 * />
 */

interface Workflow {
  _id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  visibility: string;
  ownerName: string;
  stats: {
    views: number;
    stars: number;
    forks: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface AdvancedSearchProps {
  onSelectWorkflow?: (workflow: Workflow) => void;
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
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'stars', label: 'Most Stars' },
  { value: 'views', label: 'Most Views' },
  { value: 'updated', label: 'Recently Updated' }
];

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'private', label: 'Private' },
  { value: 'team', label: 'Team' },
  { value: 'public', label: 'Public' }
];

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSelectWorkflow
}) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Results state
  const [results, setResults] = useState<Workflow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    }
  }, [searchQuery, category, tags, visibility, sortBy, dateFrom, dateTo]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (category && category !== 'all') params.append('category', category);
      if (tags.length > 0) params.append('tags', tags.join(','));
      if (visibility && visibility !== 'all') params.append('visibility', visibility);
      if (sortBy) params.append('sortBy', sortBy);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('limit', '20');

      const response = await api.get(`/workflows/search?${params}`);

      setResults(response.data.workflows);
      setTotal(response.data.total);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleClearFilters = () => {
    setCategory('all');
    setTags([]);
    setVisibility('all');
    setDateFrom('');
    setDateTo('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="advanced-search max-w-6xl mx-auto">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Workflows</h1>
        <p className="text-gray-600">Find workflows with powerful filters and search</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, description, or tags..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
        </div>
      </div>

      {/* Filters Toggle */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {VISIBILITY_OPTIONS.map(vis => (
                  <option key={vis.value} value={vis.value}>
                    {vis.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Created From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Created To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Results Header */}
      {searchQuery.trim() && (
        <div className="mb-4 text-gray-600">
          {loading ? (
            <span>Searching...</span>
          ) : (
            <span>
              Found {total} workflow{total !== 1 ? 's' : ''}
              {searchQuery && ` for "${searchQuery}"`}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-gray-600">Searching...</span>
        </div>
      ) : results.length === 0 && searchQuery.trim() ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No workflows found</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map(workflow => (
            <button
              key={workflow._id}
              onClick={() => onSelectWorkflow?.(workflow)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all text-left"
            >
              {/* Header */}
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 mb-1">{workflow.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{workflow.description || 'No description'}</p>
              </div>

              {/* Tags */}
              {workflow.tags && workflow.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {workflow.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                  {workflow.tags.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      +{workflow.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {workflow.stats?.views || 0}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {workflow.ownerName}
                </span>
                <span>{formatDate(workflow.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
