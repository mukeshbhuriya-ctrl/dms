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
        
        return await model.findMany({
            where: { company_id, group_document_id },
            include: {
                user: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Get activity trail for a transmission
     */
    async getTransmissionTrail(company_id, transmission_id) {
        const model = prisma.document_activity || prisma.documentActivity;
        if (!model) return [];

        return await model.findMany({
            where: { company_id, transmission_id },
            include: {
                user: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}

module.exports = new ActivityService();
