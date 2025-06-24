import React, { useState, useEffect } from 'react';
import { Search, Zap, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { apiService } from '../services/api';
import type { ActionMetadata as ActionType, ActionInput, ActionOutput } from '../types';

interface ActionMetadata extends Omit<ActionType, 'inputs' | 'outputs'> {
  id: string;
  inputs?: Record<string, ActionInput>;
  outputs?: Record<string, ActionOutput>;
}

interface Category {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  count?: number;
}

interface SidebarProps {
  onActionDrag: (action: ActionMetadata) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  loading?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onActionDrag,
  searchTerm,
  onSearchChange,
  loading = false
}) => {
  const [actions, setActions] = useState<ActionMetadata[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Fetch actions and categories from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [actionsResponse, categoriesResponse] = await Promise.all([
          apiService.getActions({ limit: 500 }),
          apiService.getCategories()
        ]);

        if (actionsResponse.data?.actions) {
          setActions(actionsResponse.data.actions);
        }

        if (categoriesResponse.data) {
          // Count actions per category
          const categoriesWithCount = categoriesResponse.data.map((cat: Category) => ({
            ...cat,
            count: actionsResponse.data?.actions?.filter((action: ActionMetadata) => 
              action.category === cat.id
            ).length || 0
          }));
          setCategories(categoriesWithCount);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load actions. Please try again.');
      }
    };

    fetchData();
  }, []);

  // Filter actions based on search and category
  const filteredActions = actions.filter(action => {
    const matchesSearch = !searchTerm || 
      action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.repository.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || action.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group actions by category
  const actionsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = filteredActions.filter(action => action.category === category.id);
    return acc;
  }, {} as Record<string, ActionMetadata[]>);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (event: React.DragEvent, action: ActionMetadata) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(action));
    event.dataTransfer.effectAllowed = 'move';
    onActionDrag(action);
  };

  const getCategoryColor = (categoryId: string) => {
    const colors: Record<string, string> = {
      setup: 'bg-blue-500',
      build: 'bg-green-500',
      test: 'bg-yellow-500',
      deploy: 'bg-purple-500',
      security: 'bg-red-500',
      docker: 'bg-cyan-500',
      cloud: 'bg-indigo-500',
      notification: 'bg-pink-500',
      package: 'bg-orange-500',
      documentation: 'bg-gray-500',
      automation: 'bg-teal-500',
      monitoring: 'bg-emerald-500',
      utility: 'bg-slate-500',
      mobile: 'bg-violet-500'
    };
    return colors[categoryId] || 'bg-gray-500';
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-500" />
          FlowForge
        </h1>
        <p className="text-sm text-gray-600 mt-1">Visual GitHub Actions Builder</p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search actions..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <label className="text-sm font-medium text-gray-700">Filter by Category</label>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.count})
            </option>
          ))}
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Actions List */}
      <div className="flex-1 overflow-y-auto">
        <h2 className="sr-only">GitHub Actions Library</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : selectedCategory ? (
          // Show filtered actions for selected category
          <div className="p-4">
            <h3 className="font-semibold text-gray-700 mb-3">
              {categories.find(c => c.id === selectedCategory)?.name} Actions
            </h3>
            <div className="space-y-2">
              {actionsByCategory[selectedCategory]?.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onDragStart={handleDragStart}
                  categoryColor={getCategoryColor(action.category)}
                />
              ))}
            </div>
          </div>
        ) : (
          // Show all categories with expandable sections
          <div className="p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Available Actions</h3>
            <div className="space-y-1">
              {categories.map((category) => {
                const categoryActions = actionsByCategory[category.id] || [];
                const isExpanded = expandedCategories.has(category.id);
                
                if (categoryActions.length === 0) return null;

                return (
                  <div key={category.id}>
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-50 rounded-md"
                      aria-label={`${expandedCategories.has(category.id) ? 'Collapse' : 'Expand'} ${category.name} category`}
                      aria-expanded={expandedCategories.has(category.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(category.id)}`} />
                        <span className="text-sm font-medium text-gray-700">
                          {category.name}
                        </span>
                        <span className="text-xs text-gray-500">({categoryActions.length})</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {categoryActions.map((action) => (
                          <ActionCard
                            key={action.id}
                            action={action}
                            onDragStart={handleDragStart}
                            categoryColor={getCategoryColor(action.category)}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ActionCardProps {
  action: ActionMetadata;
  onDragStart: (event: React.DragEvent, action: ActionMetadata) => void;
  categoryColor: string;
  compact?: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({ 
  action, 
  onDragStart, 
  categoryColor, 
  compact = false 
}) => {
  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, action)}
      className={`${compact ? 'p-2' : 'p-3'} border border-gray-200 rounded-md cursor-move hover:border-blue-400 hover:shadow-sm transition-all bg-white`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${categoryColor}`} />
        <h4 className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
          {action.name}
        </h4>
        {action.stars && action.stars > 100 && (
          <span className="text-xs text-yellow-600">★ {action.stars}</span>
        )}
      </div>
      <p className={`text-gray-600 ${compact ? 'text-xs' : 'text-xs'} line-clamp-2`}>
        {action.description}
      </p>
      {!compact && (
        <div className="text-xs text-gray-500 mt-1 font-mono">
          {action.repository}
        </div>
      )}
    </div>
  );
};