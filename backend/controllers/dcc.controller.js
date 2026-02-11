const DccService = require('../services/dcc.service');

class DccController {
    async createCustomer(req, res) {
        try {
            const customer = await DccService.createCustomer(req.user.company_id, req.body);
            res.status(201).json({
                success: true,
                message: 'Customer created successfully',
                data: customer
            });
        } catch (error) {
            console.error('Create customer error:', error);
            const status = error.message.includes('exists') ? 409 : 400;
            res.status(status).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }

    async getCustomers(req, res) {
        try {
            const result = await DccService.getCustomers(req.user.company_id, req.query);
            res.status(200).json({
                success: true,
                message: 'Customers fetched successfully',
                data: result.data,
                meta: result.meta
            });
        } catch (error) {
            console.error('Get customers error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async createCustomerLocation(req, res) {
        try {
            const result = await DccService.createCustomerLocation(req.user.company_id, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getCustomerLocations(req, res) {
        try {
            const result = await DccService.getCustomerLocations(req.user.company_id, req.query);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createPo(req, res) {
        try {
            const result = await DccService.createPo(req.user.company_id, req.body, req.file);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getPos(req, res) {
        try {
            const result = await DccService.getPos(req.user.company_id, req.query);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async createJob(req, res) {
        try {
            const result = await DccService.createJob(req.user.company_id, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getJobs(req, res) {
        try {
            const result = await DccService.getJobs(req.user.company_id, req.query);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createDocumentMaster(req, res) {
        try {
            const result = await DccService.createDocumentMaster(req.user.company_id, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            const status = error.message.includes('exists') ? 409 : 400;
            res.status(status).json({ success: false, message: error.message });
        }
    }

    async getDocuments(req, res) {
        try {
            const result = await DccService.getDocuments(req.user.company_id, req.query);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new DccController();
