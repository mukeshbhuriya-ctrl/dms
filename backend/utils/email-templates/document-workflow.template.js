/**
 * HTML Template for Document Workflow Notifications
 */

const getDocumentAssignedTemplate = (user_name, documents) => {
    const docRows = documents.map(doc => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <strong>${doc.document_name}</strong><br>
                <span style="font-size: 12px; color: #666;">${doc.document_number}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${doc.job_number || 'N/A'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${doc.upload_due_days ? `${doc.upload_due_days} Days` : 'N/A'}</td>
        </tr>
    `).join('');

    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden; color: #333;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">New Documents Assigned</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">DMS Document Management System</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin-top: 0;">Hello <strong>${user_name}</strong>,</p>
            <p style="line-height: 1.6;">The following documents have been assigned to you for upload. Please review the details below and ensure timely submission.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <thead>
                    <tr style="background-color: #f8fafc; text-align: left;">
                        <th style="padding: 12px; border-bottom: 2px solid #e2e8f0;">Document</th>
                        <th style="padding: 12px; border-bottom: 2px solid #e2e8f0;">Job No</th>
                        <th style="padding: 12px; border-bottom: 2px solid #e2e8f0;">Due In</th>
                    </tr>
                </thead>
                <tbody>
                    ${docRows}
                </tbody>
            </table>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    View My Assignments
                </a>
            </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} DMS System. All rights reserved.</p>
            <p style="margin: 5px 0 0;">This is an automated notification, please do not reply to this email.</p>
        </div>
    </div>
    `;
};

const getDocumentReviewTemplate = (user_name, details) => {
    const { documentName, documentNumber, status, remarks, versionNo, reviewerName } = details;
    const isApproved = status === 'Approved' || status === 'Approved';
    const statusColor = isApproved ? '#10b981' : '#ef4444';
    const statusBg = isApproved ? '#ecfdf5' : '#fef2f2';

    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden; color: #333;">
        <div style="background: ${isApproved ? 'linear-gradient(135deg, #065f46 0%, #10b981 100%)' : 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)'}; padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">Document ${status}</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Review Update for Rev ${versionNo}</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin-top: 0;">Hello <strong>${user_name}</strong>,</p>
            <p style="line-height: 1.6;">Your submitted document has been reviewed. Below are the details:</p>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Document:</strong> ${documentName} (${documentNumber})</p>
                <p style="margin: 0 0 10px 0;"><strong>Version:</strong> Rev ${versionNo}</p>
                <p style="margin: 0 0 10px 0;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold; background: ${statusBg}; padding: 2px 8px; border-radius: 4px;">${status.toUpperCase()}</span></p>
                ${remarks ? `<p style="margin: 10px 0 0 0; color: #64748b; font-style: italic;"><strong>Remarks:</strong> "${remarks}"</p>` : ''}
            </div>

            <p style="font-size: 14px; color: #64748b;">${isApproved ? 'You can now proceed with further steps.' : 'Please address the remarks and upload a new revision as soon as possible.'}</p>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
                   style="background-color: #475569; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Open Dashboard
                </a>
            </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} DMS System. All rights reserved.</p>
        </div>
    </div>
    `;
};

const getDocumentOverdueTemplate = (user_name, type, documents) => {
    const isUpload = type === 'upload';
    const title = isUpload ? 'Upload Deadline Exceeded' : 'Response Deadline Exceeded';
    const actionNeeded = isUpload ? 'uploading these documents' : 'reviewing these documents';
    
    const docRows = documents.map(doc => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                <strong>${doc.document_name}</strong><br>
                <span style="font-size: 12px; color: #666;">${doc.document_number}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${doc.job_number || 'N/A'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #ef4444; font-weight: bold;">OVERDUE</td>
        </tr>
    `).join('');

    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden; color: #333;">
        <div style="background: linear-gradient(135deg, #7c2d12 0%, #ea580c 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">Urgent: Deadline Exceeded</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">${title}</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin-top: 0;">Hello <strong>${user_name}</strong>,</p>
            <p style="line-height: 1.6;">The following documents are currently marked as <strong>OVERDUE</strong>. System records show the stipulated time for ${actionNeeded} has passed.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <thead>
                    <tr style="background-color: #fff7ed; text-align: left;">
                        <th style="padding: 12px; border-bottom: 2px solid #fed7aa;">Document</th>
                        <th style="padding: 12px; border-bottom: 2px solid #fed7aa;">Job No</th>
                        <th style="padding: 12px; border-bottom: 2px solid #fed7aa;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${docRows}
                </tbody>
            </table>

            <p style="font-size: 14px; color: #64748b;">Please complete the necessary actions immediately to avoid project delays.</p>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
                   style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Access DMS Portal
                </a>
            </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} DMS System. All rights reserved.</p>
        </div>
    </div>
    `;
};

const getClientReviewTemplate = (user_name, details) => {
    const { documentName, documentNumber, status, remarks, versionNo, transmissionNo } = details;
    
    // Status color mapping
    const statusMap = {
        'Approved': { color: '#10b981', bg: '#ecfdf5', label: 'APPROVED' },
        'Final Approved': { color: '#10b981', bg: '#ecfdf5', label: 'FINAL APPROVED' },
        'Rejected': { color: '#ef4444', bg: '#fef2f2', label: 'REJECTED' },
        'Commented': { color: '#f59e0b', bg: '#fffbeb', label: 'COMMENTED' },
        'Re-approval': { color: '#3b82f6', bg: '#eff6ff', label: 'RE-APPROVAL' },
        'As Built': { color: '#6366f1', bg: '#eef2ff', label: 'AS BUILT' }
    };

    const config = statusMap[status] || { color: '#64748b', bg: '#f8fafc', label: status.toUpperCase() };

    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden; color: #333;">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">Client Review Update</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Feedback received for ${transmissionNo}</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin-top: 0;">Hello <strong>${user_name}</strong>,</p>
            <p style="line-height: 1.6;">The client has provided feedback on a document you uploaded. Please review the status below:</p>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${config.color};">
                <p style="margin: 0 0 10px 0;"><strong>Document:</strong> ${documentName} (${documentNumber})</p>
                <p style="margin: 0 0 10px 0;"><strong>Revision:</strong> Rev ${versionNo}</p>
                <p style="margin: 0 0 10px 0;"><strong>Transmission:</strong> ${transmissionNo}</p>
                <p style="margin: 0 0 10px 0;"><strong>Client Status:</strong> <span style="color: ${config.color}; font-weight: bold; background: ${config.bg}; padding: 2px 8px; border-radius: 4px;">${config.label}</span></p>
                ${remarks ? `<p style="margin: 10px 0 0 0; color: #475569; font-style: italic; background: #fff; padding: 10px; border-radius: 4px; border: 1px dashed #cbd5e1;"><strong>Client Remarks:</strong> "${remarks}"</p>` : ''}
            </div>

            <p style="font-size: 14px; color: #64748b;">
                ${['Rejected', 'Commented', 'Re-approval'].includes(status) 
                    ? '<strong>Action Required:</strong> Please address the client feedback and prepare the next revision for submission.' 
                    : 'No further action is required for this revision.'}
            </p>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/uploader" 
                   style="background-color: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    View in Uploader Portal
                </a>
            </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} DMS System. All rights reserved.</p>
        </div>
    </div>
    `;
};

