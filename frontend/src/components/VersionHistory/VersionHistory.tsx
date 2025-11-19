/**
 * Version History Component
 *
 * Displays complete version history for a workflow with:
 * - Timeline view of all versions
 * - Version comparison
 * - Rollback functionality
 * - Change summaries
 *
 * @component
 */

import React, { useState, useEffect } from 'react';
import { History, RotateCcw, GitCompare, Clock, User, Tag } from 'lucide-react';
import api from '../../services/api';

interface Version {
  id: string;
  version: number;
  changeType: 'created' | 'updated' | 'restored' | 'published' | 'unpublished';
  changeSummary: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  stats: {
    nodeCount: number;
    actionCount: number;
    triggerCount: number;
    yamlSize: number;
  };
  diff: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    edgesAdded: number;
    edgesRemoved: number;
  };
  tags: string[];
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
}

interface VersionHistoryProps {
  workflowId: string;
  onRestore?: (version: number) => void;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({ workflowId, onRestore }) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [workflowId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/workflows/${workflowId}/versions`);
      setVersions(response.data.versions);
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: number) => {
    if (!confirm(`Are you sure you want to restore to version ${version}? This will create a new version with the restored content.`)) {
      return;
    }

    try {
      await api.post(`/workflows/${workflowId}/restore/${version}`);
      await fetchVersions();
      onRestore?.(version);
    } catch (error) {
      console.error('Failed to restore version:', error);
      alert('Failed to restore version');
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'created': return 'text-green-600 bg-green-50';
      case 'updated': return 'text-blue-600 bg-blue-50';
      case 'restored': return 'text-purple-600 bg-purple-50';
      case 'published': return 'text-yellow-600 bg-yellow-50';
      case 'unpublished': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="version-history">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6" />
          Version History
        </h2>
        <button
          onClick={() => setShowCompare(!showCompare)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <GitCompare className="w-4 h-4" />
          {showCompare ? 'Hide Compare' : 'Compare Versions'}
        </button>
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No version history available
        </div>
      ) : (
        <div className="space-y-4">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                selectedVersion?.id === version.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedVersion(version)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl font-bold text-gray-700">
                      v{version.version}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChangeTypeColor(version.changeType)}`}>
                      {version.changeType}
                    </span>
                    {version.isPublished && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-50">
                        Published
                      </span>
                    )}
                    {index === 0 && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-50">
                        Current
                      </span>
                    )}
                  </div>

                  <p className="text-gray-800 mb-2">{version.changeSummary}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {version.author.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(version.createdAt)}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div className="text-gray-600">
                      <span className="font-medium">{version.stats.nodeCount}</span> nodes
                    </div>
                    {version.diff.nodesAdded > 0 && (
                      <div className="text-green-600">
                        +{version.diff.nodesAdded} added
                      </div>
                    )}
                    {version.diff.nodesRemoved > 0 && (
                      <div className="text-red-600">
                        -{version.diff.nodesRemoved} removed
                      </div>
                    )}
                    {version.diff.nodesModified > 0 && (
                      <div className="text-blue-600">
                        ~{version.diff.nodesModified} modified
                      </div>
                    )}
                  </div>

                  {version.tags.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      {version.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {index !== 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(version.version);
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </button>
                  )}
                  {showCompare && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompareVersion(version);
                      }}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        compareVersion?.id === version.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Compare
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCompare && compareVersion && selectedVersion && compareVersion.id !== selectedVersion.id && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-bold mb-4">Comparing Versions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-2">Version {selectedVersion.version}</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Nodes: {selectedVersion.stats.nodeCount}</div>
                <div>Actions: {selectedVersion.stats.actionCount}</div>
                <div>Triggers: {selectedVersion.stats.triggerCount}</div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-bold mb-2">Version {compareVersion.version}</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Nodes: {compareVersion.stats.nodeCount}</div>
                <div>Actions: {compareVersion.stats.actionCount}</div>
                <div>Triggers: {compareVersion.stats.triggerCount}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionHistory;
