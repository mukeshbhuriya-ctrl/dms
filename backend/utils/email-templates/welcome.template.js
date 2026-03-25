/**
 * Welcome Email Template for new DMS users
 */
const getWelcomeEmailTemplate = (userData, password, companyUrl) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .credentials { background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #2563eb; }
            .credential-item { margin: 10px 0; }
            .label { font-weight: bold; width: 120px; display: inline-block; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
            .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to DMS</h1>
            </div>
            <div class="content">
                <p>Hello <strong>${userData.name}</strong>,</p>
                <p>Welcome to the Document Management System (DMS). Your account has been successfully created. You can now log in using the credentials below:</p>
                
                <div class="credentials">
                    <div class="credential-item">
                        <span class="label">Portal URL:</span>
                        <a href="${companyUrl}">${companyUrl}</a>
                    </div>
                    <div class="credential-item">
                        <span class="label">Employee ID:</span>
                        <code>${userData.empid}</code>
                    </div>
                    <div class="credential-item">
                        <span class="label">Password:</span>
                        <code>${password}</code>
                    </div>
                </div>
                
                <p>For security reasons, we recommend you change your password after your first login.</p>
                
                <div style="text-align: center;">
                    <a href="${companyUrl}" class="button">Log In Now</a>
                </div>
                
                <p>If you have any questions or encounter any issues, please contact your department administrator.</p>
                
                <p>Best Regards,<br><strong>DMS Administration Team</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { getWelcomeEmailTemplate };
