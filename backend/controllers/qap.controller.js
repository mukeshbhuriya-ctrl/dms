const QapService = require('../services/qap.service');
const QapPdfGenerator = require('../utils/qapPdfGenerator');
const { getCompanyInfo } = require('../utils/companyInfo');

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
}

module.exports = new QapController();
