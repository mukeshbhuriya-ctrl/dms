const TubeBundleInspectionService = require('../../services/tube_bundle_inspection/tube_bundle_inspection.service');
const TubeBundlePdfGenerator = require('../../utils/tubeBundlePdfGenerator');
const Audit = require('#utils/audit.js');

class TubeBundleInspectionController {
    async list(req, res) {
        try {
            const { company_id } = req.user;
            const result = await TubeBundleInspectionService.list(company_id, req.query, req.user);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error("TubeBundleInspectionController.list Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch reports", error: error.message });
        }
    }

    async getFilters(req, res) {
        try {
            const { company_id } = req.user;
            const filters = await TubeBundleInspectionService.getFilters(company_id);
            res.status(200).json({ success: true, data: filters });
        } catch (error) {
            console.error("TubeBundleInspectionController.getFilters Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch filters", error: error.message });
        }
    }

    async getById(req, res) {
        try {
            const { company_id } = req.user;
            const report = await TubeBundleInspectionService.getById(req.params.id, company_id);
            res.status(200).json({ success: true, data: report });
        } catch (error) {
            console.error("TubeBundleInspectionController.getById Error:", error);
            res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const company_id = req.user.company_id;
            const user_id = req.user.userid || req.user.id;
            const report = await TubeBundleInspectionService.create(company_id, user_id, req.body);
            
            Audit.insert({
                req,
                company_id,
                user_id,
                action: 'created',
                module: 'Tube Bundle Inspection',
                description: `Created Tube Bundle Inspection "${report.report_no}"`,
                metadata: { target_id: report.id },
            });

            res.status(201).json({ success: true, message: "Report created successfully", data: report });
        } catch (error) {
            console.error("TubeBundleInspectionController.create Error:", error);
            res.status(500).json({ success: false, message: "Failed to create report", error: error.message });
        }
    }

    async update(req, res) {
        try {
            const { company_id } = req.user;
            const user_id = req.user.userid || req.user.id;
            const report = await TubeBundleInspectionService.update(req.params.id, company_id, user_id, req.body);
            
            Audit.insert({
                req,
                company_id,
                user_id,
                action: 'updated',
                module: 'Tube Bundle Inspection',
                description: `Updated Tube Bundle Inspection "${report.report_no}"`,
                metadata: { target_id: report.id },
            });

            res.status(200).json({ success: true, message: "Report updated successfully", data: report });
        } catch (error) {
            console.error("TubeBundleInspectionController.update Error:", error);
            res.status(500).json({ success: false, message: "Failed to update report", error: error.message });
        }
    }

    async toggleStatus(req, res) {
        try {
            const { company_id } = req.user;
            const report = await TubeBundleInspectionService.toggleStatus(req.params.id, company_id);
            
            Audit.insert({
                req,
                company_id,
                user_id: req.user.userid || req.user.id,
                action: report.is_active ? 'activated' : 'deactivated',
                module: 'Tube Bundle Inspection',
                description: `${report.is_active ? 'Activated' : 'Deactivated'} Tube Bundle Inspection "${report.report_no}"`,
                metadata: { target_id: report.id, is_active: report.is_active },
            });

            res.status(200).json({ success: true, message: "Status updated successfully", data: report });
        } catch (error) {
            console.error("TubeBundleInspectionController.toggleStatus Error:", error);
            res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const { company_id } = req.user;
            const report = await TubeBundleInspectionService.getById(req.params.id, company_id);
            await TubeBundleInspectionService.delete(req.params.id, company_id);
            
            if (report) {
                Audit.insert({
                    req,
                    company_id,
                    user_id: req.user.userid || req.user.id,
                    action: 'deleted',
                    module: 'Tube Bundle Inspection',
                    description: `Deleted Tube Bundle Inspection "${report.report_no}"`,
                    metadata: { target_id: req.params.id },
                });
            }

            res.status(200).json({ success: true, message: "Report deleted successfully" });
        } catch (error) {
            console.error("TubeBundleInspectionController.delete Error:", error);
            res.status(500).json({ success: false, message: "Failed to delete report", error: error.message });
        }
    }

    async downloadReport(req, res) {
        try {
            const { company_id } = req.user;
            const reportData = await TubeBundleInspectionService.getById(req.params.id, company_id);
            
            res.setHeader('Content-Type', 'application/pdf');
            const typePrefix = reportData.inspection_type === "Tube Skeleton" ? "TUBE_SKELETON" : "TUBE_BUNDLE";
            res.setHeader('Content-Disposition', `attachment; filename=${typePrefix}_${reportData.report_no.replace(/\//g, '_')}.pdf`);
            
            // Generate and stream PDF
            TubeBundlePdfGenerator.generatePDF(reportData, res, { name: 'Shreno Engineering Limited' });
        } catch (error) {
            console.error("TubeBundleInspectionController.downloadReport Error:", error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: "Failed to generate PDF", error: error.message });
            }
        }
    }
}

module.exports = new TubeBundleInspectionController();
