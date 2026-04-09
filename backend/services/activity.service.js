const prisma = require('#prisma');

/**
 * Service to handle document and transmission activity logging
 */
class ActivityService {
    /**
     * Log an activity
     * @param {Object} params
     * @param {string} params.company_id
     * @param {string} [params.group_document_id]
     * @param {string} [params.transmission_id]
     * @param {string} params.user_id
     * @param {string} params.action - Assigned, Uploaded, Internal Approved, Internal Rejected, Transmitted, Client Approved, Client Rejected
     * @param {string} [params.remarks]
     * @param {Object} [params.metadata]
     * @param {Object} [tx] - Optional prisma transaction client
     */
    async logActivity({ company_id, group_document_id, transmission_id, user_id, action, remarks, metadata }, tx = prisma) {
        try {
            // Safety check for the model accessor
            const activityModel = tx.document_activity || tx.documentActivity;
            
            if (!activityModel) {
                console.warn(`[ActivityService] document_activity model not found on provided client. Available models: ${Object.keys(tx).filter(k => !k.startsWith('$')).join(', ')}`);
                return;
            }

            return await activityModel.create({
                data: {
                    company_id,
                    group_document_id: group_document_id || null,
                    transmission_id: transmission_id || null,
                    user_id,
                    action,
                    remarks: remarks || null,
                    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
                }
            });
        } catch (error) {
            console.error('Error logging activity:', error);
            // We don't throw here to avoid breaking the main workflow if logging fails
        }
    }

    /**
     * Get activity trail for a document
     */
    async getDocumentTrail(company_id, group_document_id) {
        const model = prisma.document_activity || prisma.documentActivity;
        if (!model) return [];
        
        // 1. Fetch activities and versions in parallel for enrichment
        const [activities, versions] = await Promise.all([
            model.findMany({
                where: { company_id, group_document_id },
                include: {
                    user: { select: { name: true, email: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.document_version.findMany({
                where: { group_document_id },
                select: { id: true, version_no: true, file_url: true, mime_type: true, file_path: true }
            })
        ]);

        // Create a lookup map for versions
        const versionMap = {};
        versions.forEach(v => {
            versionMap[v.version_no] = { 
                file_url: v.file_url,
                mime_type: v.mime_type,
                file_path: v.file_path,
                id: v.id
            };
        });

        // Expand file URLs in metadata for frontend use
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        return activities.map(activity => {
            if (activity.metadata) {
                // Backfill details from versions table if missing in metadata
                const vNo = activity.metadata.version_no;
                if ((vNo !== null && vNo !== undefined) && versionMap[vNo]) {
                    const vInfo = versionMap[vNo];
                    if (!activity.metadata.file_url) activity.metadata.file_url = vInfo.file_url;
                    if (!activity.metadata.mime_type) activity.metadata.mime_type = vInfo.mime_type;
                    if (!activity.metadata.file_path) activity.metadata.file_path = vInfo.file_path;
                    
                    if (vInfo.id && vInfo.file_path) {
                        const fileName = vInfo.file_path.split('/').pop() || vInfo.file_path.split('\\').pop();
                        activity.metadata.preview_url = `${backendUrl}/api/dcc/document-preview/${vInfo.id}/${encodeURIComponent(fileName)}`;
                    }
                }

                if (activity.metadata.file_url || activity.metadata.feedback_url) {
                    let url = activity.metadata.file_url || activity.metadata.feedback_url;
                    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('http')) {
                        const fullUrl = `${backendUrl}${url}`;
                        if (activity.metadata.file_url) activity.metadata.file_url = fullUrl;
                        if (activity.metadata.feedback_url) activity.metadata.feedback_url = fullUrl;
                    }
                }
            }
            return activity;
        });
    }

    /**
     * Get activity trail for a transmission
     */
    async getTransmissionTrail(company_id, transmission_id) {
        const model = prisma.document_activity || prisma.documentActivity;
        if (!model) return [];

        const activities = await model.findMany({
            where: { company_id, transmission_id },
            include: {
                user: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Expand feedback URLs
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        return activities.map(activity => {
            if (activity.metadata && activity.metadata.feedback_url) {
                let url = activity.metadata.feedback_url;
                if (url.startsWith('/') && !url.startsWith('http')) {
                    activity.metadata.feedback_url = `${backendUrl}${url}`;
                }
            }
            return activity;
        });
    }
}

module.exports = new ActivityService();
