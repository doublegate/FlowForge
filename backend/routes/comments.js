/**
 * Comment Routes
 *
 * API endpoints for workflow comments and discussions:
 * - Create/read/update/delete comments
 * - Threading and replies
 * - Reactions
 * - Mentions
 *
 * @module routes/comments
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Workflow = require('../models/Workflow');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

/**
 * GET /api/comments/workflow/:workflowId
 * Get all comments for a workflow
 */
router.get('/workflow/:workflowId', authenticateToken, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { limit, offset, includeReplies = 'true' } = req.query;

    // Check workflow exists and user has access
    const workflow = await Workflow.findById(workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (!workflow.hasAccess(req.user.id, 'viewer')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const comments = await Comment.getWorkflowComments(workflowId, {
      includeReplies: includeReplies === 'true',
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    });

    res.json({
      comments,
      total: comments.length
    });
  } catch (error) {
    logger.logError(error, {
      endpoint: `/api/comments/workflow/${req.params.workflowId}`,
      userId: req.user?.id
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/comments
 * Create a new comment
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { workflowId, content, parentId, nodeId } = req.body;

    // Validation
    if (!workflowId || !content) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'workflowId and content are required'
      });
    }

    if (content.length > 5000) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Content cannot exceed 5000 characters'
      });
    }

    // Check workflow exists and user has access
    const workflow = await Workflow.findById(workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (!workflow.hasAccess(req.user.id, 'viewer')) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You need at least viewer access to comment'
      });
    }

    // If replying, check parent comment exists
    if (parentId) {
      const parentComment = await Comment.findById(parentId);

      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }

      if (parentComment.workflowId.toString() !== workflowId) {
        return res.status(400).json({
          error: 'Parent comment belongs to different workflow'
        });
      }
    }

    // Get user info
    const user = await User.findById(req.user.id);

    // Extract mentions
    const mentionUsernames = Comment.extractMentions(content);
    const mentions = [];

    if (mentionUsernames.length > 0) {
      const mentionedUsers = await User.find({
        username: { $in: mentionUsernames }
      });

      for (const mentionedUser of mentionedUsers) {
        mentions.push({
          userId: mentionedUser._id,
          username: mentionedUser.username
        });
      }
    }

    // Create comment
    const comment = await Comment.create({
      workflowId,
      content,
      parentId: parentId || null,
      nodeId: nodeId || null,
      authorId: req.user.id,
      authorName: user.displayName || user.username,
      authorEmail: user.email,
      mentions
    });

    logger.info('Comment created', {
      commentId: comment._id,
      workflowId,
      userId: req.user.id
    });

    // Send email notifications to mentioned users
    if (mentions.length > 0) {
      const mentionedUsers = await User.find({
        _id: { $in: mentions.map(m => m.userId) }
      });

      for (const mentionedUser of mentionedUsers) {
        // Don't notify if user mentioned themselves
        if (mentionedUser._id.toString() !== req.user.id) {
          emailService.sendCommentMention(
            mentionedUser.email,
            user.displayName || user.username,
            workflow.name,
            content,
            workflowId
          ).catch(err => {
            logger.logError(err, { context: 'Send mention email' });
          });
        }
      }
    }

    res.status(201).json(comment);
  } catch (error) {
    logger.logError(error, { endpoint: '/api/comments', userId: req.user?.id });
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/comments/:id
 * Edit a comment
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Content is required'
      });
    }

    if (content.length > 5000) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Content cannot exceed 5000 characters'
      });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.isDeleted) {
      return res.status(400).json({ error: 'Cannot edit deleted comment' });
    }

    // Edit comment (will verify authorship)
    await comment.edit(content, req.user.id);

    logger.info('Comment edited', {
      commentId: comment._id,
      userId: req.user.id
    });

    res.json(comment);
  } catch (error) {
    logger.logError(error, {
      endpoint: `/api/comments/${req.params.id}`,
      userId: req.user?.id
    });

    if (error.message === 'Only the author can edit this comment') {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/comments/:id
 * Delete a comment
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.isDeleted) {
      return res.status(400).json({ error: 'Comment already deleted' });
    }

    // Check if user is author or has admin access to workflow
    const isAuthor = comment.authorId.toString() === req.user.id;
    let isAdmin = false;

    if (!isAuthor) {
      const workflow = await Workflow.findById(comment.workflowId);
      isAdmin = workflow && workflow.hasAccess(req.user.id, 'admin');
    }

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only comment author or workflow admin can delete comments'
      });
    }

    await comment.softDelete(req.user.id);

    logger.info('Comment deleted', {
      commentId: comment._id,
      userId: req.user.id
    });

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    logger.logError(error, {
      endpoint: `/api/comments/${req.params.id}`,
      userId: req.user?.id
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/comments/:id/reactions
 * Add a reaction to a comment
 */
router.post('/:id/reactions', authenticateToken, async (req, res) => {
  try {
    const { type } = req.body;

    const validTypes = ['like', 'love', 'laugh', 'surprised', 'sad', 'angry'];

    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Validation error',
        message: `Type must be one of: ${validTypes.join(', ')}`
      });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.isDeleted) {
      return res.status(400).json({ error: 'Cannot react to deleted comment' });
    }

    await comment.addReaction(req.user.id, type);

    logger.info('Reaction added to comment', {
      commentId: comment._id,
      userId: req.user.id,
      type
    });

    res.json(comment);
  } catch (error) {
    logger.logError(error, {
      endpoint: `/api/comments/${req.params.id}/reactions`,
      userId: req.user?.id
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/comments/:id/reactions
 * Remove user's reaction from a comment
 */
router.delete('/:id/reactions', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    await comment.removeReaction(req.user.id);

    logger.info('Reaction removed from comment', {
      commentId: comment._id,
      userId: req.user.id
    });

    res.json(comment);
  } catch (error) {
    logger.logError(error, {
      endpoint: `/api/comments/${req.params.id}/reactions`,
      userId: req.user?.id
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/comments/:id/history
 * Get edit history for a comment
 */
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user has access to the workflow
    const workflow = await Workflow.findById(comment.workflowId);

    if (!workflow || !workflow.hasAccess(req.user.id, 'viewer')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      commentId: comment._id,
      isEdited: comment.isEdited,
      editedAt: comment.editedAt,
      history: comment.editHistory
    });
  } catch (error) {
    logger.logError(error, {
      endpoint: `/api/comments/${req.params.id}/history`,
      userId: req.user?.id
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
