/**
 * Analytics Routes
 *
 * API endpoints for usage analytics and insights:
 * - User activity tracking
 * - Workflow usage statistics
 * - Popular actions and trends
 * - System health metrics
 *
 * @module routes/analytics
 */

const express = require('express');
const router = express.Router();
const Workflow = require('../models/Workflow');
const WorkflowVersion = require('../models/WorkflowVersion');
const Action = require('../models/Action');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * GET /api/analytics/overview
 * Get high-level analytics overview
 */
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's workflows
    const userWorkflows = await Workflow.find({ ownerId: userId });
    const workflowIds = userWorkflows.map(w => w._id);

    // Aggregate statistics
    const stats = {
      workflows: {
        total: userWorkflows.length,
        published: userWorkflows.filter(w => w.isPublished).length,
        private: userWorkflows.filter(w => w.visibility === 'private').length,
        public: userWorkflows.filter(w => w.visibility === 'public').length,
        totalViews: userWorkflows.reduce((sum, w) => sum + w.stats.views, 0),
        totalStars: userWorkflows.reduce((sum, w) => sum + w.stats.stars, 0),
        totalForks: userWorkflows.reduce((sum, w) => sum + w.stats.forks, 0)
      },
      versions: {
        total: await WorkflowVersion.countDocuments({ workflowId: { $in: workflowIds } })
      },
      activity: {
        lastWeek: await Workflow.countDocuments({
          ownerId: userId,
          updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }),
        lastMonth: await Workflow.countDocuments({
          ownerId: userId,
          updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        })
      }
    };

    res.json(stats);
  } catch (error) {
    logger.logError(error, { endpoint: '/api/analytics/overview', userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/workflows/:id
 * Get detailed analytics for a specific workflow
 */
router.get('/workflows/:id', authenticateToken, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check access
    if (!workflow.hasAccess(req.user.id, 'viewer')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get version history
    const versions = await WorkflowVersion.find({ workflowId: workflow._id })
      .sort({ version: -1 })
      .limit(10)
      .select('version changeType changeSummary createdAt stats');

    // Calculate trends
    const recentVersions = versions.slice(0, 5);
    const nodeCountTrend = recentVersions.map(v => ({
      version: v.version,
      count: v.stats.nodeCount,
      date: v.createdAt
    }));

    // Get most used actions in this workflow
    const actionCounts = {};
    workflow.nodes.forEach(node => {
      if (node.data?.action) {
        const actionName = node.data.action;
        actionCounts[actionName] = (actionCounts[actionName] || 0) + 1;
      }
    });

    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    const analytics = {
      workflow: {
        id: workflow._id,
        name: workflow.name,
        stats: workflow.stats,
        currentVersion: workflow.currentVersion,
        visibility: workflow.visibility,
        isPublished: workflow.isPublished
      },
      versions: {
        total: versions.length,
        recent: versions.map(v => ({
          version: v.version,
          changeType: v.changeType,
          summary: v.changeSummary,
          date: v.createdAt,
          nodeCount: v.stats.nodeCount
        })),
        nodeCountTrend
      },
      topActions,
      collaborators: workflow.collaborators.length,
      stars: workflow.stats.stars,
      forks: workflow.stats.forks
    };

    res.json(analytics);
  } catch (error) {
    logger.logError(error, { endpoint: `/api/analytics/workflows/${req.params.id}`, userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/actions/popular
 * Get most popular actions across all workflows
 */
router.get('/actions/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Get all workflows
    const workflows = await Workflow.find({ visibility: 'public' })
      .select('nodes');

    // Count action usage
    const actionCounts = {};
    workflows.forEach(workflow => {
      workflow.nodes.forEach(node => {
        if (node.data?.action) {
          const actionName = node.data.action;
          actionCounts[actionName] = (actionCounts[actionName] || 0) + 1;
        }
      });
    });

    // Sort and limit
    const popularActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([action, count]) => ({ action, count }));

    res.json({ actions: popularActions });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/analytics/actions/popular' });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/marketplace
 * Get marketplace analytics
 */
router.get('/marketplace', async (req, res) => {
  try {
    const stats = {
      totalPublished: await Workflow.countDocuments({ isPublished: true }),
      totalPublic: await Workflow.countDocuments({ visibility: 'public' }),
      categories: {},
      topWorkflows: [],
      recentlyPublished: []
    };

    // Count by category
    const categories = ['ci-cd', 'deployment', 'testing', 'security', 'automation', 'docker', 'other'];
    for (const category of categories) {
      stats.categories[category] = await Workflow.countDocuments({
        isPublished: true,
        category
      });
    }

    // Top workflows by stars
    stats.topWorkflows = await Workflow.find({ isPublished: true })
      .sort({ 'stats.stars': -1 })
      .limit(10)
      .select('name description category stats ownerId ownerName');

    // Recently published
    stats.recentlyPublished = await Workflow.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .limit(10)
      .select('name description category stats publishedAt ownerId ownerName');

    res.json(stats);
  } catch (error) {
    logger.logError(error, { endpoint: '/api/analytics/marketplace' });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/trends
 * Get trending workflows and actions
 */
router.get('/trends', async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Workflows with most stars in last 7 days
    const trendingWorkflows = await Workflow.find({
      isPublished: true,
      publishedAt: { $gte: sevenDaysAgo }
    })
      .sort({ 'stats.stars': -1 })
      .limit(10)
      .select('name description category stats publishedAt ownerId ownerName');

    // Most forked workflows
    const mostForked = await Workflow.find({ isPublished: true })
      .sort({ 'stats.forks': -1 })
      .limit(10)
      .select('name description category stats ownerId ownerName');

    // Most viewed workflows
    const mostViewed = await Workflow.find({ isPublished: true })
      .sort({ 'stats.views': -1 })
      .limit(10)
      .select('name description category stats ownerId ownerName');

    res.json({
      trending: trendingWorkflows,
      mostForked,
      mostViewed
    });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/analytics/trends' });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/user/activity
 * Get user's activity timeline
 */
router.get('/user/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get user's workflows
    const workflows = await Workflow.find({ ownerId: userId })
      .select('_id name');
    const workflowIds = workflows.map(w => w._id);

    // Get all versions created by user in date range
    const versions = await WorkflowVersion.find({
      workflowId: { $in: workflowIds },
      createdAt: { $gte: startDate }
    })
      .sort({ createdAt: -1 })
      .select('workflowId version changeType changeSummary createdAt');

    // Group by date
    const activityByDate = {};
    versions.forEach(version => {
      const date = version.createdAt.toISOString().split('T')[0];
      if (!activityByDate[date]) {
        activityByDate[date] = [];
      }
      activityByDate[date].push({
        workflowId: version.workflowId,
        workflowName: workflows.find(w => w._id.toString() === version.workflowId.toString())?.name,
        version: version.version,
        changeType: version.changeType,
        summary: version.changeSummary,
        time: version.createdAt
      });
    });

    res.json({ activityByDate, totalEvents: versions.length });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/analytics/user/activity', userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/system
 * Get system-wide analytics (admin only in future)
 */
router.get('/system', async (req, res) => {
  try {
    const stats = {
      users: await User.countDocuments(),
      workflows: {
        total: await Workflow.countDocuments(),
        public: await Workflow.countDocuments({ visibility: 'public' }),
        published: await Workflow.countDocuments({ isPublished: true })
      },
      versions: await WorkflowVersion.countDocuments(),
      actions: await Action.countDocuments(),
      activity: {
        workflowsCreatedToday: await Workflow.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        workflowsUpdatedToday: await Workflow.countDocuments({
          updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      }
    };

    res.json(stats);
  } catch (error) {
    logger.logError(error, { endpoint: '/api/analytics/system' });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
