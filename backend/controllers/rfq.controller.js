const RfqService = require('../services/rfq.service');

class RfqController {
    async list(req, res) {
        try {
            const result = await RfqService.list(req.user.company_id, req.query);
            res.status(200).json({
                success: true,
                message: 'RFQ records fetched successfully',
                data: result.data,
                meta: result.meta,
            });
        } catch (error) {
            console.error('RFQ list error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getNextQuotationNo(req, res) {
        try {
            const result = await RfqService.getNextQuotationNo(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('RFQ getNextQuotationNo error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getDashboardStats(req, res) {
        try {
            const data = await RfqService.getDashboardStats(req.user.company_id);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('RFQ getDashboardStats error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async create(req, res) {
        try {
            const result = await RfqService.create(req.user.company_id, req.user.id, req.body);
            res.status(201).json({
                success: true,
                message: 'RFQ record created successfully',
                data: result,
            });
        } catch (error) {
            console.error('RFQ create error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async update(req, res) {
        try {
            const result = await RfqService.update(req.user.company_id, req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'RFQ record updated successfully',
                data: result,
            });
        } catch (error) {
            console.error('RFQ update error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getById(req, res) {
        try {
            const result = await RfqService.getById(req.user.company_id, req.params.id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('RFQ getById error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async deleteById(req, res) {
        try {
            await RfqService.deleteById(req.user.company_id, req.params.id);
            res.status(200).json({
                success: true,
                message: 'RFQ record deleted successfully',
            });
        } catch (error) {
            console.error('RFQ delete error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    // ─── Lookup & User Endpoints ─────────────────────────────────────────────

    async getUsers(req, res) {
        try {
            const data = await RfqService.getUsers(req.user.company_id);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('RFQ getUsers error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getLookups(req, res) {
        try {
            const data = await RfqService.getLookups(req.user.company_id, req.params.type);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('RFQ getLookups error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async createLookup(req, res) {
        try {
            const { type, name } = req.body;
            const data = await RfqService.createLookup(req.user.company_id, type, name);
            res.status(201).json({ success: true, message: 'Lookup created successfully', data });
        } catch (error) {
            console.error('RFQ createLookup error:', error);
            const status = error.message.includes('Unique constraint') ? 409 : 400;
            res.status(status).json({ success: false, message: error.message.includes('Unique constraint') ? 'This value already exists' : error.message || 'Internal server error' });
        }
    }

    async updateLookup(req, res) {
        try {
            const { name } = req.body;
            const data = await RfqService.updateLookup(req.user.company_id, req.params.id, name);
            res.status(200).json({ success: true, message: 'Lookup updated successfully', data });
        } catch (error) {
            console.error('RFQ updateLookup error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async deleteLookup(req, res) {
        try {
            await RfqService.deleteLookup(req.user.company_id, req.params.id);
            res.status(200).json({ success: true, message: 'Lookup deleted successfully' });
        } catch (error) {
            console.error('RFQ deleteLookup error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }
}

module.exports = new RfqController();
