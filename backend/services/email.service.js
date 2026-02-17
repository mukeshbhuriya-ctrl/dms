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
                from: process.env.SMTP_FROM || '"DMS System" <no-reply@dms.com>',
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
        const subject = `New Document Transmission: ${transmissionDetails.transmission_number}`;
        const html = `
            <h2>Document Transmission</h2>
            <p>A new transmission has been created for PO: <strong>${transmissionDetails.po_number}</strong></p>
            <p><strong>Transmission Number:</strong> ${transmissionDetails.transmission_number}</p>
            <p><strong>Password:</strong> ${transmissionDetails.password}</p>
            <br/>
            <p>Please click the link below to download the documents:</p>
            <a href="${transmissionDetails.zip_url}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Download ZIP</a>
            <br/><br/>
            <p>Regards,<br/>DCC Team</p>
        `;
        return this.sendEmail({ to, cc, subject, html });
    }
}

module.exports = new EmailService();
