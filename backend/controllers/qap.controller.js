const QapService = require('../services/qap.service');

class QapController {
    async create(req, res) {
        try {
            const result = await QapService.create(req.user.company_id, req.body);
            res.status(201).json({
                success: true,
                message: 'Quality Assurance Plan created successfully',
                data: result,
            });
        } catch (error) {
            console.error('QAP create error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to create Quality Assurance Plan' });
        }
    }

    async update(req, res) {
        try {
            const result = await QapService.update(req.user.company_id, req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Quality Assurance Plan updated successfully',
                data: result,
            });
        } catch (error) {
            console.error('QAP update error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to update Quality Assurance Plan' });
        }
    }

    async list(req, res) {
        try {
            const result = await QapService.list(req.user.company_id, req.query);
            res.status(200).json({
                success: true,
                message: 'Quality Assurance Plans fetched successfully',
                data: result.data,
                meta: result.meta,
            });
        } catch (error) {
            console.error('QAP list error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch Quality Assurance Plans.' });
        }
    }

    async getById(req, res) {
        try {
            const result = await QapService.getById(req.user.company_id, req.params.id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('QAP getById error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Failed to fetch Quality Assurance Plan.' });
        }
    }

    async getNextReportNo(req, res) {
        try {
            const result = await QapService.getNextReportNo(req.user.company_id, req.params.jobId);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('QAP getNextReportNo error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Failed to fetch next report number.' });
        }
    }
}

module.exports = new QapController();
