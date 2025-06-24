import React, { useState, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { Sidebar } from './components/Sidebar';
import { AIAssistant } from './components/AIAssistant';
import { Canvas } from './components/Canvas';
import { WorkflowManager } from './components/WorkflowManager';
import { WorkflowSuggestions } from './components/WorkflowSuggestions';
import { apiService } from './services/api';

/**
 * FlowForge - GitHub Actions Workflow Builder
 * 
 * A powerful visual workflow builder for GitHub Actions that combines
 * drag-and-drop functionality with AI-powered assistance.
 * 
 * @version 1.0.0
 * @author FlowForge Team
 */

interface ActionMetadata {
  id: string;
  name: string;
  description: string;
  repository: string;
  category: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
}

// Main FlowForge component
const FlowForge = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showWorkflowManager, setShowWorkflowManager] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_currentAction, setCurrentAction] = useState<ActionMetadata | null>(null);

  // Handle AI workflow generation
  const handleAIWorkflowGenerated = useCallback((aiResponse: any) => {
    console.log('AI workflow generated:', aiResponse);
    // The Canvas component will handle the workflow loading
  }, []);

  // Handle workflow save
  const handleWorkflowSave = useCallback(async (nodes: any[], edges: any[], yamlContent: string) => {
    try {
      const workflowData = {
        name: 'FlowForge Workflow',
        description: 'Generated workflow',
        nodes,
        edges,
        yaml: yamlContent,
        tags: ['flowforge', 'generated'],
        isPublic: false
      };

      await apiService.saveWorkflow(workflowData);
      setShowWorkflowManager(true);
    } catch (err: any) {
      console.error('Failed to save workflow:', err);
      setError('Failed to save workflow. Please try again.');
    }
  }, []);

  // Handle action drag from sidebar
  const handleActionDrag = useCallback((action: ActionMetadata) => {
    setCurrentAction(action);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="h-screen flex bg-gray-50">
        {/* Sidebar with AI Assistant and Actions */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <AIAssistant
            onWorkflowGenerated={handleAIWorkflowGenerated}
            onError={setError}
          />
          <Sidebar
            onActionDrag={handleActionDrag}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>

        {/* Main Canvas */}
        <Canvas
          onSave={handleWorkflowSave}
          onShowSuggestions={() => setShowSuggestions(true)}
        />

        {/* Error Display */}
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-sm text-red-700">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Manager Modal */}
        {showWorkflowManager && (
          <WorkflowManager
            onClose={() => setShowWorkflowManager(false)}
          />
        )}

        {/* Workflow Suggestions Modal */}
        {showSuggestions && (
          <WorkflowSuggestions
            onClose={() => setShowSuggestions(false)}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
};

export default FlowForge;