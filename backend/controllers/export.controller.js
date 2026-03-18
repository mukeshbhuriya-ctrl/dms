const ExportService = require('../services/export.service');

class ExportController {
    /**
     * Get record count summary for all report modules.
     */
    async getReportSummary(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const summary = await ExportService.getReportSummary(company_id, startDate, endDate);
            res.status(200).json({ success: true, data: summary });
        } catch (error) {
            console.error("ExportController.getReportSummary Error:", error);
            res.status(500).json({ success: false, message: "Failed to get report summary", error: error.message });
        }
    }

    /**
     * Export Locations to Excel.
     */
    async exportLocations(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const buffer = await ExportService.exportLocations(company_id, startDate, endDate);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=locations_export.xlsx');
            res.status(200).send(buffer);
        } catch (error) {
            console.error("ExportController.exportLocations Error:", error);
            res.status(500).json({ success: false, message: "Failed to export locations", error: error.message });
        }
    }

    /**
     * Export Customers to Excel.
     */
    async exportCustomers(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const buffer = await ExportService.exportCustomers(company_id, startDate, endDate);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=customers_export.xlsx');
            res.status(200).send(buffer);
        } catch (error) {
            console.error("ExportController.exportCustomers Error:", error);
            res.status(500).json({ success: false, message: "Failed to export customers", error: error.message });
        }
    }

    /**
     * Export Jobs to Excel.
     */
    async exportJobs(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const buffer = await ExportService.exportJobs(company_id, startDate, endDate);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=jobs_export.xlsx');
            res.status(200).send(buffer);
        } catch (error) {
            console.error("ExportController.exportJobs Error:", error);
            res.status(500).json({ success: false, message: "Failed to export jobs", error: error.message });
        }
    }

    /**
     * Export Departments to Excel.
     */
    async exportDepartments(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const buffer = await ExportService.exportDepartments(company_id, startDate, endDate);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=departments_export.xlsx');
            res.status(200).send(buffer);
        } catch (error) {
            console.error("ExportController.exportDepartments Error:", error);
            res.status(500).json({ success: false, message: "Failed to export departments", error: error.message });
        }
    }

    /**
     * Export Users to Excel.
     */
    async exportUsers(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const buffer = await ExportService.exportUsers(company_id, startDate, endDate);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=users_export.xlsx');
            res.status(200).send(buffer);
        } catch (error) {
            console.error("ExportController.exportUsers Error:", error);
            res.status(500).json({ success: false, message: "Failed to export users", error: error.message });
        }
    }

    /**
     * Export MHC reports to Excel.
     */
    async exportMHC(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const buffer = await ExportService.exportMHC(company_id, startDate, endDate);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=mhc_export.xlsx');
            res.status(200).send(buffer);
        } catch (error) {
            console.error("ExportController.exportMHC Error:", error);
            res.status(500).json({ success: false, message: "Failed to export MHC reports", error: error.message });
        }
    }

    /**
     * Export QAP reports to Excel.
     */
    async exportQAP(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const buffer = await ExportService.exportQAP(company_id, startDate, endDate);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=qap_export.xlsx');
            res.status(200).send(buffer);
        } catch (error) {
            console.error("ExportController.exportQAP Error:", error);
            res.status(500).json({ success: false, message: "Failed to export QAP reports", error: error.message });
        }
    }

    /**
     * Export Hydro Test reports to Excel.
     */
    async exportHydro(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const buffer = await ExportService.exportHydro(company_id, startDate, endDate);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=hydro_test_export.xlsx');
            res.status(200).send(buffer);
        } catch (error) {
            console.error("ExportController.exportHydro Error:", error);
            res.status(500).json({ success: false, message: "Failed to export hydro test reports", error: error.message });
        }
    }

    /**
     * Export Dish End Inspection reports to Excel.
     */
    async exportDishEnd(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const buffer = await ExportService.exportDishEnd(company_id, startDate, endDate);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=dish_end_inspection_export.xlsx');
            res.status(200).send(buffer);
        } catch (error) {
            console.error("ExportController.exportDishEnd Error:", error);
            res.status(500).json({ success: false, message: "Failed to export dish end inspection reports", error: error.message });
        }
    }

    /**
     * Export Final Inspection reports to Excel.
     */
    async exportFinalInspection(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const buffer = await ExportService.exportFinalInspection(company_id, startDate, endDate);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=final_inspection_export.xlsx');
            res.status(200).send(buffer);
        } catch (error) {
            console.error("ExportController.exportFinalInspection Error:", error);
            res.status(500).json({ success: false, message: "Failed to export final inspection reports", error: error.message });
        }
    }

    /**
     * Generic module export.
     */
    async exportModule(req, res) {
        try {
            const { moduleName } = req.params;
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const buffer = await ExportService.exportModule(moduleName, company_id, startDate, endDate);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${moduleName}_export.xlsx`);
            res.status(200).send(buffer);
        } catch (error) {
            console.error(`ExportController.exportModule (${req.params.moduleName}) Error:`, error);
            res.status(500).json({ success: false, message: `Failed to export ${req.params.moduleName}`, error: error.message });
        }
    }
}

module.exports = new ExportController();
