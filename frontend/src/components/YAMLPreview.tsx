import React, { useState } from 'react';
import { X, Copy, Download, Check, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { apiService } from '../services/api';

interface YAMLPreviewProps {
  yamlContent: string;
  onClose: () => void;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export const YAMLPreview: React.FC<YAMLPreviewProps> = ({ yamlContent, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(yamlContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download YAML file
  const handleDownload = () => {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Validate YAML with actionlint
  const handleValidate = async () => {
    setValidating(true);
    try {
      const response = await apiService.validateWorkflow(yamlContent);
      setValidation(response.data);
    } catch (err) {
      console.error('Validation failed:', err);
      setValidation({
        valid: false,
        errors: ['Failed to validate workflow. Please check your connection.']
      });
    } finally {
      setValidating(false);
    }
  };

  // Syntax highlighting for YAML
  const highlightYAML = (yaml: string) => {
    return yaml
      .split('\n')
      .map((line, index) => {
        let highlightedLine = line;
        
        // Comments
        highlightedLine = highlightedLine.replace(
          /(#.*)/g,
          '<span class="text-gray-500">$1</span>'
        );
        
        // Keys (before colon)
        highlightedLine = highlightedLine.replace(
          /^(\s*)([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/g,
          '$1<span class="text-blue-600 font-medium">$2</span>:'
        );
        
        // String values (quoted)
        highlightedLine = highlightedLine.replace(
          /: *(['"])(.*?)\1/g,
          ': <span class="text-green-600">$1$2$1</span>'
        );
        
        // Numbers and booleans
        highlightedLine = highlightedLine.replace(
          /: *(true|false|\d+)/g,
          ': <span class="text-purple-600">$1</span>'
        );
        
        // Array indicators
        highlightedLine = highlightedLine.replace(
          /^(\s*)-(\s)/g,
          '$1<span class="text-orange-600">-</span>$2'
        );

        return (
          <div key={index} className="flex">
            <span className="text-gray-400 text-xs mr-3 select-none" style={{ minWidth: '2rem' }}>
              {index + 1}
            </span>
            <span 
              className="flex-1 font-mono text-sm"
              dangerouslySetInnerHTML={{ __html: highlightedLine || '&nbsp;' }}
            />
          </div>
        );
      });
  };

  return (
    <div className="absolute inset-4 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-800">Generated YAML</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleValidate}
              disabled={validating}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              {validating ? 'Validating...' : 'Validate'}
            </button>
            {validation && (
              <div className="flex items-center gap-1">
                {validation.valid ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-xs ${validation.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {validation.valid ? 'Valid' : `${validation.errors.length} error(s)`}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center gap-1.5 text-sm"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Validation Results */}
      {validation && !validation.valid && validation.errors.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-1">Validation Errors:</h4>
              <ul className="text-xs text-red-700 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index} className="font-mono">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-4">
          <pre className="text-sm leading-relaxed">
            {highlightYAML(yamlContent)}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div>
            Lines: {yamlContent.split('\n').length} | 
            Characters: {yamlContent.length}
          </div>
          <div className="flex items-center gap-4">
            <span>Save as .github/workflows/workflow.yml in your repository</span>
            {validation?.valid && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                Ready to use
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};