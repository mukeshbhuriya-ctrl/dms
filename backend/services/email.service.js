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
        });
    }

    async sendEmail({ to, cc, subject, text, html, attachments }) {
        try {
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_USER || '"DMS System" <no-reply@dms.com>',
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
    async sendTransmissionEmail(to, cc, transmissionDetails) {
        const { getTransmissionEmailTemplate } = require('../utils/email-templates/transmission.template');

        const subject = `Document Transmission: ${transmissionDetails.transmission_number} - PO: ${transmissionDetails.po_number}`;
        const html = getTransmissionEmailTemplate(transmissionDetails);

        return this.sendEmail({ to, cc, subject, html });
    }
}

module.exports = new EmailService();
