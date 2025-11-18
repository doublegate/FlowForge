import React, { useState, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Sidebar } from './components/Sidebar';
import { AIAssistant } from './components/AIAssistant';
import { Canvas } from './components/Canvas';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfile from './components/UserProfile';
import ThemeToggle from './components/ThemeToggle';
import ErrorBoundary from './components/ErrorBoundary';
import SkipLink from './components/SkipLink';
import LoadingSpinner from './components/LoadingSpinner';
import { Menu, X } from 'lucide-react';
import { apiService } from './services/api';
import type { ActionMetadata, WorkflowGenerationResponse, FlowNode, FlowEdge } from './types';

// Lazy load components that are not immediately needed
const Login = lazy(() => import('./components/Login'));
const Register = lazy(() => import('./components/Register'));
const WorkflowManager = lazy(() => import('./components/WorkflowManager'));
const WorkflowSuggestions = lazy(() => import('./components/WorkflowSuggestions'));

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
      throw new Error('Failed to save workflow. Please try again.');
    }
  }, []);

  // Handle action drag from sidebar
  const handleActionDrag = useCallback((action: ActionMetadata) => {
    setCurrentAction(action);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <SkipLink />
      <h1 className="sr-only">FlowForge - Visual GitHub Actions Workflow Builder</h1>

      {/* Top bar with user profile */}
      <header role="banner" className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent" role="heading" aria-level={1}>
            FlowForge
          </div>
          <span className="text-sm text-gray-500" aria-label="Application subtitle">Visual Workflow Builder</span>
        </div>
        <div className="flex items-center gap-3" role="toolbar" aria-label="User tools">
          <ThemeToggle />
          <UserProfile />
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div
            className="mobile-sidebar-overlay active"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}

        {/* Sidebar with AI Assistant and Actions */}
        <aside
          role="complementary"
          aria-label="Tools and actions sidebar"
          className={`w-80 bg-white border-r border-gray-200 flex flex-col ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}
        >
          <AIAssistant
            onWorkflowGenerated={handleAIWorkflowGenerated}
          />
          <Sidebar
            onActionDrag={handleActionDrag}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </aside>

        {/* Mobile Menu Toggle Button */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          aria-label={mobileSidebarOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Main Canvas */}
        <main id="main-content" role="main" aria-label="Workflow canvas" className="flex-1">
          <Canvas
            onSave={handleWorkflowSave}
            onShowSuggestions={() => setShowSuggestions(true)}
          />
        </main>

        {/* Workflow Manager Modal */}
        {showWorkflowManager && (
          <Suspense fallback={<LoadingSpinner message="Loading workflow manager..." />}>
            <WorkflowManager
              onClose={() => setShowWorkflowManager(false)}
            />
          </Suspense>
        )}

        {/* Workflow Suggestions Modal */}
        {/* Temporarily disabled - needs nodes/edges props */}
        {/* {showSuggestions && (
          <WorkflowSuggestions
            onClose={() => setShowSuggestions(false)}
          />
        )} */}
      </div>
    </div>
  );
};

// Authentication Pages Component
const AuthPages = () => {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen />}>
      {showLogin ? (
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
      )}
    </Suspense>
  );
};

// Main App component with routing and authentication
const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
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
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;