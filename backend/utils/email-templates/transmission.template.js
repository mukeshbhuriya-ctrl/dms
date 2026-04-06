/**
 * Generates the HTML content for the transmission email.
 * @param {Object} details - Transmission details
 * @param {string} details.transmission_number - The unique transmission number
 * @param {string} details.po_number - The Purchase Order number
 * @param {string} details.customer_name - Name of the customer
 * @param {string} details.project_name - Name of the project (if available)
 * @param {string} details.password - The secure password for the ZIP file
 * @param {string} details.zip_url - The secure download link
 * @param {number} details.document_count - Number of documents included
 * @returns {string} HTML string
 */
const getTransmissionEmailTemplate = (details) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background-color: #0056b3; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        .info-item { background: #f8f9fa; padding: 10px; border-radius: 4px; }
        .info-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
        .info-value { font-weight: 600; font-size: 14px; color: #333; }
        .secure-section { background-color: #e9ecef; border-left: 4px solid #0056b3; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .button-container { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; padding: 12px 30px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; transition: background-color 0.3s; }
        .btn:hover { background-color: #218838; }
        .footer { background-color: #343a40; color: #adb5bd; padding: 15px; text-align: center; font-size: 12px; }
        .note { font-size: 13px; color: #666; margin-top: 20px; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Document Transmission</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Please find the attached documents for the following transmission.</p>
            
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Transmission No</span>
                    <span class="info-value">${details.transmission_number}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">PO Number</span>
                    <span class="info-value">${details.po_number}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Customer</span>
                    <span class="info-value">${details.customer_name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Documents</span>
                    <span class="info-value">${details.document_count} Files</span>
                </div>
            </div>

            ${details.include_zip ? `
            <div class="secure-section">
                <p style="margin-top: 0; margin-bottom: 10px;"><strong>🔒 Secure Access Required</strong></p>
                <p style="margin: 0;">Use the following password to unlock the files:</p>
                <p style="font-size: 24px; font-family: monospace; font-weight: bold; margin: 10px 0; color: #0056b3; letter-spacing: 2px;">${details.password}</p>
            </div>

            <div class="button-container">
                <a href="${details.zip_url}" class="btn">Download Secure ZIP</a>
            </div>
            
            <p class="note">Note: This link is secure. You will be prompted to enter the password shown above when you access the download page.</p>
            ` : `
            <div class="secure-section" style="background-color: #f8f9fa; border-left-color: #6c757d;">
                <p style="margin: 0; color: #666;"><strong>Note:</strong> Selected documents are attached to this email as a Transmittal PDF for your reference.</p>
            </div>
            `}
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} Shreno Engineering. All rights reserved.<br>
            This is an automated message. Please do not reply directly to this email.
        </div>
    </div>
</body>
</html>
    `;
};

module.exports = { getTransmissionEmailTemplate };
