const nodemailer = require('nodemailer');

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

    // Template for Transmission
    async sendTransmissionEmail(to, cc, transmissionDetails, attachments = []) {
        const { getTransmissionEmailTemplate } = require('../utils/email-templates/transmission.template');

        const subject = `Document Transmission: ${transmissionDetails.transmission_number} - PO: ${transmissionDetails.po_number}`;
        const html = getTransmissionEmailTemplate(transmissionDetails);

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
}

module.exports = new EmailService();
