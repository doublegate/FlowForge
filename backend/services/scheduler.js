/**
 * Workflow Scheduler Service
 *
 * Manages scheduled workflow executions using cron expressions
 *
 * @module services/scheduler
 */

const cron = require('node-cron');
const Workflow = require('../models/Workflow');
const logger = require('../utils/logger');

class WorkflowScheduler {
  constructor() {
    this.scheduledJobs = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the scheduler and load all scheduled workflows
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('Scheduler already initialized');
      return;
    }

    try {
      logger.info('Initializing workflow scheduler...');

      // Find all workflows with enabled schedules
      const scheduledWorkflows = await Workflow.find({
        'schedule.enabled': true,
        'schedule.cron': { $exists: true, $ne: null }
      });

      logger.info(`Found ${scheduledWorkflows.length} scheduled workflows`);

      // Schedule each workflow
      for (const workflow of scheduledWorkflows) {
        await this.scheduleWorkflow(workflow);
      }

      this.initialized = true;
      logger.info('Workflow scheduler initialized successfully');
    } catch (error) {
      logger.logError(error, { context: 'Scheduler initialization' });
      throw error;
    }
  }

  /**
   * Schedule a workflow
   */
  async scheduleWorkflow(workflow) {
    try {
      // Validate cron expression
      if (!cron.validate(workflow.schedule.cron)) {
        logger.warn(`Invalid cron expression for workflow ${workflow._id}: ${workflow.schedule.cron}`);
        return false;
      }

      // Cancel existing schedule if any
      this.cancelSchedule(workflow._id);

      // Create new scheduled job
      const task = cron.schedule(
        workflow.schedule.cron,
        async () => {
          await this.executeWorkflow(workflow._id);
        },
        {
          timezone: workflow.schedule.timezone || 'UTC'
        }
      );

      // Store the scheduled job
      this.scheduledJobs.set(workflow._id.toString(), task);

      // Update next run time
      await this.updateNextRunTime(workflow);

      logger.info('Workflow scheduled', {
        workflowId: workflow._id,
        cron: workflow.schedule.cron,
        timezone: workflow.schedule.timezone
      });

      return true;
    } catch (error) {
      logger.logError(error, {
        context: 'Schedule workflow',
        workflowId: workflow._id
      });
      return false;
    }
  }

  /**
   * Cancel a scheduled workflow
   */
  cancelSchedule(workflowId) {
    const workflowIdStr = workflowId.toString();

    if (this.scheduledJobs.has(workflowIdStr)) {
      const task = this.scheduledJobs.get(workflowIdStr);
      task.stop();
      this.scheduledJobs.delete(workflowIdStr);

      logger.info('Workflow schedule cancelled', { workflowId: workflowIdStr });
      return true;
    }

    return false;
  }

  /**
   * Execute a scheduled workflow
   */
  async executeWorkflow(workflowId) {
    try {
      logger.info('Executing scheduled workflow', { workflowId });

      const workflow = await Workflow.findById(workflowId);

      if (!workflow) {
        logger.warn('Scheduled workflow not found', { workflowId });
        this.cancelSchedule(workflowId);
        return;
      }

      // Update last run time
      workflow.schedule.lastRun = new Date();
      await workflow.save();

      // Here you would integrate with GitHub Actions API to trigger the workflow
      // For now, we'll just log the execution
      logger.info('Scheduled workflow executed', {
        workflowId: workflow._id,
        name: workflow.name,
        owner: workflow.ownerId
      });

      // Update next run time
      await this.updateNextRunTime(workflow);

      // You could add webhook notifications here
      // or integrate with GitHub API to actually run the workflow
    } catch (error) {
      logger.logError(error, {
        context: 'Execute scheduled workflow',
        workflowId
      });
    }
  }

  /**
   * Update the next run time for a workflow
   */
  async updateNextRunTime(workflow) {
    try {
      const cronExpression = workflow.schedule.cron;
      // const timezone = workflow.schedule.timezone || 'UTC'; // Reserved for future use with cron-parser
      // NOTE: Timezone support is NOT implemented. All scheduling is done in UTC.
      if (workflow.schedule.timezone && workflow.schedule.timezone !== 'UTC') {
        logger.warn(
          `Timezone '${workflow.schedule.timezone}' specified for workflow '${workflow.name}' (ID: ${workflow._id}) is ignored. Only UTC is currently supported.`
        );
      }

      // Parse cron expression to calculate next run time
      // NOTE: This is a simplified implementation. For production use, consider using
      // the 'cron-parser' library for accurate scheduling with proper timezone support.
      // Current implementation uses basic approximation which may not handle all edge cases.

      // For now, we'll use a simple approximation
      const now = new Date();
      // const parts = cronExpression.split(' '); // Reserved for future cron parsing

      // Basic cron format: minute hour day month weekday
      // Calculate approximate next run (simplified)
      const minutesUntilNextRun = this.calculateMinutesUntilNextRun(cronExpression);

      workflow.schedule.nextRun = new Date(now.getTime() + minutesUntilNextRun * 60 * 1000);
      await workflow.save();
    } catch (error) {
      logger.logError(error, {
        context: 'Update next run time',
        workflowId: workflow._id
      });
    }
  }

  /**
   * Calculate approximate minutes until next run (simplified)
   */
  calculateMinutesUntilNextRun(cronExpression) {
    // This is a simplified calculation
    // In production, use a proper cron parser library

    const parts = cronExpression.split(' ');

    if (parts[0] === '*') {
      // Every minute
      return 1;
    } else if (parts[1] === '*') {
      // Every hour
      return 60;
    } else {
      // Default to daily
      return 24 * 60;
    }
  }

  /**
   * Get statistics about scheduled workflows
   */
  getStats() {
    return {
      totalScheduled: this.scheduledJobs.size,
      workflows: Array.from(this.scheduledJobs.keys())
    };
  }

  /**
   * Shutdown the scheduler
   */
  shutdown() {
    logger.info('Shutting down workflow scheduler...');

    for (const [, task] of this.scheduledJobs.entries()) {
      task.stop();
    }

    this.scheduledJobs.clear();
    this.initialized = false;

    logger.info('Workflow scheduler shutdown complete');
  }
}

// Create singleton instance
const scheduler = new WorkflowScheduler();

module.exports = scheduler;
