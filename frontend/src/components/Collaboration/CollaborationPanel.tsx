import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  UserMinus,
  Shield,
  Eye,
  Edit3,
  Crown,
  Check,
  X,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';
import api from '../../services/api';

/**
 * CollaborationPanel Component
 *
 * Manages workflow collaborators with role-based access control
 *
 * Features:
 * - Add/remove collaborators
 * - Role selection (Viewer/Editor/Admin)
 * - Permission matrix display
 * - Team member list
 * - Access level indicators
 *
 * @component
 * @example
 * <CollaborationPanel
 *   workflowId="workflow-id"
 *   currentUserRole="owner"
 *   onCollaboratorsChange={(collaborators) => console.log(collaborators)}
 * />
 */

interface Collaborator {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
  };
  role: 'viewer' | 'editor' | 'admin';
  addedAt: string;
  addedBy?: string;
}

interface WorkflowOwner {
  id: string;
  name: string;
  email: string;
  username: string;
}

interface CollaborationPanelProps {
  workflowId: string;
  currentUserRole: 'owner' | 'admin' | 'editor' | 'viewer';
  onCollaboratorsChange?: (collaborators: Collaborator[]) => void;
}

const ROLE_CONFIG = {
  viewer: {
    icon: Eye,
    label: 'Viewer',
    color: 'bg-gray-100 text-gray-700',
    description: 'Can view workflow only'
  },
  editor: {
    icon: Edit3,
    label: 'Editor',
    color: 'bg-blue-100 text-blue-700',
    description: 'Can view and edit workflow'
  },
  admin: {
    icon: Shield,
    label: 'Admin',
    color: 'bg-purple-100 text-purple-700',
    description: 'Full control including collaborator management'
  },
  owner: {
    icon: Crown,
    label: 'Owner',
    color: 'bg-yellow-100 text-yellow-700',
    description: 'Original creator with complete control'
  }
};

