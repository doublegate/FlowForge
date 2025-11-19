/**
 * GitHub Integration Utilities
 *
 * Handles GitHub API integration for deploying workflows directly to repositories.
 * Uses Octokit for authenticated API requests.
 *
 * @module utils/githubIntegration
 * @version 1.0.0
 */

const { Octokit } = require('@octokit/rest');
const logger = require('./logger');
const { exportToYAML } = require('./workflowImportExport');

/**
 * Create GitHub client with user's access token
 *
 * @param {string} accessToken - User's GitHub access token
 * @returns {Octokit} Configured Octokit instance
 */
function createGitHubClient(accessToken) {
  return new Octokit({
    auth: accessToken,
    userAgent: 'FlowForge v1.0'
  });
}

/**
 * Get user's GitHub repositories
 *
 * @param {string} accessToken - User's GitHub access token
 * @param {Object} options - Options for filtering repositories
 * @param {boolean} options.checkWorkflows - Whether to check for workflows (default: false to avoid N+1 API calls)
 * @returns {Promise<Array>} List of repositories
 */
async function getUserRepositories(accessToken, options = {}) {
  try {
    const octokit = createGitHubClient(accessToken);

    const { 
      sort = 'updated', 
      per_page = 100, 
      page = 1,
      checkWorkflows = false // Default to false to avoid N+1 API calls
    } = options;

    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort,
      per_page,
      page,
      visibility: 'all'
    });

    // Map basic repository data first
    const repositories = data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      description: repo.description,
      defaultBranch: repo.default_branch,
      url: repo.html_url,
      hasWorkflows: null // null indicates not checked yet
    }));

    // Only check for workflows if explicitly requested (to avoid N+1 API calls)
    if (checkWorkflows) {
      // Use Promise.allSettled to prevent one failing repo from breaking all results
      const workflowChecks = await Promise.allSettled(
        repositories.map(async repo => {
          try {
            const contents = await octokit.repos.getContent({
              owner: repo.owner,
              repo: repo.name,
              path: '.github/workflows',
              ref: repo.defaultBranch
            });
            // If the directory exists and contains files, set hasWorkflows to true
            return {
              id: repo.id,
              hasWorkflows: Array.isArray(contents.data) && contents.data.length > 0
            };
          } catch (err) {
            // On any error (404, permissions, etc.), default to false
            if (err.status !== 404) {
              logger.logError(err, { 
                context: 'Check workflows for repo', 
                repo: repo.fullName 
              });
            }
            return { id: repo.id, hasWorkflows: false };
          }
        })
      );

      // Update repositories with workflow check results
      workflowChecks.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const repoIndex = repositories.findIndex(r => r.id === result.value.id);
          if (repoIndex !== -1) {
            repositories[repoIndex].hasWorkflows = result.value.hasWorkflows;
          }
        } else {
          // If the promise was rejected, default to false
          repositories[index].hasWorkflows = false;
        }
      });
    }

    return repositories;
  } catch (error) {
    logger.logError(error, { context: 'Get GitHub repositories' });
    throw new Error(`Failed to fetch repositories: ${error.message}`);
  }
}

/**
 * Check if workflow file already exists in repository
 *
 * @param {string} accessToken - User's GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - Workflow file path
 * @param {string} branch - Branch name
 * @returns {Promise<Object|null>} Existing file object or null
 */
async function getExistingWorkflow(accessToken, owner, repo, path, branch) {
  try {
    const octokit = createGitHubClient(accessToken);

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    });

    return data;
  } catch (error) {
    if (error.status === 404) {
      return null; // File doesn't exist
    }
    throw error;
  }
}

/**
 * Deploy workflow to GitHub repository
 *
 * @param {string} accessToken - User's GitHub access token
 * @param {Object} workflow - Workflow object from database
 * @param {Object} deployOptions - Deployment options
 * @returns {Promise<Object>} Deployment result
 */
