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
  type: 'optimization' | 'security' | 'best-practice' | 'performance' | 'cost' | 'reliability' | 'feature';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  priority?: 'high' | 'medium' | 'low';
  implementation?: string;
}

// Technology Detection Types
export interface TechnologyInfo {
  name: string;
  category: 'language' | 'framework' | 'platform' | 'tool';
  keywords: string[];
  related: string[];
}

export interface ActionWithTechnology extends ActionMetadata {
  technologies?: string[];
  techCategory?: string;
}

// Enhanced Validation Types
export interface ValidationWarning {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rule?: string;
  suggestion?: string;
}

export interface EnhancedValidationResponse {
  isValid: boolean;
  errors: ValidationWarning[];
  warnings: ValidationWarning[];
  suggestions: string[];
  stats?: {
    totalSteps: number;
    estimatedTime: string;
    complexity: 'low' | 'medium' | 'high';
  };
}

// Workflow Job Structure Types
export interface WorkflowJob {
  name: string;
  'runs-on': string | string[];
  needs?: string | string[];
  steps: WorkflowStep[];
  strategy?: {
    matrix?: Record<string, unknown>;
    'fail-fast'?: boolean;
    'max-parallel'?: number;
  };
  environment?: string | {
    name: string;
    url?: string;
  };
  'timeout-minutes'?: number;
  permissions?: Record<string, string>;
  services?: Record<string, unknown>;
}

export interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, string | number | boolean>;
  env?: Record<string, string>;
  id?: string;
  if?: string;
  'continue-on-error'?: boolean;
  'timeout-minutes'?: number;
}

export interface WorkflowDefinition {
  name: string;
  on: string | string[] | Record<string, unknown>;
  jobs: Record<string, WorkflowJob>;
  env?: Record<string, string>;
  permissions?: Record<string, string>;
  concurrency?: {
    group: string;
    'cancel-in-progress'?: boolean;
  };
}

// Edge Analysis Types
export interface EdgeAnalysis {
  parallelizableJobs: string[][];
  bottlenecks: string[];
  criticalPath: string[];
  suggestions: string[];
  dependencies: Record<string, string[]>;
}

// API Response Wrapper Types
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface APIError {
  success: false;
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}