# FlowForge User Guide

**Version**: 0.7.0
**Last Updated**: 2025-11-19

Welcome to FlowForge, the Visual GitHub Actions Workflow Builder! This guide will help you get started and make the most of all available features.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Workflow](#creating-your-first-workflow)
3. [Using the Visual Editor](#using-the-visual-editor)
4. [AI-Assisted Workflow Generation](#ai-assisted-workflow-generation)
5. [Import & Export Workflows](#import--export-workflows)
6. [GitHub Integration](#github-integration)
7. [Collaboration Features](#collaboration-features)
8. [Comments & Discussions](#comments--discussions)
9. [Search & Discovery](#search--discovery)
10. [Advanced Features](#advanced-features)
11. [Tips & Best Practices](#tips--best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Creating an Account

1. Navigate to the FlowForge homepage
2. Click "Sign Up" in the top right corner
3. Choose your registration method:
   - **Email Registration**: Enter username, email, and password
   - **GitHub OAuth**: Sign in with your GitHub account
   - **Google OAuth**: Sign in with your Google account
4. Verify your email (if using email registration)
5. Complete your profile setup

### Understanding the Dashboard

After logging in, you'll see the main dashboard with:

- **Your Workflows**: All workflows you've created or have access to
- **Starred Workflows**: Workflows you've starred for quick access
- **Recent Activity**: Your recent workflow interactions
- **Templates**: Pre-built workflow templates to get started quickly

---

## Creating Your First Workflow

### Method 1: Start from Scratch

1. Click "New Workflow" button on the dashboard
2. Enter workflow details:
   - **Name**: A descriptive name for your workflow
   - **Description**: What the workflow does
   - **Category**: Select from categories (CI/CD, Deployment, Testing, etc.)
   - **Visibility**: Private, Team, or Public
   - **Tags**: Add searchable tags (e.g., "docker", "nodejs", "testing")
3. Click "Create Workflow"
4. You'll be taken to the visual editor

### Method 2: Use a Template

1. Click "Templates" in the navigation
2. Browse available templates or search
3. Click on a template to preview it
4. Click "Use Template"
5. Customize the workflow name and settings
6. Click "Create from Template"

### Method 3: Import from GitHub

1. Connect your GitHub account (see [GitHub Integration](#github-integration))
2. Click "Import from GitHub"
3. Select a repository
4. Choose a workflow file from the repository
5. Click "Import"

### Method 4: AI Generation

1. Click "Generate with AI"
2. Describe your workflow in plain English
3. Review the AI-generated workflow
4. Make adjustments as needed
5. Save the workflow

---

## Using the Visual Editor

The visual editor is the heart of FlowForge, allowing you to build workflows with drag-and-drop simplicity.

### Interface Overview

**Left Panel - Action Library**:
- Searchable library of GitHub Actions
- Organized by categories
- Shows action descriptions and inputs
- Drag actions to the canvas

**Center Panel - Canvas**:
- Visual representation of your workflow
- Nodes represent actions
- Edges represent execution flow
- Pan and zoom for navigation

**Right Panel - Properties**:
- Configure selected action
- Set input parameters
- View action documentation
- Delete or duplicate actions

**Bottom Panel - YAML Preview**:
- Real-time YAML generation
- Syntax highlighting
- Copy YAML to clipboard
- Validate workflow

### Building a Workflow

1. **Add Trigger Events**:
   - Click "Workflow Settings"
   - Select trigger events (push, pull_request, schedule, etc.)
   - Configure trigger conditions (branches, paths, etc.)

2. **Add Actions**:
   - Search for actions in the library
   - Drag actions to the canvas
   - Actions automatically connect in sequence

3. **Configure Actions**:
   - Click an action node to select it
   - Fill in required inputs in the properties panel
   - Optional inputs can be left blank
   - Use expressions like `${{ github.ref }}` for dynamic values

4. **Organize Jobs**:
   - Create parallel jobs by adding multiple action chains
   - Set job dependencies if needed
   - Configure job runners (ubuntu-latest, windows-latest, etc.)

5. **Save Your Workflow**:
   - Click "Save" to save changes
   - Changes are auto-saved every 30 seconds
   - View version history in workflow settings

### Keyboard Shortcuts

- `Ctrl/Cmd + S`: Save workflow
- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Y`: Redo
- `Delete`: Delete selected node
- `Ctrl/Cmd + D`: Duplicate selected node
- `Ctrl/Cmd + F`: Search actions
- `Ctrl/Cmd + /`: Toggle YAML preview

---

## AI-Assisted Workflow Generation

FlowForge includes powerful AI capabilities to help you create workflows faster.

### Generating a Complete Workflow

1. Click "Generate with AI" button
2. Enter a detailed description of your workflow:
   ```
   Example: "Create a workflow that builds a Node.js application,
   runs tests, and deploys to AWS on main branch pushes"
   ```
3. Click "Generate"
4. Review the AI-generated workflow
5. Make adjustments in the visual editor
6. Save the workflow

### Getting Workflow Suggestions

1. Open an existing workflow in the editor
2. Click "AI Suggestions" button
3. FlowForge will analyze your workflow and suggest:
   - Missing best practices
   - Optimization opportunities
   - Additional security checks
   - Caching strategies
4. Click "Apply" to add suggestions to your workflow

### Tips for Better AI Results

- Be specific about your tech stack (Node.js, Python, Docker, etc.)
- Mention the deployment target (AWS, Azure, Vercel, etc.)
- Include testing requirements
- Specify branch strategies
- Mention security requirements

---

## Import & Export Workflows

**New in v0.7.0**: FlowForge supports importing and exporting workflows for portability and sharing.

### Exporting Workflows

#### Export to JSON

1. Open the workflow you want to export
2. Click "Export" button
3. Select "JSON Format"
4. Choose export options:
   - **Include Metadata**: Workflow owner, creation date, etc.
   - **Include Statistics**: Views, stars, forks
   - **Include Collaborators**: List of people with access
5. Click "Download"
6. The workflow is saved as a `.json` file

#### Export to YAML

1. Open the workflow you want to export
2. Click "Export" button
3. Select "YAML Format"
4. This exports a GitHub Actions-compatible workflow file
5. Click "Download"
6. The workflow is saved as a `.yml` file

### Importing Workflows

#### Import from JSON

1. Click "Import" button
2. Drag and drop a JSON file, or click to browse
3. FlowForge validates the import
4. Review the preview:
   - Workflow name
   - Number of actions
   - Category
   - Any warnings or errors
5. Click "Import" to add to your workflows

#### Import from YAML

1. Click "Import" button
2. Select "YAML Format" tab
3. Upload a GitHub Actions workflow file or paste YAML content
4. FlowForge parses the YAML and creates a visual representation
5. Review the preview
6. Click "Import"

#### Import from URL

1. Click "Import" button
2. Select "From URL" tab
3. Enter a URL to a raw workflow file (e.g., from GitHub)
4. Click "Fetch"
5. Review and import

---

## GitHub Integration

**New in v0.7.0**: Deploy your workflows directly to GitHub repositories.

### Connecting Your GitHub Account

1. Navigate to Settings > Integrations
2. Click "Connect GitHub"
3. Choose connection method:

   **Option A - OAuth (Recommended)**:
   - Click "Sign in with GitHub"
   - Authorize FlowForge application
   - Connection established automatically

   **Option B - Personal Access Token**:
   - Go to GitHub > Settings > Developer settings > Personal access tokens
   - Click "Generate new token (classic)"
   - Select scopes:
     - `repo` - Full control of repositories
     - `workflow` - Update GitHub Actions workflows
     - `read:user` - Read user profile data
   - Copy the generated token
   - Paste into FlowForge
   - Click "Connect"

4. Verify connection shows your GitHub username

### Deploying Workflows to GitHub

1. Open the workflow you want to deploy
2. Click "Deploy to GitHub"
3. Select deployment options:
   - **Repository**: Choose from your repositories
   - **Branch**: Target branch (default: main)
   - **Path**: Workflow file path (default: `.github/workflows/{name}.yml`)
   - **Commit Message**: Custom commit message

4. Choose deployment method:

   **Direct Commit**:
   - Commits directly to the selected branch
   - Immediate deployment
   - Best for personal projects

   **Create Pull Request**:
   - Creates a new branch
   - Opens a pull request
   - Allows review before merging
   - Best for team projects

5. Click "Deploy"
6. View deployment result with links to:
   - Commit on GitHub
   - Workflow file
   - Pull request (if created)

### Importing from GitHub

1. Click "Import from GitHub"
2. Select a repository
3. FlowForge lists all workflows in `.github/workflows/`
4. Click on a workflow to preview
5. Click "Import" to add to your FlowForge workflows
6. Edit in the visual editor

### Managing GitHub Connection

- **View Status**: Settings > Integrations shows connection status
- **Disconnect**: Click "Disconnect GitHub" to remove access token
- **Reconnect**: Follow connection steps again to reconnect

---

## Collaboration Features

FlowForge makes it easy to collaborate with your team on workflows.

### Workflow Visibility

Three visibility levels:

1. **Private**: Only you can see and edit
2. **Team**: Members of your organization can view
3. **Public**: Anyone can view, fork, and star

To change visibility:
1. Open workflow settings
2. Select "Visibility" dropdown
3. Choose visibility level
4. Click "Save"

### Adding Collaborators

1. Open a workflow
2. Click "Collaborators" button
3. Click "Add Collaborator"
4. Search for users by username or email
5. Select user
6. Choose role:
   - **Viewer**: Can view the workflow only
   - **Editor**: Can view and edit the workflow
   - **Admin**: Can view, edit, and manage collaborators
7. Click "Add"
8. Collaborator receives email notification

### Managing Collaborator Roles

1. Open workflow > Collaborators
2. Find the collaborator
3. Click the role dropdown
4. Select new role
5. Changes are saved automatically

### Removing Collaborators

1. Open workflow > Collaborators
2. Find the collaborator
3. Click "Remove" button
4. Confirm removal

### Email Notifications

Collaborators receive email notifications for:
- Being added as a collaborator
- Workflow deployments
- Mentions in comments
- Major workflow changes (if enabled in settings)

---

## Comments & Discussions

**New in v0.7.0**: Discuss workflows with threaded comments, reactions, and mentions.

### Viewing Comments

1. Open a workflow
2. Click "Comments" tab
3. View all comments in chronological order
4. Threaded replies are nested under parent comments

### Adding Comments

1. Click in the "Add comment" text box
2. Type your comment (supports Markdown)
3. Use `@username` to mention other users
4. Click "Post Comment"

### Comment Features

**Markdown Support**:
```markdown
**Bold text**
*Italic text*
`code`
```Code blocks```
- Bullet points
1. Numbered lists
[Links](https://example.com)
```

**Mentions**:
- Type `@` followed by username
- Mentioned users receive email notifications
- Click on a mention to view user profile

**Reactions**:
- React to comments with emojis
- Available reactions: 👍 Like, ❤️ Love, 😂 Laugh, 😮 Surprised, 😢 Sad, 😠 Angry
- Click a reaction to add/remove it
- See who reacted by hovering over reactions

### Threaded Replies

1. Click "Reply" under a comment
2. Type your reply
3. Click "Post Reply"
4. Replies are nested under the parent comment
5. Collapse/expand threads by clicking the thread icon

### Editing Comments

1. Click "Edit" on your comment
2. Make changes
3. Click "Save"
4. Edited comments show "edited" label
5. View edit history by clicking "edited" label

### Deleting Comments

1. Click "Delete" on your comment
2. Confirm deletion
3. Comment is soft-deleted (shows "[deleted]")
4. Workflow admins can delete any comment

### Commenting on Specific Actions

1. In the visual editor, right-click an action node
2. Select "Add Comment"
3. Comment is attached to that specific action
4. Action shows a comment badge
5. Filter comments by action in the Comments tab

---

## Search & Discovery

**New in v0.7.0**: Powerful search with multiple filters to find the perfect workflow.

### Quick Search

1. Use the search bar in the top navigation
2. Type workflow name, description, or tags
3. Results appear as you type
4. Click a result to open the workflow

### Advanced Search

1. Click "Advanced Search" or press `Ctrl/Cmd + K`
2. Use multiple filters:

**Text Search**:
- Searches workflow name, description, and tags
- Supports partial matches

**Category Filter**:
- CI/CD
- Deployment
- Testing
- Security
- Automation
- Docker
- Other

**Tag Filter**:
- Add multiple tags
- Results match workflows with ANY of the tags
- Click "x" to remove a tag

**Visibility Filter**:
- All, Private, Team, Public

**Owner Filter**:
- Filter by workflow creator
- Type username to filter

**Date Range**:
- Created From: Workflows created after this date
- Created To: Workflows created before this date

**Sort Options**:
- Relevance (default for searches)
- Newest First
- Oldest First
- Name (A-Z)
- Most Stars
- Most Views
- Recently Updated

3. Click "Search" or press Enter
4. Browse results
5. Click on a workflow to view details

### Saving Searches

1. Perform an advanced search
2. Click "Save Search"
3. Name your saved search
4. Access from "Saved Searches" dropdown

---

## Advanced Features

### Workflow Versioning

FlowForge automatically versions your workflows:

1. View version history in workflow settings
2. Click a version to view it
3. Compare versions side-by-side
4. Restore previous versions
5. See who made changes and when

### Starring Workflows

- Star workflows for quick access
- View starred workflows on dashboard
- Popular workflows show star count

### Forking Workflows

1. Open a public or team workflow
2. Click "Fork" button
3. Customize name if desired
4. Fork becomes your own private workflow
5. Edit freely without affecting original

### Workflow Analytics

1. Open a workflow
2. Click "Analytics" tab
3. View metrics:
   - Total views
   - Stars
   - Forks
   - Deployment count
   - Success rate
   - Timeline graphs

4. Filter by date range (7d, 30d, 90d, all time)

### API Access

For advanced users and integrations:

1. Generate API key in Settings > API
2. Use REST API for automation
3. See [API Documentation](./API.md) for details

---

## Tips & Best Practices

### Workflow Design

1. **Start Simple**: Begin with basic workflows and add complexity gradually
2. **Use Templates**: Start from templates and customize
3. **Descriptive Names**: Use clear, descriptive action names
4. **Add Comments**: Document complex logic with comments
5. **Test Locally**: Use tools like `act` to test workflows locally before deploying

### Performance Optimization

1. **Use Caching**: Cache dependencies to speed up workflows
   - `actions/cache` for general caching
   - Built-in caching in `setup-node`, `setup-python`, etc.

2. **Parallel Jobs**: Run independent jobs in parallel
3. **Matrix Strategies**: Test multiple versions efficiently
4. **Conditional Steps**: Skip unnecessary steps with `if` conditions
5. **Artifacts**: Use `actions/upload-artifact` and `actions/download-artifact` to share data between jobs

### Security Best Practices

1. **Use Secrets**: Never hardcode sensitive data
2. **Pin Action Versions**: Use specific commit SHAs for critical actions
   ```yaml
   uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab
   ```
3. **Least Privilege**: Grant minimum required permissions
4. **Review Dependencies**: Audit third-party actions before use
5. **Enable Branch Protection**: Protect main branches

### Collaboration Tips

1. **Clear Descriptions**: Write detailed workflow descriptions
2. **Use Tags**: Tag workflows for easy discovery
3. **Comment Code**: Explain complex logic in comments
4. **Regular Updates**: Keep workflows up-to-date with latest action versions
5. **Team Templates**: Create team-specific templates for consistency

---

## Troubleshooting

### Common Issues

#### "Workflow Validation Failed"

**Problem**: YAML syntax errors or invalid configuration

**Solutions**:
1. Check YAML syntax in preview panel
2. Look for red underlines in the editor
3. Validate using "Validate Workflow" button
4. Check action inputs for required fields
5. Ensure proper indentation

#### "GitHub Connection Failed"

**Problem**: GitHub authentication issues

**Solutions**:
1. Check if token has expired
2. Verify token has required scopes (repo, workflow, read:user)
3. Disconnect and reconnect GitHub account
4. Generate new personal access token

#### "Deployment Failed"

**Problem**: Can't deploy workflow to GitHub

**Solutions**:
1. Verify you have write access to the repository
2. Check if workflow file already exists (use PR option)
3. Ensure branch exists
4. Check GitHub API rate limits
5. Try deploying to a different branch

#### "Import Failed"

**Problem**: Can't import workflow file

**Solutions**:
1. Verify file format (valid JSON or YAML)
2. Check for required fields (name, on, jobs)
3. Ensure nodes and edges are properly formatted
4. Try importing from URL instead of file upload
5. Check file size (max 1MB)

#### "Actions Not Loading"

**Problem**: Action library is empty

**Solutions**:
1. Refresh the page
2. Check internet connection
3. Clear browser cache
4. Try different browser
5. Contact support if problem persists

### Getting Help

1. **Documentation**: Read the [API Documentation](./API.md) and [Deployment Guide](./DEPLOYMENT.md)
2. **Community Forum**: Ask questions on GitHub Discussions
3. **GitHub Issues**: Report bugs on the repository
4. **Email Support**: support@flowforge.dev
5. **Status Page**: Check system status at status.flowforge.dev

### Reporting Bugs

When reporting bugs, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser and OS version
5. Screenshots or error messages
6. Workflow YAML (if applicable)

---

## Keyboard Shortcuts Reference

### Global

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open search |
| `Ctrl/Cmd + N` | New workflow |
| `Ctrl/Cmd + ,` | Open settings |
| `/` | Focus search bar |
| `?` | Show keyboard shortcuts |

### Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save workflow |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` | Redo |
| `Delete` | Delete selected node |
| `Ctrl/Cmd + D` | Duplicate selected node |
| `Ctrl/Cmd + F` | Search actions |
| `Ctrl/Cmd + /` | Toggle YAML preview |
| `Ctrl/Cmd + B` | Toggle sidebar |
| `Esc` | Deselect all |
| `Space` | Pan mode |
| `+` / `-` | Zoom in/out |
| `Ctrl/Cmd + 0` | Reset zoom |

### Navigation

| Shortcut | Action |
|----------|--------|
| `g d` | Go to dashboard |
| `g w` | Go to workflows |
| `g t` | Go to templates |
| `g s` | Go to settings |

---

## Glossary

- **Action**: A reusable unit of code that performs a specific task
- **Workflow**: A configurable automated process made up of jobs and steps
- **Job**: A set of steps that execute on the same runner
- **Step**: An individual task that runs a command or action
- **Runner**: A server that runs your workflows (ubuntu-latest, windows-latest, etc.)
- **Trigger**: An event that starts a workflow (push, pull_request, schedule, etc.)
- **Node**: Visual representation of an action in the canvas
- **Edge**: Connection between nodes showing execution flow
- **YAML**: A human-readable data serialization format used for workflow files
- **Fork**: A copy of a workflow that you can modify independently

---

## What's New in v0.7.0

- **Import/Export**: Share workflows in JSON or YAML format
- **GitHub Integration**: Deploy workflows directly to repositories
- **Comments**: Discuss workflows with threaded comments
- **Reactions**: React to comments with emoji reactions
- **Mentions**: Mention users with @username
- **Email Notifications**: Get notified of mentions and deployments
- **Advanced Search**: Find workflows with powerful filters
- **Improved Analytics**: Better insights into workflow usage

---

## Next Steps

1. Create your first workflow using a template
2. Connect your GitHub account
3. Explore the action library
4. Try AI-assisted generation
5. Join the community forum
6. Star workflows you find useful
7. Share your own workflows

Happy workflow building! 🚀

---

**Need Help?**
- Documentation: https://docs.flowforge.dev
- Community: https://github.com/your-org/flowforge/discussions
- Email: support@flowforge.dev
- Status: https://status.flowforge.dev
