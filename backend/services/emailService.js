/**
 * Email Notification Service
 *
 * Handles sending email notifications for various events:
 * - Comment mentions
 * - Workflow sharing
 * - Collaboration invitations
 * - Deployment notifications
 *
 * @module services/emailService
 * @version 1.0.0
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.enabled = false;
    this.from = process.env.SMTP_FROM || 'noreply@flowforge.com';
    this.appName = 'FlowForge';
    this.appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  initialize() {
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    };

    // Check if SMTP is configured
    if (!smtpConfig.host || !smtpConfig.auth.user) {
      logger.warn('Email service not configured. Email notifications will be disabled.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter(smtpConfig);
      this.enabled = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.logError(error, { context: 'Email service initialization' });
      this.enabled = false;
    }
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html, text) {
    if (!this.enabled) {
      logger.warn('Email service not enabled, skipping email send');
      return { success: false, reason: 'Email service not enabled' };
    }

    try {
      const mailOptions = {
        from: this.from,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: info.messageId
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.logError(error, {
        context: 'Send email',
        to,
        subject
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Strip HTML tags for plain text version
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Generate email template
   */
  template(title, content, actionUrl, actionText) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e2e8f0;
              border-top: none;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #718096;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">${this.appName}</h1>
          </div>
          <div class="content">
            ${content}
            ${actionUrl && actionText ? `
              <p style="text-align: center;">
                <a href="${actionUrl}" class="button">${actionText}</a>
              </p>
            ` : ''}
          </div>
          <div class="footer">
            <p>This is an automated message from ${this.appName}.</p>
            <p>
              <a href="${this.appUrl}" style="color: #667eea;">Visit ${this.appName}</a>
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send comment mention notification
   */
  async sendCommentMention(toEmail, mentionedByName, workflowName, commentContent, workflowId) {
    const subject = `${mentionedByName} mentioned you in a comment`;

    const content = `
      <h2>You were mentioned in a comment</h2>
      <p><strong>${mentionedByName}</strong> mentioned you in a comment on <strong>${workflowName}</strong>:</p>
      <blockquote style="background: #f7fafc; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
        ${commentContent}
      </blockquote>
    `;

    const actionUrl = `${this.appUrl}/workflows/${workflowId}#comments`;
    const html = this.template(subject, content, actionUrl, 'View Comment');

    return this.sendEmail(toEmail, subject, html);
  }

  /**
   * Send collaboration invitation
   */
  async sendCollaborationInvite(toEmail, inviterName, workflowName, role, workflowId) {
    const subject = `${inviterName} invited you to collaborate on ${workflowName}`;

    const content = `
      <h2>Collaboration Invitation</h2>
      <p><strong>${inviterName}</strong> has invited you to collaborate on <strong>${workflowName}</strong>.</p>
      <p>You have been granted <strong>${role}</strong> access to this workflow.</p>
      <p>Click the button below to view the workflow and start collaborating.</p>
    `;

    const actionUrl = `${this.appUrl}/workflows/${workflowId}`;
    const html = this.template(subject, content, actionUrl, 'View Workflow');

    return this.sendEmail(toEmail, subject, html);
  }

  /**
   * Send workflow deployment notification
   */
  async sendDeploymentNotification(toEmail, workflowName, repository, deployedBy, commitUrl) {
    const subject = `Workflow "${workflowName}" deployed to GitHub`;

    const content = `
      <h2>Workflow Deployed Successfully</h2>
      <p><strong>${deployedBy}</strong> has deployed the workflow <strong>${workflowName}</strong> to GitHub.</p>
      <p><strong>Repository:</strong> ${repository}</p>
      <p>The workflow is now active and ready to use in your GitHub Actions.</p>
    `;

    const actionUrl = commitUrl;
    const html = this.template(subject, content, actionUrl, 'View on GitHub');

    return this.sendEmail(toEmail, subject, html);
  }

  /**
   * Send workflow shared notification
   */
  async sendWorkflowShared(toEmail, sharedByName, workflowName, workflowId) {
    const subject = `${sharedByName} shared a workflow with you`;

    const content = `
      <h2>Workflow Shared</h2>
      <p><strong>${sharedByName}</strong> has shared the workflow <strong>${workflowName}</strong> with you.</p>
      <p>You can now view and use this workflow in your projects.</p>
    `;

    const actionUrl = `${this.appUrl}/workflows/${workflowId}`;
    const html = this.template(subject, content, actionUrl, 'View Workflow');

    return this.sendEmail(toEmail, subject, html);
  }

  /**
   * Send workflow published to marketplace notification
   */
  async sendWorkflowPublished(toEmail, workflowName, publishedBy, workflowId) {
    const subject = `"${workflowName}" published to marketplace`;

    const content = `
      <h2>Workflow Published</h2>
      <p><strong>${publishedBy}</strong> has published <strong>${workflowName}</strong> to the FlowForge Marketplace.</p>
      <p>Your workflow is now available for others to discover and use.</p>
    `;

    const actionUrl = `${this.appUrl}/marketplace?workflow=${workflowId}`;
    const html = this.template(subject, content, actionUrl, 'View in Marketplace');

    return this.sendEmail(toEmail, subject, html);
  }

  /**
   * Send scheduled workflow execution notification
   */
  async sendScheduledExecutionNotification(toEmail, workflowName, executionStatus, workflowId) {
    const subject = `Scheduled workflow "${workflowName}" ${executionStatus}`;

    const content = `
      <h2>Scheduled Workflow Execution</h2>
      <p>Your scheduled workflow <strong>${workflowName}</strong> has ${executionStatus}.</p>
      <p>Check the workflow details for more information.</p>
    `;

    const actionUrl = `${this.appUrl}/workflows/${workflowId}`;
    const html = this.template(subject, content, actionUrl, 'View Workflow');

    return this.sendEmail(toEmail, subject, html);
  }

  /**
   * Send bulk notification
   */
  async sendBulk(emails, subject, html) {
    const results = [];

    for (const email of emails) {
      const result = await this.sendEmail(email, subject, html);
      results.push({ email, ...result });
    }

    return results;
  }
}

// Export singleton instance
module.exports = new EmailService();
