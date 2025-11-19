/**
 * Workflow Routes
 *
 * API endpoints for workflow management with:
 * - CRUD operations
 * - Version history
 * - Collaboration
 * - Sharing and marketplace
 * - Analytics
 *
 * @module routes/workflows
 */

const express = require('express');
const router = express.Router();
const Workflow = require('../models/Workflow');
const WorkflowVersion = require('../models/WorkflowVersion');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * GET /api/workflows
 * Get workflows accessible by user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit, offset, category, tags, visibility } = req.query;

    const options = {
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
      category,
      tags: tags ? tags.split(',') : undefined,
      visibility
    };

    const result = await Workflow.getAccessibleWorkflows(
      req.user.id,
      options
    );

    res.json(result);
  } catch (error) {
    logger.logError(error, { endpoint: '/api/workflows', userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/marketplace
 * Get public marketplace workflows
 */
router.get('/marketplace', async (req, res) => {
  try {
    const { limit, offset, category, tags, sortBy } = req.query;

    const options = {
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
      category,
      tags: tags ? tags.split(',') : undefined,
      sortBy: sortBy || 'stars'
    };

    const result = await Workflow.getMarketplaceWorkflows(options);

    res.json(result);
  } catch (error) {
    logger.logError(error, { endpoint: '/api/workflows/marketplace' });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/:id
 * Get specific workflow
 */
router.get('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check access for non-public workflows
    if (workflow.visibility !== 'public' && req.user) {
      if (!workflow.hasAccess(req.user.id, 'viewer')) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Increment view count
    await workflow.incrementViews();

    res.json(workflow);
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}` });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows
 * Create new workflow
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      nodes,
      edges,
      yaml,
      triggers,
      environment,
      category,
      tags,
      visibility
    } = req.body;

    // Validation
    if (!name || !nodes || !edges) {
      return res.status(400).json({
        error: 'Missing required fields: name, nodes, edges'
      });
    }

    const workflow = new Workflow({
      name,
      description,
      nodes,
      edges,
      yaml,
      triggers,
      environment,
      category,
      tags,
      visibility: visibility || 'private',
      ownerId: req.user.id,
      ownerName: req.user.username,
      ownerEmail: req.user.email,
      lastEditedBy: req.user.id
    });

    await workflow.save();

    // Create initial version
    await WorkflowVersion.createVersion(
      workflow,
      req.user.id,
      'created',
      'Initial version'
    );

    logger.info('Workflow created', {
      workflowId: workflow._id,
      userId: req.user.id,
      name: workflow.name
    });

    res.status(201).json(workflow);
  } catch (error) {
    logger.logError(error, { endpoint: '/api/workflows', userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/workflows/:id
 * Update workflow
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check edit permission
    if (!workflow.hasAccess(req.user.id, 'editor')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      name,
      description,
      nodes,
      edges,
      yaml,
      triggers,
      environment,
      category,
      tags,
      visibility,
      changeSummary
    } = req.body;

    // Update fields
    if (name !== undefined) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (nodes !== undefined) workflow.nodes = nodes;
    if (edges !== undefined) workflow.edges = edges;
    if (yaml !== undefined) workflow.yaml = yaml;
    if (triggers !== undefined) workflow.triggers = triggers;
    if (environment !== undefined) workflow.environment = environment;
    if (category !== undefined) workflow.category = category;
    if (tags !== undefined) workflow.tags = tags;
    if (visibility !== undefined) workflow.visibility = visibility;

    workflow.lastEditedBy = req.user.id;
    workflow.currentVersion++;

    await workflow.save();

    // Create new version
    await WorkflowVersion.createVersion(
      workflow,
      req.user.id,
      'updated',
      changeSummary || 'Workflow updated'
    );

    logger.info('Workflow updated', {
      workflowId: workflow._id,
      userId: req.user.id,
      version: workflow.currentVersion
    });

    res.json(workflow);
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}`, userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/workflows/:id
 * Delete workflow
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Only owner can delete
    if (workflow.ownerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Only owner can delete workflow' });
    }

    await workflow.deleteOne();

    // Delete all versions
    await WorkflowVersion.deleteMany({ workflowId: workflow._id });

    logger.info('Workflow deleted', {
      workflowId: workflow._id,
      userId: req.user.id
    });

    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}`, userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/:id/versions
 * Get version history
 */
router.get('/:id/versions', async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check access
    if (workflow.visibility !== 'public' && req.user) {
      if (!workflow.hasAccess(req.user.id, 'viewer')) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const { limit, offset } = req.query;
    const versions = await WorkflowVersion.getHistory(workflow._id, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      includeContent: false
    });

    res.json({ versions, total: versions.length });
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}/versions` });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/:id/versions/:version
 * Get specific version
 */
router.get('/:id/versions/:version', async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check access
    if (workflow.visibility !== 'public' && req.user) {
      if (!workflow.hasAccess(req.user.id, 'viewer')) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const version = await WorkflowVersion.findOne({
      workflowId: workflow._id,
      version: parseInt(req.params.version)
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(version);
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}/versions/${req.params.version}` });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/:id/restore/:version
 * Restore workflow to specific version
 */
router.post('/:id/restore/:version', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check edit permission
    if (!workflow.hasAccess(req.user.id, 'editor')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const version = await WorkflowVersion.findOne({
      workflowId: workflow._id,
      version: parseInt(req.params.version)
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Restore workflow to this version
    workflow.name = version.content.name;
    workflow.description = version.content.description;
    workflow.nodes = version.content.nodes;
    workflow.edges = version.content.edges;
    workflow.yaml = version.content.yaml;
    workflow.triggers = version.content.triggers;
    workflow.environment = version.content.environment;
    workflow.lastEditedBy = req.user.id;
    workflow.currentVersion++;

    await workflow.save();

    // Create new version marking it as restoration
    const newVersion = await WorkflowVersion.createVersion(
      workflow,
      req.user.id,
      'restored',
      `Restored from version ${req.params.version}`
    );
    newVersion.restoredFrom = version._id;
    await newVersion.save();

    logger.info('Workflow restored', {
      workflowId: workflow._id,
      userId: req.user.id,
      restoredVersion: req.params.version,
      newVersion: workflow.currentVersion
    });

    res.json(workflow);
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}/restore/${req.params.version}`, userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/:id/collaborators
 * Add collaborator
 */
router.post('/:id/collaborators', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check admin permission
    if (!workflow.hasAccess(req.user.id, 'admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ error: 'Missing userId or role' });
    }

    await workflow.addCollaborator(userId, role, req.user.id);

    logger.info('Collaborator added', {
      workflowId: workflow._id,
      userId: req.user.id,
      collaboratorId: userId,
      role
    });

    res.json(workflow);
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}/collaborators`, userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/workflows/:id/collaborators/:userId
 * Remove collaborator
 */
router.delete('/:id/collaborators/:userId', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check admin permission
    if (!workflow.hasAccess(req.user.id, 'admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await workflow.removeCollaborator(req.params.userId);

    logger.info('Collaborator removed', {
      workflowId: workflow._id,
      userId: req.user.id,
      collaboratorId: req.params.userId
    });

    res.json(workflow);
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}/collaborators/${req.params.userId}`, userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/:id/star
 * Star workflow
 */
router.post('/:id/star', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    await workflow.star(req.user.id);

    res.json({ starred: true, stars: workflow.stats.stars });
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}/star`, userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/workflows/:id/star
 * Unstar workflow
 */
router.delete('/:id/star', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    await workflow.unstar(req.user.id);

    res.json({ starred: false, stars: workflow.stats.stars });
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}/star`, userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/:id/fork
 * Fork/clone workflow
 */
router.post('/:id/fork', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check if workflow can be forked
    if (workflow.visibility === 'private') {
      return res.status(403).json({ error: 'Cannot fork private workflow' });
    }

    const forkedWorkflow = await workflow.fork(
      req.user.id,
      req.user.username,
      req.user.email
    );

    // Create initial version for forked workflow
    await WorkflowVersion.createVersion(
      forkedWorkflow,
      req.user.id,
      'created',
      `Forked from ${workflow.name}`
    );

    logger.info('Workflow forked', {
      originalWorkflowId: workflow._id,
      forkedWorkflowId: forkedWorkflow._id,
      userId: req.user.id
    });

    res.status(201).json(forkedWorkflow);
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}/fork`, userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/:id/publish
 * Publish workflow to marketplace
 */
router.post('/:id/publish', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Only owner can publish
    if (workflow.ownerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Only owner can publish workflow' });
    }

    workflow.isPublished = true;
    workflow.publishedAt = new Date();
    workflow.visibility = 'public';

    await workflow.save();

    // Create published version
    await WorkflowVersion.createVersion(
      workflow,
      req.user.id,
      'published',
      'Published to marketplace'
    );

    logger.info('Workflow published', {
      workflowId: workflow._id,
      userId: req.user.id
    });

    res.json(workflow);
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}/publish`, userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/:id/unpublish
 * Unpublish workflow from marketplace
 */
router.post('/:id/unpublish', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Only owner can unpublish
    if (workflow.ownerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Only owner can unpublish workflow' });
    }

    workflow.isPublished = false;
    workflow.visibility = 'private';

    await workflow.save();

    logger.info('Workflow unpublished', {
      workflowId: workflow._id,
      userId: req.user.id
    });

    res.json(workflow);
  } catch (error) {
    logger.logError(error, { endpoint: `/api/workflows/${req.params.id}/unpublish`, userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
