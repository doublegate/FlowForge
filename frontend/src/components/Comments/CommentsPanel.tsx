import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Reply,
  Edit2,
  Trash2,
  Heart,
  Smile,
  ThumbsUp,
  Loader2,
  AlertCircle,
  Check,
  X,
  MoreVertical,
  Clock
} from 'lucide-react';
import api from '../../services/api';

/**
 * CommentsPanel Component
 *
 * Workflow discussion and collaboration interface
 *
 * Features:
 * - Threaded comments and replies
 * - User mentions with @username
 * - Emoji reactions
 * - Edit and delete comments
 * - Real-time updates
 *
 * @component
 * @example
 * <CommentsPanel
 *   workflowId="workflow-id"
 *   currentUserId="user-id"
 * />
 */

interface Comment {
  _id: string;
  workflowId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  parentId?: string;
  nodeId?: string;
  mentions: Array<{ userId: string; username: string }>;
  reactions: Array<{ userId: string; type: string }>;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

interface CommentsPanelProps {
  workflowId: string;
  currentUserId?: string;
}

const REACTION_EMOJIS = {
  like: { emoji: '👍', label: 'Like' },
  love: { emoji: '❤️', label: 'Love' },
  laugh: { emoji: '😄', label: 'Laugh' },
  surprised: { emoji: '😮', label: 'Surprised' },
  sad: { emoji: '😢', label: 'Sad' },
  angry: { emoji: '😠', label: 'Angry' }
};

export const CommentsPanel: React.FC<CommentsPanelProps> = ({
  workflowId,
  currentUserId
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New comment state
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // UI state
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [workflowId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/comments/workflow/${workflowId}`);
      setComments(response.data.comments);
    } catch (err: any) {
      console.error('Error loading comments:', err);
      setError(err.response?.data?.error || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    try {
      setPosting(true);
      setError(null);

      await api.post('/comments', {
        workflowId,
        content: newComment.trim()
      });

      setNewComment('');
      await loadComments();
    } catch (err: any) {
      console.error('Error posting comment:', err);
      setError(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const handlePostReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    try {
      setPosting(true);
      setError(null);

      await api.post('/comments', {
        workflowId,
        content: replyContent.trim(),
        parentId
      });

      setReplyContent('');
      setReplyingTo(null);
      await loadComments();
    } catch (err: any) {
      console.error('Error posting reply:', err);
      setError(err.response?.data?.message || 'Failed to post reply');
    } finally {
      setPosting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      setError(null);

      await api.put(`/comments/${commentId}`, {
        content: editContent.trim()
      });

      setEditingId(null);
      setEditContent('');
      await loadComments();
    } catch (err: any) {
      console.error('Error editing comment:', err);
      setError(err.response?.data?.error || 'Failed to edit comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      setError(null);

      await api.delete(`/comments/${commentId}`);
      await loadComments();
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      setError(err.response?.data?.error || 'Failed to delete comment');
    }
  };

  const handleReaction = async (commentId: string, type: string) => {
    try {
      setError(null);

      // Check if user already reacted with this type
      const comment = findComment(comments, commentId);
      const existingReaction = comment?.reactions.find(
        r => r.userId === currentUserId && r.type === type
      );

      if (existingReaction) {
        // Remove reaction
        await api.delete(`/comments/${commentId}/reactions`);
      } else {
        // Add reaction
        await api.post(`/comments/${commentId}/reactions`, { type });
      }

      await loadComments();
      setShowReactions(null);
    } catch (err: any) {
      console.error('Error adding reaction:', err);
      setError(err.response?.data?.error || 'Failed to add reaction');
    }
  };

  const findComment = (commentList: Comment[], commentId: string): Comment | undefined => {
    for (const comment of commentList) {
      if (comment._id === commentId) return comment;
      if (comment.replies) {
        const found = findComment(comment.replies, commentId);
        if (found) return found;
      }
    }
    return undefined;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const getReactionCounts = (reactions: Array<{ userId: string; type: string }>) => {
    const counts: Record<string, number> = {};
    reactions.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isAuthor = comment.authorId === currentUserId;
    const isEditing = editingId === comment._id;
    const isReplying = replyingTo === comment._id;
    const reactionCounts = getReactionCounts(comment.reactions);

    if (comment.isDeleted) {
      return (
        <div key={comment._id} className={`${isReply ? 'ml-12' : ''} p-4 bg-gray-50 rounded-lg text-gray-500 italic`}>
          [Comment deleted]
        </div>
      );
    }

    return (
      <div key={comment._id} className={`${isReply ? 'ml-12' : ''} mb-4`}>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {comment.authorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900">{comment.authorName}</div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  {formatDate(comment.createdAt)}
                  {comment.isEdited && ' (edited)'}
                </div>
              </div>
            </div>

            {isAuthor && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(showMenu === comment._id ? null : comment._id)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>

                {showMenu === comment._id && (
                  <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => {
                        setEditingId(comment._id);
                        setEditContent(comment.content);
                        setShowMenu(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteComment(comment._id);
                        setShowMenu(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mb-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => handleEditComment(comment._id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  <Check className="w-4 h-4 inline mr-1" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditContent('');
                  }}
                  className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm"
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-900 mb-3 whitespace-pre-wrap">{comment.content}</div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setReplyingTo(isReplying ? null : comment._id)}
              className="text-gray-600 hover:text-blue-600 flex items-center gap-1"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>

            <div className="relative">
              <button
                onClick={() => setShowReactions(showReactions === comment._id ? null : comment._id)}
                className="text-gray-600 hover:text-blue-600 flex items-center gap-1"
              >
                <Smile className="w-4 h-4" />
                React
              </button>

              {showReactions === comment._id && (
                <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-2 z-10">
                  {Object.entries(REACTION_EMOJIS).map(([type, { emoji, label }]) => (
                    <button
                      key={type}
                      onClick={() => handleReaction(comment._id, type)}
                      className="p-2 hover:bg-gray-100 rounded text-xl"
                      title={label}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reaction counts */}
            {Object.entries(reactionCounts).map(([type, count]) => (
              <button
                key={type}
                onClick={() => handleReaction(comment._id, type)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs hover:bg-gray-200"
              >
                <span>{REACTION_EMOJIS[type as keyof typeof REACTION_EMOJIS].emoji}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reply form */}
        {isReplying && (
          <div className="ml-12 mt-3">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`Reply to ${comment.authorName}...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => handlePostReply(comment._id)}
                disabled={posting || !replyContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {posting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Reply
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading comments...</span>
      </div>
    );
  }

  return (
    <div className="comments-panel max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="w-6 h-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-900">Comments</h2>
          <span className="text-gray-600">({comments.length})</span>
        </div>
        <p className="text-gray-600">Discuss this workflow with your team</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* New comment form */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment... Use @username to mention someone"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          rows={4}
        />
        <button
          onClick={handlePostComment}
          disabled={posting || !newComment.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {posting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Post Comment
            </>
          )}
        </button>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No comments yet</p>
          <p className="text-sm text-gray-500 mt-1">Be the first to share your thoughts</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  );
};

export default CommentsPanel;
