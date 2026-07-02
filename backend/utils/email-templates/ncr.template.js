function getNcrEmailTemplate(details) {
    const { ncrNo, jobNo, stageLabel, status, nextAction, submittedBy, description, viewUrl } = details;

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5;">
        <p>Dear Team,</p>
        
        <p>An update has been made to a Non-Conformance Report (NCR) that requires your attention or awareness.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left;">
            <thead>
                <tr>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">NCR Number</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Job Number</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Current Status</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Recent Activity</th>
                    ${description ? `<th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Description</th>` : ''}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;"><strong>${ncrNo}</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${jobNo}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${status.toUpperCase()}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${stageLabel} by ${submittedBy}</td>
                    ${description ? `<td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${description}</td>` : ''}
                </tr>
            </tbody>
        </table>
        
        <p><strong>Action Required:</strong> Next task: ${nextAction}</p>
        
        <p>You can view the full NCR details here:<br>
        <a href="${viewUrl}">${viewUrl}</a></p>
        
        <p>Best regards,<br>
        DMS Workflow Automated System</p>

        <br>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
        <div style="font-size: 12px; color: #666666; text-align: left;">
            <p style="margin: 0;"><strong>DMS Portal &bull; Shreno Engineering Limited</strong></p>
            <p style="margin: 4px 0 0 0;">This is an automated system-generated email. Please do not reply to this message.</p>
        </div>
    </div>
    `;
}

module.exports = { getNcrEmailTemplate };
