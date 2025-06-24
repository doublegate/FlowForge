// API Response Types
export interface ActionInput {
  description: string;
  required: boolean;
  default?: string;
  type?: string;
}

export interface ActionOutput {
  description: string;
  value?: string;
}

export interface ActionMetadata {
  _id: string;
  name: string;
  description: string;
  repository: string;
  category: string;
  version?: string;
  author?: string;
  stars?: number;
  lastUpdated?: string;
  inputs?: Record<string, ActionInput>;
  outputs?: Record<string, ActionOutput>;
  runs?: {
    using: string;
    main?: string;
    pre?: string;
    post?: string;
  };
  branding?: {
    icon: string;
    color: string;
  };
}

export interface WorkflowTemplate {
  _id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  prerequisites: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowGenerationRequest {
  prompt: string;
  context?: string;
  language?: string;
  framework?: string;
}

export interface WorkflowGenerationResponse {
  workflow: string;
  explanation: string;
  suggestions: string[];
  actions: ActionMetadata[];
}

export interface WorkflowSuggestionsResponse {
  summary: string;
  suggestions: Array<{
    type: 'optimization' | 'security' | 'best-practice' | 'performance';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    implementation?: string;
  }>;
}

export interface ValidationResponse {
  isValid: boolean;
  errors: Array<{
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

// React Flow Types
export interface NodeData {
  name: string;
  repository: string;
  description?: string;
  category?: string;
  action?: ActionMetadata;
  inputs?: Record<string, string | ActionInput>;
  outputs?: Record<string, string | ActionOutput>;
  config?: Record<string, string>;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// Workflow Types
export interface SavedWorkflow {
  _id: string;
  name: string;
  description?: string;
  content: {
    nodes: FlowNode[];
    edges: FlowEdge[];
  };
  yaml?: string;
  createdAt: string;
  updatedAt: string;
}

// AI Suggestion Types
export interface AISuggestion {
  type: 'optimization' | 'security' | 'best-practice' | 'performance';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  implementation?: string;
}