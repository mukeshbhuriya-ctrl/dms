const NcrService = require('../services/ncr.service');

class NcrController {
    async list(req, res) {
        try {
            const result = await NcrService.list(req.user.company_id, req.query);
            res.status(200).json({
                success: true,
                message: 'NCRs fetched successfully',
                data: result.data,
                meta: result.meta,
            });
        } catch (error) {
            console.error('NCR list error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async create(req, res) {
        try {
            const result = await NcrService.create(req.user.company_id, req.user.id, req.body);
            res.status(201).json({
                success: true,
                message: 'NCR created successfully',
                data: result,
            });
        } catch (error) {
            console.error('NCR create error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getById(req, res) {
        try {
            const result = await NcrService.getById(req.user.company_id, req.params.id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('NCR getById error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getNextNcrNo(req, res) {
        try {
            const result = await NcrService.getNextNcrNo(req.user.company_id, req.params.job_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('NCR getNextNcrNo error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async updateStage2(req, res) {
        try {
            const result = await NcrService.updateStage2(req.user.company_id, req.params.id, req.body);
            res.status(200).json({ success: true, message: 'Stage 2 submitted', data: result });
        } catch (error) {
            console.error('NCR updateStage2 error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async updateStage3Init(req, res) {
        try {
            const result = await NcrService.updateStage3Init(req.user.company_id, req.params.id, req.body);
            res.status(200).json({ success: true, message: 'Stage 3 initialized', data: result });
        } catch (error) {
            console.error('NCR updateStage3Init error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async submitReview(req, res) {
        try {
            const result = await NcrService.submitReview(req.user.company_id, req.params.id, req.user.userid, req.body);
            res.status(200).json({ success: true, message: 'Review submitted', data: result });
        } catch (error) {
            console.error('NCR submitReview error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async updateStage4(req, res) {
        try {
            const result = await NcrService.updateStage4(req.user.company_id, req.params.id, req.body);
            res.status(200).json({ success: true, message: 'Stage 4 submitted', data: result });
        } catch (error) {
            console.error('NCR updateStage4 error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async updateStage5(req, res) {
        try {
            const result = await NcrService.updateStage5(req.user.company_id, req.params.id, req.body);
            res.status(200).json({ success: true, message: 'NCR closed successfully', data: result });
        } catch (error) {
            console.error('NCR updateStage5 error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getUsers(req, res) {
        try {
            const result = await NcrService.getUsers(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('NCR getUsers error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}

module.exports = new NcrController();
