import React, { useState, useEffect } from 'react';
import { X, Settings, Info, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { Node } from 'reactflow';

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}

interface InputField {
  key: string;
  value: string;
  description?: string;
  required?: boolean;
  type?: string;
  options?: string[];
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  onUpdate,
  onClose
}) => {
  const [name, setName] = useState(node.data.name || '');
  const [inputs, setInputs] = useState<InputField[]>([]);
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);
  const [condition, setCondition] = useState(node.data.condition || '');
  const [continueOnError, setContinueOnError] = useState(node.data.continueOnError || false);
  const [command, setCommand] = useState(node.data.command || '');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));

  // Initialize form data from node
  useEffect(() => {
    setName(node.data.name || '');
    setCondition(node.data.condition || '');
    setContinueOnError(node.data.continueOnError || false);
    setCommand(node.data.command || '');

    // Convert inputs to form format
    if (node.data.inputs) {
      const inputFields: InputField[] = Object.entries(node.data.inputs).map(([key, value]: [string, any]) => {
        if (typeof value === 'object' && value !== null) {
          return {
            key,
            value: value.default || '',
            description: value.description,
            required: value.required,
            type: value.type,
            options: value.options
          };
        }
        return {
          key,
          value: String(value || ''),
        };
      });
      setInputs(inputFields);
    }

    // Convert env vars to form format
    if (node.data.env) {
      const envFields = Object.entries(node.data.env).map(([key, value]) => ({
        key,
        value: String(value || '')
      }));
      setEnvVars(envFields);
    }
  }, [node]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updateInput = (index: number, field: keyof InputField, value: string) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setInputs(newInputs);
  };

  const addInput = () => {
    setInputs([...inputs, { key: '', value: '' }]);
  };

  const removeInput = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const newEnvVars = [...envVars];
    newEnvVars[index] = { ...newEnvVars[index], [field]: value };
    setEnvVars(newEnvVars);
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Convert inputs back to object format
    const inputsObj: Record<string, any> = {};
    inputs.forEach(input => {
      if (input.key.trim()) {
        inputsObj[input.key] = input.value;
      }
    });

    // Convert env vars back to object format
    const envObj: Record<string, string> = {};
    envVars.forEach(env => {
      if (env.key.trim()) {
        envObj[env.key] = env.value;
      }
    });

    const updatedData = {
      name: name.trim() || node.data.name,
      inputs: inputsObj,
      env: Object.keys(envObj).length > 0 ? envObj : undefined,
      condition: condition.trim() || undefined,
      continueOnError,
      command: node.data.repository === 'run' ? command : undefined,
    };

    onUpdate(node.id, updatedData);
    onClose();
  };

  const isRunStep = node.data.repository === 'run' || !node.data.repository || node.data.repository.startsWith('run:');

  return (
    <div className="absolute bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[70vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-700">Configure Step</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Basic Configuration */}
          <div>
            <button
              onClick={() => toggleSection('basic')}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                {expandedSections.has('basic') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Basic Settings
              </h4>
            </button>
            
            {expandedSections.has('basic') && (
              <div className="mt-3 space-y-3 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Step Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter step name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Action Repository
                  </label>
                  <div className="text-sm text-gray-500 font-mono bg-gray-50 p-2 rounded border">
                    {node.data.repository || 'run'}
                  </div>
                </div>

                {isRunStep && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Command
                    </label>
                    <textarea
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="Enter shell command"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Inputs */}
          {!isRunStep && (
            <div>
              <button
                onClick={() => toggleSection('inputs')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  {expandedSections.has('inputs') ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  Action Inputs
                  {inputs.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {inputs.length}
                    </span>
                  )}
                </h4>
              </button>
              
              {expandedSections.has('inputs') && (
                <div className="mt-3 space-y-3 ml-6">
                  {inputs.map((input, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={input.key}
                            onChange={(e) => updateInput(index, 'key', e.target.value)}
                            placeholder="Parameter name"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={input.value}
                            onChange={(e) => updateInput(index, 'value', e.target.value)}
                            placeholder="Parameter value"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={() => removeInput(index)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {input.description && (
                        <div className="flex items-start gap-1 text-xs text-gray-500">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {input.description}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <button
                    onClick={addInput}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Input
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Environment Variables */}
          <div>
            <button
              onClick={() => toggleSection('env')}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                {expandedSections.has('env') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Environment Variables
                {envVars.length > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {envVars.length}
                  </span>
                )}
              </h4>
            </button>
            
            {expandedSections.has('env') && (
              <div className="mt-3 space-y-3 ml-6">
                {envVars.map((env, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={env.key}
                      onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                      placeholder="ENV_NAME"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    <span className="text-gray-400">=</span>
                    <input
                      type="text"
                      value={env.value}
                      onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                      placeholder="value"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeEnvVar(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={addEnvVar}
                  className="flex items-center gap-2 text-green-600 hover:text-green-800 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Environment Variable
                </button>
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <div>
            <button
              onClick={() => toggleSection('advanced')}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                {expandedSections.has('advanced') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Advanced Options
              </h4>
            </button>
            
            {expandedSections.has('advanced') && (
              <div className="mt-3 space-y-3 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Condition (if)
                  </label>
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="e.g., success() && github.ref == 'refs/heads/main'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Only run this step if the condition is true
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="continueOnError"
                    checked={continueOnError}
                    onChange={(e) => setContinueOnError(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="continueOnError" className="text-sm text-gray-600">
                    Continue on error
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};