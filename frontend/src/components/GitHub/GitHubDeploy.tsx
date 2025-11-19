import React, { useState, useEffect } from 'react';
import {
  Github,
  GitBranch,
  FileCode,
  GitPullRequest,
  Check,
  X,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Link as LinkIcon,
  Unlink
} from 'lucide-react';
import api from '../../services/api';

/**
 * GitHubDeploy Component
 *
 * Handles GitHub integration and workflow deployment
 *
 * Features:
 * - Connect/disconnect GitHub account
 * - Browse user repositories
 * - Deploy workflows to repositories
 * - Create pull requests
 * - View deployment history
 *
 * @component
 * @example
 * <GitHubDeploy
 *   workflowId="workflow-id"
 *   onDeploySuccess={(result) => console.log(result)}
 * />
 */

interface GitHubDeployProps {
  workflowId: string;
  onDeploySuccess?: (result: any) => void;
}

interface Repository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  description: string;
  defaultBranch: string;
  url: string;
}

interface GitHubStatus {
  connected: boolean;
  tokenValid: boolean;
  user: {
    login: string;
    name: string;
    email: string;
    avatarUrl: string;
  } | null;
}

export const GitHubDeploy: React.FC<GitHubDeployProps> = ({
  workflowId,
  onDeploySuccess
}) => {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  // Form state
  const [branch, setBranch] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [createPR, setCreatePR] = useState(false);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [deployResult, setDeployResult] = useState<any>(null);

  // GitHub token connect
  const [tokenInput, setTokenInput] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkGitHubStatus();
  }, []);

  useEffect(() => {
    if (status?.connected && status.tokenValid) {
      loadRepositories();
    }
  }, [status]);

  useEffect(() => {
    if (selectedRepo) {
      setBranch(selectedRepo.defaultBranch);
    }
  }, [selectedRepo]);

  const checkGitHubStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/github/status');
      setStatus(response.data);
    } catch (err: any) {
      console.error('Error checking GitHub status:', err);
      setError('Failed to check GitHub connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!tokenInput.trim()) {
      setError('Please enter a GitHub access token');
      return;
    }

    try {
      setConnecting(true);
      setError(null);

      await api.post('/github/connect', {
        accessToken: tokenInput.trim()
      });

      setTokenInput('');
      await checkGitHubStatus();
    } catch (err: any) {
      console.error('Error connecting GitHub:', err);
      setError(err.response?.data?.message || 'Failed to connect GitHub account');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect GitHub account? You will need to reconnect to deploy workflows.')) {
      return;
    }

    try {
      await api.post('/github/disconnect');
      setStatus(null);
      setRepositories([]);
      setSelectedRepo(null);
    } catch (err: any) {
      console.error('Error disconnecting GitHub:', err);
      setError('Failed to disconnect GitHub account');
    }
  };

  const loadRepositories = async () => {
    try {
      setLoadingRepos(true);
      setError(null);

      const response = await api.get('/github/repositories');
      setRepositories(response.data.repositories);
    } catch (err: any) {
      console.error('Error loading repositories:', err);
      setError(err.response?.data?.message || 'Failed to load repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedRepo) {
      setError('Please select a repository');
      return;
    }

    if (!branch.trim()) {
      setError('Please specify a branch');
      return;
    }

    if (createPR && !prTitle.trim()) {
      setError('Please provide a pull request title');
      return;
    }

    try {
      setDeploying(true);
      setError(null);
      setSuccess(false);

      const response = await api.post(`/github/workflows/${workflowId}/deploy`, {
        owner: selectedRepo.owner,
        repo: selectedRepo.name,
        branch: branch.trim(),
        path: customPath.trim() || undefined,
        commitMessage: commitMessage.trim() || undefined,
        createPullRequest: createPR,
        prTitle: prTitle.trim() || undefined,
        prBody: prBody.trim() || undefined
      });

      setDeployResult(response.data.deployment);
      setSuccess(true);

      onDeploySuccess?.(response.data);
    } catch (err: any) {
      console.error('Error deploying workflow:', err);
      setError(err.response?.data?.error || 'Failed to deploy workflow');
    } finally {
      setDeploying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Checking GitHub connection...</span>
      </div>
    );
  }

  // Not connected state
  if (!status?.connected || !status?.tokenValid) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Github className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect GitHub</h2>
            <p className="text-gray-600">
              Deploy workflows directly to your GitHub repositories
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={connecting}
              />
              <p className="mt-2 text-xs text-gray-500">
                Generate a token with <span className="font-mono">repo</span> scope at{' '}
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub Settings <ExternalLink className="w-3 h-3 inline" />
                </a>
              </p>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting || !tokenInput.trim()}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <LinkIcon className="w-5 h-5" />
                  Connect GitHub
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Deploy to GitHub</h2>
          <button
            onClick={handleDisconnect}
            className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Unlink className="w-4 h-4" />
            Disconnect
          </button>
        </div>

        {/* Connected account info */}
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <img
            src={status.user?.avatarUrl}
            alt={status.user?.name || ''}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">{status.user?.name || status.user?.login}</div>
            <div className="text-sm text-gray-600">@{status.user?.login}</div>
          </div>
          <Check className="w-5 h-5 text-green-600" />
        </div>
      </div>

      {/* Success Message */}
      {success && deployResult && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-900">
                {deployResult.pullRequest ? 'Pull Request Created!' : 'Workflow Deployed!'}
              </p>
              <p className="text-sm text-green-700 mt-1">
                Workflow has been successfully deployed to GitHub
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <a
              href={deployResult.file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <FileCode className="w-4 h-4" />
              View workflow file
              <ExternalLink className="w-3 h-3" />
            </a>

            {deployResult.pullRequest && (
              <a
                href={deployResult.pullRequest.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <GitPullRequest className="w-4 h-4" />
                View pull request #{deployResult.pullRequest.number}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Deployment Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Repository Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Select Repository
            </label>
            <button
              onClick={loadRepositories}
              disabled={loadingRepos}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RefreshCw className={`w-4 h-4 ${loadingRepos ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loadingRepos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="ml-2 text-gray-600">Loading repositories...</span>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {repositories.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No repositories found
                </div>
              ) : (
                repositories.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                      selectedRepo?.id === repo.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{repo.fullName}</div>
                        {repo.description && (
                          <div className="text-sm text-gray-600 mt-1">{repo.description}</div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {repo.defaultBranch}
                          </span>
                          {repo.private && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded">Private</span>
                          )}
                        </div>
                      </div>
                      {selectedRepo?.id === repo.id && (
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {selectedRepo && (
          <>
            {/* Branch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Custom Path */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workflow Path (optional)
              </label>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder=".github/workflows/workflow-name.yml"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to use default naming
              </p>
            </div>

            {/* Commit Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commit Message (optional)
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Add workflow from FlowForge"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Create PR Option */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createPR}
                  onChange={(e) => setCreatePR(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Create pull request instead of direct commit
                </span>
              </label>
            </div>

            {/* PR Fields */}
            {createPR && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pull Request Title
                  </label>
                  <input
                    type="text"
                    value={prTitle}
                    onChange={(e) => setPrTitle(e.target.value)}
                    placeholder="Add new GitHub Actions workflow"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pull Request Description (optional)
                  </label>
                  <textarea
                    value={prBody}
                    onChange={(e) => setPrBody(e.target.value)}
                    placeholder="Describe the changes..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Deploy Button */}
            <button
              onClick={handleDeploy}
              disabled={deploying || !selectedRepo || !branch.trim()}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deploying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Github className="w-5 h-5" />
                  {createPR ? 'Create Pull Request' : 'Deploy to GitHub'}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GitHubDeploy;
