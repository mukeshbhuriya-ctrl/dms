const getAdminResetEmailTemplate = (userData, tempPassword, portalUrl) => {
    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5;">
        <p>Dear ${userData.name},</p>
        
        <p>Your DMS account password has been reset by an administrator. You have been assigned a temporary password to access the portal.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left;">
            <thead>
                <tr>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Portal URL</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Employee ID</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Temp Password</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;"><a href="${portalUrl}">${portalUrl}</a></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${userData.empid}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${tempPassword}</td>
                </tr>
            </tbody>
        </table>
        
        <p>IMPORTANT: For security reasons, you will be required to set a new, private password immediately upon logging in with these credentials.</p>
        
        <p>If you did not request this change, please contact the IT security department immediately.</p>
        
        <p>Best regards,<br>
        DMS Security Team</p>

        <br>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
        <div style="font-size: 12px; color: #666666; text-align: left;">
            <p style="margin: 0;"><strong>DMS Portal &bull; Shreno Engineering Limited</strong></p>
            <p style="margin: 4px 0 0 0;">This is an automated system-generated email. Please do not reply to this message.</p>
        </div>
    </div>
    `;
};

module.exports = { getAdminResetEmailTemplate };
