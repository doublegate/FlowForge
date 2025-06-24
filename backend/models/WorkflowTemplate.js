const mongoose = require('mongoose');

/**
 * Workflow Template Schema
 * Stores pre-built workflow templates for common use cases
 */
const WorkflowTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  template: Object,
  tags: [String],
  usageCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkflowTemplate', WorkflowTemplateSchema);