/**
 * Comment Model
 *
 * Stores comments and discussions on workflows with:
 * - Threaded replies
 * - User mentions
 * - Reactions
 * - Edit history
 *
 * @module models/Comment
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  // Associated workflow
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
    index: true
  },

  // Comment content
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },

  // Author information
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  authorName: {
    type: String,
    required: true
  },

  authorEmail: String,

  // Threading
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },

  // For context (optional - can comment on specific nodes)
  nodeId: {
    type: String,
    index: true
  },

  // User mentions
  mentions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  }],

  // Reactions
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'love', 'laugh', 'surprised', 'sad', 'angry']
    }
  }],

  // Edit tracking
  isEdited: {
    type: Boolean,
    default: false
  },

  editedAt: Date,

  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: Date,

  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  }
}, {
  timestamps: true
});

// Indexes for performance
CommentSchema.index({ workflowId: 1, createdAt: -1 });
CommentSchema.index({ workflowId: 1, parentId: 1 });
CommentSchema.index({ authorId: 1, createdAt: -1 });
CommentSchema.index({ 'mentions.userId': 1 });

// Virtual for reply count
CommentSchema.virtual('replyCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  count: true
});

/**
 * Get all comments for a workflow
 */
CommentSchema.statics.getWorkflowComments = async function(workflowId, options = {}) {
  const {
    includeDeleted = false,
    includeReplies = true,
    limit = 50,
    offset = 0
  } = options;

  const query = {
    workflowId: mongoose.Types.ObjectId(workflowId),
    parentId: null // Only top-level comments
  };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  let comments = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  if (includeReplies) {
    // Fetch replies for each comment
    for (let comment of comments) {
      const replies = await this.find({
        parentId: comment._id,
        isDeleted: false
      })
        .sort({ createdAt: 1 })
        .lean();

      comment.replies = replies;
    }
  }

  return comments;
};

/**
 * Add a reaction to a comment
 */
CommentSchema.methods.addReaction = async function(userId, reactionType) {
  // Remove existing reaction from user
  this.reactions = this.reactions.filter(
    r => r.userId.toString() !== userId.toString()
  );

  // Add new reaction
  this.reactions.push({
    userId,
    type: reactionType
  });

  await this.save();
  return this;
};

/**
 * Remove a reaction from a comment
 */
CommentSchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(
    r => r.userId.toString() !== userId.toString()
  );

  await this.save();
  return this;
};

/**
 * Edit comment content
 */
CommentSchema.methods.edit = async function(newContent, userId) {
  // Verify user is the author
  if (this.authorId.toString() !== userId.toString()) {
    throw new Error('Only the author can edit this comment');
  }

  // Save to edit history
  this.editHistory.push({
    content: this.content,
    editedAt: new Date()
  });

  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();

  await this.save();
  return this;
};

/**
 * Soft delete comment
 */
CommentSchema.methods.softDelete = async function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;

  await this.save();
  return this;
};

/**
 * Extract mentions from content
 */
CommentSchema.statics.extractMentions = function(content) {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
};

module.exports = mongoose.model('Comment', CommentSchema);
