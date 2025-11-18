/**
 * User Model
 *
 * MongoDB schema for user authentication and profile management.
 * Supports JWT-based authentication with bcrypt password hashing.
 *
 * @module models/User
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens']
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
  },

  password: {
    type: String,
    required: function() {
      // Password required only for local auth (not OAuth)
      return !this.githubId && !this.googleId;
    },
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },

  // OAuth Fields
  githubId: {
    type: String,
    unique: true,
    sparse: true
  },

  githubAccessToken: {
    type: String,
    select: false
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true
  },

  googleAccessToken: {
    type: String,
    select: false
  },

  oauthProvider: {
    type: String,
    enum: ['local', 'github', 'google', 'microsoft'],
    default: 'local'
  },

  avatar: {
    type: String,
    trim: true
  },

  emailVerified: {
    type: Boolean,
    default: false
  },

  displayName: {
    type: String,
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },

  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },

  isActive: {
    type: Boolean,
    default: true
  },

  isEmailVerified: {
    type: Boolean,
    default: false
  },

  emailVerificationToken: {
    type: String,
    select: false
  },

  passwordResetToken: {
    type: String,
    select: false
  },

  passwordResetExpires: {
    type: Date,
    select: false
  },

  lastLogin: {
    type: Date
  },

  loginCount: {
    type: Number,
    default: 0
  },

  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    defaultWorkflowVisibility: {
      type: String,
      enum: ['private', 'public'],
      default: 'private'
    }
  },

  metadata: {
    createdIp: String,
    lastLoginIp: String,
    userAgent: String
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc, ret) {
      // Remove sensitive fields from JSON responses
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.__v;
      return ret;
    }
  }
});

/**
 * Pre-save hook to hash password before storing
 */
UserSchema.pre('save', async function(next) {
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Method to compare password for authentication
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>} True if password matches, false otherwise
 */
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Method to update last login timestamp
 * @param {string} ip - IP address of the login
 * @param {string} userAgent - User agent string
 */
UserSchema.methods.recordLogin = async function(ip, userAgent) {
  this.lastLogin = new Date();
  this.loginCount += 1;
  this.metadata.lastLoginIp = ip;
  this.metadata.userAgent = userAgent;
  await this.save();
};

/**
 * Static method to find user by email or username
 * @param {string} identifier - Email or username
 * @returns {Promise<User>} User document
 */
UserSchema.statics.findByIdentifier = async function(identifier) {
  return await this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  }).select('+password'); // Include password for authentication
};

/**
 * Check if user is admin
 * @returns {boolean} True if user has admin role
 */
UserSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

/**
 * Check if user can access resource
 * @param {Object} resource - Resource to check access for
 * @returns {boolean} True if user can access
 */
UserSchema.methods.canAccess = function(resource) {
  // Admins can access everything
  if (this.isAdmin()) return true;

  // Users can access their own resources
  if (resource.userId && resource.userId.toString() === this._id.toString()) {
    return true;
  }

  // Public resources are accessible to all
  if (resource.isPublic) return true;

  return false;
};

// Create indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ createdAt: -1 });

const User = mongoose.model('User', UserSchema);

module.exports = User;
