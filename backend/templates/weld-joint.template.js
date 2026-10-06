module.exports = {
  generateModificationRequestEmail: ({ joint_no, stage, requesterName, reason }) => {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Weld Joint Stage Modification Request</h2>
        <p>Dear HOD,</p>
        <p>A new modification request has been submitted for approval.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Joint No:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${joint_no}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Stage:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${stage}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Requested By:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${requesterName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${reason}</td>
          </tr>
        </table>
        <br>
        <p>Please login to the DMS portal to approve or reject this request.</p>
      </div>
    `;
  },
  
  generateModificationActionEmail: ({ joint_no, stage, action, reason, reviewerName }) => {
    const actionColor = action === 'approve' ? 'green' : 'red';
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Modification Request <span style="color: ${actionColor}; text-transform: uppercase;">${action}D</span></h2>
        <p>Dear User,</p>
        <p>Your modification request has been <strong>${action}d</strong> by ${reviewerName}.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Joint No:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${joint_no}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Stage:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${stage}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reason Submitted:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${reason}</td>
          </tr>
        </table>
        <br>
        <p>Login to the DMS portal for more details.</p>
      </div>
    `;
  }
};
