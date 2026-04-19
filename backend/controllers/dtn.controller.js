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
                return res.status(400).json({ success: false, message: 'jobIds query parameter is required' });
            }

            const jobIdsArray = typeof jobIds === 'string' ? jobIds.split(',') : jobIds;
            const documents = await DtnService.getDocumentsByJobIds(company_id, jobIdsArray);

            res.status(200).json({ success: true, message: 'Documents fetched successfully', data: documents });
        } catch (error) {
            console.error('getDocumentsByJobs error:', error);
            res.status(500).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    /**
     * Create a new transmittal
     */
    async create(req, res) {
        try {
            const { company_id, userid } = req.user;
            const data = req.body;

            const dtn = await DtnService.createTransmittal(company_id, userid, data);

            res.status(201).json({ success: true, message: 'Transmittal generated successfully', data: dtn });
        } catch (error) {
            console.error('createTransmittal error:', error);
            res.status(500).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    /**
     * Update an existing transmittal
     */
    async update(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;
            const data = req.body;

            const dtn = await DtnService.updateTransmittal(company_id, id, data);

            res.status(200).json({ success: true, message: 'Transmittal updated successfully', data: dtn });
        } catch (error) {
            console.error('updateTransmittal error:', error);
            res.status(500).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    /**
     * List all transmittals
     */
    async list(req, res) {
        try {
            const { company_id } = req.user;
            const dtns = await DtnService.listTransmittals(company_id);

            // Format for Frontend table
            const formattedDtns = dtns.map(d => ({
                id: d.id,
                ref_no: d.ref_no,
                customer: d.client_name,
                job_no: d.jobs.map(j => j.job.job_number).join(', '),
                date: d.date,
                status: d.status
            }));

            res.status(200).json({ 
                success: true, 
                data: formattedDtns,
                meta: {
                    total: dtns.length,
                    page: 1,
                    totalPages: 1
                }
            });
        } catch (error) {
            console.error('listTransmittals error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Get Next Reference Number
     */
    async getNextRef(req, res) {
        try {
            const { company_id } = req.user;
            const nextRef = await DtnService.getNextRefNo(company_id);
            res.status(200).json({ success: true, data: nextRef });
        } catch (error) {
            console.error('getNextRef error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Get by ID
     */
    async getById(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;

            const dtn = await DtnService.getTransmittalById(company_id, id);

            if (!dtn) {
                return res.status(404).json({ success: false, message: 'Transmittal not found' });
            }

            res.status(200).json({ success: true, data: dtn });
        } catch (error) {
            console.error('getTransmittalById error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}

module.exports = new DtnController();
