const DtnService = require('../services/dtn.service');

class DtnController {
    /**
     * Get unique documents related to specified Job IDs
     */
    async getDocumentsByJobs(req, res) {
        try {
            const { company_id } = req.user;
            const { jobIds } = req.query;

            if (!jobIds) {
                return res.status(400).json({
                    success: false,
                    message: 'jobIds query parameter is required'
                });
            }

            // Parse jobIds from comma separated string if provided as string
            const jobIdsArray = typeof jobIds === 'string' ? jobIds.split(',') : jobIds;

            const documents = await DtnService.getDocumentsByJobIds(company_id, jobIdsArray);

            res.status(200).json({
                success: true,
                message: 'Documents fetched successfully',
                data: documents
            });
        } catch (error) {
            console.error('getDocumentsByJobs error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }
}

module.exports = new DtnController();
