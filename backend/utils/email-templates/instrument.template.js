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
        
        <p>
            <strong>Equipment Description:</strong> ${details.equipment_desc || 'N/A'}<br>
            <strong>ID / SR No:</strong> ${details.serial_no || 'N/A'}<br>
            <strong>Due Date:</strong> ${dueDateFormatted}
        </p>
        
        <p>Please ensure the instrument is calibrated and the new certificate is updated in the system before the due date.</p>
        
        <p>You can view the instrument in the system here:<br>
        <a href="${portalUrl}/masters/${linkPath}">${portalUrl}/masters/${linkPath}</a></p>
        
        <p>Best regards,<br>
        DMS System</p>
    </div>
    `;
};

module.exports = {
    getInstrumentExpiryTemplate
};
