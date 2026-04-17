const MhcService = require('../services/mhc.service');

class MhcController {
    async list(req, res) {
        try {
            const result = await MhcService.list(req.user.company_id, req.query);
            res.status(200).json({
                success: true,
                message: 'Material heat charts fetched successfully',
                data: result.data,
                meta: result.meta,
            });
        } catch (error) {
            console.error('MHC list error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async create(req, res) {
        try {
            const result = await MhcService.create(req.user.company_id, req.body, req.user.id);
            res.status(201).json({
                success: true,
                message: 'Material heat chart created successfully',
                data: result,
            });
        } catch (error) {
            console.error('MHC create error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async bulkCreate(req, res) {
        try {
            const result = await MhcService.bulkCreate(req.user.company_id, req.body, req.user.id);
            res.status(201).json({
                success: true,
                message: `${result.length} Material heat charts created successfully`,
                data: result,
            });
        } catch (error) {
            console.error('MHC bulkCreate error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async update(req, res) {
        try {
            const result = await MhcService.update(req.user.company_id, req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Material heat chart updated successfully',
                data: result,
            });
        } catch (error) {
            console.error('MHC update error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async updateStatus(req, res) {
        try {
            const result = await MhcService.updateStatus(req.user.company_id, req.params.id, {
                ...req.body,
                user_id: req.user.id
            });
            res.status(200).json({
                success: true,
                message: `Material heat chart ${req.body.status} successfully`,
                data: result,
            });
        } catch (error) {
            console.error('MHC updateStatus error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getById(req, res) {
        try {
            const result = await MhcService.getById(req.user.company_id, req.params.id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('MHC getById error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getNextReportNo(req, res) {
        try {
            const result = await MhcService.getNextReportNo(req.user.company_id, req.params.job_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('MHC getNextReportNo error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getApprovedItemsByJob(req, res) {
        try {
            const result = await MhcService.getApprovedItemsByJob(req.user.company_id, req.params.job_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('MHC getApprovedItemsByJob error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getApprovedItemsByMsn(req, res) {
        try {
            const result = await MhcService.getApprovedItemsByMsn(req.user.company_id, req.params.msn);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('MHC getApprovedItemsByMsn error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }
}

module.exports = new MhcController();
