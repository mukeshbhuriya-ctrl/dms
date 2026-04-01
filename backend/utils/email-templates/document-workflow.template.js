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

module.exports = {
    getDocumentAssignedTemplate,
    getDocumentReviewTemplate,
    getDocumentOverdueTemplate
};
