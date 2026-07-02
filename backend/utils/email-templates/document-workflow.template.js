const getDocumentAssignedTemplate = (user_name, documents) => {
    const docRows = documents.map(doc => `
        <tr>
            <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word; overflow-wrap: break-word; max-width: 300px;">
                <strong>${doc.document_name}</strong> (${doc.document_number})
            </td>
            <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea;">${doc.job_number || 'N/A'}</td>
            <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea;">${doc.upload_due_days ? `${doc.upload_due_days} Days` : 'N/A'}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${doc.planned_submission_date ? new Date(doc.planned_submission_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</td>
        </tr>
    `).join('');

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5; max-width: 800px;">
        <p>Dear ${user_name},</p>
        
        <p>The following documents have been assigned to you for upload. Please review the details below and ensure timely submission.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; table-layout: fixed;">
            <thead>
                <tr>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 45%;">Document</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 20%;">Job No</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 15%;">Due In</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc; width: 20%;">Deadline</th>
                </tr>
            </thead>
            <tbody>
                ${docRows}
            </tbody>
        </table>
        
        <p>You can view your assignments in the DMS Portal here:<br>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a></p>
        
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

const getDocumentReviewTemplate = (user_name, details) => {
    const { documentName, documentNumber, status, remarks, versionNo } = details;
    const isApproved = status === 'Approved' || status === 'Final Approved';

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5; max-width: 800px;">
        <p>Dear ${user_name},</p>
        
        <p>Your submitted document has been reviewed. Below are the details:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; table-layout: fixed;">
            <thead>
                <tr>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: ${remarks ? '45%' : '60%'};">Document</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 15%;">Revision</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 15%;">Status</th>
                    ${remarks ? `<th style="padding: 8px 0; border-bottom: 2px solid #cccccc; width: 25%;">Remarks</th>` : ''}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word; overflow-wrap: break-word;">
                        <strong>${documentName}</strong> (${documentNumber})
                    </td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea;">${versionNo}</td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea;">${status.toUpperCase()}</td>
                    ${remarks ? `<td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word; overflow-wrap: break-word;">${remarks}</td>` : ''}
                </tr>
            </tbody>
        </table>
        
        <p>${isApproved ? 'You can now proceed with further steps.' : 'Please address the remarks and upload a new revision as soon as possible.'}</p>
        
        <p>Access the portal here:<br>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a></p>
        
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

const getDocumentOverdueTemplate = (user_name, type, documents) => {
    const isUpload = type === 'upload';
    const actionNeeded = isUpload ? 'uploading these documents' : 'reviewing these documents';
    const isToAdmin = user_name === 'DCC Team';

    const docRows = documents.map(doc => `
        <tr>
            <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word; overflow-wrap: break-word;">
                <strong>${doc.document_name}</strong> (${doc.document_number})
            </td>
            <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea;">${doc.job_number || 'N/A'}</td>
            ${isToAdmin ? `<td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${doc.assigned_user || 'Unknown'}</td>` : ''}
        </tr>
    `).join('');

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5; max-width: 800px;">
        <p>Dear ${user_name},</p>
        
        <p>The following documents are currently marked as <strong>OVERDUE</strong>. System records show the stipulated time for ${actionNeeded} has passed.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; table-layout: fixed;">
            <thead>
                <tr>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: ${isToAdmin ? '45%' : '65%'};">Document</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: ${isToAdmin ? '25%' : '35%'};">Job No</th>
                    ${isToAdmin ? `<th style="padding: 8px 0; border-bottom: 2px solid #cccccc; width: 30%;">Pending With</th>` : ''}
                </tr>
            </thead>
            <tbody>
                ${docRows}
            </tbody>
        </table>
        
        <p>Please complete the necessary actions immediately to avoid project delays.</p>
        
        <p>Access the portal here:<br>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a></p>
        
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

const getClientReviewTemplate = (user_name, details) => {
    const { documentName, documentNumber, status, remarks, versionNo, transmissionNo } = details;

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5; max-width: 800px;">
        <p>Dear ${user_name},</p>
        
        <p>The client has provided feedback on a document you uploaded. Please review the status below:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; table-layout: fixed;">
            <thead>
                <tr>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 35%;">Document</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 12%;">Revision</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 18%;">Transmission</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 15%;">Client Status</th>
                    ${remarks ? `<th style="padding: 8px 0; border-bottom: 2px solid #cccccc; width: 20%;">Client Remarks</th>` : ''}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word; overflow-wrap: break-word;">
                        <strong>${documentName}</strong> (${documentNumber})
                    </td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea;">${versionNo}</td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word;">${transmissionNo}</td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea;">${status.toUpperCase()}</td>
                    ${remarks ? `<td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word; overflow-wrap: break-word;">${remarks}</td>` : ''}
                </tr>
            </tbody>
        </table>
        
        <p>${['Rejected', 'Commented', 'Re-approval'].includes(status) 
            ? '<strong>Action Required:</strong> Please address the client feedback and prepare the next revision for submission.' 
            : 'No further action is required for this revision.'}</p>
            
        <p>View in Uploader Portal here:<br>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/uploader">${process.env.FRONTEND_URL || 'http://localhost:5173'}/uploader</a></p>
        
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

const getDocumentUploadedTemplate = (admin_name, details) => {
    const { documentName, documentNumber, uploaderName, versionNo, jobNo } = details;

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5; max-width: 800px;">
        <p>Dear ${admin_name},</p>
        
        <p>A new document version has been uploaded and is waiting for your review.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; table-layout: fixed;">
            <thead>
                <tr>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 45%;">Document</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 20%;">Job No</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 20%;">Uploaded By</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc; width: 15%;">Revision</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word; overflow-wrap: break-word;">
                        <strong>${documentName}</strong> (${documentNumber})
                    </td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word;">${jobNo}</td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea;">${uploaderName}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${versionNo}</td>
                </tr>
            </tbody>
        </table>
        
        <p>Review in DCC Portal here:<br>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/approver">${process.env.FRONTEND_URL || 'http://localhost:5173'}/approver</a></p>
        
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

const getInternalTransmittalAlertTemplate = (user_name, details) => {
    const { transmissionNo, customerName, poNo, docCount, createdBy } = details;

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5; max-width: 800px;">
        <p>Dear ${user_name},</p>
        
        <p>A new document transmission package has been successfully generated and is ready for client delivery.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; table-layout: fixed;">
            <thead>
                <tr>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 25%;">Transmission No</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 30%;">Customer</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 20%;">PO Number</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 10%;">Docs</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc; width: 15%;">Created By</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word;"><strong>${transmissionNo}</strong></td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word; overflow-wrap: break-word;">${customerName}</td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word;">${poNo}</td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea;">${docCount}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${createdBy}</td>
                </tr>
            </tbody>
        </table>
        
        <p>View Transmissions here:<br>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/transmissions">${process.env.FRONTEND_URL || 'http://localhost:5173'}/transmissions</a></p>
        
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

const getRevisionRequestedTemplate = (admin_name, details) => {
    const { documentName, shrenoDocNo, clientDocNo, versionNo, clientStatus, requesterName } = details;

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5; max-width: 800px;">
        <p>Dear ${admin_name},</p>
        
        <p>A user has requested a new revision for a finalized document. Please review the request and approve or reject it.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; table-layout: fixed;">
            <thead>
                <tr>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 35%;">Document Name</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 15%;">Shreno No</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 15%;">Client No</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 10%;">Rev</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 15%;">Client Status</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc; width: 10%;">By</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word; overflow-wrap: break-word;"><strong>${documentName}</strong></td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word;">${shrenoDocNo}</td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word;">${clientDocNo}</td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea;">${versionNo}</td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea;">${clientStatus || 'N/A'}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${requesterName}</td>
                </tr>
            </tbody>
        </table>
        
        <p>Review in DCC Portal here:<br>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dcc/document-approver">${process.env.FRONTEND_URL || 'http://localhost:5173'}/dcc/document-approver</a></p>
        
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

const getRevisionApprovedTemplate = (uploader_name, details) => {
    const { documentName, shrenoDocNo, clientDocNo, newVersionNo, plannedSubmissionDate } = details;

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5; max-width: 800px;">
        <p>Dear ${uploader_name},</p>
        
        <p>Your request to create a new revision has been approved by the Admin. A new placeholder has been created for you to upload the document.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; table-layout: fixed;">
            <thead>
                <tr>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 40%;">Document Name</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 20%;">Shreno No</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 20%;">Client No</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 10%;">New Rev</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc; width: 10%;">Deadline</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word; overflow-wrap: break-word;"><strong>${documentName}</strong></td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word;">${shrenoDocNo}</td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word;">${clientDocNo}</td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea;">${newVersionNo}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">${plannedSubmissionDate || 'N/A'}</td>
                </tr>
            </tbody>
        </table>
        
        <p>Upload New Revision here:<br>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/user/upload-documents">${process.env.FRONTEND_URL || 'http://localhost:5173'}/user/upload-documents</a></p>
        
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

const getRevisionRejectedTemplate = (requester_name, details) => {
    const { documentName, shrenoDocNo, clientDocNo, adminRemarks } = details;

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.5; max-width: 800px;">
        <p>Dear ${requester_name},</p>
        
        <p>Your request to create a new revision for the following document has been rejected.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; text-align: left; table-layout: fixed;">
            <thead>
                <tr>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 35%;">Document Name</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 20%;">Shreno No</th>
                    <th style="padding: 8px 10px 8px 0; border-bottom: 2px solid #cccccc; width: 20%;">Client No</th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #cccccc; width: 25%;">Admin Remarks</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word; overflow-wrap: break-word;"><strong>${documentName}</strong></td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word;">${shrenoDocNo}</td>
                    <td style="padding: 8px 10px 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word;">${clientDocNo}</td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eaeaea; word-break: break-word; overflow-wrap: break-word;">"${adminRemarks || 'No remarks provided'}"</td>
                </tr>
            </tbody>
        </table>
        
        <p>The document status has been reverted to its previous state. If you believe this is an error, please contact the DCC team.</p>
        
        <p>Open Dashboard here:<br>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">${process.env.FRONTEND_URL || 'http://localhost:5173'}</a></p>
        
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
    getDocumentAssignedTemplate,
    getDocumentReviewTemplate,
    getDocumentOverdueTemplate,
    getClientReviewTemplate,
    getDocumentUploadedTemplate,
    getInternalTransmittalAlertTemplate,
    getRevisionRequestedTemplate,
    getRevisionApprovedTemplate,
    getRevisionRejectedTemplate
};
