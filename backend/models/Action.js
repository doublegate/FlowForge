const mongoose = require('mongoose');

/**
 * Action Schema
 * Defines the structure for storing GitHub Action metadata in MongoDB
 */
const ActionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  repository: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['action', 'workflow'], 
    required: true, 
    default: 'action' 
  },
  category: String,
  version: String,
  author: String,
  stars: Number,
  lastUpdated: Date,
  inputs: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  outputs: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  runs: {
    using: String,
    main: String,
    pre: String,
    post: String
  },
  // Workflow-specific fields
  workflowPath: String, // Path to the workflow file
  triggers: [String], // Array of trigger types (workflow_call, push, etc.)
  branding: {
    icon: String,
    color: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Action', ActionSchema);