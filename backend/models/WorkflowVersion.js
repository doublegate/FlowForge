/**
 * Workflow Version Model
 *
 * Stores version history for workflows, enabling:
 * - Version tracking and rollback
 * - Change comparison
 * - Audit trail
 * - Collaborative editing history
 *
 * @module models/WorkflowVersion
 */

const mongoose = require('mongoose');

const WorkflowVersionSchema = new mongoose.Schema({
  // Reference to parent workflow
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
    index: true
  },

  // Version number (auto-incremented)
  version: {
    type: Number,
    required: true,
    min: 1
  },

  // Workflow content snapshot
  content: {
    name: { type: String, required: true },
    description: String,
    nodes: { type: Array, required: true },
    edges: { type: Array, required: true },
    yaml: String,
    triggers: Array,
    environment: Object
  },

  // Change metadata
  changeType: {
    type: String,
    enum: ['created', 'updated', 'restored', 'published', 'unpublished'],
    default: 'updated'
  },

  changeSummary: {
    type: String,
    maxlength: 500
  },

  // Author information
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  authorName: String,
  authorEmail: String,

  // Version statistics
  stats: {
    nodeCount: Number,
    actionCount: Number,
    triggerCount: Number,
    yamlSize: Number
  },

  // Comparison data (diff from previous version)
  diff: {
    nodesAdded: { type: Number, default: 0 },
    nodesRemoved: { type: Number, default: 0 },
    nodesModified: { type: Number, default: 0 },
    edgesAdded: { type: Number, default: 0 },
    edgesRemoved: { type: Number, default: 0 }
  },

  // Tags for this version
  tags: [String],

  // Is this version published/deployed?
  isPublished: {
    type: Boolean,
    default: false
  },

  publishedAt: Date,

  // Restoration info (if this version was restored)
  restoredFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkflowVersion'
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // Using custom createdAt
});

// Compound index for efficient querying
WorkflowVersionSchema.index({ workflowId: 1, version: -1 });
WorkflowVersionSchema.index({ authorId: 1, createdAt: -1 });

// Pre-save middleware to calculate stats
WorkflowVersionSchema.pre('save', function(next) {
  if (this.content) {
    this.stats = {
      nodeCount: this.content.nodes?.length || 0,
      actionCount: this.content.nodes?.filter(n => n.type !== 'trigger').length || 0,
      triggerCount: this.content.triggers?.length || 0,
      yamlSize: this.content.yaml?.length || 0
    };
  }
  next();
});

// Instance methods
WorkflowVersionSchema.methods = {
  /**
   * Get version summary
   */
  getSummary() {
    return {
      id: this._id,
      version: this.version,
      changeType: this.changeType,
      changeSummary: this.changeSummary,
      author: {
        id: this.authorId,
        name: this.authorName,
        email: this.authorEmail
      },
      stats: this.stats,
      diff: this.diff,
      tags: this.tags,
      isPublished: this.isPublished,
      publishedAt: this.publishedAt,
      createdAt: this.createdAt
    };
  }
};

// Static methods
WorkflowVersionSchema.statics = {
  /**
   * Get next version number for a workflow
   */
  async getNextVersion(workflowId) {
    const lastVersion = await this.findOne({ workflowId })
      .sort({ version: -1 })
      .select('version');

    return lastVersion ? lastVersion.version + 1 : 1;
  },

  /**
   * Get version history for a workflow
   */
  async getHistory(workflowId, options = {}) {
    const { limit = 50, offset = 0, includeContent = false } = options;

    const query = this.find({ workflowId })
      .sort({ version: -1 })
      .skip(offset)
      .limit(limit);

    if (!includeContent) {
      query.select('-content');
    }

    return await query.exec();
  },

  /**
   * Compare two versions
   */
  async compareVersions(workflowId, versionA, versionB) {
    const [vA, vB] = await Promise.all([
      this.findOne({ workflowId, version: versionA }),
      this.findOne({ workflowId, version: versionB })
    ]);

    if (!vA || !vB) {
      throw new Error('Version not found');
    }

    return {
      versionA: vA.getSummary(),
      versionB: vB.getSummary(),
      changes: {
        nodes: {
          added: vB.content.nodes.filter(n =>
            !vA.content.nodes.find(an => an.id === n.id)
          ).length,
          removed: vA.content.nodes.filter(n =>
            !vB.content.nodes.find(bn => bn.id === n.id)
          ).length,
          modified: vB.content.nodes.filter(n => {
            const oldNode = vA.content.nodes.find(an => an.id === n.id);
            return oldNode && JSON.stringify(oldNode) !== JSON.stringify(n);
          }).length
        },
        nameChanged: vA.content.name !== vB.content.name,
        descriptionChanged: vA.content.description !== vB.content.description
      }
    };
  },

  /**
   * Create version from workflow
   */
  async createVersion(workflow, userId, changeType = 'updated', changeSummary = '') {
    const version = await this.getNextVersion(workflow._id);

    // Calculate diff from previous version
    let diff = {
      nodesAdded: 0,
      nodesRemoved: 0,
      nodesModified: 0,
      edgesAdded: 0,
      edgesRemoved: 0
    };

    if (version > 1) {
      const previousVersion = await this.findOne({
        workflowId: workflow._id,
        version: version - 1
      });

      if (previousVersion) {
        const oldNodes = previousVersion.content.nodes || [];
        const newNodes = workflow.nodes || [];
        const oldEdges = previousVersion.content.edges || [];
        const newEdges = workflow.edges || [];

        diff.nodesAdded = newNodes.filter(n =>
          !oldNodes.find(on => on.id === n.id)
        ).length;
        diff.nodesRemoved = oldNodes.filter(n =>
          !newNodes.find(nn => nn.id === n.id)
        ).length;
        diff.nodesModified = newNodes.filter(n => {
          const oldNode = oldNodes.find(on => on.id === n.id);
          return oldNode && JSON.stringify(oldNode) !== JSON.stringify(n);
        }).length;
        diff.edgesAdded = newEdges.length - oldEdges.length;
      }
    }

    const newVersion = new this({
      workflowId: workflow._id,
      version,
      content: {
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
        yaml: workflow.yaml,
        triggers: workflow.triggers,
        environment: workflow.environment
      },
      changeType,
      changeSummary,
      authorId: userId,
      authorName: workflow.authorName,
      authorEmail: workflow.authorEmail,
      diff,
      isPublished: workflow.isPublished || false,
      publishedAt: workflow.publishedAt
    });

    await newVersion.save();
    return newVersion;
  }
};

module.exports = mongoose.model('WorkflowVersion', WorkflowVersionSchema);
