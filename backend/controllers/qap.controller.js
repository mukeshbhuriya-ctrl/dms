const QapService = require('../services/qap.service');
const QapPdfGenerator = require('../utils/qapPdfGenerator');
const { getCompanyInfo } = require('../utils/companyInfo');
const Audit = require('#utils/audit.js');

class QapController {
    async create(req, res) {
        try {
            const result = await QapService.create(req.user.company_id, req.body);
            
            const isArray = Array.isArray(result);
            const mainRecord = isArray ? result[0] : result;
            const extraCount = isArray ? result.length - 1 : 0;

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'created',
                module: 'QAP',
                description: `Created QAP "${mainRecord.report_no}"${extraCount > 0 ? ` and ${extraCount} others` : ''}`,
                metadata: { target_qap_id: mainRecord.id },
            });

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
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'updated',
                module: 'QAP',
                description: `Updated QAP "${result.report_no}"`,
                metadata: { target_qap_id: result.id },
            });

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

    async downloadPdf(req, res) {
        try {
            const data = await QapService.getById(req.user.company_id, req.params.id);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=QAP_${data.report_no.replace(/\//g, '_')}.pdf`);
            const companyInfo = await getCompanyInfo(req.user.company_id);
            QapPdfGenerator.generatePDF(data, res, companyInfo);
        } catch (error) {
            console.error('QAP downloadPdf error:', error);
            res.status(500).json({ success: false, message: 'Failed to generate PDF.' });
        }
    }

    async getFilters(req, res) {
        try {
            const result = await QapService.getFilters(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('QAP getFilters error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch filters.' });
        }
    }

    async toggleStatus(req, res) {
        try {
            const result = await QapService.toggleStatus(req.user.company_id, req.params.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: result.is_active ? 'activated' : 'deactivated',
                module: 'QAP',
                description: `${result.is_active ? 'Activated' : 'Deactivated'} QAP "${result.report_no}"`,
                metadata: { target_qap_id: result.id, is_active: result.is_active },
            });

            res.status(200).json({
                success: true,
                message: 'Status toggled successfully',
                data: result,
            });
        } catch (error) {
            console.error('QapController.toggleStatus error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async archive(req, res) {
        try {
            const result = await QapService.archive(req.user.company_id, req.params.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'deleted',
                module: 'QAP',
                description: `Archived QAP "${result.report_no}"`,
                metadata: { target_qap_id: result.id },
            });

            res.status(200).json({
                success: true,
                message: 'Quality Assurance Plan archived successfully',
                data: result,
            });
        } catch (error) {
            console.error('QapController.archive error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    // Master Headings
    async listMasterHeadings(req, res) {
        try {
            const result = await QapService.listMasterHeadings(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createMasterHeading(req, res) {
        try {
            const result = await QapService.createMasterHeading(req.user.company_id, req.body);
            res.status(201).json({ success: true, message: 'Heading created', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateMasterHeading(req, res) {
        try {
            const result = await QapService.updateMasterHeading(req.user.company_id, req.params.id, req.body);
            res.status(200).json({ success: true, message: 'Heading updated', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async deleteMasterHeading(req, res) {
        try {
            await QapService.deleteMasterHeading(req.user.company_id, req.params.id);
            res.status(200).json({ success: true, message: 'Heading deleted' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new QapController();
