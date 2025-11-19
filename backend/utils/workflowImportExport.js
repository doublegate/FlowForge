/**
 * Workflow Import/Export Utilities
 *
 * Handles workflow export to various formats (JSON, YAML) and import with validation.
 * Supports GitHub Actions YAML format for seamless integration.
 *
 * @module utils/workflowImportExport
 * @version 1.0.0
 */

const yaml = require('js-yaml');
const logger = require('./logger');

/**
 * Export workflow to JSON format
 *
 * @param {Object} workflow - Workflow document from database
 * @param {Object} options - Export options
 * @returns {Object} Exported workflow in JSON format
 */
function exportToJSON(workflow, options = {}) {
  const {
    includeMetadata = true,
    includeStats = false,
    includeCollaborators = false,
    includeVersionHistory = false
  } = options;

  const exported = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    workflow: {
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes,
      edges: workflow.edges,
      yaml: workflow.yaml
    }
  };

  if (includeMetadata) {
    exported.metadata = {
      category: workflow.category,
      tags: workflow.tags,
      visibility: workflow.visibility,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt
    };
  }

  if (includeStats && workflow.stats) {
    exported.stats = {
      views: workflow.stats.views,
      stars: workflow.stats.stars,
      forks: workflow.stats.forks,
      uses: workflow.stats.uses
    };
  }

  if (includeCollaborators && workflow.collaborators) {
    exported.collaborators = workflow.collaborators.map(c => ({
      role: c.role,
      addedAt: c.addedAt
    }));
  }

  if (includeVersionHistory) {
    exported.currentVersion = workflow.currentVersion;
  }

  return exported;
}

/**
 * Export workflow to YAML format (GitHub Actions compatible)
 *
 * @param {Object} workflow - Workflow document from database
 * @param {Object} options - Export options
 * @returns {string} Exported workflow in YAML format
 */
function exportToYAML(workflow, options = {}) {
  const { includeComments = true } = options;

  let yamlContent = '';

  if (includeComments) {
    yamlContent += `# Workflow: ${workflow.name}\n`;
    yamlContent += `# Description: ${workflow.description || 'No description'}\n`;
    yamlContent += `# Exported from FlowForge on ${new Date().toISOString()}\n`;
    yamlContent += `#\n`;
    if (workflow.tags && workflow.tags.length > 0) {
      yamlContent += `# Tags: ${workflow.tags.join(', ')}\n`;
    }
    yamlContent += `\n`;
  }

  // Use the workflow's YAML if available, otherwise generate from nodes
  if (workflow.yaml) {
    yamlContent += workflow.yaml;
  } else {
    // Fallback: generate basic YAML structure
    const workflowObj = {
      name: workflow.name,
      on: ['push', 'pull_request'],
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          steps: workflow.nodes.map((node, index) => ({
            name: node.data.label || `Step ${index + 1}`,
            uses: node.data.action || 'actions/checkout@v3',
            with: node.data.inputs || {}
          }))
        }
      }
    };

    yamlContent += yaml.dump(workflowObj, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
  }

  return yamlContent;
}

