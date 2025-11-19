import React, { useState } from 'react';
import { Bot, ChevronRight, Loader2, X, Lightbulb, Zap, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import type { WorkflowGenerationResponse } from '../types';

interface AIAssistantProps {
  onWorkflowGenerated: (workflow: WorkflowGenerationResponse) => void;
}

interface AIResponse extends WorkflowGenerationResponse {
  name: string;
  description: string;
  generatedAt?: string;
  version?: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  onWorkflowGenerated
}) => {
  const { error: showError, success } = useNotification();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    const userMessage = prompt.trim();
    setPrompt('');
    setLoading(true);
    
    // Add user message to history
    setConversationHistory(prev => [...prev, {
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    try {
      const result = await apiService.generateWorkflow(userMessage);
      const aiResponse = result.data as AIResponse;

      setResponse(aiResponse);
      setShowResponse(true);

      // Add assistant response to history
      setConversationHistory(prev => [...prev, {
        type: 'assistant',
        content: aiResponse.explanation || aiResponse.description || 'Workflow generated successfully',
        timestamp: new Date()
      }]);

      // Trigger workflow generation in parent component
      onWorkflowGenerated(aiResponse);

      // Show success notification
      success('Workflow Generated', 'Your AI-powered workflow has been created successfully!');

    } catch (err) {
      const errorMessage = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to generate workflow. Please try again.';

      // Show error notification
      showError('Generation Failed', errorMessage);

      // Add error to history
      setConversationHistory(prev => [...prev, {
        type: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setConversationHistory([]);
    setResponse(null);
    setShowResponse(false);
  };

  const suggestedPrompts = [
    'Create a Node.js CI/CD pipeline with testing and deployment',
    'Build a Python workflow with linting, testing, and Docker',
    'Set up a React app deployment to GitHub Pages',
    'Create a security scanning workflow for a JavaScript project',
    'Build a multi-platform release workflow with artifacts'
  ];

  return (
    <div className="border-b border-gray-200">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold text-gray-700">AI Assistant</h2>
          </div>
          {conversationHistory.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your workflow needs..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleSubmit()}
            disabled={loading}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !prompt.trim()}
            className="px-3 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Generate workflow from prompt"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Suggested Prompts */}
        {conversationHistory.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-2">Try these examples:</p>
            {suggestedPrompts.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setPrompt(suggestion)}
                className="block w-full text-left text-xs text-gray-600 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-md transition-colors"
              >
                <Lightbulb className="w-3 h-3 inline mr-1" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="max-h-64 overflow-y-auto border-t border-gray-100">
          <div className="p-4 space-y-3">
            {conversationHistory.slice(-6).map((message, index) => (
              <div
                key={index}
                className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-2 rounded-lg text-xs ${
                    message.type === 'user'
                      ? 'bg-purple-500 text-white'
                      : message.content.startsWith('Error:')
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {message.type === 'assistant' && message.content.startsWith('Error:') && (
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                  )}
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Response Modal */}
      {showResponse && response && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-800">AI Generated Workflow</h3>
              </div>
              <button
                onClick={() => setShowResponse(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {/* Workflow Info */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">{response.name}</h4>
                  <p className="text-sm text-gray-600">{response.description}</p>
                </div>

                {/* Explanation */}
                {response.explanation && (
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">How it works:</h5>
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {response.explanation}
                    </p>
                  </div>
                )}

                {/* Actions Used */}
                {response.actions && response.actions.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Actions included:</h5>
                    <div className="space-y-2">
                      {response.actions.map((action, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            action.category === 'setup' ? 'bg-blue-500' :
                              action.category === 'build' ? 'bg-green-500' :
                                action.category === 'test' ? 'bg-yellow-500' :
                                  action.category === 'deploy' ? 'bg-purple-500' :
                                    'bg-gray-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">{action.name}</p>
                            <p className="text-xs text-gray-500">{action.repository}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {response.suggestions && response.suggestions.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Additional suggestions:</h5>
                    <ul className="space-y-1">
                      {response.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <Lightbulb className="w-3 h-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Metadata */}
                {response.generatedAt && (
                  <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                    Generated at {new Date(response.generatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowResponse(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onWorkflowGenerated(response);
                  setShowResponse(false);
                }}
                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
              >
                Apply to Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};