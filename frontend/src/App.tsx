import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { AuthProvider } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { AIAssistant } from './components/AIAssistant';
import { Canvas } from './components/Canvas';
import { WorkflowManager } from './components/WorkflowManager';
import { WorkflowSuggestions } from './components/WorkflowSuggestions';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfile from './components/UserProfile';
import { apiService } from './services/api';
import type { ActionMetadata, WorkflowGenerationResponse, FlowNode, FlowEdge } from './types';

/**
 * FlowForge - GitHub Actions Workflow Builder
 *
 * A powerful visual workflow builder for GitHub Actions that combines
 * drag-and-drop functionality with AI-powered assistance.
 *
 * @version 1.0.0
 * @author FlowForge Team
 */

// Main FlowForge Workspace component (protected)
const FlowForgeWorkspace = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showWorkflowManager, setShowWorkflowManager] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setCurrentAction] = useState<ActionMetadata | null>(null);

  // Handle AI workflow generation
  const handleAIWorkflowGenerated = useCallback((_aiResponse: WorkflowGenerationResponse) => {
    // Successfully generated AI workflow
    // The Canvas component will handle the workflow loading
    // Future: Could use aiResponse here to show statistics or additional UI feedback
  }, []);

  // Handle workflow save
  const handleWorkflowSave = useCallback(async (nodes: FlowNode[], edges: FlowEdge[], yamlContent: string) => {
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
    } catch (err) {
      console.error('Failed to save workflow:', err);
      setError('Failed to save workflow. Please try again.');
    }
  }, []);

  // Handle action drag from sidebar
  const handleActionDrag = useCallback((action: ActionMetadata) => {
    setCurrentAction(action);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <h1 className="sr-only">FlowForge - Visual GitHub Actions Workflow Builder</h1>

      {/* Top bar with user profile */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            FlowForge
          </div>
          <span className="text-sm text-gray-500">Visual Workflow Builder</span>
        </div>
        <UserProfile />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex">
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
                  aria-label="Close error message"
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
    </div>
  );
};

// Authentication Pages Component
const AuthPages = () => {
  const [showLogin, setShowLogin] = useState(true);

  return showLogin ? (
    <Login
      onSuccess={() => {
        // Will redirect via ProtectedRoute after login
        window.location.href = '/';
      }}
      onSwitchToRegister={() => setShowLogin(false)}
    />
  ) : (
    <Register
      onSuccess={() => {
        // Will redirect via ProtectedRoute after registration
        window.location.href = '/';
      }}
      onSwitchToLogin={() => setShowLogin(true)}
    />
  );
};

// Main App component with routing and authentication
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<AuthPages />} />
          <Route path="/register" element={<AuthPages />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ReactFlowProvider>
                  <FlowForgeWorkspace />
                </ReactFlowProvider>
              </ProtectedRoute>
            }
          />

          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;