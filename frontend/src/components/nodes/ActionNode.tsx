import React from 'react';
import { Handle, Position } from 'reactflow';
import { Settings, Play, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { NodeData } from '../../types';

interface ActionNodeData extends NodeData {
  status?: 'idle' | 'running' | 'success' | 'error';
  env?: Record<string, string>;
  condition?: string;
  continueOnError?: boolean;
  command?: string;
}

interface ActionNodeProps {
  data: ActionNodeData;
  selected: boolean;
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    setup: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    build: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
    test: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    deploy: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    security: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    docker: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
    cloud: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
    notification: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
    package: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
    documentation: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
    automation: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
    monitoring: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    utility: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
    mobile: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
    imported: { bg: 'bg-zinc-50', border: 'border-zinc-200', text: 'text-zinc-700' },
  };
  
  return colors[category] || colors.utility;
};

const getStatusIcon = (status?: string) => {
  switch (status) {
  case 'running':
    return <Clock className="w-3 h-3 text-blue-500 animate-pulse" />;
  case 'success':
    return <CheckCircle className="w-3 h-3 text-green-500" />;
  case 'error':
    return <AlertTriangle className="w-3 h-3 text-red-500" />;
  default:
    return null;
  }
};

export const ActionNode: React.FC<ActionNodeProps> = ({ data, selected }) => {
  const categoryStyle = getCategoryColor(data.category);
  const isRunStep = data.repository === 'run' || !data.repository || data.repository.startsWith('run:');
  
  const hasInputs = data.inputs && Object.keys(data.inputs).length > 0;
  const hasEnv = data.env && Object.keys(data.env).length > 0;
  const hasCondition = data.condition && data.condition.trim().length > 0;
  
  return (
    <div 
      className={`
        relative bg-white rounded-lg shadow-sm border-2 transition-all duration-200
        ${selected 
      ? 'border-blue-500 shadow-lg scale-105' 
      : `${categoryStyle.border} hover:shadow-md hover:scale-102`
    }
        min-w-[240px] max-w-[300px]
      `}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white hover:!bg-blue-500"
      />
      
      {/* Header */}
      <div className={`px-3 py-2 rounded-t-lg ${categoryStyle.bg} ${categoryStyle.border} border-b`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`w-2 h-2 rounded-full ${
              data.category === 'setup' ? 'bg-blue-500' :
                data.category === 'build' ? 'bg-green-500' :
                  data.category === 'test' ? 'bg-yellow-500' :
                    data.category === 'deploy' ? 'bg-purple-500' :
                      data.category === 'security' ? 'bg-red-500' :
                        data.category === 'docker' ? 'bg-cyan-500' :
                          data.category === 'cloud' ? 'bg-indigo-500' :
                            'bg-gray-500'
            }`} />
            <h3 className={`font-semibold text-sm truncate ${categoryStyle.text}`}>
              {data.name || 'Unnamed Step'}
            </h3>
            {getStatusIcon(data.status)}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {hasCondition && (
              <div 
                className="w-2 h-2 rounded-full bg-yellow-400" 
                title="Has condition"
              />
            )}
            {data.continueOnError && (
              <div 
                className="w-2 h-2 rounded-full bg-orange-400" 
                title="Continue on error"
              />
            )}
            <Settings className="w-3 h-3 text-gray-400 opacity-60" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Description */}
        {data.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {data.description}
          </p>
        )}

        {/* Repository/Command */}
        <div className="mb-2">
          {isRunStep ? (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Play className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Command:</span>
              </div>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700 block truncate">
                {data.command || 'echo "Configure command"'}
              </code>
            </div>
          ) : (
            <div>
              <div className="text-xs text-gray-500 mb-1">Action:</div>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700 block truncate">
                {data.repository}
              </code>
            </div>
          )}
        </div>

        {/* Inputs Summary */}
        {hasInputs && (
          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">
              Inputs ({Object.keys(data.inputs!).length}):
            </div>
            <div className="text-xs bg-blue-50 px-2 py-1 rounded border border-blue-100">
              {Object.keys(data.inputs!).slice(0, 2).join(', ')}
              {Object.keys(data.inputs!).length > 2 && '...'}
            </div>
          </div>
        )}

        {/* Environment Variables Summary */}
        {hasEnv && (
          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">
              Env ({Object.keys(data.env!).length}):
            </div>
            <div className="text-xs bg-green-50 px-2 py-1 rounded border border-green-100">
              {Object.keys(data.env!).slice(0, 2).join(', ')}
              {Object.keys(data.env!).length > 2 && '...'}
            </div>
          </div>
        )}

        {/* Condition */}
        {hasCondition && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Condition:</div>
            <code className="text-xs bg-yellow-50 px-2 py-1 rounded font-mono text-yellow-700 block truncate border border-yellow-100">
              {data.condition}
            </code>
          </div>
        )}
      </div>

      {/* Category Badge */}
      <div className="absolute -top-2 -right-2">
        <span className={`
          inline-block px-2 py-0.5 rounded-full text-xs font-medium
          ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border} border
          shadow-sm
        `}>
          {data.category}
        </span>
      </div>

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white hover:!bg-blue-500"
      />
    </div>
  );
};