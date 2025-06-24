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
  ReactFlowInstance,
  Panel,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FileCode, Save, Download, Upload, Lightbulb, Undo, Redo, Trash2 } from 'lucide-react';
import yaml from 'js-yaml';

// Custom node types
import { ActionNode } from './nodes/ActionNode';
import { YAMLPreview } from './YAMLPreview';
import { NodeConfigPanel } from './NodeConfigPanel';
import type { FlowNode, FlowEdge, NodeData } from '../types';

interface CanvasProps {
  onSave: (nodes: FlowNode[], edges: FlowEdge[], yamlContent: string) => void;
  onShowSuggestions: () => void;
  onAIWorkflowLoaded?: (nodes: FlowNode[], edges: FlowEdge[]) => void;
}

const nodeTypes = {
  action: ActionNode,
};

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#6366f1' },
};

export const Canvas: React.FC<CanvasProps> = ({ 
  onSave, 
  onShowSuggestions,
  onAIWorkflowLoaded
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showYaml, setShowYaml] = useState(false);
  const [history, setHistory] = useState<{ nodes: Node[], edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Save current state to history
  const saveToHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: newNodes, edges: newEdges });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Handle connection between nodes
  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const newEdges = addEdge(params, edges);
      setEdges(newEdges);
      saveToHistory(nodes, newEdges);
    },
    [edges, nodes, saveToHistory, setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle node updates
  const onNodeChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    // Save to history when nodes are modified (not just moved)
    const hasNonPositionChange = changes.some((change) => 
      change.type !== 'position' || (change.type === 'position' && !change.dragging)
    );
    if (hasNonPositionChange) {
      // Delay to allow the change to apply
      setTimeout(() => {
        setNodes(currentNodes => {
          saveToHistory(currentNodes, edges);
          return currentNodes;
        });
      }, 0);
    }
  }, [onNodesChange, edges, saveToHistory, setNodes]);

  // Handle edge updates
  const onEdgeChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    // Save to history when edges are modified
    setTimeout(() => {
      setEdges(currentEdges => {
        saveToHistory(nodes, currentEdges);
        return currentEdges;
      });
    }, 0);
  }, [onEdgesChange, nodes, saveToHistory, setEdges]);

  // Undo/Redo functionality
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

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
        data: {
          ...action,
          label: action.name,
        },
      };

      const newNodes = nodes.concat(newNode);
      setNodes(newNodes);
      saveToHistory(newNodes, edges);
    },
    [reactFlowInstance, nodes, edges, setNodes, saveToHistory]
  );

  // Generate YAML from workflow
  const generateYAML = useCallback(() => {
    if (nodes.length === 0) {
      return '# Add actions to your workflow to generate YAML\nname: Empty Workflow\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - name: No steps defined\n        run: echo "Add some actions!"';
    }

    // Sort nodes by position (top to bottom)
    const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);

    const workflow = {
      name: 'FlowForge Generated Workflow',
      on: {
        push: {
          branches: ['main', 'develop']
        },
        pull_request: {
          branches: ['main']
        },
        workflow_dispatch: {}
      },
      env: {
        NODE_VERSION: '18',
      },
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          timeout: 30,
          steps: sortedNodes.map((node, index) => {
            const step: Record<string, unknown> = {
              id: node.id,
            };

            // Handle different action types
            if (node.data.repository === 'run' || !node.data.repository || node.data.repository.startsWith('run:')) {
              step.name = node.data.name || `Step ${index + 1}`;
              step.run = node.data.command || node.data.inputs?.command || 'echo "Configure this step"';
            } else {
              step.name = node.data.name || `Step ${index + 1}`;
              step.uses = node.data.repository;
              
              // Add inputs if they exist
              if (node.data.inputs && Object.keys(node.data.inputs).length > 0) {
                step.with = {};
                Object.entries(node.data.inputs).forEach(([key, value]) => {
                  if (value && value !== '') {
                    step.with[key] = value;
                  }
                });
              }
            }

            // Add environment variables if specified
            if (node.data.env && Object.keys(node.data.env).length > 0) {
              step.env = node.data.env;
            }

            // Add conditions if specified
            if (node.data.condition) {
              step.if = node.data.condition;
            }

            // Add continue-on-error if specified
            if (node.data.continueOnError) {
              step['continue-on-error'] = true;
            }

            return step;
          })
        }
      }
    };

    return yaml.dump(workflow, { 
      indent: 2, 
      lineWidth: 80,
      noRefs: true 
    });
  }, [nodes]);

  // Load workflow from AI or import
  const loadWorkflow = useCallback((workflowNodes: Node[], workflowEdges: Edge[]) => {
    setNodes(workflowNodes);
    setEdges(workflowEdges);
    saveToHistory(workflowNodes, workflowEdges);
    if (onAIWorkflowLoaded) {
      onAIWorkflowLoaded(workflowNodes, workflowEdges);
    }
  }, [setNodes, setEdges, saveToHistory, onAIWorkflowLoaded]);

  // Handle save workflow
  const handleSave = useCallback(() => {
    const yamlContent = generateYAML();
    onSave(nodes, edges, yamlContent);
  }, [nodes, edges, generateYAML, onSave]);

  // Handle workflow export
  const handleExport = useCallback(() => {
    const yamlContent = generateYAML();
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateYAML]);

  // Handle workflow import
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const yamlContent = e.target?.result as string;
        const workflow = yaml.load(yamlContent) as Record<string, unknown>;
        
        // Convert YAML workflow back to nodes and edges
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        
        if (workflow.jobs && typeof workflow.jobs === 'object') {
          Object.entries(workflow.jobs).forEach(([jobName, job]) => {
            const jobData = job as Record<string, unknown>;
            if (jobData.steps && Array.isArray(jobData.steps)) {
              jobData.steps.forEach((step: unknown, index: number) => {
                const stepData = step as Record<string, unknown>;
                const nodeId = `${jobName}-${index}`;
                
                newNodes.push({
                  id: nodeId,
                  type: 'action',
                  position: { x: 250, y: 100 + index * 120 },
                  data: {
                    name: (stepData.name as string) || `Step ${index + 1}`,
                    repository: (stepData.uses as string) || 'run',
                    inputs: (stepData.with as Record<string, string>) || {},
                    env: (stepData.env as Record<string, string>) || {},
                    condition: stepData.if as string,
                    continueOnError: stepData['continue-on-error'] as boolean,
                    command: stepData.run as string,
                    category: 'imported'
                  }
                });

                // Create sequential edges
                if (index > 0) {
                  newEdges.push({
                    id: `e${jobName}-${index-1}-${index}`,
                    source: `${jobName}-${index-1}`,
                    target: nodeId,
                  });
                }
              });
            }
          });
        }

        loadWorkflow(newNodes, newEdges);
      } catch (error) {
        console.error('Failed to import workflow:', error);
        alert('Failed to import workflow. Please check the YAML format.');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  }, [loadWorkflow]);

  // Clear workflow
  const handleClear = useCallback(() => {
    if (nodes.length > 0 && window.confirm('Are you sure you want to clear the entire workflow?')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      saveToHistory([], []);
    }
  }, [nodes.length, setNodes, setEdges, saveToHistory]);

  // Update node data
  const updateNodeData = useCallback((nodeId: string, newData: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  return (
    <div className="flex-1 relative">
      <ReactFlowProvider>
        <div className="h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodeChange}
            onEdgesChange={onEdgeChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            attributionPosition="bottom-left"
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1} 
              color="#e5e7eb"
            />
            <Controls showInteractive={false} />
            <MiniMap 
              nodeStrokeWidth={3}
              nodeColor="#6366f1"
              maskColor="rgb(240, 242, 247, 0.7)"
            />
            
            {/* Top Panel */}
            <Panel position="top-center" className="bg-white rounded-lg shadow-md p-2 flex gap-2 border border-gray-200">
              <button
                onClick={() => setShowYaml(!showYaml)}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1.5 text-sm"
              >
                <FileCode className="w-4 h-4" />
                {showYaml ? 'Hide' : 'Show'} YAML
              </button>
              
              <button 
                onClick={handleSave}
                className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-1.5 text-sm"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              
              <button 
                onClick={handleExport}
                className="px-3 py-1.5 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors flex items-center gap-1.5 text-sm"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              
              <label className="px-3 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors flex items-center gap-1.5 text-sm cursor-pointer">
                <Upload className="w-4 h-4" />
                Import
                <input
                  type="file"
                  accept=".yml,.yaml"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              
              <button 
                onClick={onShowSuggestions}
                className="px-3 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors flex items-center gap-1.5 text-sm"
              >
                <Lightbulb className="w-4 h-4" />
                Suggestions
              </button>

              <div className="border-l border-gray-300 mx-1" />
              
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="px-2 py-1.5 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Undo"
              >
                <Undo className="w-4 h-4" />
              </button>
              
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="px-2 py-1.5 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Redo"
              >
                <Redo className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleClear}
                disabled={nodes.length === 0}
                className="px-2 py-1.5 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Clear workflow"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Panel>

            {/* Node Count Info */}
            {nodes.length > 0 && (
              <Panel position="bottom-left" className="bg-white rounded-md shadow-sm p-2 border border-gray-200">
                <div className="text-xs text-gray-600">
                  {nodes.length} step{nodes.length !== 1 ? 's' : ''}, {edges.length} connection{edges.length !== 1 ? 's' : ''}
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </ReactFlowProvider>

      {/* YAML Preview */}
      {showYaml && (
        <YAMLPreview
          yamlContent={generateYAML()}
          onClose={() => setShowYaml(false)}
        />
      )}

      {/* Node Configuration Panel */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={updateNodeData}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
};