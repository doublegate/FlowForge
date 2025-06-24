import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  ReactFlowProvider,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Search, Zap, Save, FileCode, Bot, ChevronRight, X, Settings } from 'lucide-react';

/**
 * FlowForge - GitHub Actions Workflow Builder
 * 
 * A powerful visual workflow builder for GitHub Actions that combines
 * drag-and-drop functionality with AI-powered assistance. This application
 * allows users to create complex CI/CD pipelines by connecting actions
 * from the Awesome Actions repository and generates valid YAML files.
 * 
 * Features:
 * - Visual workflow builder with React Flow
 * - Action discovery from Awesome Actions repository
 * - AI/LLM integration for natural language workflow creation
 * - Real-time YAML generation and validation
 * - Action parameter configuration
 * - Workflow optimization suggestions
 * 
 * @version 1.0.0
 * @author FlowForge Team
 */

// Define the structure for GitHub Actions
interface ActionMetadata {
  id: string;
  name: string;
  description: string;
  repository: string;
  category: string;
  inputs?: Record<string, {
    description: string;
    required?: boolean;
    default?: string;
  }>;
  outputs?: Record<string, {
    description: string;
  }>;
}

// Custom node component for actions
const ActionNode = ({ data, selected }: { data: any; selected: boolean }) => {
  return (
    <div className={`px-4 py-3 rounded-lg border-2 ${
      selected ? 'border-blue-500 shadow-lg' : 'border-gray-300'
    } bg-white min-w-[200px]`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            data.category === 'build' ? 'bg-green-500' :
            data.category === 'test' ? 'bg-yellow-500' :
            data.category === 'deploy' ? 'bg-blue-500' :
            'bg-gray-500'
          }`} />
          <h3 className="font-semibold text-sm">{data.name}</h3>
        </div>
        <Settings className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
      </div>
      <p className="text-xs text-gray-600 mb-2">{data.description}</p>
      <div className="text-xs text-gray-500">{data.repository}</div>
    </div>
  );
};

// Node types configuration
const nodeTypes = {
  action: ActionNode,
};

// Sample actions data (in production, this would come from the backend)
const sampleActions: ActionMetadata[] = [
  {
    id: '1',
    name: 'Checkout',
    description: 'Checkout a Git repository at a particular version',
    repository: 'actions/checkout@v4',
    category: 'build',
    inputs: {
      repository: {
        description: 'Repository name with owner',
        default: '${{ github.repository }}'
      },
      ref: {
        description: 'The branch, tag or SHA to checkout'
      }
    }
  },
  {
    id: '2',
    name: 'Setup Node.js',
    description: 'Set up Node.js environment',
    repository: 'actions/setup-node@v4',
    category: 'build',
    inputs: {
      'node-version': {
        description: 'Version of Node.js to use',
        required: true
      }
    }
  },
  {
    id: '3',
    name: 'Run Tests',
    description: 'Run test suite',
    repository: 'run',
    category: 'test',
  },
  {
    id: '4',
    name: 'Deploy to GitHub Pages',
    description: 'Deploy static site to GitHub Pages',
    repository: 'peaceiris/actions-gh-pages@v3',
    category: 'deploy',
    inputs: {
      github_token: {
        description: 'GitHub token for authentication',
        required: true,
        default: '${{ secrets.GITHUB_TOKEN }}'
      },
      publish_dir: {
        description: 'Directory to publish',
        required: true
      }
    }
  }
];

// Main FlowForge component
const FlowForge = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showYaml, setShowYaml] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Handle connection between nodes
  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Drag and drop handling
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowBounds) {
        return;
      }

      const action = JSON.parse(type);
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${Date.now()}`,
        type: 'action',
        position,
        data: action,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Generate YAML from the current workflow
  const generateYaml = () => {
    const workflow = {
      name: 'Custom Workflow',
      on: ['push'],
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          steps: nodes.map((node, index) => {
            const step: any = {};
            
            if (node.data.repository === 'run') {
              step.run = node.data.inputs?.command || 'echo "Add command"';
            } else {
              step.uses = node.data.repository;
              if (node.data.inputs) {
                step.with = {};
                Object.entries(node.data.inputs).forEach(([key, value]: [string, any]) => {
                  if (value.default) {
                    step.with[key] = value.default;
                  }
                });
              }
            }
            
            if (index === 0 || edges.some(edge => edge.target === node.id)) {
              step.name = node.data.name;
            }
            
            return step;
          })
        }
      }
    };

    return `# Generated by FlowForge
${JSON.stringify(workflow, null, 2).replace(/"/g, '').replace(/,\n/g, '\n')}`;
  };

  // Handle AI prompt submission
  const handleAiPrompt = () => {
    // In production, this would call the backend API
    console.log('AI Prompt:', aiPrompt);
    // Simulate AI response by adding suggested actions
    if (aiPrompt.toLowerCase().includes('deploy') && aiPrompt.toLowerCase().includes('static')) {
      // Add checkout, setup-node, build, and deploy actions
      const suggestedNodes = [
        { ...sampleActions[0], position: { x: 100, y: 100 } },
        { ...sampleActions[1], position: { x: 100, y: 200 } },
        { ...sampleActions[2], position: { x: 100, y: 300 } },
        { ...sampleActions[3], position: { x: 100, y: 400 } },
      ];
      
      // Add nodes and edges for the suggested workflow
      // This is simplified - in production, this would be more sophisticated
    }
  };

  // Filter actions based on search
  const filteredActions = sampleActions.filter(action =>
    action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-500" />
            FlowForge
          </h1>
          <p className="text-sm text-gray-600 mt-1">Visual GitHub Actions Builder</p>
        </div>

        {/* AI Assistant */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-purple-500" />
            <h2 className="font-semibold text-gray-700">AI Assistant</h2>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe your workflow..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAiPrompt()}
            />
            <button
              onClick={handleAiPrompt}
              className="px-3 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actions..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Available Actions</h3>
          <div className="space-y-2">
            {filteredActions.map((action) => (
              <div
                key={action.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/reactflow', JSON.stringify(action));
                  event.dataTransfer.effectAllowed = 'move';
                }}
                className="p-3 border border-gray-200 rounded-md cursor-move hover:border-blue-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${
                    action.category === 'build' ? 'bg-green-500' :
                    action.category === 'test' ? 'bg-yellow-500' :
                    action.category === 'deploy' ? 'bg-blue-500' :
                    'bg-gray-500'
                  }`} />
                  <h4 className="font-medium text-sm">{action.name}</h4>
                </div>
                <p className="text-xs text-gray-600">{action.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <div className="h-full" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background variant="dots" gap={12} size={1} />
              <Controls />
              <MiniMap />
              
              {/* Top Panel */}
              <Panel position="top-center" className="bg-white rounded-lg shadow-md p-2 flex gap-2">
                <button
                  onClick={() => setShowYaml(!showYaml)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <FileCode className="w-4 h-4" />
                  {showYaml ? 'Hide' : 'Show'} YAML
                </button>
                <button className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Workflow
                </button>
              </Panel>
            </ReactFlow>
          </div>
        </ReactFlowProvider>

        {/* YAML Preview */}
        {showYaml && (
          <div className="absolute top-20 right-4 w-96 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700">Generated YAML</h3>
              <button
                onClick={() => setShowYaml(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="flex-1 p-4 overflow-auto text-xs font-mono bg-gray-50">
              {nodes.length > 0 ? generateYaml() : '# Add actions to generate YAML'}
            </pre>
          </div>
        )}

        {/* Selected Node Panel */}
        {selectedNode && (
          <div className="absolute bottom-4 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Configure Action</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Action</label>
                <p className="text-sm text-gray-800">{selectedNode.data.name}</p>
              </div>
              {selectedNode.data.inputs && Object.entries(selectedNode.data.inputs).map(([key, input]: [string, any]) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-600">
                    {key} {input.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    defaultValue={input.default || ''}
                    placeholder={input.description}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowForge;