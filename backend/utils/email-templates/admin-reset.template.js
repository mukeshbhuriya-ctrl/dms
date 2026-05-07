/**
 * Admin Reset Password Email Template
 */
const getAdminResetEmailTemplate = (userData, tempPassword, portalUrl) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .credentials { background-color: #fef2f2; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .credential-item { margin: 10px 0; }
            .label { font-weight: bold; width: 120px; display: inline-block; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
            .button { background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
            .warning { color: #991b1b; font-size: 14px; font-weight: bold; margin-top: 20px; padding: 10px; background: #fff1f1; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Security Alert: Password Reset</h1>
            </div>
            <div class="content">
                <p>Hello <strong>${userData.name}</strong>,</p>
                <p>Your DMS account password has been reset by an administrator. You have been assigned a temporary password to access the portal.</p>
                
                <div class="credentials">
                    <div class="credential-item">
                        <span class="label">Portal URL:</span>
                        <a href="${portalUrl}">${portalUrl}</a>
                    </div>
                    <div class="credential-item">
                        <span class="label">Employee ID:</span>
                        <code>${userData.empid}</code>
                    </div>
                    <div class="credential-item">
                        <span class="label">Temp Password:</span>
                        <code>${tempPassword}</code>
                    </div>
                </div>
                
                <div class="warning">
                    IMPORTANT: For security reasons, you will be required to set a new, private password immediately upon logging in with these credentials.
                </div>
                
                <div style="text-align: center;">
                    <a href="${portalUrl}" class="button">Reset Password Now</a>
                </div>
                
                <p>If you did not request this change, please contact the IT security department immediately.</p>
                
                <p>Best Regards,<br><strong>DMS Security Team</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated security notification. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { getAdminResetEmailTemplate };
