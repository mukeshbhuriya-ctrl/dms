/**
 * OTP Email Template for DMS password reset
 */
const getOtpEmailTemplate = (userName, otp) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333; }
            .header { background-color: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center; }
            .otp-container { background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 2px dashed #1e3a8a; display: inline-block; min-width: 200px; }
            .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a; margin: 0; }
            .footer { text-align: center; margin-top: 25px; font-size: 12px; color: #6b7280; }
            .warning { color: #dc2626; font-size: 13px; margin-top: 20px; border-top: 1px solid #fee2e2; padding-top: 15px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin:0;">Password Reset Request</h2>
            </div>
            <div class="content">
                <p>Hello <strong>${userName}</strong>,</p>
                <p>We received a request to reset your password for the DMS Portal. Please use the following One-Time Password (OTP) to verify your identity:</p>
                
                <div class="otp-container">
                    <p class="otp-code">${otp}</p>
                </div>
                
                <p>This OTP is valid for <strong>10 minutes</strong>. If you did not request this reset, please ignore this email or contact your IT administrator.</p>
                
                <div class="warning">
                    <strong>Security Note:</strong> Never share this OTP with anyone. Shreno Engineering employees will never ask for your password or OTP.
                </div>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} SHRENO ENGINEERING LIMITED. All rights reserved.</p>
                <p>This is an automated message. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { getOtpEmailTemplate };
