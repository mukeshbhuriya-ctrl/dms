const getMhcEmailTemplate = (data) => {
    const { action, report_no, po_no, client, equipment_name, remarks, action_by, url, msn } = data;
    
    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5;">
        <p>Dear Team,</p>
        
        <p>Please be advised that the Material Heat Chart has been <strong>${action.toUpperCase()}</strong> by ${action_by}.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left;">
            <thead>
                <tr>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Report No</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Job No (MSN)</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Client</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Equipment</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Status</th>
                    ${remarks ? `<th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Remarks</th>` : ''}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;"><strong>${report_no}</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${msn || 'N/A'}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${client || 'N/A'}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${equipment_name || 'N/A'}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${action}</td>
                    ${remarks ? `<td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${remarks}</td>` : ''}
                </tr>
            </tbody>
        </table>
        
        <p>You can view the Material Heat Chart in the DMS Portal here:<br>
        <a href="${url}">${url}</a></p>
        
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
};

module.exports = { getMhcEmailTemplate };