const PERMISSIONS = [
  { action: 'View workflow', viewer: true, editor: true, admin: true, owner: true },
  { action: 'Edit workflow', viewer: false, editor: true, admin: true, owner: true },
  { action: 'View versions', viewer: true, editor: true, admin: true, owner: true },
  { action: 'Restore versions', viewer: false, editor: true, admin: true, owner: true },
  { action: 'Add collaborators', viewer: false, editor: false, admin: true, owner: true },
  { action: 'Remove collaborators', viewer: false, editor: false, admin: true, owner: true },
  { action: 'Change visibility', viewer: false, editor: false, admin: false, owner: true },
  { action: 'Delete workflow', viewer: false, editor: false, admin: false, owner: true },
  { action: 'Publish to marketplace', viewer: false, editor: false, admin: false, owner: true }
];

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  workflowId,
  currentUserRole,
  onCollaboratorsChange
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [owner, setOwner] = useState<WorkflowOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add collaborator state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Permission matrix state
  const [showPermissions, setShowPermissions] = useState(false);

  const canManageCollaborators = currentUserRole === 'owner' || currentUserRole === 'admin';

  useEffect(() => {
    fetchCollaborators();
  }, [workflowId]);

  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/workflows/${workflowId}`);
      const workflow = response.data;

      setCollaborators(workflow.collaborators || []);
      setOwner({
        id: workflow.ownerId,
        name: workflow.ownerName,
        email: workflow.ownerEmail || '',
        username: workflow.ownerUsername || workflow.ownerName
      });

      onCollaboratorsChange?.(workflow.collaborators || []);
    } catch (err: any) {
      console.error('Error fetching collaborators:', err);
      setError(err.response?.data?.error || 'Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCollaboratorEmail.trim()) {
      setAddError('Email is required');
      return;
    }

    if (!canManageCollaborators) {
      setAddError('You do not have permission to add collaborators');
      return;
    }

    try {
      setAddingCollaborator(true);
      setAddError(null);

      await api.post(`/workflows/${workflowId}/collaborators`, {
        email: newCollaboratorEmail.trim(),
        role: newCollaboratorRole
      });

      // Refresh collaborators list
      await fetchCollaborators();

      // Reset form
      setNewCollaboratorEmail('');
      setNewCollaboratorRole('viewer');
      setShowAddForm(false);
    } catch (err: any) {
      console.error('Error adding collaborator:', err);
      setAddError(err.response?.data?.error || 'Failed to add collaborator');
    } finally {
      setAddingCollaborator(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string, userName: string) => {
    if (!canManageCollaborators) {
      alert('You do not have permission to remove collaborators');
      return;
    }

    if (!confirm(`Remove ${userName} from this workflow?`)) {
      return;
    }

    try {
      await api.delete(`/workflows/${workflowId}/collaborators/${userId}`);
      await fetchCollaborators();
    } catch (err: any) {
      console.error('Error removing collaborator:', err);
      alert(err.response?.data?.error || 'Failed to remove collaborator');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const renderRoleBadge = (role: 'viewer' | 'editor' | 'admin' | 'owner') => {
    const config = ROLE_CONFIG[role];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const renderPermissionMatrix = () => (
    <div className="mt-6 bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Permission Matrix</h3>
        <button
          onClick={() => setShowPermissions(!showPermissions)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showPermissions ? 'Hide' : 'Show'}
        </button>
      </div>

      {showPermissions && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-700">Action</th>
                <th className="text-center py-2 px-3 font-medium text-gray-700">Viewer</th>
                <th className="text-center py-2 px-3 font-medium text-gray-700">Editor</th>
                <th className="text-center py-2 px-3 font-medium text-gray-700">Admin</th>
                <th className="text-center py-2 px-3 font-medium text-gray-700">Owner</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission, index) => (
                <tr key={index} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 px-3 text-gray-900">{permission.action}</td>
                  <td className="text-center py-2 px-3">
                    {permission.viewer ? (
                      <Check className="w-4 h-4 text-green-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="text-center py-2 px-3">
                    {permission.editor ? (
                      <Check className="w-4 h-4 text-green-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="text-center py-2 px-3">
                    {permission.admin ? (
                      <Check className="w-4 h-4 text-green-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="text-center py-2 px-3">
                    {permission.owner ? (
                      <Check className="w-4 h-4 text-green-600 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading collaborators...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Collaborators</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchCollaborators}
              className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="collaboration-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-gray-700" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Team Collaboration</h2>
            <p className="text-sm text-gray-600">
              {collaborators.length + 1} team member{collaborators.length !== 0 ? 's' : ''}
            </p>
          </div>
        </div>

        {canManageCollaborators && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Collaborator
          </button>
        )}
      </div>

      {/* Add Collaborator Form */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Add New Collaborator</h3>
          <form onSubmit={handleAddCollaborator} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={newCollaboratorEmail}
                onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={addingCollaborator}
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                id="role"
                value={newCollaboratorRole}
                onChange={(e) => setNewCollaboratorRole(e.target.value as 'viewer' | 'editor' | 'admin')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={addingCollaborator}
              >
                <option value="viewer">Viewer - Can view workflow only</option>
                <option value="editor">Editor - Can view and edit workflow</option>
                <option value="admin">Admin - Full control including collaborator management</option>
              </select>
            </div>

            {addError && (
              <div className="flex items-start gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={addingCollaborator}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingCollaborator ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Add Collaborator
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCollaboratorEmail('');
                  setNewCollaboratorRole('viewer');
                  setAddError(null);
                }}
                disabled={addingCollaborator}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">About Collaboration</p>
            <p className="mt-1 text-blue-800">
              Team members can be assigned different roles with varying levels of access.
              Only admins and owners can manage collaborators.
            </p>
          </div>
        </div>
      </div>

      {/* Owner */}
      {owner && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Owner</h3>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {owner.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{owner.name}</div>
                  <div className="text-sm text-gray-600">{owner.email}</div>
                </div>
              </div>
              {renderRoleBadge('owner')}
            </div>
          </div>
        </div>
      )}

      {/* Collaborators */}
      {collaborators.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Collaborators ({collaborators.length})
          </h3>
          <div className="space-y-3">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.userId}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {collaborator.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{collaborator.user.name}</div>
                      <div className="text-sm text-gray-600">{collaborator.user.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Added {formatDate(collaborator.addedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {renderRoleBadge(collaborator.role)}
                    {canManageCollaborators && (
                      <button
                        onClick={() => handleRemoveCollaborator(collaborator.userId, collaborator.user.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove collaborator"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No Collaborators Yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            {canManageCollaborators
              ? 'Add team members to collaborate on this workflow'
              : 'This workflow has no other collaborators'
            }
          </p>
          {canManageCollaborators && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add First Collaborator
            </button>
          )}
        </div>
      )}

      {/* Permission Matrix */}
      {renderPermissionMatrix()}
    </div>
  );
};

export default CollaborationPanel;
