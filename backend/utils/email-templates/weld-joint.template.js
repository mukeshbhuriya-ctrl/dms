/**
 * Get Weld Joint Stage Notification Email Template
 * @param {Object} details - Details like jointNo, stageLabel, status, engineerName
 * @returns {string} - HTML email template
 */
function getWeldStageEmailTemplate(details) {
    const { jointNo, stageLabel, status, engineerName, actionType } = details;
    
    // actionType: 'submission' or 'review'
    const title = actionType === 'submission' ? 'Inspection Stage Review Requested' : `Inspection Stage ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    const actionText = actionType === 'submission' 
        ? `The production engineer has submitted the following stage for your review.` 
        : `The inspection stage has been ${status.toLowerCase()} by the QC engineer.`;

    const statusColor = status === 'approved' ? '#10b981' : status === 'rejected' ? '#ef4444' : '#3b82f6';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
            .header { background-color: #1f2937; color: #ffffff; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #ffffff; }
            .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
            .details-box { background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .detail-row { margin-bottom: 10px; display: flex; }
            .detail-label { font-weight: 600; width: 150px; color: #4b5563; }
            .detail-value { flex: 1; color: #111827; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #ffffff; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin:0;">Weld Inspection Update</h2>
            </div>
            <div class="content">
                <h3 style="color: #111827;">${title}</h3>
                <p>${actionText}</p>
                
                <div class="details-box">
                    <div class="detail-row">
                        <span class="detail-label">Joint Number:</span>
                        <span class="detail-value">${jointNo}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Stage Name:</span>
                        <span class="detail-value">${stageLabel}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Action By:</span>
                        <span class="detail-value">${engineerName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Current Status:</span>
                        <span class="detail-value">
                            <span class="status-badge" style="background-color: ${statusColor};">${status}</span>
                        </span>
                    </div>
                </div>
                
                <p>Please log in to the DMS system to take further action or view details.</p>
                
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">View in DMS</a>
                </div>
            </div>
            <div class="footer">
                <p>This is an automated notification from Shreno DMS System.</p>
                <p>&copy; ${new Date().getFullYear()} Shreno Engineering. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = { getWeldStageEmailTemplate };
