/**
 * Get Email Template for NCR Notifications
 * @param {Object} details - NCR Details
 * @returns {string} HTML content
 */
function getNcrEmailTemplate(details) {
    const { 
        ncrNo, 
        jobNo, 
        stageLabel, 
        status, 
        nextAction, 
        submittedBy, 
        description,
        viewUrl 
    } = details;

    const statusColor = status === 'REJECTED' ? '#ef4444' : '#10b981';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333; }
            .header { background-color: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .details-box { background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #000; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
            .btn { display: inline-block; background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
            .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
            .label { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 2px; }
            .value { font-size: 15px; font-weight: 500; margin-bottom: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">NCR WORKFLOW UPDATE</h2>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>An update has been made to a Non-Conformance Report (NCR) that requires your attention or awareness.</p>
                
                <div class="details-box">
                    <div class="label">NCR Number</div>
                    <div class="value">${ncrNo}</div>
                    
                    <div class="label">Job Number</div>
                    <div class="value">${jobNo}</div>
                    
                    <div class="label">Current Status</div>
                    <div style="color: ${statusColor}; font-weight: bold; margin-bottom: 12px;">${status.toUpperCase()}</div>
                    
                    <div class="label">Recent Activity</div>
                    <div class="value">${stageLabel} submitted by ${submittedBy}</div>

                    ${description ? `
                    <div class="label">Description</div>
                    <div class="value" style="font-size: 13px; color: #4b5563;">${description}</div>
                    ` : ''}
                </div>

                <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">
                    <strong style="color: #166534;">Action Required:</strong>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #166534;">Next task: <strong>${nextAction}</strong></p>
                </div>

                <a href="${viewUrl}" class="btn">View NCR Details</a>

                <p style="margin-top: 30px;">Thank you,<br>DMS Workflow Automated System</p>
            </div>
            <div class="footer">
                This is an automated notification. Please do not reply to this email.
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = {
    getNcrEmailTemplate
};
