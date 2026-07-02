const getOtpEmailTemplate = (userName, otp) => {
    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5;">
        <p>Dear ${userName},</p>
        
        <p>We received a request to reset your password for the DMS Portal. Please use the following One-Time Password (OTP) to verify your identity:</p>
        
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
            ${otp}
        </p>
        
        <p>This OTP is valid for <strong>10 minutes</strong>. If you did not request this reset, please ignore this email or contact your IT administrator.</p>
        
        <p><em>Security Note: Never share this OTP with anyone. Shreno Engineering employees will never ask for your password or OTP.</em></p>
        
        <p>Best regards,<br>
        DMS Security Team</p>

        <br>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
        <div style="font-size: 12px; color: #666666; text-align: left;">
            <p style="margin: 0;"><strong>DMS Portal &bull; Shreno Engineering Limited</strong></p>
            <p style="margin: 4px 0 0 0;">This is an automated system-generated email. Please do not reply to this message.</p>
        </div>
    </div>
    `;
};

module.exports = { getOtpEmailTemplate };
