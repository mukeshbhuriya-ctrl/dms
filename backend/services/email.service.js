require('dotenv/config');
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        const isGmail = (process.env.SMTP_HOST || 'smtp.gmail.com').includes('gmail.com');
        
        const config = {
            host: isGmail ? 'smtp.gmail.com' : process.env.SMTP_HOST,
            port: isGmail ? 587 : (process.env.SMTP_PORT || 587),
            secure: isGmail ? false : (process.env.SMTP_SECURE === 'true'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false
            }
        };

        this.transporter = nodemailer.createTransport(config);
        
        // Verify connection
        this.transporter.verify((error, success) => {
            if (error) {
                console.error("SMTP Connection Error:", error);
            } else {
                console.log("SMTP Server is ready");
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
}

module.exports = new EmailService();