/**
 * Validate imported workflow data
 *
 * @param {Object} data - Imported workflow data
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateImport(data) {
  const errors = [];

  // Check required fields
  if (!data.workflow) {
    errors.push('Missing "workflow" object in import data');
    return { valid: false, errors };
  }

  const { workflow } = data;

  if (!workflow.name || typeof workflow.name !== 'string') {
    errors.push('Workflow name is required and must be a string');
  }

  if (workflow.name && workflow.name.length > 100) {
    errors.push('Workflow name cannot exceed 100 characters');
  }

  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    errors.push('Workflow nodes are required and must be an array');
  }

  if (!workflow.edges || !Array.isArray(workflow.edges)) {
    errors.push('Workflow edges are required and must be an array');
  }

  // Validate nodes structure
  if (workflow.nodes && Array.isArray(workflow.nodes)) {
    workflow.nodes.forEach((node, index) => {
      if (!node.id) {
        errors.push(`Node at index ${index} is missing required "id" field`);
      }
      if (!node.type) {
        errors.push(`Node at index ${index} is missing required "type" field`);
      }
      if (!node.data) {
        errors.push(`Node at index ${index} is missing required "data" field`);
      }
    });

    // Check for duplicate node IDs
    const nodeIds = workflow.nodes.map(n => n.id);
    const duplicateIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate node IDs found: ${duplicateIds.join(', ')}`);
    }
  }

  // Validate edges structure
  if (workflow.edges && Array.isArray(workflow.edges)) {
    workflow.edges.forEach((edge, index) => {
      if (!edge.id) {
        errors.push(`Edge at index ${index} is missing required "id" field`);
      }
      if (!edge.source) {
        errors.push(`Edge at index ${index} is missing required "source" field`);
      }
      if (!edge.target) {
        errors.push(`Edge at index ${index} is missing required "target" field`);
      }
    });
  }

  // Validate metadata if present
  if (data.metadata) {
    const validCategories = ['ci-cd', 'deployment', 'testing', 'security', 'automation', 'docker', 'other'];
    if (data.metadata.category && !validCategories.includes(data.metadata.category)) {
      errors.push(`Invalid category: ${data.metadata.category}. Must be one of: ${validCategories.join(', ')}`);
    }

    const validVisibilities = ['private', 'team', 'public'];
    if (data.metadata.visibility && !validVisibilities.includes(data.metadata.visibility)) {
      errors.push(`Invalid visibility: ${data.metadata.visibility}. Must be one of: ${validVisibilities.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Parse imported YAML workflow
 *
 * @param {string} yamlContent - YAML content to parse
 * @returns {Object} Parse result { success: boolean, workflow?: Object, error?: string }
 */
function parseYAML(yamlContent) {
  try {
    const parsed = yaml.load(yamlContent);

    // Extract workflow information
    const workflow = {
      name: parsed.name || 'Imported Workflow',
      description: extractDescription(yamlContent),
      yaml: yamlContent,
      nodes: [],
      edges: []
    };

    // Convert YAML steps to nodes
    if (parsed.jobs) {
      let nodeIndex = 0;
      Object.entries(parsed.jobs).forEach(([jobId, job]) => {
        if (job.steps && Array.isArray(job.steps)) {
          job.steps.forEach((step, stepIndex) => {
            const nodeId = `node-${nodeIndex++}`;
            workflow.nodes.push({
              id: nodeId,
              type: 'actionNode',
              data: {
                label: step.name || `Step ${stepIndex + 1}`,
                action: step.uses || '',
                inputs: step.with || {}
              },
              position: {
                x: 100,
                y: 100 + (nodeIndex * 150)
              }
            });

            // Create edge to previous node
            if (stepIndex > 0) {
              const prevNodeId = `node-${nodeIndex - 2}`;
              workflow.edges.push({
                id: `edge-${nodeIndex - 2}-${nodeIndex - 1}`,
                source: prevNodeId,
                target: nodeId,
                type: 'smoothstep'
              });
            }
          });
        }
      });
    }

    return { success: true, workflow };
  } catch (error) {
    logger.logError(error, { context: 'YAML parsing' });
    return {
      success: false,
      error: `Failed to parse YAML: ${error.message}`
    };
  }
}

/**
 * Extract description from YAML comments
 *
 * @param {string} yamlContent - YAML content
 * @returns {string} Extracted description
 */
function extractDescription(yamlContent) {
  const lines = yamlContent.split('\n');
  const descriptionLine = lines.find(line => line.trim().startsWith('# Description:'));

  if (descriptionLine) {
    return descriptionLine.replace(/^#\s*Description:\s*/, '').trim();
  }

  return '';
}

/**
 * Sanitize workflow data for import
 *
 * @param {Object} workflow - Workflow data to sanitize
 * @param {string} userId - User ID of importer
 * @returns {Object} Sanitized workflow data
 */
function sanitizeImport(workflow, userId) {
  return {
    name: workflow.name.trim(),
    description: workflow.description?.trim() || '',
    nodes: workflow.nodes || [],
    edges: workflow.edges || [],
    yaml: workflow.yaml || '',
    category: workflow.category || 'other',
    tags: Array.isArray(workflow.tags) ? workflow.tags : [],
    visibility: 'private', // Always import as private
    isPublished: false,
    ownerId: userId,
    stats: {
      views: 0,
      stars: 0,
      forks: 0,
      uses: 0
    }
  };
}

module.exports = {
  exportToJSON,
  exportToYAML,
  validateImport,
  parseYAML,
  sanitizeImport
};
