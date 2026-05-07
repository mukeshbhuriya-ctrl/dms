const FinalInspectionService = require('../../services/hydro/final_inspection.service');
const { getCompanyInfo } = require('../../utils/companyInfo');

class FinalInspectionController {
    /**
     * Get paginated list of reports
     */
    async getList(req, res) {
        try {
            const { company_id } = req.user;
            const { page = 1, limit = 10, search = '', columnFilters } = req.query;

            const result = await FinalInspectionService.getList(company_id, {
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                columnFilters
            });

            res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error("FinalInspectionController.getList Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch reports", error: error.message });
        }
    }

    /**
     * Get report by ID
     */
    async getById(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;

            if (id === 'next-report-no') return; // Skip if it's the next-report-no route
            if (id === 'list') return; // Skip if it's the list route

            const data = await FinalInspectionService.getById(company_id, id);
            if (!data) {
                return res.status(404).json({ success: false, message: "Report not found" });
            }

            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("FinalInspectionController.getById Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch report", error: error.message });
        }
    }

    /**
     * Get Next Report No
     */
    async getNextReportNo(req, res) {
        try {
            const { company_id } = req.user;
            const { jobId } = req.params;
            const next_report_no = await FinalInspectionService.getNextReportNo(company_id, jobId);
            res.status(200).json({ success: true, data: { next_report_no } });
        } catch (error) {
            console.error("FinalInspectionController.getNextReportNo Error:", error);
            res.status(500).json({ success: false, message: "Failed to generate next report no", error: error.message });
        }
    }

    /**
     * Create Report
     */
    async createReport(req, res) {
        try {
            const { company_id } = req.user;
            const data = req.body;

            const report = await FinalInspectionService.createReport(company_id, data);

            res.status(201).json({
                success: true,
                message: "Final Inspection Report created successfully",
                data: report
            });
        } catch (error) {
            console.error("FinalInspectionController.createReport Error:", error);
            res.status(500).json({ success: false, message: "Failed to create report", error: error.message });
        }
    }

    /**
     * Update Report
     */
    async updateReport(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;
            const data = req.body;

            const report = await FinalInspectionService.updateReport(company_id, id, data);

            res.status(200).json({
                success: true,
                message: "Final Inspection Report updated successfully",
                data: report
            });
        } catch (error) {
            console.error("FinalInspectionController.updateReport Error:", error);
            res.status(500).json({ success: false, message: "Failed to update report", error: error.message });
        }
    }

    /**
     * Update Report Status
     */
    async updateStatus(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;
            const data = req.body;

            const report = await FinalInspectionService.updateStatus(company_id, id, data);

            res.status(200).json({
                success: true,
                message: "Final Inspection Report status updated successfully",
                data: report
            });
        } catch (error) {
            console.error("FinalInspectionController.updateStatus Error:", error);
            res.status(500).json({ success: false, message: "Failed to update report status", error: error.message });
        }
    }

    /**
     * Download Report as PDF
     */
    async downloadPdf(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;

            const data = await FinalInspectionService.getById(company_id, id);
            if (!data) {
                return res.status(404).json({ success: false, message: "Report not found" });
            }

            const FinalInspectionPdfGenerator = require('../../utils/finalInspectionPdfGenerator');
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=FIR_${data.report_no.replace(/\//g, '_')}.pdf`);

            const companyInfo = await getCompanyInfo(company_id);
            FinalInspectionPdfGenerator.generatePDF(data, res, companyInfo);
        } catch (error) {
            console.error("FinalInspectionController.downloadPdf Error:", error);
            res.status(500).json({ success: false, message: "Failed to generate PDF", error: error.message });
        }
    }

    async getFilters(req, res) {
        try {
            const { company_id } = req.user;
            const data = await FinalInspectionService.getListFilters(company_id);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("FinalInspectionController.getFilters Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch filters", error: error.message });
        }
    }

    async toggleStatus(req, res) {
        try {
            const result = await FinalInspectionService.toggleStatus(req.user.company_id, req.params.id);
            res.status(200).json({
                success: true,
                message: 'Status toggled successfully',
                data: result,
            });
        } catch (error) {
            console.error('FinalInspectionController.toggleStatus error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async archive(req, res) {
        try {
            const result = await FinalInspectionService.archive(req.user.company_id, req.params.id);
            res.status(200).json({
                success: true,
                message: 'Report archived successfully',
                data: result,
            });
        } catch (error) {
            console.error('FinalInspectionController.archive error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}

module.exports = new FinalInspectionController();