async function deployWorkflow(accessToken, workflow, deployOptions) {
  try {
    const {
      owner,
      repo,
      branch = 'main',
      path,
      commitMessage,
      createPullRequest = false,
      prTitle,
      prBody
    } = deployOptions;

    const octokit = createGitHubClient(accessToken);

    // Generate workflow YAML
    const workflowYAML = exportToYAML(workflow, { includeComments: true });

    // Determine full path
    const workflowPath = path || `.github/workflows/${workflow.name.replace(/\s+/g, '-').toLowerCase()}.yml`;

    // Check if file exists
    const existingFile = await getExistingWorkflow(accessToken, owner, repo, workflowPath, branch);

    let targetBranch = branch;

    // If creating PR, create a new branch
    if (createPullRequest) {
      const timestamp = Date.now();
      targetBranch = `flowforge/workflow-${workflow._id}-${timestamp}`;

      // Get the base branch SHA
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`
      });

      // Create new branch
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${targetBranch}`,
        sha: refData.object.sha
      });

      logger.info('Created branch for PR', {
        owner,
        repo,
        branch: targetBranch
      });
    }

    // Create or update file
    const fileData = {
      owner,
      repo,
      path: workflowPath,
      message: commitMessage || `${existingFile ? 'Update' : 'Add'} workflow: ${workflow.name}`,
      content: Buffer.from(workflowYAML).toString('base64'),
      branch: targetBranch
    };

    if (existingFile) {
      fileData.sha = existingFile.sha;
    }

    const { data: commitData } = await octokit.repos.createOrUpdateFileContents(fileData);

    logger.info('Workflow deployed to GitHub', {
      owner,
      repo,
      path: workflowPath,
      sha: commitData.commit.sha
    });

    let pullRequest = null;

    // Create pull request if requested
    if (createPullRequest) {
      const { data: prData } = await octokit.pulls.create({
        owner,
        repo,
        title: prTitle || `Add workflow: ${workflow.name}`,
        head: targetBranch,
        base: branch,
        body: prBody || `This PR adds a new GitHub Actions workflow created with FlowForge.\n\n**Workflow**: ${workflow.name}\n**Description**: ${workflow.description || 'No description'}\n\nGenerated by [FlowForge](https://github.com/your-org/flowforge)`
      });

      pullRequest = {
        number: prData.number,
        url: prData.html_url,
        title: prData.title
      };

      logger.info('Pull request created', {
        owner,
        repo,
        prNumber: prData.number,
        prUrl: prData.html_url
      });
    }

    return {
      success: true,
      commit: {
        sha: commitData.commit.sha,
        url: commitData.commit.html_url
      },
      file: {
        path: workflowPath,
        url: commitData.content.html_url
      },
      branch: targetBranch,
      pullRequest
    };
  } catch (error) {
    logger.logError(error, { context: 'Deploy workflow to GitHub' });

    let errorMessage = 'Failed to deploy workflow to GitHub';

    if (error.status === 401) {
      errorMessage = 'GitHub authentication failed. Please reconnect your GitHub account.';
    } else if (error.status === 403) {
      errorMessage = 'Insufficient permissions. Please grant write access to the repository.';
    } else if (error.status === 404) {
      errorMessage = 'Repository not found. Please check the owner and repository name.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
}

/**
 * List workflows in a GitHub repository
 *
 * @param {string} accessToken - User's GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} List of workflow files
 */
async function listRepositoryWorkflows(accessToken, owner, repo) {
  try {
    const octokit = createGitHubClient(accessToken);

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: '.github/workflows'
    });

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter(file => file.type === 'file' && (file.name.endsWith('.yml') || file.name.endsWith('.yaml')))
      .map(file => ({
        name: file.name,
        path: file.path,
        sha: file.sha,
        size: file.size,
        url: file.html_url,
        downloadUrl: file.download_url
      }));
  } catch (error) {
    if (error.status === 404) {
      return []; // No workflows directory
    }

    logger.logError(error, { context: 'List repository workflows' });
    throw new Error(`Failed to list workflows: ${error.message}`);
  }
}

/**
 * Fetch workflow content from GitHub
 *
 * @param {string} accessToken - User's GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - Workflow file path
 * @returns {Promise<string>} Workflow YAML content
 */
async function fetchWorkflowContent(accessToken, owner, repo, path) {
  try {
    const octokit = createGitHubClient(accessToken);

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path
    });

    if (data.type !== 'file') {
      throw new Error('Path does not point to a file');
    }

    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf8');

    return content;
  } catch (error) {
    logger.logError(error, { context: 'Fetch workflow content' });
    throw new Error(`Failed to fetch workflow: ${error.message}`);
  }
}

/**
 * Validate GitHub access token
 *
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<Object>} User information if valid
 */
async function validateAccessToken(accessToken) {
  try {
    const octokit = createGitHubClient(accessToken);

    const { data } = await octokit.users.getAuthenticated();

    return {
      valid: true,
      user: {
        login: data.login,
        id: data.id,
        name: data.name,
        email: data.email,
        avatarUrl: data.avatar_url
      }
    };
  } catch (error) {
    logger.logError(error, { context: 'Validate GitHub token' });
    return {
      valid: false,
      error: error.message
    };
  }
}

module.exports = {
  getUserRepositories,
  deployWorkflow,
  listRepositoryWorkflows,
  fetchWorkflowContent,
  validateAccessToken
};
