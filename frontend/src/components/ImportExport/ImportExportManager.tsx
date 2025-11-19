import React, { useState } from 'react';
import {
  Download,
  Upload,
  FileJson,
  FileCode,
  Check,
  X,
  AlertCircle,
  Info,
  Loader2,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react';
import api from '../../services/api';

/**
 * ImportExportManager Component
 *
 * Handles workflow import and export functionality
 *
 * Features:
 * - Export to JSON or YAML
 * - Import from JSON or YAML
 * - Import preview and validation
 * - Drag and drop file upload
 * - Download workflows as files
 *
 * @component
 * @example
 * <ImportExportManager
 *   workflowId="workflow-id"
 *   onImportSuccess={(workflow) => console.log(workflow)}
 * />
 */

interface ImportExportManagerProps {
  workflowId?: string;
  mode?: 'import' | 'export' | 'both';
  onImportSuccess?: (workflow: any) => void;
  onExportSuccess?: () => void;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  preview?: {
    name: string;
    description: string;
    nodeCount: number;
    edgeCount: number;
    category?: string;
    tags?: string[];
  };
}

export const ImportExportManager: React.FC<ImportExportManagerProps> = ({
  workflowId,
  mode = 'both',
  onImportSuccess,
  onExportSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(
    mode === 'export' ? 'export' : 'import'
  );

  // Export state
  const [exportFormat, setExportFormat] = useState<'json' | 'yaml'>('json');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeStats, setIncludeStats] = useState(false);
  const [includeCollaborators, setIncludeCollaborators] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Import state
  const [importFormat, setImportFormat] = useState<'json' | 'yaml'>('json');
  const [importData, setImportData] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  const handleExport = async () => {
    if (!workflowId) {
      alert('No workflow selected');
      return;
    }

    try {
      setExporting(true);
      setExportSuccess(false);

      const params = new URLSearchParams({
        format: exportFormat,
        includeMetadata: includeMetadata.toString(),
        includeStats: includeStats.toString(),
        includeCollaborators: includeCollaborators.toString()
      });

      const response = await api.get(`/workflows/${workflowId}/export?${params}`, {
        responseType: exportFormat === 'json' ? 'json' : 'text'
      });

      // Create blob and download
      const blob = new Blob(
        [exportFormat === 'json' ? JSON.stringify(response.data, null, 2) : response.data],
        { type: exportFormat === 'json' ? 'application/json' : 'text/yaml' }
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workflow-export.${exportFormat === 'json' ? 'json' : 'yml'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);

      onExportSuccess?.();
    } catch (err: any) {
      console.error('Export error:', err);
      alert(err.response?.data?.error || 'Failed to export workflow');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setImportFile(file);
    setImportError(null);
    setValidation(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);

      // Auto-detect format from file extension
      if (file.name.endsWith('.yml') || file.name.endsWith('.yaml')) {
        setImportFormat('yaml');
      } else {
        setImportFormat('json');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleValidate = async () => {
    if (!importData.trim()) {
      setImportError('No data to validate');
      return;
    }

    try {
      setValidating(true);
      setImportError(null);

      const response = await api.post('/workflows/validate-import', {
        data: importData,
        format: importFormat
      });

      setValidation(response.data);

      if (!response.data.valid) {
        setImportError('Validation failed');
      }
    } catch (err: any) {
      console.error('Validation error:', err);
      setImportError(err.response?.data?.error || 'Validation failed');
      setValidation({ valid: false, errors: [err.response?.data?.error || 'Unknown error'] });
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      setImportError('No data to import');
      return;
    }

    try {
      setImporting(true);
      setImportError(null);

      const response = await api.post('/workflows/import', {
        data: importData,
        format: importFormat,
        source: importFile?.name || 'manual-input'
      });

      setImportSuccess(true);
      setImportData('');
      setImportFile(null);
      setValidation(null);

      setTimeout(() => setImportSuccess(false), 3000);

      onImportSuccess?.(response.data.workflow);
    } catch (err: any) {
      console.error('Import error:', err);
      setImportError(err.response?.data?.error || 'Failed to import workflow');
    } finally {
      setImporting(false);
    }
  };

  const renderExportTab = () => (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setExportFormat('json')}
            className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
              exportFormat === 'json'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FileJson className={`w-6 h-6 ${exportFormat === 'json' ? 'text-blue-600' : 'text-gray-400'}`} />
            <div className="text-left">
              <div className="font-semibold text-gray-900">JSON</div>
              <div className="text-xs text-gray-600">FlowForge format</div>
            </div>
            {exportFormat === 'json' && <Check className="w-5 h-5 text-blue-600 ml-auto" />}
          </button>

          <button
            onClick={() => setExportFormat('yaml')}
            className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
              exportFormat === 'yaml'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FileCode className={`w-6 h-6 ${exportFormat === 'yaml' ? 'text-blue-600' : 'text-gray-400'}`} />
            <div className="text-left">
              <div className="font-semibold text-gray-900">YAML</div>
              <div className="text-xs text-gray-600">GitHub Actions</div>
            </div>
            {exportFormat === 'yaml' && <Check className="w-5 h-5 text-blue-600 ml-auto" />}
          </button>
        </div>
      </div>

      {/* Export Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Include in Export</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Metadata (category, tags, dates)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeStats}
              onChange={(e) => setIncludeStats(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Statistics (views, stars, forks)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCollaborators}
              onChange={(e) => setIncludeCollaborators(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Collaborators (roles only, no emails)</span>
          </label>
        </div>
      </div>

      {/* Success Message */}
      {exportSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Workflow exported successfully!</span>
          </div>
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting || !workflowId}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {exporting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Export Workflow
          </>
        )}
      </button>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">About Export</p>
            <p className="text-blue-800">
              {exportFormat === 'json'
                ? 'JSON format preserves the complete workflow structure including visual layout.'
                : 'YAML format generates GitHub Actions-compatible workflow files that can be deployed directly.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderImportTab = () => (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Import Format</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setImportFormat('json')}
            className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
              importFormat === 'json'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FileJson className={`w-6 h-6 ${importFormat === 'json' ? 'text-blue-600' : 'text-gray-400'}`} />
            <div className="text-left">
              <div className="font-semibold text-gray-900">JSON</div>
              <div className="text-xs text-gray-600">FlowForge format</div>
            </div>
            {importFormat === 'json' && <Check className="w-5 h-5 text-blue-600 ml-auto" />}
          </button>

          <button
            onClick={() => setImportFormat('yaml')}
            className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
              importFormat === 'yaml'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FileCode className={`w-6 h-6 ${importFormat === 'yaml' ? 'text-blue-600' : 'text-gray-400'}`} />
            <div className="text-left">
              <div className="font-semibold text-gray-900">YAML</div>
              <div className="text-xs text-gray-600">GitHub Actions</div>
            </div>
            {importFormat === 'yaml' && <Check className="w-5 h-5 text-blue-600 ml-auto" />}
          </button>
        </div>
      </div>

      {/* File Upload / Drop Zone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Upload File</label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop your file here, or{' '}
            <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
              browse
              <input
                type="file"
                accept=".json,.yml,.yaml"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </label>
          </p>
          <p className="text-xs text-gray-500">Supports .json, .yml, .yaml files</p>

          {importFile && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <FileJson className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-900">{importFile.name}</span>
              <button
                onClick={() => {
                  setImportFile(null);
                  setImportData('');
                  setValidation(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manual Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Or Paste {importFormat.toUpperCase()} Content
        </label>
        <textarea
          value={importData}
          onChange={(e) => setImportData(e.target.value)}
          placeholder={`Paste your ${importFormat.toUpperCase()} content here...`}
          className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
      </div>

      {/* Validation Button */}
      <button
        onClick={handleValidate}
        disabled={validating || !importData.trim()}
        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {validating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Validating...
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" />
            Validate & Preview
          </>
        )}
      </button>

      {/* Validation Results */}
      {validation && (
        <div className={`border rounded-lg p-4 ${
          validation.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-2 mb-3">
            {validation.valid ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-semibold ${validation.valid ? 'text-green-900' : 'text-red-900'}`}>
                {validation.valid ? 'Validation Passed' : 'Validation Failed'}
              </p>
              {validation.errors && validation.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-red-700">
                  {validation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {validation.valid && validation.preview && (
            <div className="mt-4 bg-white rounded-lg p-3 border border-green-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">Preview</p>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Name:</span> {validation.preview.name}</p>
                <p><span className="font-medium">Description:</span> {validation.preview.description || 'None'}</p>
                <p><span className="font-medium">Nodes:</span> {validation.preview.nodeCount}</p>
                <p><span className="font-medium">Edges:</span> {validation.preview.edgeCount}</p>
                {validation.preview.category && (
                  <p><span className="font-medium">Category:</span> {validation.preview.category}</p>
                )}
                {validation.preview.tags && validation.preview.tags.length > 0 && (
                  <p><span className="font-medium">Tags:</span> {validation.preview.tags.join(', ')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {importError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Import Error</p>
              <p className="text-sm text-red-700 mt-1">{importError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {importSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Workflow imported successfully!</span>
          </div>
        </div>
      )}

      {/* Import Button */}
      <button
        onClick={handleImport}
        disabled={importing || !importData.trim() || (validation && !validation.valid)}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {importing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Import Workflow
          </>
        )}
      </button>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">About Import</p>
            <p className="text-blue-800">
              Imported workflows will be created as private and can be modified after import.
              We recommend validating your workflow before importing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="import-export-manager max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Import / Export</h2>
        <p className="text-gray-600">Transfer workflows between environments or share with others</p>
      </div>

      {/* Tabs */}
      {mode === 'both' && (
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'import'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Import
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'export'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            Export
          </button>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'export' ? renderExportTab() : renderImportTab()}
      </div>
    </div>
  );
};

export default ImportExportManager;
