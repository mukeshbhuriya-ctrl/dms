const HydroTestService = require('../../services/hydro/hydro_test.service');
const { getCompanyInfo } = require('../../utils/companyInfo');

class HydroTestController {
    async list(req, res) {
        try {
            const result = await HydroTestService.list(req.user.company_id, req.query);
            res.status(200).json({
                success: true,
                message: 'Hydrostatic test reports fetched successfully',
                data: result.data,
                meta: result.meta,
            });
        } catch (error) {
            console.error('Hydro test list error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async create(req, res) {
        try {
            const result = await HydroTestService.create(req.user.company_id, req.body);
            res.status(201).json({
                success: true,
                message: 'Hydrostatic test report created successfully',
                data: result,
            });
        } catch (error) {
            console.error('Hydro test create error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async update(req, res) {
        try {
            const result = await HydroTestService.update(req.user.company_id, req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Hydrostatic test report updated successfully',
                data: result,
            });
        } catch (error) {
            console.error('Hydro test update error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getById(req, res) {
        try {
            const result = await HydroTestService.getById(req.user.company_id, req.params.id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('Hydro test getById error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getNextReportNo(req, res) {
        try {
            const result = await HydroTestService.getNextReportNo(req.user.company_id, req.params.job_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('Hydro test getNextReportNo error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    /**
     * Download Hydrostatic Test Report as PDF
     */
    async downloadPdf(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;

            const data = await HydroTestService.getById(company_id, id);
            if (!data) {
                return res.status(404).json({ success: false, message: "Hydrostatic Test Report not found" });
            }

            const HydroTestPdfGenerator = require('../../utils/hydroTestPdfGenerator');
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=HYDRO_${data.report_no.replace(/\//g, '_')}.pdf`);

            const companyInfo = await getCompanyInfo(company_id);
            HydroTestPdfGenerator.generatePDF(data, res, companyInfo);
        } catch (error) {
            console.error("HydroTestController.downloadPdf Error:", error);
            res.status(500).json({ success: false, message: "Failed to generate PDF", error: error.message });
        }
    }

    async getActiveFilters(req, res) {
        try {
            const result = await HydroTestService.getActiveFilters(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('Hydro test getActiveFilters error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async toggleStatus(req, res) {
        try {
            const result = await HydroTestService.toggleStatus(req.user.company_id, req.params.id);
            res.status(200).json({
                success: true,
                message: 'Status toggled successfully',
                data: result,
            });
        } catch (error) {
            console.error('Hydro test toggleStatus error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async archive(req, res) {
        try {
            const result = await HydroTestService.archive(req.user.company_id, req.params.id);
            res.status(200).json({
                success: true,
                message: 'Report archived successfully',
                data: result,
            });
        } catch (error) {
            console.error('Hydro test archive error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}

module.exports = new HydroTestController();
