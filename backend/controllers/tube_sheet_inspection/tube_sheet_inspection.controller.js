const TubeSheetInspectionService = require('../../services/tube_sheet_inspection/tube_sheet_inspection.service');
const TubeSheetPdfGenerator = require('../../utils/tubeSheetPdfGenerator');
const Audit = require('#utils/audit.js');

class TubeSheetInspectionController {
    async list(req, res) {
        try {
            const { company_id } = req.user;
            const result = await TubeSheetInspectionService.list(company_id, req.query, req.user);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error("TubeSheetInspectionController.list Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch reports", error: error.message });
        }
    }

    async getFilters(req, res) {
        try {
            const { company_id } = req.user;
            const filters = await TubeSheetInspectionService.getFilters(company_id);
            res.status(200).json({ success: true, data: filters });
        } catch (error) {
            console.error("TubeSheetInspectionController.getFilters Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch filters", error: error.message });
        }
    }

    async getById(req, res) {
        try {
            const { company_id } = req.user;
            const report = await TubeSheetInspectionService.getById(req.params.id, company_id);
            res.status(200).json({ success: true, data: report });
        } catch (error) {
            console.error("TubeSheetInspectionController.getById Error:", error);
            res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const company_id = req.user.company_id;
            const user_id = req.user.userid || req.user.id;
            const report = await TubeSheetInspectionService.create(company_id, user_id, req.body);
            
            Audit.insert({
                req,
                company_id,
                user_id,
                action: 'created',
                module: 'Tube Sheet Inspection',
                description: `Created Tube Sheet Inspection "${report.report_no}"`,
                metadata: { target_id: report.id },
            });

            res.status(201).json({ success: true, message: "Report created successfully", data: report });
        } catch (error) {
            console.error("TubeSheetInspectionController.create Error:", error);
            res.status(500).json({ success: false, message: "Failed to create report", error: error.message });
        }
    }

    async update(req, res) {
        try {
            const { company_id } = req.user;
            const report = await TubeSheetInspectionService.update(req.params.id, company_id, req.body);
            
            Audit.insert({
                req,
                company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'Tube Sheet Inspection',
                description: `Updated Tube Sheet Inspection "${report.report_no}"`,
                metadata: { target_id: report.id },
            });

            res.status(200).json({ success: true, message: "Report updated successfully", data: report });
        } catch (error) {
            console.error("TubeSheetInspectionController.update Error:", error);
            res.status(500).json({ success: false, message: "Failed to update report", error: error.message });
        }
    }

    async toggleStatus(req, res) {
        try {
            const { company_id } = req.user;
            const report = await TubeSheetInspectionService.toggleStatus(req.params.id, company_id);
            
            Audit.insert({
                req,
                company_id,
                user_id: req.user.userid || req.user.id,
                action: report.is_active ? 'activated' : 'deactivated',
                module: 'Tube Sheet Inspection',
                description: `${report.is_active ? 'Activated' : 'Deactivated'} Tube Sheet Inspection "${report.report_no}"`,
                metadata: { target_id: report.id, is_active: report.is_active },
            });

            res.status(200).json({ success: true, message: "Status updated successfully", data: report });
        } catch (error) {
            console.error("TubeSheetInspectionController.toggleStatus Error:", error);
            res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const { company_id } = req.user;
            const report = await TubeSheetInspectionService.getById(req.params.id, company_id);
            await TubeSheetInspectionService.delete(req.params.id, company_id);
            
            if (report) {
                Audit.insert({
                    req,
                    company_id,
                    user_id: req.user.userid || req.user.id,
                    action: 'deleted',
                    module: 'Tube Sheet Inspection',
                    description: `Deleted Tube Sheet Inspection "${report.report_no}"`,
                    metadata: { target_id: req.params.id },
                });
            }

            res.status(200).json({ success: true, message: "Report deleted successfully" });
        } catch (error) {
            console.error("TubeSheetInspectionController.delete Error:", error);
            res.status(500).json({ success: false, message: "Failed to delete report", error: error.message });
        }
    }

    async downloadReport(req, res) {
        try {
            const { company_id } = req.user;
            const reportData = await TubeSheetInspectionService.getById(req.params.id, company_id);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=tube_sheet_inspection_${reportData.report_no.replace(/\//g, '_')}.pdf`);
            
            // Generate and stream PDF
            TubeSheetPdfGenerator.generatePDF(reportData, res, { name: 'Shreno Engineering Limited' });
        } catch (error) {
            console.error("TubeSheetInspectionController.downloadReport Error:", error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: "Failed to generate PDF", error: error.message });
            }
        }
    }
}

module.exports = new TubeSheetInspectionController();
