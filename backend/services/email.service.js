const nodemailer = require('nodemailer');
const prisma = require('#prisma');
const { getNcrEmailTemplate } = require('../utils/email-templates/ncr.template');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                // Do not fail on invalid certs (common in corporate mail servers)
                rejectUnauthorized: false
            }
        });
    }

    /**
     * Internal helper to scrub out users who disabled email notifications
     * @param {string|Array} emails 
     * @returns {string} Comma-separated list of active emails
     */
    async _filterOptOutEmails(emails) {
        if (!emails) return '';

        let emailArray = [];
        if (typeof emails === 'string') {
            emailArray = emails.split(',').map(e => e.trim()).filter(Boolean);
        } else if (Array.isArray(emails)) {
            emailArray = emails.map(e => e.trim()).filter(Boolean);
        }

        if (emailArray.length === 0) return '';

        // Query all matched users to check their settings
        const users = await prisma.user.findMany({
            where: { email: { in: emailArray } },
            include: { user_settings: true }
        });

        // Filter valid emails
        const validEmails = emailArray.filter(email => {
            const userRecord = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            // If user exists and explicitly set email_notifications to false, filter them out.
            // (If user_settings is missing, we default to true to prevent breaking legacy users)
            if (userRecord && userRecord.user_settings && userRecord.user_settings.email_notifications === false) {
                console.log(`[EmailService] Intercepted and blocked email to ${email} (User opted out via settings)`);
                return false;
            }
            return true;
        });

        return validEmails.join(', ');
    }

    async sendEmail({ to, cc, subject, text, html, attachments }) {
        try {
            if (!this.isEmailEnabled()) {
                console.log(`[EmailService] - disabled`);
                return { skipped: true };
            }

            // Enterprise Interceptor: Filter out opted-out users
            const filteredTo = await this._filterOptOutEmails(to);
            const filteredCc = await this._filterOptOutEmails(cc);

            if (!filteredTo || filteredTo.trim() === '') {
                console.log(`[EmailService] Aborting email "${subject}". All primary recipients ('to') have opted out of notifications.`);
                return { skipped: true, reason: 'All recipients opted out' };
            }

            const info = await this.transporter.sendMail({
                from: `"DMS System" <${process.env.SMTP_USER || 'no-reply@dms.com'}>`,
                to: filteredTo, // filtered receivers
                cc: filteredCc, // filtered cc receivers
                subject,
                text,
                html,
                attachments,
            });

            if (info.rejected?.length) {
                console.warn(`[EmailService] Rejected by mail server:`, info.rejected);
            } else {
                console.log(`[EmailService] Message sent: ${info.messageId}`);
            }

            return info;
        } catch (error) {
            console.error(`[EmailService] Error:`, error);
            throw error;
        }
    }

    isEmailEnabled() {
        return process.env.EMAIL_ENABLED?.toLowerCase() !== 'false';
    }

    // Template for Transmission
    async sendTransmissionEmail(to, cc, transmissionDetails, attachments = [], customContent = {}) {
        const { getTransmissionEmailTemplate } = require('../utils/email-templates/transmission.template');

        const subject = customContent.subject || `Document Transmission: ${transmissionDetails.transmission_number} - PO: ${transmissionDetails.po_number}`;
        const html = customContent.html || getTransmissionEmailTemplate(transmissionDetails);

        return this.sendEmail({ to, cc, subject, html, attachments });
    }

    // Template for Welcome Email
    async sendWelcomeEmail(userData, password) {
        console.log(`[EmailService] Preparing welcome email for: ${userData.email}`);
        const { getWelcomeEmailTemplate } = require('../utils/email-templates/welcome.template');
        const companyUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        const subject = `Welcome to DMS - Your Account Credentials`;
        const html = getWelcomeEmailTemplate(userData, password, companyUrl);

        return this.sendEmail({ to: userData.email, subject, html });
    }

    // Template for Weld Stage Notification
    async sendWeldStageNotification(to, details) {
        const { getWeldStageEmailTemplate } = require('../utils/email-templates/weld-joint.template');

        const { jointNo, stageLabel, status, actionType } = details;
        const subject = `Weld Inspection Update: Joint ${jointNo} - ${stageLabel} (${status.toUpperCase()})`;
        const html = getWeldStageEmailTemplate(details);

        return this.sendEmail({ to, subject, html });
    }

    // --- Document Workflow Notifications ---

    async sendDocumentAssignmentNotification(to, user_name, documents) {
        const { getDocumentAssignedTemplate } = require('../utils/email-templates/document-workflow.template');
        const subject = `[Action Required] New Documents Assigned - DMS`;
        const html = getDocumentAssignedTemplate(user_name, documents);
        return this.sendEmail({ to, subject, html });
    }

    async sendDocumentReviewNotification(to, user_name, details) {
        const { getDocumentReviewTemplate } = require('../utils/email-templates/document-workflow.template');
        const subject = `Document Review Update: ${details.documentNumber} is ${details.status}`;
        const html = getDocumentReviewTemplate(user_name, details);
        return this.sendEmail({ to, subject, html });
    }

    async sendDocumentOverdueNotification(to, user_name, type, documents) {
        const { getDocumentOverdueTemplate } = require('../utils/email-templates/document-workflow.template');
        const subject = `[URGENT] Portfolio Deadline Exceeded - DMS`;
        const html = getDocumentOverdueTemplate(user_name, type, documents);
        return this.sendEmail({ to, subject, html });
    }

    async sendNcrNotification(to, details) {
        const { ncrNo, jobNo, status } = details;
        const subject = `NCR Notification: ${ncrNo} (Job ${jobNo}) - ${status.toUpperCase()}`;
        const viewUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/ncr`;

        const html = getNcrEmailTemplate({ ...details, viewUrl });

        return this.sendEmail({ to, subject, html });
    }

    async sendOtpEmail(to, userName, otp) {
        const { getOtpEmailTemplate } = require('../utils/email-templates/otp.template');
        const subject = `${otp} is your DMS Password Reset Code`;
        const html = getOtpEmailTemplate(userName, otp);

        return this.sendEmail({ to, subject, html });
    }

    async sendAdminResetEmail(user, tempPassword) {
        const { getAdminResetEmailTemplate } = require('../utils/email-templates/admin-reset.template');
        const portalUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const subject = `[Action Required] Your DMS Password Has Been Reset`;
        const html = getAdminResetEmailTemplate(user, tempPassword, portalUrl);

        return this.sendEmail({ to: user.email, subject, html });
    }

    async sendClientReviewNotification(to, user_name, details) {
        const { getClientReviewTemplate } = require('../utils/email-templates/document-workflow.template');
        const subject = `[Client Feedback] ${details.documentNumber}: ${details.status}`;
        const html = getClientReviewTemplate(user_name, details);
        return this.sendEmail({ to, subject, html });
    }

    async sendDocumentUploadedNotification(to, user_name, details) {
        const { getDocumentUploadedTemplate } = require('../utils/email-templates/document-workflow.template');
        const subject = `[New Upload] ${details.documentNumber} - Rev ${details.versionNo} for Review`;
        const html = getDocumentUploadedTemplate(user_name, details);
        return this.sendEmail({ to, subject, html });
    }

    async sendRevisionRequestedNotification(to, admin_name, details) {
        const { getRevisionRequestedTemplate } = require('../utils/email-templates/document-workflow.template');
        const subject = `[Action Required] Revision Request for ${details.shrenoDocNo}`;
        const html = getRevisionRequestedTemplate(admin_name, details);
        return this.sendEmail({ to, subject, html });
    }

    async sendRevisionApprovedNotification(to, uploader_name, details) {
        const { getRevisionApprovedTemplate } = require('../utils/email-templates/document-workflow.template');
        const subject = `[Approved] Revision Request for ${details.shrenoDocNo}`;
        const html = getRevisionApprovedTemplate(uploader_name, details);
        return this.sendEmail({ to, subject, html });
    }

    async sendRevisionRejectedNotification(to, requester_name, details) {
        const { getRevisionRejectedTemplate } = require('../utils/email-templates/document-workflow.template');
        const subject = `[Rejected] Revision Request for ${details.shrenoDocNo}`;
        const html = getRevisionRejectedTemplate(requester_name, details);
        return this.sendEmail({ to, subject, html });
    }

    async sendMhcNotification(to, details) {
        const { getMhcEmailTemplate } = require('../utils/email-templates/mhc.template');
        const subject = `[MHC ${details.action}] Report: ${details.report_no} (Job ${details.msn})`;

        const payload = {
            ...details,
            url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/material-heat-chart`
        };

        const html = getMhcEmailTemplate(payload);
        return this.sendEmail({ to, subject, html });
    }

    async broadcastMhcToEmployeeGroup(group_id, details) {
        if (!group_id || !process.env.EMAIL_ENABLED || process.env.EMAIL_ENABLED !== 'true') return;

        try {
            const groupMembers = await prisma.user_employee_group.findMany({
                where: { employee_group_id: group_id },
                include: { user: true }
            });

            // Extract emails (opt-out logic is handled internally by sendEmail)
            // Deduplicate emails in case multiple users share the same email address
            const validEmails = [...new Set(
                groupMembers
                    .map(gm => gm.user)
                    .filter(user => user && user.email)
                    .map(user => user.email)
            )];

            if (validEmails.length > 0) {
                // Send an email to everyone in the group
                await Promise.all(validEmails.map(email => this.sendMhcNotification(email, details)));
            }
        } catch (error) {
            console.error(`[EmailService] Failed to broadcast MHC notification to group ${group_id}:`, error);
        }
    }

    async sendInstrumentExpiryNotification(to, details) {
        const { getInstrumentExpiryTemplate } = require('../utils/email-templates/instrument.template');
        const subject = `[Action Required] Instrument Calibration Expiring Soon: ${details.serial_no}`;
        const html = getInstrumentExpiryTemplate(details);
        return this.sendEmail({ to, subject, html });
    }
}

module.exports = new EmailService();
