import React, { useState, useEffect } from 'react';
import { Save, Upload, Download, Share2, Copy, Trash2, FolderOpen, X } from 'lucide-react';
import { apiService } from '../services/api';

interface Workflow {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  tags: string[];
}

interface WorkflowManagerProps {
  onClose: () => void;
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({
  onClose
}) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [activeTab, setActiveTab] = useState<'save' | 'load'>('save');

  // Fetch user workflows
  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await apiService.getWorkflows();
      setWorkflows(response.data.workflows);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    try {
      setSaving(true);
      
      // Generate YAML from nodes and edges
      const yaml = generateYamlFromFlow(nodes, edges);
      
      const workflowData = {
        name: workflowName,
        description: workflowDescription,
        nodes,
        edges,
        yaml,
        isPublic,
        tags: [] // TODO: Add tag input
      };

      if (selectedWorkflow) {
        // Update existing workflow
        await apiService.updateWorkflow(selectedWorkflow._id, workflowData);
        alert('Workflow updated successfully!');
      } else {
        // Create new workflow
        await apiService.saveWorkflow(workflowData);
        alert('Workflow saved successfully!');
      }

      // Refresh workflow list
      fetchWorkflows();
      
      // Reset form
      setWorkflowName('');
      setWorkflowDescription('');
      setIsPublic(false);
      setSelectedWorkflow(null);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const loadWorkflow = async (workflow: Workflow) => {
    try {
      setLoading(true);
      const response = await apiService.getWorkflow(workflow._id);
      const fullWorkflow = response.data;
      
      if (fullWorkflow.nodes && fullWorkflow.edges) {
        onLoadWorkflow(fullWorkflow.nodes, fullWorkflow.edges);
        onClose();
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
      alert('Failed to load workflow. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      await apiService.deleteWorkflow(workflowId);
      fetchWorkflows();
      alert('Workflow deleted successfully!');
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      alert('Failed to delete workflow. Please try again.');
    }
  };

  const generateYamlFromFlow = (nodes: any[], edges: any[]) => {
    const workflow = {
      name: workflowName || 'My Workflow',
      on: ['push'],
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          steps: nodes.map((node) => {
            const step: any = {};
            
            if (node.data.repository === 'run') {
              step.run = node.data.inputs?.command || 'echo "Add command"';
            } else {
              step.uses = node.data.repository;
              if (node.data.inputs) {
                step.with = {};
                Object.entries(node.data.inputs).forEach(([key, value]: [string, any]) => {
                  if (typeof value === 'string') {
                    step.with[key] = value;
                  } else if (value.default) {
                    step.with[key] = value.default;
                  }
                });
              }
            }
            
            step.name = node.data.name;
            
            return step;
          })
        }
      }
    };

    return JSON.stringify(workflow, null, 2).replace(/"/g, '').replace(/,\n/g, '\n');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Workflow Manager</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('save')}
            className={`flex-1 py-3 px-4 font-medium ${
              activeTab === 'save'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Save className="w-4 h-4 inline-block mr-2" />
            Save Workflow
          </button>
          <button
            onClick={() => setActiveTab('load')}
            className={`flex-1 py-3 px-4 font-medium ${
              activeTab === 'load'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FolderOpen className="w-4 h-4 inline-block mr-2" />
            Load Workflow
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {activeTab === 'save' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="My CI/CD Pipeline"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Describe what this workflow does..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                  Make this workflow public (others can view and fork)
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveWorkflow}
                  disabled={saving || !workflowName.trim()}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : selectedWorkflow ? 'Update Workflow' : 'Save Workflow'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading workflows...</div>
              ) : workflows.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No saved workflows yet. Create your first workflow!
                </div>
              ) : (
                <div className="space-y-3">
                  {workflows.map((workflow) => (
                    <div
                      key={workflow._id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-800">{workflow.name}</h3>
                          {workflow.description && (
                            <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Updated: {new Date(workflow.updatedAt).toLocaleDateString()}</span>
                            {workflow.isPublic && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                                Public
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => loadWorkflow(workflow)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Load workflow"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedWorkflow(workflow);
                              setWorkflowName(workflow.name);
                              setWorkflowDescription(workflow.description);
                              setIsPublic(workflow.isPublic);
                              setActiveTab('save');
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                            title="Edit workflow"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteWorkflow(workflow._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete workflow"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};