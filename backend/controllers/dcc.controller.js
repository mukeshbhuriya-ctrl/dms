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

    async updateDocumentMaster(req, res) {
        try {
            const result = await DccService.updateDocumentMaster(req.user.company_id, req.params.id, req.body);
            res.status(200).json({ success: true, message: 'Document master updated successfully', data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
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

    async getMyAssignedDocuments(req, res) {
        try {
            // Middleware attaches userid, not id
            const userId = req.user.userid || req.user.id;
            const result = await DccService.getMyAssignedDocuments(req.user.company_id, userId, req.query);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getAllAssignedDocuments(req, res) {
        try {
            const userRoles = req.user.role || [];
            // Check if user has DCC or ADMIN role
            if (userRoles.includes('DCC') || userRoles.includes('ADMIN')) {
                const result = await DccService.getAllAssignedDocuments(req.user.company_id, req.query);
                return res.status(200).json({ success: true, data: result.data, meta: result.meta });
            } else {
                // For other users, only show documents assigned to them
                // Using req.user.userid as per middleware definition
                const userId = req.user.userid || req.user.id;
                const result = await DccService.getMyAssignedDocuments(req.user.company_id, userId, req.query);
                return res.status(200).json({ success: true, data: result.data, meta: result.meta });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }


    async uploadDocumentVersion(req, res) {
        try {
            // Middleware attaches userid
            const userId = req.user.userid || req.user.id;
            const result = await DccService.uploadDocumentVersion(req.user.company_id, userId, req.body.document_id, req.file, req.body.remarks);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getDocumentsForApproval(req, res) {
        try {
            const result = await DccService.getDocumentsForApproval(req.user.company_id, req.query);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async reviewDocument(req, res) {
        try {
            const userId = req.user.userid || req.user.id;
            const result = await DccService.reviewDocument(req.user.company_id, userId, req.body.document_id, req.body.status, req.body.remarks);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async createTransmission(req, res) {
        try {
            const userId = req.user.userid || req.user.id;
            const result = await DccService.createTransmission(req.user.company_id, userId, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async assignDocument(req, res) {
        try {
            const result = await DccService.assignDocument(req.user.company_id, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            console.error('Assign document error:', error);
            res.status(400).json({ success: false, message: 'Failed to assign document. Please check your inputs.' });
        }
    }

    async bulkAssignDocuments(req, res) {
        try {
            const result = await DccService.bulkAssignDocuments(req.user.company_id, req.body);
            res.status(201).json({ success: true, data: result, message: 'Documents assigned successfully' });
        } catch (error) {
            console.error('Bulk assign document error:', error);
            res.status(400).json({ success: false, message: error.message || 'Failed to assign documents' });
        }
    }

    async getTransmissionDocuments(req, res) {
        try {
            const result = await DccService.getTransmissionDocuments(req.user.company_id, req.query.transmission_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getTransmissions(req, res) {
        try {
            const result = await DccService.getTransmissions(req.user.company_id, req.query);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async sendTransmissionEmail(req, res) {
        try {
            const result = await DccService.sendTransmissionEmail(req.user.company_id, req.body);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async downloadTransmittalPDF(req, res) {
        try {
            const { filename, buffer } = await DccService.getTransmissionTransmittalPDF(req.user.company_id, req.params.id);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    async updateTransmissionClientStatus(req, res) {
        try {
            const { transmission_id, status, remarks } = req.body;
            const result = await DccService.updateTransmissionClientStatus(req.user.company_id, transmission_id, status, remarks);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateAssignedDocument(req, res) {
        try {
            const result = await DccService.updateAssignedDocument(req.user.company_id, req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Assignment updated successfully',
                data: result
            });
        } catch (error) {
            console.error('Update assignment error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new DccController();
