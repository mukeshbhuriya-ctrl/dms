const getInstrumentExpiryTemplate = (details) => {
    const dueDateFormatted = new Date(details.due_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    
    const portalUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const linkPath = details.type === 'PRESSURE_GAUGE' ? 'pressure-gauges' : 'calibration-instruments';

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5;">
        <p>Dear User,</p>
        
        <p>Please note that the following instrument you uploaded into the system is due for calibration in exactly 10 days.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left;">
            <thead>
                <tr>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Equipment Description</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">ID / SR No</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc;">Due Date</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${details.equipment_desc || 'N/A'}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${details.serial_no || 'N/A'}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;"><strong>${dueDateFormatted}</strong></td>
                </tr>
            </tbody>
        </table>
        
        <p>Please ensure the instrument is calibrated and the new certificate is updated in the system before the due date.</p>
        
        <p>You can view the instrument in the system here:<br>
        <a href="${portalUrl}/masters/${linkPath}">${portalUrl}/masters/${linkPath}</a></p>
        
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

module.exports = {
    getInstrumentExpiryTemplate
};
