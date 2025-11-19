/**
 * GitHub Integration Routes
 *
 * API endpoints for GitHub Actions integration:
 * - Repository management
 * - Workflow deployment
 * - Pull request creation
 * - Token validation
 *
 * @module routes/github
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const Workflow = require('../models/Workflow');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const {
  getUserRepositories,
  deployWorkflow,
  listRepositoryWorkflows,
  fetchWorkflowContent,
  validateAccessToken
} = require('../utils/githubIntegration');

/**
 * GET /api/github/repositories
 * Get user's GitHub repositories
 */
router.get('/repositories', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.githubAccessToken) {
      return res.status(400).json({
        error: 'GitHub account not connected',
        message: 'Please connect your GitHub account first'
      });
    }

    const { sort, page, checkWorkflows } = req.query;

    const repositories = await getUserRepositories(user.githubAccessToken, {
      sort,
      page: parseInt(page) || 1,
      checkWorkflows: checkWorkflows === 'true' // Optional: only check if explicitly requested
    });

    logger.info('Fetched GitHub repositories', {
      userId: req.user.id,
      count: repositories.length
    });

    res.json({
      repositories,
      total: repositories.length
    });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/github/repositories', userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/github/repositories/:owner/:repo/workflows
 * List workflows in a specific repository
 */
router.get('/repositories/:owner/:repo/workflows', authenticateToken, async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const user = await User.findById(req.user.id);

    if (!user.githubAccessToken) {
      return res.status(400).json({
        error: 'GitHub account not connected'
      });
    }

    const workflows = await listRepositoryWorkflows(
      user.githubAccessToken,
      owner,
      repo
    );

    logger.info('Listed repository workflows', {
      userId: req.user.id,
      owner,
      repo,
      count: workflows.length
    });

    res.json({
      workflows,
      total: workflows.length
    });
  } catch (error) {
    logger.logError(error, {
      endpoint: `/api/github/repositories/${req.params.owner}/${req.params.repo}/workflows`,
      userId: req.user?.id
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/github/repositories/:owner/:repo/workflows/:path
 * Fetch specific workflow content
 */
router.get('/repositories/:owner/:repo/workflows/:path(*)', authenticateToken, async (req, res) => {
  try {
    const { owner, repo, path } = req.params;

    const user = await User.findById(req.user.id);

    if (!user.githubAccessToken) {
      return res.status(400).json({
        error: 'GitHub account not connected'
      });
    }

    const content = await fetchWorkflowContent(
      user.githubAccessToken,
      owner,
      repo,
      path
    );

    logger.info('Fetched workflow content', {
      userId: req.user.id,
      owner,
      repo,
      path
    });

    res.json({
      content,
      path
    });
  } catch (error) {
    logger.logError(error, {
      endpoint: `/api/github/repositories/${req.params.owner}/${req.params.repo}/workflows/${req.params.path}`,
      userId: req.user?.id
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/github/workflows/:id/deploy
 * Deploy workflow to GitHub repository
 */
router.post('/workflows/:id/deploy', authenticateToken, async (req, res) => {
  try {
    const {
      owner,
      repo,
      branch,
      path,
      commitMessage,
      createPullRequest,
      prTitle,
      prBody
    } = req.body;

    // Validate required fields
    if (!owner || !repo) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Repository owner and name are required'
      });
    }

    // Get workflow
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check permission (editor or higher)
    // Fallback: if hasAccess is not defined, allow access if user is in editors array
    if (typeof workflow.hasAccess !== 'function') {
      workflow.hasAccess = function(userId, role) {
        // Simple fallback: check if user is in editors array
        if (Array.isArray(this.editors)) {
          return this.editors.includes(userId);
        }
        // If no editors array, allow access (or return false to deny)
        return false;
      };
    }
    if (!workflow.hasAccess(req.user.id, 'editor')) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You need editor access to deploy this workflow'
      });
    }

    // Get user's GitHub token
    const user = await User.findById(req.user.id);

    if (!user.githubAccessToken) {
      return res.status(400).json({
        error: 'GitHub account not connected',
        message: 'Please connect your GitHub account to deploy workflows'
      });
    }

    // Deploy workflow
    const result = await deployWorkflow(
      user.githubAccessToken,
      workflow,
      {
        owner,
        repo,
        branch,
        path,
        commitMessage,
        createPullRequest,
        prTitle,
        prBody
      }
    );

    // Update workflow metadata
    workflow.githubDeployments = workflow.githubDeployments || [];
    workflow.githubDeployments.push({
      repository: `${owner}/${repo}`,
      branch: result.branch,
      path: result.file.path,
      commitSha: result.commit.sha,
      pullRequest: result.pullRequest?.number,
      deployedAt: new Date(),
      deployedBy: req.user.id
    });

    await workflow.save();

    logger.info('Workflow deployed to GitHub', {
      workflowId: workflow._id,
      userId: req.user.id,
      repository: `${owner}/${repo}`,
      commit: result.commit.sha
    });

    res.json({
      success: true,
      deployment: result,
      message: createPullRequest
        ? 'Pull request created successfully'
        : 'Workflow deployed successfully'
    });
  } catch (error) {
    logger.logError(error, {
      endpoint: `/api/github/workflows/${req.params.id}/deploy`,
      userId: req.user?.id
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/github/connect
 * Validate and store GitHub access token
 */
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Access token is required'
      });
    }

    // Validate token
    const validation = await validateAccessToken(accessToken);

    if (!validation.valid) {
      return res.status(401).json({
        error: 'Invalid access token',
        message: validation.error
      });
    }

    // Store token for user
    const user = await User.findById(req.user.id);
    user.githubAccessToken = accessToken;
    user.githubUsername = validation.user.login;
    user.githubId = validation.user.id;

    await user.save();

    logger.info('GitHub account connected', {
      userId: req.user.id,
      githubUsername: validation.user.login
    });

    res.json({
      success: true,
      user: validation.user,
      message: 'GitHub account connected successfully'
    });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/github/connect', userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/github/disconnect
 * Remove GitHub access token
 */
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.githubAccessToken = undefined;
    user.githubUsername = undefined;
    user.githubId = undefined;

    await user.save();

    logger.info('GitHub account disconnected', {
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'GitHub account disconnected successfully'
    });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/github/disconnect', userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/github/status
 * Check GitHub connection status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const connected = !!user.githubAccessToken;

    let tokenValid = false;
    let githubUser = null;

    if (connected) {
      const validation = await validateAccessToken(user.githubAccessToken);
      tokenValid = validation.valid;

      if (tokenValid) {
        githubUser = validation.user;
      }
    }

    res.json({
      connected,
      tokenValid,
      user: githubUser
    });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/github/status', userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
