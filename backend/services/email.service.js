const nodemailer = require('nodemailer');
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

    async sendEmail({ to, cc, subject, text, html, attachments }) {
        try {
            if (!this.isEmailEnabled()) {
                console.log('[EmailService] - disabled');
                return { skipped: true };
            }

            const info = await this.transporter.sendMail({
                from: `"DMS System" <${process.env.SMTP_USER || 'no-reply@dms.com'}>`,
                to, // list of receivers
                cc, // list of cc receivers
                subject,
                text,
                html,
                attachments,
            });
            console.log("Message sent: %s", info.messageId);
            return info;
        } catch (error) {
            console.error("Error sending email:", error);
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
}

module.exports = new EmailService();
