const MhcService = require('../services/mhc.service');
const NotificationService = require('#services/notification.service.js');
const Audit = require('#utils/audit.js');
const MhcPdfGenerator = require('../utils/mhcPdfGenerator');
const { getCompanyInfo } = require('../utils/companyInfo');
const prisma = require('#prisma');

class MhcController {
    async list(req, res) {
        try {
            const query = { ...req.query };
            if (typeof query.columnFilters === "string") {
                try { query.columnFilters = JSON.parse(query.columnFilters); } catch (e) { query.columnFilters = {}; }
            }
            const result = await MhcService.list(req.user.company_id, query);
            res.status(200).json({
                success: true,
                message: 'Material heat charts fetched successfully',
                data: result.data,
                meta: result.meta,
            });
        } catch (error) {
            console.error('MHC list error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getFilters(req, res) {
        try {
            const result = await MhcService.getFilters(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('MHC getFilters error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async initiate(req, res) {
        try {
            const result = await MhcService.initiate(req.user.company_id, req.body, req.user.userid || req.user.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: result.status === 'Draft' ? 'draft_created' : 'created',
                module: 'Material Heat Chart',
                description: `${result.status === 'Draft' ? 'Saved Draft' : 'Initiated'} Material Heat Chart "${result.report_no}"`,
                metadata: { target_mhc_id: result.id },
            });

            // Notify Production Group (Only if not draft)
            if (result.status !== 'Draft' && result.production_group_id) {
                await NotificationService.broadcastToEmployeeGroup({
                    company_id: req.user.company_id,
                    group_id: result.production_group_id,
                    title: 'New MHC Assigned',
                    message: `MHC ${result.report_no} has been initiated and requires production data.`,
                    action_path: `/material-heat-chart`,
                    action_params: { id: result.id }
                });
            }

            res.status(201).json({
                success: true,
                message: 'Material heat chart initiated successfully',
                data: result,
            });
        } catch (error) {
            console.error('MHC initiate error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async offer(req, res) {
        try {
            const result = await MhcService.offer(req.user.company_id, req.params.id, req.body, req.user.userid || req.user.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'Material Heat Chart',
                description: `Offered Material Heat Chart "${result.report_no}" with production data`,
                metadata: { target_mhc_id: result.id },
            });

            // Notify QC Group
            if (result.qc_group_id) {
                await NotificationService.broadcastToEmployeeGroup({
                    company_id: req.user.company_id,
                    group_id: result.qc_group_id,
                    title: 'MHC Offered',
                    message: `Production data for MHC ${result.report_no} has been submitted for QC review.`,
                    action_path: `/material-heat-chart`,
                    action_params: { id: result.id }
                });
            }

            res.status(200).json({
                success: true,
                message: 'Material heat chart offered successfully',
                data: result,
            });
        } catch (error) {
            console.error('MHC offer error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async finalize(req, res) {
        try {
            const result = await MhcService.finalize(req.user.company_id, req.params.id, req.body, req.user.userid || req.user.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'Material Heat Chart',
                description: `Finalized and Approved Material Heat Chart "${result.report_no}"`,
                metadata: { target_mhc_id: result.id },
            });

            // Notify Production Group about Approval
            if (result.production_group_id) {
                await NotificationService.broadcastToEmployeeGroup({
                    company_id: req.user.company_id,
                    group_id: result.production_group_id,
                    title: 'MHC Approved',
                    severity: 'success',
                    message: `MHC ${result.report_no} has been finalized and approved by QC.`,
                    action_path: `/material-heat-chart`,
                    action_params: { id: result.id }
                });
            }

            res.status(200).json({
                success: true,
                message: 'Material heat chart finalized successfully',
                data: result,
            });
        } catch (error) {
            console.error('MHC finalize error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async saveReview(req, res) {
        try {
            const result = await MhcService.saveReview(req.user.company_id, req.params.id, req.body, req.user.userid || req.user.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'Material Heat Chart',
                description: `Saved QC Review for Material Heat Chart "${result.report_no}"${result.status === 'Rejected' ? ' (Sent back for correction)' : ''}`,
                metadata: { target_mhc_id: result.id, status: result.status },
            });

            // Notify Production Group if sent back for correction
            if (result.status === 'Rejected' && result.production_group_id) {
                await NotificationService.broadcastToEmployeeGroup({
                    company_id: req.user.company_id,
                    group_id: result.production_group_id,
                    title: 'MHC Correction Required',
                    severity: 'warning',
                    message: `MHC ${result.report_no} requires corrections. Please review QC remarks.`,
                    action_path: `/material-heat-chart`,
                    action_params: { id: result.id }
                });
            }

            res.status(200).json({
                success: true,
                message: result.status === 'Rejected' ? 'Review saved and sent back for corrections' : 'Review decisions saved successfully',
                data: result,
            });
        } catch (error) {
            console.error('MHC saveReview error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async rejectItem(req, res) {
        try {
            const { mhc_id, item_id, remarks } = req.body;
            const result = await MhcService.rejectItem(req.user.company_id, mhc_id, item_id, remarks, req.user.userid || req.user.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'Material Heat Chart',
                description: `Rejected item in MHC. New version created for correction.`,
                metadata: { target_mhc_id: mhc_id, item_id },
            });

            res.status(200).json({
                success: true,
                message: 'Item rejected and new version created for correction',
                data: result,
            });
        } catch (error) {
            console.error('MHC rejectItem error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async requestRevision(req, res) {
        try {
            const { mhc_id, item_id, remarks } = req.body;
            const result = await MhcService.requestRevision(req.user.company_id, mhc_id, item_id, remarks, req.user.userid || req.user.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'Material Heat Chart',
                description: `Revision requested for approved item in MHC.`,
                metadata: { target_mhc_id: mhc_id, item_id },
            });

            res.status(200).json({
                success: true,
                message: 'Revision requested and new version created for editing',
                data: result,
            });
        } catch (error) {
            console.error('MHC requestRevision error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async bulkCreate(req, res) {
        try {
            const result = await MhcService.bulkCreate(req.user.company_id, req.body, req.user.userid || req.user.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'created',
                module: 'Material Heat Chart',
                description: `Bulk created ${result.length} Material Heat Charts`,
                metadata: { mhc_count: result.length },
            });

            res.status(201).json({
                success: true,
                message: `${result.length} Material heat charts created successfully`,
                data: result,
            });
        } catch (error) {
            console.error('MHC bulkCreate error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async update(req, res) {
        try {
            const result = await MhcService.update(req.user.company_id, req.params.id, req.body);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'Material Heat Chart',
                description: `Updated Material Heat Chart "${result.report_no}" ${result.status === 'Initiated' ? '(Now Initiated)' : (result.status === 'Draft' ? '(Saved as Draft)' : '')}`,
                metadata: { target_mhc_id: result.id, status: result.status },
            });

            // If it was a draft and now it's initiated, notify
            if (result.status === 'Initiated' && result.production_group_id) {
                 await NotificationService.broadcastToEmployeeGroup({
                    company_id: req.user.company_id,
                    group_id: result.production_group_id,
                    title: 'New MHC Assigned',
                    message: `MHC ${result.report_no} has been initiated and requires production data.`,
                    action_path: `/material-heat-chart`,
                    action_params: { id: result.id }
                });
            }

            res.status(200).json({
                success: true,
                message: 'Material heat chart updated successfully',
                data: result,
            });
        } catch (error) {
            console.error('MHC update error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getById(req, res) {
        try {
            const { includeHistory } = req.query;
            const result = await MhcService.getById(req.user.company_id, req.params.id, includeHistory === 'true');
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('MHC getById error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getNextReportNo(req, res) {
        try {
            const result = await MhcService.getNextReportNo(req.user.company_id, req.params.job_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('MHC getNextReportNo error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getApprovedItemsByJob(req, res) {
        try {
            const result = await MhcService.getApprovedItemsByJob(req.user.company_id, req.params.job_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('MHC getApprovedItemsByJob error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getApprovedItemsByMsn(req, res) {
        try {
            const result = await MhcService.getApprovedItemsByMsn(req.user.company_id, req.params.msn);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('MHC getApprovedItemsByMsn error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async toggleStatus(req, res) {
        try {
            const result = await MhcService.toggleStatus(req.user.company_id, req.params.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: result.is_active ? 'activated' : 'deactivated',
                module: 'Material Heat Chart',
                description: `${result.is_active ? 'Activated' : 'Deactivated'} Material Heat Chart "${result.report_no}"`,
                metadata: { target_mhc_id: result.id, is_active: result.is_active },
            });

            res.status(200).json({ 
                success: true, 
                message: `Material Heat Chart ${result.is_active ? 'activated' : 'deactivated'} successfully`,
                data: result 
            });
        } catch (error) {
            console.error('MHC toggleStatus error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async archive(req, res) {
        try {
            const result = await MhcService.archive(req.user.company_id, req.params.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'deleted',
                module: 'Material Heat Chart',
                description: `Archived Material Heat Chart "${result.report_no}"`,
                metadata: { target_mhc_id: result.id },
            });

            res.status(200).json({ success: true, message: 'Material Heat Chart archived successfully' });
        } catch (error) {
            console.error('MHC archive error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async downloadReport(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;
            const { itemIds } = req.query; // Comma-separated list of item IDs

            // 1. Fetch MHC with current items
            const mhc = await MhcService.getById(company_id, id);

            if (!mhc) {
                return res.status(404).json({ success: false, message: 'Material Heat Chart not found' });
            }

            // 2. Format PO Date for the header
            let poDate = '-';
            if (mhc.job?.po?.po_date) {
                const dateObj = new Date(mhc.job.po.po_date);
                if (!isNaN(dateObj.getTime())) {
                    poDate = dateObj.toLocaleDateString('en-GB').replace(/\//g, '.');
                }
            }

            // 3. Filter items if requested
            let finalItems = mhc.items || [];
            if (itemIds) {
                const selectedIds = itemIds.split(',');
                // Keep selected items OR any heading rows
                finalItems = finalItems.filter(it => it.is_heading || selectedIds.includes(it.id));
            }

            // 4. Format header data
            const pdfData = {
                client: mhc.client || mhc.job?.customer?.customer_name || '-',
                msn: mhc.job?.job_number || '-',
                equipment_name: mhc.equipment_name || mhc.job?.equipement_name || '-',
                tag_no: mhc.tag_no || mhc.job?.tag_number || '-',
                shreno_drg_no: mhc.shreno_drg_no || '-',
                po_no: `${mhc.po_no || mhc.job?.po?.po_number || '-'} DT.- ${poDate}`,
                code: mhc.code || '-',
                inspection_by: mhc.inspection_by || '-',
                items: finalItems
            };

            // 4. Set Headers for Preview/Download
            res.setHeader('Content-Type', 'application/pdf');
            const filename = `MHC_${mhc.report_no.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

            // 5. Fetch company branding
            const companyInfo = await getCompanyInfo(company_id);

            // 6. Generate
            MhcPdfGenerator.generatePDF(pdfData, res, companyInfo);

        } catch (error) {
            console.error('MHC downloadReport error:', error);
            res.status(500).send('Error generating Material Heat Chart report');
        }
    }
}

module.exports = new MhcController();