const getDocumentUploadedTemplate = (admin_name, details) => {
    const { documentName, documentNumber, uploaderName, versionNo, jobNo } = details;

    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden; color: #333;">
        <div style="background: linear-gradient(135deg, #475569 0%, #64748b 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">New Document Uploaded</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Action Required: Review Pending</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin-top: 0;">Hello <strong>${admin_name}</strong>,</p>
            <p style="line-height: 1.6;">A new document version has been uploaded and is waiting for your review.</p>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #475569;">
                <p style="margin: 0 0 10px 0;"><strong>Document:</strong> ${documentName} (${documentNumber})</p>
                <p style="margin: 0 0 10px 0;"><strong>Job No:</strong> ${jobNo}</p>
                <p style="margin: 0 0 10px 0;"><strong>Uploaded By:</strong> ${uploaderName}</p>
                <p style="margin: 0 0 0 0;"><strong>Revision:</strong> Rev ${versionNo}</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/approver" 
                   style="background-color: #475569; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Review in DCC Portal
                </a>
            </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} DMS System. All rights reserved.</p>
        </div>
    </div>
    `;
};

const getInternalTransmittalAlertTemplate = (user_name, details) => {
    const { transmissionNo, customerName, poNo, docCount, createdBy } = details;

    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 8px; overflow: hidden; color: #333;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">Transmittal Package Ready</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Internal Notification: ${transmissionNo}</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin-top: 0;">Hello <strong>${user_name}</strong>,</p>
            <p style="line-height: 1.6;">A new document transmission package has been successfully generated and is ready for client delivery.</p>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #0f172a;">
                <p style="margin: 0 0 10px 0;"><strong>Transmission No:</strong> ${transmissionNo}</p>
                <p style="margin: 0 0 10px 0;"><strong>Customer:</strong> ${customerName}</p>
                <p style="margin: 0 0 10px 0;"><strong>PO Number:</strong> ${poNo}</p>
                <p style="margin: 0 0 10px 0;"><strong>Document Count:</strong> ${docCount}</p>
                <p style="margin: 0 0 0 0;"><strong>Created By:</strong> ${createdBy}</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/transmissions" 
                   style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    View Transmissions
                </a>
            </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} DMS System. All rights reserved.</p>
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
    getInternalTransmittalAlertTemplate
};
