const getTransmissionEmailTemplate = (details) => {
    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5;">
        <p>Dear Team,</p>
        
        <p>Please find the attached documents for the following transmission.</p>
        
        <table style="border-collapse: collapse; margin: 15px 0; font-size: 14px;">
            <tr><td style="padding: 4px 15px 4px 0;"><strong>Transmission No:</strong></td><td style="padding: 4px 0;">${details.transmission_number}</td></tr>
            <tr><td style="padding: 4px 15px 4px 0;"><strong>PO Number:</strong></td><td style="padding: 4px 0;">${details.po_number}</td></tr>
            <tr><td style="padding: 4px 15px 4px 0;"><strong>Customer:</strong></td><td style="padding: 4px 0;">${details.customer_name}</td></tr>
            <tr><td style="padding: 4px 15px 4px 0;"><strong>Documents:</strong></td><td style="padding: 4px 0;">${details.document_count} Files</td></tr>
        </table>

        ${details.include_zip ? `
        <p><strong>Secure Access Required:</strong><br>
        Use the following password to unlock the files: <strong>${details.password}</strong></p>
        
        <p>You can securely download the ZIP file here:<br>
        <a href="${details.zip_url}">${details.zip_url}</a></p>
        
        <p><em>Note: This link is secure. You will be prompted to enter the password shown above when you access the download page.</em></p>
        ` : `
        <p><em>Note: Selected documents are attached to this email as a Transmittal PDF for your reference.</em></p>
        `}
        
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

module.exports = { getTransmissionEmailTemplate };
