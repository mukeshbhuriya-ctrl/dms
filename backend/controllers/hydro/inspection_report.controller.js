const InspectionReportService = require('../../services/hydro/inspection_report.service');
const DishEndPdfGenerator = require('../../utils/dishEndPdfGenerator');

class InspectionReportController {
    /**
     * Get paginated list of reports
     */
    async getList(req, res) {
        try {
            const { company_id } = req.user;
            const { page = 1, limit = 10, search = '' } = req.query;

            const result = await InspectionReportService.getList(company_id, {
                page: parseInt(page),
                limit: parseInt(limit),
                search
            });

            res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error("DishEndController.getList Error:", error);
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

            const data = await InspectionReportService.getById(company_id, id);
            if (!data) {
                return res.status(404).json({ success: false, message: "Report not found" });
            }

            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("DishEndController.getById Error:", error);
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
            const next_report_no = await InspectionReportService.getNextReportNo(company_id, jobId);
            res.status(200).json({ success: true, data: { next_report_no } });
        } catch (error) {
            console.error("DishEndController.getNextReportNo Error:", error);
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

            const report = await InspectionReportService.createReport(company_id, data);

            res.status(201).json({
                success: true,
                message: "Dish End Inspection Report created successfully",
                data: report
            });
        } catch (error) {
            console.error("DishEndController.createReport Error:", error);
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

            const report = await InspectionReportService.updateReport(company_id, id, data);

            res.status(200).json({
                success: true,
                message: "Dish End Inspection Report updated successfully",
                data: report
            });
        } catch (error) {
            console.error("DishEndController.updateReport Error:", error);
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

            const report = await InspectionReportService.updateStatus(company_id, id, data);

            res.status(200).json({
                success: true,
                message: "Inspection Report status updated successfully",
                data: report
            });
        } catch (error) {
            console.error("DishEndController.updateStatus Error:", error);
            res.status(500).json({ success: false, message: "Failed to update report status", error: error.message });
        }
    }
    /**
     * Download Report PDF
     */
    async downloadPdf(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;

            const data = await InspectionReportService.getById(company_id, id);
            if (!data) {
                return res.status(404).json({ success: false, message: "Report not found" });
            }

            const fileName = `DISH_END_${data.report_no.replace(/\//g, '_')}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            DishEndPdfGenerator.generatePDF(data, res);
        } catch (error) {
            console.error("DishEndController.downloadPdf Error:", error);
            res.status(500).json({ success: false, message: "Failed to generate PDF", error: error.message });
        }
    }
}

module.exports = new InspectionReportController();
