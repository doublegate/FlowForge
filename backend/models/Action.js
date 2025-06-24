const mongoose = require('mongoose');

/**
 * Action Schema
 * Defines the structure for storing GitHub Action metadata in MongoDB
 */
const ActionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  repository: { type: String, required: true, unique: true },
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
  branding: {
    icon: String,
    color: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Action', ActionSchema);