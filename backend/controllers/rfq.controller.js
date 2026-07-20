const path = require('path');
const fs = require('fs');
const RfqService = require('../services/rfq.service');
const StorageUtils = require('../utils/storage.utils');
const Audit = require('#utils/audit.js');
const prisma = require('#prisma');

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

    async getUniqueFilters(req, res) {
        try {
            const result = await RfqService.getUniqueFilters(req.user.company_id);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('RFQ getUniqueFilters error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getNextQuotationNo(req, res) {
        try {
            const { type = 'MKT' } = req.query;
            const result = await RfqService.getNextQuotationNo(req.user.company_id, type);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('RFQ getNextQuotationNo error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getDashboardStats(req, res) {
        try {
            const data = await RfqService.getDashboardStats(req.user.company_id, req.query);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('RFQ getDashboardStats error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async create(req, res) {
        try {
            const result = await RfqService.create(req.user.company_id, req.user.userid, req.body, req.files);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'created',
                module: 'RFQ',
                description: `Created RFQ "${result.quotation_no}"`,
                metadata: { target_rfq_id: result.id },
            });

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
            const result = await RfqService.update(req.user.company_id, req.params.id, req.body, req.files);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'updated',
                module: 'RFQ',
                description: `Updated RFQ "${result.quotation_no}"`,
                metadata: { target_rfq_id: result.id },
            });

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
            const rfq = await RfqService.getById(req.user.company_id, req.params.id);
            await RfqService.deleteById(req.user.company_id, req.params.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'deleted',
                module: 'RFQ',
                description: `Permanently deleted RFQ "${rfq.quotation_no}"`,
                metadata: { target_rfq_id: req.params.id },
            });

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
            const data = await RfqService.getLookups(req.user.company_id, req.params.type, req.query);
            res.status(200).json({ success: true, ...data });
        } catch (error) {
            console.error('RFQ getLookups error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getLookupFilters(req, res) {
        try {
            const data = await RfqService.getLookupFilters(req.user.company_id, req.params.type);
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createLookup(req, res) {
        try {
            const { type, name } = req.body;
            const data = await RfqService.createLookup(req.user.company_id, type, name);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'created',
                module: 'RFQ Lookup',
                description: `Created ${type} lookup "${name}"`,
                metadata: { type, name },
            });

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
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'updated',
                module: 'RFQ Lookup',
                description: `Updated ${data.type} lookup to "${name}"`,
                metadata: { type: data.type, name },
            });

            res.status(200).json({ success: true, message: 'Lookup updated successfully', data });
        } catch (error) {
            console.error('RFQ updateLookup error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async deleteLookup(req, res) {
        try {
            const lookup = await prisma.rfq_lookup.findUnique({ where: { id: req.params.id } });
            await RfqService.deleteLookup(req.user.company_id, req.params.id);
            
            if (lookup) {
                Audit.insert({
                    req,
                    company_id: req.user.company_id,
                    user_id: req.user.id || req.user.userid,
                    action: 'deleted',
                    module: 'RFQ Lookup',
                    description: `Deleted ${lookup.type} lookup "${lookup.name}"`,
                    metadata: { type: lookup.type, name: lookup.name },
                });
            }

            res.status(200).json({ success: true, message: 'Lookup deleted successfully' });
        } catch (error) {
            console.error('RFQ deleteLookup error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    // ─── Estimator & Mediator Endpoints ─────────────────────────────────────
    
    async getEstimators(req, res) {
        try {
            const data = await RfqService.getPersons(req.user.company_id, 'estimator', req.query);
            res.status(200).json({ success: true, ...data });
        } catch (error) {
            console.error('RFQ getEstimators error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getEstimatorFilters(req, res) {
        try {
            const data = await RfqService.getPersonFilters(req.user.company_id, 'estimator');
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createEstimator(req, res) {
        try {
            const data = await RfqService.createPerson(req.user.company_id, 'estimator', req.body);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'created',
                module: 'RFQ Estimator',
                description: `Created Estimator "${data.name}"`,
                metadata: { name: data.name, email: data.email },
            });

            res.status(201).json({ success: true, message: 'Estimator created successfully', data });
        } catch (error) {
            console.error('RFQ createEstimator error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async updateEstimator(req, res) {
        try {
            const data = await RfqService.updatePerson(req.user.company_id, 'estimator', req.params.id, req.body);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'updated',
                module: 'RFQ Estimator',
                description: `Updated Estimator "${data.name}"`,
                metadata: { name: data.name, email: data.email },
            });

            res.status(200).json({ success: true, message: 'Estimator updated successfully', data });
        } catch (error) {
            console.error('RFQ updateEstimator error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async deleteEstimator(req, res) {
        try {
            const person = await prisma.estimator.findUnique({ where: { id: req.params.id } });
            await RfqService.deletePerson(req.user.company_id, 'estimator', req.params.id);
            
            if (person) {
                Audit.insert({
                    req,
                    company_id: req.user.company_id,
                    user_id: req.user.id || req.user.userid,
                    action: 'deleted',
                    module: 'RFQ Estimator',
                    description: `Deleted Estimator "${person.name}"`,
                    metadata: { name: person.name, email: person.email },
                });
            }

            res.status(200).json({ success: true, message: 'Estimator deleted successfully' });
        } catch (error) {
            console.error('RFQ deleteEstimator error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getMediators(req, res) {
        try {
            const data = await RfqService.getPersons(req.user.company_id, 'mediator', req.query);
            res.status(200).json({ success: true, ...data });
        } catch (error) {
            console.error('RFQ getMediators error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getMediatorFilters(req, res) {
        try {
            const data = await RfqService.getPersonFilters(req.user.company_id, 'mediator');
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createMediator(req, res) {
        try {
            const data = await RfqService.createPerson(req.user.company_id, 'mediator', req.body);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'created',
                module: 'RFQ Mediator',
                description: `Created Mediator "${data.name}"`,
                metadata: { name: data.name, email: data.email },
            });

            res.status(201).json({ success: true, message: 'Mediator created successfully', data });
        } catch (error) {
            console.error('RFQ createMediator error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async updateMediator(req, res) {
        try {
            const data = await RfqService.updatePerson(req.user.company_id, 'mediator', req.params.id, req.body);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'updated',
                module: 'RFQ Mediator',
                description: `Updated Mediator "${data.name}"`,
                metadata: { name: data.name, email: data.email },
            });

            res.status(200).json({ success: true, message: 'Mediator updated successfully', data });
        } catch (error) {
            console.error('RFQ updateMediator error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async deleteMediator(req, res) {
        try {
            const person = await prisma.mediator.findUnique({ where: { id: req.params.id } });
            await RfqService.deletePerson(req.user.company_id, 'mediator', req.params.id);
            
            if (person) {
                Audit.insert({
                    req,
                    company_id: req.user.company_id,
                    user_id: req.user.id || req.user.userid,
                    action: 'deleted',
                    module: 'RFQ Mediator',
                    description: `Deleted Mediator "${person.name}"`,
                    metadata: { name: person.name, email: person.email },
                });
            }

            res.status(200).json({ success: true, message: 'Mediator deleted successfully' });
        } catch (error) {
            console.error('RFQ deleteMediator error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async bulkCreate(req, res) {
        try {
            const data = await RfqService.bulkCreate(req.user.company_id, req.user.id, req.body);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'created',
                module: 'RFQ',
                description: `Bulk imported ${data.length} RFQ records`,
                metadata: { count: data.length },
            });

            res.status(201).json({ success: true, message: `${data.length} RFQ records imported successfully`, data });
        } catch (error) {
            console.error('RFQ bulkCreate error:', error);
            res.status(500).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async bulkUpdatePriority(req, res) {
        try {
            const { rfqIds, priority } = req.body;
            const result = await RfqService.bulkUpdatePriority(req.user.company_id, rfqIds, priority);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'updated',
                module: 'RFQ',
                description: `Bulk updated priority to ${priority} for ${result.count} RFQ records`,
                metadata: { count: result.count, priority },
            });

            res.status(200).json({ success: true, message: `Priority set to ${priority} for ${result.count} records`, data: result });
        } catch (error) {
            console.error('RFQ bulkUpdatePriority error:', error);
            res.status(500).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async uploadAttachments(req, res) {
        try {
            const result = await RfqService.addAttachments(req.params.id, req.files);
            res.status(200).json({
                success: true,
                message: 'Attachments uploaded successfully',
                data: result,
            });
        } catch (error) {
            console.error('RFQ uploadAttachments error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getAttachments(req, res) {
        try {
            const result = await RfqService.getAttachmentsByRfqId(req.user.company_id, req.params.id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('RFQ getAttachments error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async deleteAttachment(req, res) {
        try {
            await RfqService.deleteAttachment(req.params.attachmentId);
            res.status(200).json({
                success: true,
                message: 'Attachment deleted successfully',
            });
        } catch (error) {
            console.error('RFQ deleteAttachment error:', error);
            res.status(500).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async downloadAttachment(req, res) {
        try {
            const { filename } = req.params;
            const rfqDir = StorageUtils.getRfqDir();
            const filePath = path.join(rfqDir, path.basename(filename));

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ success: false, message: 'Attachment not found' });
            }

            res.sendFile(path.resolve(filePath));
        } catch (error) {
            console.error('RFQ downloadAttachment error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async toggleStatus(req, res) {
        try {
            const result = await RfqService.toggleStatus(req.user.company_id, req.params.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: result.is_active ? 'activated' : 'deactivated',
                module: 'RFQ',
                description: `${result.is_active ? 'Activated' : 'Deactivated'} RFQ "${result.quotation_no}"`,
                metadata: { target_rfq_id: result.id, is_active: result.is_active },
            });

            res.status(200).json({
                success: true,
                message: 'Status toggled successfully',
                data: result,
            });
        } catch (error) {
            console.error('RfqController.toggleStatus error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async archive(req, res) {
        try {
            const result = await RfqService.archive(req.user.company_id, req.params.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'deleted',
                module: 'RFQ',
                description: `Archived RFQ "${result.quotation_no}"`,
                metadata: { target_rfq_id: result.id },
            });

            res.status(200).json({
                success: true,
                message: 'RFQ record archived successfully',
                data: result,
            });
        } catch (error) {
            console.error('RfqController.archive error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}

module.exports = new RfqController();
