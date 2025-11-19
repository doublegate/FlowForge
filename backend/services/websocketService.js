/**
 * WebSocket Service for Real-time Collaboration
 *
 * Provides real-time features:
 * - User presence tracking
 * - Cursor position sharing
 * - Live workflow updates
 * - Collaborative editing
 * - Activity notifications
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.io = null;
    this.workflowRooms = new Map(); // workflowId -> Set of socket IDs
    this.userSockets = new Map(); // userId -> Set of socket IDs
    this.socketUsers = new Map(); // socketId -> user info
    this.cursors = new Map(); // workflowId -> Map(userId -> cursor position)
    this.activeEditors = new Map(); // workflowId -> Map(userId -> editing info)
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('WebSocket service initialized');
    return this.io;
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        socket.displayName = decoded.displayName || decoded.username;

        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Invalid authentication token'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.username} (${socket.id})`);

      // Store user-socket mapping
      if (!this.userSockets.has(socket.userId)) {
        this.userSockets.set(socket.userId, new Set());
      }
      this.userSockets.get(socket.userId).add(socket.id);

      this.socketUsers.set(socket.id, {
        userId: socket.userId,
        username: socket.username,
        displayName: socket.displayName,
        connectedAt: new Date()
      });

      // Join workflow room
      socket.on('join-workflow', (data) => this.handleJoinWorkflow(socket, data));

      // Leave workflow room
      socket.on('leave-workflow', (data) => this.handleLeaveWorkflow(socket, data));

      // Cursor position update
      socket.on('cursor-move', (data) => this.handleCursorMove(socket, data));

      // Workflow update (node/edge changes)
      socket.on('workflow-update', (data) => this.handleWorkflowUpdate(socket, data));

      // Start editing (lock a node)
      socket.on('start-editing', (data) => this.handleStartEditing(socket, data));

      // Stop editing (unlock a node)
      socket.on('stop-editing', (data) => this.handleStopEditing(socket, data));

      // Typing indicator
      socket.on('typing', (data) => this.handleTyping(socket, data));

      // Activity notification
      socket.on('activity', (data) => this.handleActivity(socket, data));

      // Disconnect
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  /**
   * Handle user joining a workflow room
   */
  handleJoinWorkflow(socket, data) {
    const { workflowId } = data;

    if (!workflowId) {
      socket.emit('error', { message: 'Workflow ID required' });
      return;
    }

    // Join the room
    socket.join(`workflow:${workflowId}`);

    // Track room membership
    if (!this.workflowRooms.has(workflowId)) {
      this.workflowRooms.set(workflowId, new Set());
    }
    this.workflowRooms.get(workflowId).add(socket.id);

    // Initialize cursor tracking for this workflow
    if (!this.cursors.has(workflowId)) {
      this.cursors.set(workflowId, new Map());
    }

    // Initialize active editors tracking
    if (!this.activeEditors.has(workflowId)) {
      this.activeEditors.set(workflowId, new Map());
    }

    // Get current users in the workflow
    const activeUsers = this.getWorkflowUsers(workflowId);

    // Notify user of current state
    socket.emit('workflow-joined', {
      workflowId,
      activeUsers,
      cursors: Array.from(this.cursors.get(workflowId).entries()).map(([userId, cursor]) => ({
        userId,
        ...cursor
      })),
      activeEdits: Array.from(this.activeEditors.get(workflowId).entries()).map(([userId, edit]) => ({
        userId,
        ...edit
      }))
    });

    // Notify others in the room
    socket.to(`workflow:${workflowId}`).emit('user-joined', {
      userId: socket.userId,
      username: socket.username,
      displayName: socket.displayName,
      timestamp: new Date()
    });

    logger.info(`User ${socket.username} joined workflow ${workflowId}`);
  }

  /**
   * Handle user leaving a workflow room
   */
  handleLeaveWorkflow(socket, data) {
    const { workflowId } = data;

    if (!workflowId) return;

    socket.leave(`workflow:${workflowId}`);

    // Remove from room tracking
    if (this.workflowRooms.has(workflowId)) {
      this.workflowRooms.get(workflowId).delete(socket.id);
      if (this.workflowRooms.get(workflowId).size === 0) {
        this.workflowRooms.delete(workflowId);
        this.cursors.delete(workflowId);
        this.activeEditors.delete(workflowId);
      }
    }

    // Remove cursor
    if (this.cursors.has(workflowId)) {
      this.cursors.get(workflowId).delete(socket.userId);
    }

    // Remove active edits
    if (this.activeEditors.has(workflowId)) {
      this.activeEditors.get(workflowId).delete(socket.userId);
    }

    // Notify others
    socket.to(`workflow:${workflowId}`).emit('user-left', {
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date()
    });

    logger.info(`User ${socket.username} left workflow ${workflowId}`);
  }

  /**
   * Handle cursor position updates
   */
  handleCursorMove(socket, data) {
    const { workflowId, position, nodeId } = data;

    if (!workflowId || !position) return;

    // Update cursor position
    if (this.cursors.has(workflowId)) {
      this.cursors.get(workflowId).set(socket.userId, {
        username: socket.username,
        displayName: socket.displayName,
        position,
        nodeId,
        timestamp: new Date()
      });

      // Broadcast to others in the room
      socket.to(`workflow:${workflowId}`).emit('cursor-update', {
        userId: socket.userId,
        username: socket.username,
        displayName: socket.displayName,
        position,
        nodeId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle workflow updates (node/edge changes)
   */
  handleWorkflowUpdate(socket, data) {
    const { workflowId, type, payload } = data;

    if (!workflowId || !type) return;

    // Broadcast update to others in the room
    socket.to(`workflow:${workflowId}`).emit('workflow-changed', {
      userId: socket.userId,
      username: socket.username,
      type, // 'node-add', 'node-update', 'node-delete', 'edge-add', 'edge-delete'
      payload,
      timestamp: new Date()
    });

    logger.debug(`Workflow ${workflowId} updated by ${socket.username}: ${type}`);
  }

  /**
   * Handle user starting to edit a node
   */
  handleStartEditing(socket, data) {
    const { workflowId, nodeId, nodeName } = data;

    if (!workflowId || !nodeId) return;

    // Check if someone else is editing this node
    if (this.activeEditors.has(workflowId)) {
      const editors = this.activeEditors.get(workflowId);
      const existingEditor = Array.from(editors.values()).find(edit => edit.nodeId === nodeId);

      if (existingEditor && existingEditor.userId !== socket.userId) {
        // Node is locked by another user
        socket.emit('editing-conflict', {
          nodeId,
          lockedBy: existingEditor.username,
          timestamp: existingEditor.timestamp
        });
        return;
      }

      // Lock the node
      editors.set(socket.userId, {
        userId: socket.userId,
        username: socket.username,
        displayName: socket.displayName,
        nodeId,
        nodeName,
        timestamp: new Date()
      });

      // Notify others
      socket.to(`workflow:${workflowId}`).emit('node-locked', {
        nodeId,
        nodeName,
        userId: socket.userId,
        username: socket.username,
        displayName: socket.displayName,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle user stopping editing a node
   */
  handleStopEditing(socket, data) {
    const { workflowId, nodeId } = data;

    if (!workflowId || !nodeId) return;

    if (this.activeEditors.has(workflowId)) {
      const editors = this.activeEditors.get(workflowId);
      const edit = editors.get(socket.userId);

      if (edit && edit.nodeId === nodeId) {
        editors.delete(socket.userId);

        // Notify others
        socket.to(`workflow:${workflowId}`).emit('node-unlocked', {
          nodeId,
          userId: socket.userId,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Handle typing indicator
   */
  handleTyping(socket, data) {
    const { workflowId, nodeId, isTyping } = data;

    if (!workflowId) return;

    socket.to(`workflow:${workflowId}`).emit('user-typing', {
      userId: socket.userId,
      username: socket.username,
      displayName: socket.displayName,
      nodeId,
      isTyping,
      timestamp: new Date()
    });
  }

  /**
   * Handle activity notifications
   */
  handleActivity(socket, data) {
    const { workflowId, activity, message } = data;

    if (!workflowId || !activity) return;

    socket.to(`workflow:${workflowId}`).emit('activity-notification', {
      userId: socket.userId,
      username: socket.username,
      displayName: socket.displayName,
      activity,
      message,
      timestamp: new Date()
    });
  }

  /**
   * Handle user disconnect
   */
  handleDisconnect(socket) {
    logger.info(`User disconnected: ${socket.username} (${socket.id})`);

    // Get all workflows this user was in
    const userWorkflows = [];
    for (const [workflowId, sockets] of this.workflowRooms.entries()) {
      if (sockets.has(socket.id)) {
        userWorkflows.push(workflowId);
      }
    }

    // Clean up each workflow
    userWorkflows.forEach(workflowId => {
      this.handleLeaveWorkflow(socket, { workflowId });
    });

    // Remove from user-socket mapping
    if (this.userSockets.has(socket.userId)) {
      this.userSockets.get(socket.userId).delete(socket.id);
      if (this.userSockets.get(socket.userId).size === 0) {
        this.userSockets.delete(socket.userId);
      }
    }

    // Remove socket-user mapping
    this.socketUsers.delete(socket.id);
  }

  /**
   * Get active users in a workflow
   */
  getWorkflowUsers(workflowId) {
    const users = [];
    if (this.workflowRooms.has(workflowId)) {
      for (const socketId of this.workflowRooms.get(workflowId)) {
        const user = this.socketUsers.get(socketId);
        if (user && !users.find(u => u.userId === user.userId)) {
          users.push(user);
        }
      }
    }
    return users;
  }

  /**
   * Send notification to specific user
   */
  sendToUser(userId, event, data) {
    if (this.userSockets.has(userId)) {
      for (const socketId of this.userSockets.get(userId)) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }

  /**
   * Send notification to workflow room
   */
  sendToWorkflow(workflowId, event, data) {
    this.io.to(`workflow:${workflowId}`).emit(event, data);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      connectedUsers: this.userSockets.size,
      totalConnections: this.socketUsers.size,
      activeWorkflows: this.workflowRooms.size,
      activeEdits: Array.from(this.activeEditors.values()).reduce((sum, editors) => sum + editors.size, 0)
    };
  }
}

module.exports = new WebSocketService();
