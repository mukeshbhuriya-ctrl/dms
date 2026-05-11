const InspectionReportService = require('../../services/hydro/inspection_report.service');
const Audit = require('#utils/audit.js');
const DishEndPdfGenerator = require('../../utils/dishEndPdfGenerator');
const { getCompanyInfo } = require('../../utils/companyInfo');

class InspectionReportController {
    /**
     * Get paginated list of reports
     */
    async getList(req, res) {
        try {
            const { company_id } = req.user;
            const { page = 1, limit = 10, search = '', columnFilters } = req.query;

            const result = await InspectionReportService.getList(company_id, {
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                columnFilters
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
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'created',
                module: 'Dish End Inspection',
                description: `Created Dish End Inspection Report "${report.report_no}"`,
                metadata: { target_report_id: report.id },
            });

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
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'updated',
                module: 'Dish End Inspection',
                description: `Updated Dish End Inspection Report "${report.report_no}"`,
                metadata: { target_report_id: report.id },
            });

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

            const companyInfo = await getCompanyInfo(company_id);
            DishEndPdfGenerator.generatePDF(data, res, companyInfo);
        } catch (error) {
            console.error("DishEndController.downloadPdf Error:", error);
            res.status(500).json({ success: false, message: "Failed to generate PDF", error: error.message });
        }
    }

    async getFilters(req, res) {
        try {
            const { company_id } = req.user;
            const data = await InspectionReportService.getListFilters(company_id);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("DishEndController.getFilters Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch filters", error: error.message });
        }
    }

    async toggleStatus(req, res) {
        try {
            const result = await InspectionReportService.toggleStatus(req.user.company_id, req.params.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: result.is_active ? 'activated' : 'deactivated',
                module: 'Dish End Inspection',
                description: `${result.is_active ? 'Activated' : 'Deactivated'} Dish End Inspection Report "${result.report_no}"`,
                metadata: { target_report_id: result.id, is_active: result.is_active },
            });

            res.status(200).json({
                success: true,
                message: 'Status toggled successfully',
                data: result,
            });
        } catch (error) {
            console.error('DishEndController.toggleStatus error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async archive(req, res) {
        try {
            const result = await InspectionReportService.archive(req.user.company_id, req.params.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'deleted',
                module: 'Dish End Inspection',
                description: `Archived Dish End Inspection Report "${result.report_no}"`,
                metadata: { target_report_id: result.id },
            });

            res.status(200).json({
                success: true,
                message: 'Report archived successfully',
                data: result,
            });
        } catch (error) {
            console.error('DishEndController.archive error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}

module.exports = new InspectionReportController();
