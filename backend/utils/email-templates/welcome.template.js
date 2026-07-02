const getWelcomeEmailTemplate = (userData, password, companyUrl) => {
    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5;">
        <p>Dear ${userData.name},</p>
        
        <p>Welcome to the Document Management System (DMS). Your account has been successfully created. You can now log in using the credentials below:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left;">
            <thead>
                <tr>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Portal URL</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Employee ID</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Password</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;"><a href="${companyUrl}">${companyUrl}</a></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${userData.empid}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${password}</td>
                </tr>
            </tbody>
        </table>
        
        <p>For security reasons, we recommend you change your password after your first login.</p>
        
        <p>If you have any questions or encounter any issues, please contact your department administrator.</p>
        
        <p>Best regards,<br>
        DMS Administration Team</p>

        <br>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
        <div style="font-size: 12px; color: #666666; text-align: left;">
            <p style="margin: 0;"><strong>DMS Portal &bull; Shreno Engineering Limited</strong></p>
            <p style="margin: 4px 0 0 0;">This is an automated system-generated email. Please do not reply to this message.</p>
        </div>
    </div>
    `;
};

module.exports = { getWelcomeEmailTemplate };
