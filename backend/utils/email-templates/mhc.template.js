const getMhcEmailTemplate = (data) => {
    const { action, report_no, po_no, client, equipment_name, remarks, action_by, url } = data;
    
    // Determine colors based on action
    let color = "#3b82f6"; // Blue
    if (action.includes("Approved")) color = "#10b981"; // Green
    if (action.includes("Rejected")) color = "#ef4444"; // Red
    if (action.includes("Offered")) color = "#f59e0b"; // Orange

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Material Heat Chart Update</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { background-color: ${color}; color: #ffffff; padding: 20px; text-align: center; }
            .header h2 { margin: 0; font-size: 20px; }
            .content { padding: 30px 20px; }
            .content p { line-height: 1.6; margin-bottom: 20px; }
            .details { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin-bottom: 20px; }
            .details p { margin: 8px 0; font-size: 14px; }
            .label { font-weight: bold; color: #475569; width: 120px; display: inline-block; }
            .btn-container { text-align: center; margin-top: 30px; }
            .btn { display: inline-block; background-color: ${color}; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; font-size: 14px; }
            .footer { background-color: #f1f5f9; text-align: center; padding: 15px; font-size: 12px; color: #64748b; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Material Heat Chart - ${action}</h2>
            </div>
            <div class="content">
                <p>Hello Team,</p>
                <p>A Material Heat Chart has been <strong>${action.toLowerCase()}</strong> by ${action_by}. Please review the details below:</p>
                
                <div class="details">
                    <p><span class="label">Report No:</span> ${report_no}</p>
                    <p><span class="label">Client:</span> ${client || 'N/A'}</p>
                    <p><span class="label">PO No:</span> ${po_no || 'N/A'}</p>
                    <p><span class="label">Equipment:</span> ${equipment_name || 'N/A'}</p>
                    ${remarks ? `<p><span class="label">Remarks:</span> ${remarks}</p>` : ''}
                </div>

                <div class="btn-container">
                    <a href="${url}" class="btn">View in DMS</a>
                </div>
            </div>
            <div class="footer">
                <p>This is an automated notification from the DMS System. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { getMhcEmailTemplate };
