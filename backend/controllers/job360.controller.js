const Job360Service = require('#services/job360.service.js');

class Job360Controller {
    async getSnapshot(req, res) {
        try {
            const { company_id } = req.user;
            const { jobId } = req.params;

            if (!jobId) {
                return res.status(400).json({ success: false, message: 'Job ID is required' });
            }

            const data = await Job360Service.getSnapshot(company_id, jobId);

            res.status(200).json({
                success: true,
                message: 'Job 360 snapshot fetched successfully',
                data,
            });
        } catch (error) {
            console.error('Job360Controller.getSnapshot error:', error);
            res.status(error.message.includes('not found') ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to fetch job 360 snapshot',
            });
        }
    }
}

module.exports = new Job360Controller();
