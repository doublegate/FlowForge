/**
 * Workflow Model (Enhanced with Version Support)
 *
 * Core workflow model with:
 * - Version tracking
 * - Collaboration features
 * - Sharing and marketplace support
 * - Analytics tracking
 *
 * @module models/Workflow
 */

const mongoose = require('mongoose');

const WorkflowSchema = new mongoose.Schema({
  // Basic information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },

  description: {
    type: String,
    maxlength: 1000
  },

  // Workflow structure
  nodes: {
    type: Array,
    required: true,
    default: []
  },

  edges: {
    type: Array,
    required: true,
    default: []
  },

  // Generated YAML
  yaml: {
    type: String,
    maxlength: 100000
  },

  // Workflow configuration
  triggers: {
    type: Array,
    default: []
  },

  environment: {
    type: Object,
    default: {}
  },

  // Ownership and collaboration
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  ownerName: String,
  ownerEmail: String,

  // Team collaboration
  collaborators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Sharing and visibility
  visibility: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private',
    index: true
  },

  // Marketplace features
  isTemplate: {
    type: Boolean,
    default: false,
    index: true
  },

  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },

  publishedAt: Date,

  category: {
    type: String,
    enum: ['ci-cd', 'deployment', 'testing', 'security', 'automation', 'docker', 'other'],
    index: true
  },

  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],

  // Version tracking
  currentVersion: {
    type: Number,
    default: 1,
    min: 1
  },

  lastVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowVersion'
  },

  // Analytics
  stats: {
    views: { type: Number, default: 0 },
    uses: { type: Number, default: 0 },
    clones: { type: Number, default: 0 },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 }
  },

  // User engagement
  starredBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Fork information
  forkedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow'
  },

  // Repository integration
  githubRepo: {
    owner: String,
    repo: String,
    path: String,
    branch: String,
    synced: Boolean,
    lastSyncAt: Date
  },

  // Scheduling
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    cron: String,
    timezone: {
      type: String,
      default: 'UTC'
    },
    lastRun: Date,
    nextRun: Date
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
WorkflowSchema.index({ ownerId: 1, updatedAt: -1 });
WorkflowSchema.index({ isPublished: 1, category: 1, 'stats.stars': -1 });
WorkflowSchema.index({ tags: 1 });
WorkflowSchema.index({ 'stats.stars': -1 });
WorkflowSchema.index({ visibility: 1, isPublished: 1 });

// Virtual for version count
WorkflowSchema.virtual('versionCount', {
  ref: 'WorkflowVersion',
  localField: '_id',
  foreignField: 'workflowId',
  count: true
});

// Instance methods
WorkflowSchema.methods = {
  /**
   * Check if user has access to workflow
   */
  hasAccess(userId, requiredRole = 'viewer') {
    const userIdStr = userId.toString();

    // Owner always has access
    if (this.ownerId.toString() === userIdStr) {
      return true;
    }

    // Public workflows can be viewed
    if (this.visibility === 'public' && requiredRole === 'viewer') {
      return true;
    }

    // Check collaborators
    const collaborator = this.collaborators.find(
      c => c.userId.toString() === userIdStr
    );

    if (!collaborator) {
      return false;
    }

    // Role hierarchy: admin > editor > viewer
    const roleLevel = {
      'viewer': 1,
      'editor': 2,
      'admin': 3
    };

    return roleLevel[collaborator.role] >= roleLevel[requiredRole];
  },

  /**
   * Add collaborator
   */
  async addCollaborator(userId, role, addedBy) {
    // Check if already a collaborator
    const existing = this.collaborators.find(
      c => c.userId.toString() === userId.toString()
    );

    if (existing) {
      existing.role = role;
    } else {
      this.collaborators.push({
        userId,
        role,
        addedBy,
        addedAt: new Date()
      });
    }

    await this.save();
    return this;
  },

  /**
   * Remove collaborator
   */
  async removeCollaborator(userId) {
    this.collaborators = this.collaborators.filter(
      c => c.userId.toString() !== userId.toString()
    );
    await this.save();
    return this;
  },

  /**
   * Star workflow
   */
  async star(userId) {
    const userIdStr = userId.toString();

    if (!this.starredBy.some(id => id.toString() === userIdStr)) {
      this.starredBy.push(userId);
      this.stats.stars++;
      await this.save();
    }

    return this;
  },

  /**
   * Unstar workflow
   */
  async unstar(userId) {
    const userIdStr = userId.toString();
    const index = this.starredBy.findIndex(id => id.toString() === userIdStr);

    if (index !== -1) {
      this.starredBy.splice(index, 1);
      this.stats.stars = Math.max(0, this.stats.stars - 1);
      await this.save();
    }

    return this;
  },

  /**
   * Increment view count
   */
  async incrementViews() {
    this.stats.views++;
    await this.save({ validateBeforeSave: false });
  },

  /**
   * Clone/fork workflow
   */
  async fork(newOwnerId, newOwnerName, newOwnerEmail) {
    const forkedWorkflow = new this.constructor({
      name: `${this.name} (Fork)`,
      description: this.description,
      nodes: JSON.parse(JSON.stringify(this.nodes)),
      edges: JSON.parse(JSON.stringify(this.edges)),
      yaml: this.yaml,
      triggers: this.triggers,
      environment: this.environment,
      ownerId: newOwnerId,
      ownerName: newOwnerName,
      ownerEmail: newOwnerEmail,
      forkedFrom: this._id,
      visibility: 'private',
      category: this.category,
      tags: [...this.tags]
    });

    await forkedWorkflow.save();

    // Increment fork count on original
    this.stats.forks++;
    await this.save({ validateBeforeSave: false });

    return forkedWorkflow;
  }
};

// Static methods
WorkflowSchema.statics = {
  /**
   * Get workflows accessible by user
   */
  async getAccessibleWorkflows(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      category,
      tags,
      visibility
    } = options;

    const query = {
      $or: [
        { ownerId: userId },
        { 'collaborators.userId': userId },
        { visibility: 'public' }
      ]
    };

    if (category) {
      query.category = category;
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    if (visibility) {
      query.visibility = visibility;
    }

    const workflows = await this.find(query)
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(limit)
      .select('-yaml');

    const total = await this.countDocuments(query);

    return { workflows, total };
  },

  /**
   * Get marketplace/public workflows
   */
  async getMarketplaceWorkflows(options = {}) {
    const {
      limit = 20,
      offset = 0,
      category,
      tags,
      sortBy = 'stars' // stars, recent, uses
    } = options;

    const query = {
      visibility: 'public',
      isPublished: true
    };

    if (category) {
      query.category = category;
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    let sort = {};
    switch (sortBy) {
      case 'stars':
        sort = { 'stats.stars': -1 };
        break;
      case 'uses':
        sort = { 'stats.uses': -1 };
        break;
      case 'recent':
        sort = { publishedAt: -1 };
        break;
      default:
        sort = { 'stats.stars': -1 };
    }

    const workflows = await this.find(query)
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .select('-yaml');

    const total = await this.countDocuments(query);

    return { workflows, total };
  }
};

module.exports = mongoose.model('Workflow', WorkflowSchema);
