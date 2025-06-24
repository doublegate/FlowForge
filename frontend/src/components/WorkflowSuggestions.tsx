import React, { useState } from 'react';
import { Lightbulb, TrendingUp, Shield, DollarSign, Zap, Package, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '../services/api';

interface Suggestion {
  type: 'performance' | 'security' | 'best-practice' | 'cost' | 'reliability' | 'feature';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementation: string;
  impact: string;
}

interface WorkflowSuggestionsProps {
  nodes: any[];
  edges: any[];
  onClose: () => void;
  onApplySuggestion?: (suggestion: Suggestion) => void;
}

export const WorkflowSuggestions: React.FC<WorkflowSuggestionsProps> = ({
  nodes,
  edges: _edges,
  onClose,
  onApplySuggestion
}) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set());
  const [context, setContext] = useState('');

  const getSuggestions = async () => {
    if (nodes.length === 0) {
      setError('Please add some actions to your workflow first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build workflow structure from nodes and edges
      const workflow = {
        name: 'Current Workflow',
        on: ['push'],
        jobs: {
          build: {
            'runs-on': 'ubuntu-latest',
            steps: nodes.map((node) => {
              const step: any = {
                name: node.data.name
              };
              
              if (node.data.repository === 'run') {
                step.run = node.data.inputs?.command || 'echo "Command"';
              } else {
                step.uses = node.data.repository;
                if (node.data.inputs && Object.keys(node.data.inputs).length > 0) {
                  step.with = node.data.inputs;
                }
              }
              
              return step;
            })
          }
        }
      };

      const response = await apiService.getSuggestions(workflow, context);
      const result = response.data;

      setSuggestions(result.suggestions || []);
      setSummary(result.summary || '');
    } catch (err: any) {
      console.error('Failed to get suggestions:', err);
      setError(err.response?.data?.error || 'Failed to get suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSuggestion = (index: number) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSuggestions(newExpanded);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
    case 'performance':
      return <TrendingUp className="w-4 h-4" />;
    case 'security':
      return <Shield className="w-4 h-4" />;
    case 'cost':
      return <DollarSign className="w-4 h-4" />;
    case 'reliability':
      return <Zap className="w-4 h-4" />;
    case 'feature':
      return <Package className="w-4 h-4" />;
    default:
      return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
    case 'performance':
      return 'text-blue-600';
    case 'security':
      return 'text-purple-600';
    case 'cost':
      return 'text-green-600';
    case 'reliability':
      return 'text-orange-600';
    case 'feature':
      return 'text-indigo-600';
    default:
      return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">AI Workflow Suggestions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Context Input */}
        <div className="p-4 border-b bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Provide any specific requirements or constraints for your workflow (e.g., 'This is for a Node.js project', 'Optimize for speed', 'Must support multiple environments')"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <button
            onClick={getSuggestions}
            disabled={loading}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Workflow...
              </>
            ) : (
              <>
                <Lightbulb className="w-4 h-4" />
                Get Suggestions
              </>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 240px)' }}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}

          {summary && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-medium text-blue-900 mb-1">Summary</h3>
              <p className="text-sm text-blue-700">{summary}</p>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800 mb-3">
                {suggestions.length} Suggestions Found
              </h3>
              
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSuggestion(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`mt-0.5 ${getTypeColor(suggestion.type)}`}>
                          {getTypeIcon(suggestion.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{suggestion.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(suggestion.priority)}`}>
                              {suggestion.priority.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {suggestion.type.replace('-', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        {expandedSuggestions.has(index) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedSuggestions.has(index) && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Implementation</h5>
                          <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                            {suggestion.implementation}
                          </pre>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-1">Expected Impact</h5>
                          <p className="text-sm text-gray-600">{suggestion.impact}</p>
                        </div>
                        {onApplySuggestion && (
                          <button
                            onClick={() => onApplySuggestion(suggestion)}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Apply Suggestion
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && suggestions.length === 0 && !error && (
            <div className="text-center py-12 text-gray-500">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Click &quot;Get Suggestions&quot; to analyze your workflow</p>
              <p className="text-sm mt-1">Our AI will provide optimization recommendations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};