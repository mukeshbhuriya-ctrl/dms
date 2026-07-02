function getWeldStageEmailTemplate(details) {
    const { jointNo, stageLabel, status, engineerName, actionType } = details;
    
    const title = actionType === 'submission' ? 'Inspection Stage Review Requested' : `Inspection Stage ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    const actionText = actionType === 'submission' 
        ? `The production engineer has submitted the following stage for your review.` 
        : `The inspection stage has been ${status.toLowerCase()} by the QC engineer.`;
        
    const portalUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5;">
        <p>Dear Team,</p>
        
        <p><strong>${title}</strong></p>
        <p>${actionText}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left;">
            <thead>
                <tr>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Joint Number</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Stage Name</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Action By</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Current Status</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;"><strong>${jointNo}</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${stageLabel}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${engineerName}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${status.toUpperCase()}</td>
                </tr>
            </tbody>
        </table>
        
        <p>Please log in to the DMS system to take further action or view details:<br>
        <a href="${portalUrl}">${portalUrl}</a></p>
        
        <p>Best regards,<br>
        DMS System</p>

        <br>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
        <div style="font-size: 12px; color: #666666; text-align: left;">
            <p style="margin: 0;"><strong>DMS Portal &bull; Shreno Engineering Limited</strong></p>
            <p style="margin: 4px 0 0 0;">This is an automated system-generated email. Please do not reply to this message.</p>
        </div>
    </div>
    `;
}

module.exports = { getWeldStageEmailTemplate };
