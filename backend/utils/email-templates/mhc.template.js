const getMhcEmailTemplate = (data) => {
    const { action, report_no, po_no, client, equipment_name, remarks, action_by, url, msn } = data;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Material Heat Chart Update</title>
        <style>
            body { font-family: Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 20px; color: #333333; font-size: 14px; }
            .content { max-width: 650px; margin: 0 auto; }
            p { line-height: 1.5; margin-bottom: 16px; }
            table.details-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            table.details-table td { padding: 6px 0; vertical-align: top; }
            .label { font-weight: bold; color: #555555; width: 140px; }
            .value { color: #111111; }
            .btn { display: inline-block; background-color: #0056b3; color: #ffffff !important; text-decoration: none; padding: 10px 20px; font-weight: bold; font-size: 13px; margin-top: 10px; border-radius: 3px; }
            .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #dddddd; font-size: 12px; color: #888888; }
        </style>
    </head>
    <body>
        <div class="content">
            <p>Hello,</p>
            <p>Please be advised that the Material Heat Chart has been <strong>${action.toUpperCase()}</strong> by ${action_by}.</p>
            
            <table class="details-table">
                <tr>
                    <td class="label">Report No:</td>
                    <td class="value">${report_no}</td>
                </tr>
                <tr>
                    <td class="label">Job No (MSN):</td>
                    <td class="value">${msn || 'N/A'}</td>
                </tr>
                <tr>
                    <td class="label">Client:</td>
                    <td class="value">${client || 'N/A'}</td>
                </tr>
                <tr>
                    <td class="label">Equipment:</td>
                    <td class="value">${equipment_name || 'N/A'}</td>
                </tr>
                <tr>
                    <td class="label">Status:</td>
                    <td class="value">${action}</td>
                </tr>
                ${remarks ? `<tr><td class="label">Remarks:</td><td class="value">${remarks}</td></tr>` : ''}
            </table>

            <p>
                <a href="${url}" class="btn">DMS Portal</a>
            </p>

            <div class="footer">
                <p>This is an automated notification from the Document Management System (DMS). Please do not reply directly to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { getMhcEmailTemplate };
