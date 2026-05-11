const NcrService = require('../services/ncr.service');
const NCRPdfGenerator = require('../utils/ncrPdfGenerator');
const Audit = require('#utils/audit.js');
const { getCompanyInfo } = require('../utils/companyInfo');

class NcrController {
    async list(req, res) {
        try {
            const result = await NcrService.list(req.user.company_id, req.query);
            const mappedData = result.data.map(ncr => this._mapNcrAttachments(ncr));
            res.status(200).json({
                success: true,
                message: 'NCRs fetched successfully',
                data: mappedData,
                meta: result.meta,
            });
        } catch (error) {
            console.error('NCR list error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async create(req, res) {
        try {
            // If multipart data, req.body might need parsing if it was stringified
            // But usually multer handles fields automatically. 
            // We just need to attach the files metadata.
            let attachments = [];
            if (req.files && req.files.length > 0) {
                attachments = req.files.map(file => ({
                    name: file.originalname,
                    url: `/api/files/${file.filename}`,
                    type: file.mimetype,
                    size: file.size,
                    filename: file.filename
                }));
            }

            const data = {
                ...req.body,
                attachments: attachments.length > 0 ? attachments : undefined
            };

            const result = await NcrService.create(req.user.company_id, req.user.id || req.user.userid, data);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'created',
                module: 'Non-Conformance Report',
                description: `Created new NCR "${result.ncr_no}"`,
                metadata: { target_ncr_id: result.id },
            });

            res.status(201).json({
                success: true,
                message: 'NCR created successfully',
                data: this._mapNcrAttachments(result),
            });
        } catch (error) {
            console.error('NCR create error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getById(req, res) {
        try {
            const result = await NcrService.getById(req.user.company_id, req.params.id);
            res.status(200).json({ success: true, data: this._mapNcrAttachments(result) });
        } catch (error) {
            console.error('NCR getById error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getNextNcrNo(req, res) {
        try {
            const result = await NcrService.getNextNcrNo(req.user.company_id, req.params.job_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('NCR getNextNcrNo error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async updateStage2(req, res) {
        try {
            const result = await NcrService.updateStage2(req.user.company_id, req.params.id, req.body);
            res.status(200).json({ success: true, message: 'Stage 2 submitted', data: result });
        } catch (error) {
            console.error('NCR updateStage2 error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async updateStage3Init(req, res) {
        try {
            const result = await NcrService.updateStage3Init(req.user.company_id, req.params.id, req.body);
            res.status(200).json({ success: true, message: 'Stage 3 initialized', data: result });
        } catch (error) {
            console.error('NCR updateStage3Init error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async submitReview(req, res) {
        try {
            const result = await NcrService.submitReview(req.user.company_id, req.params.id, req.user.userid, req.body);
            res.status(200).json({ success: true, message: 'Review submitted', data: result });
        } catch (error) {
            console.error('NCR submitReview error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async updateStage4(req, res) {
        try {
            const result = await NcrService.updateStage4(req.user.company_id, req.params.id, req.user.userid, req.body);
            res.status(200).json({ success: true, message: 'Stage 4 submitted', data: result });
        } catch (error) {
            console.error('NCR updateStage4 error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async updateStage5(req, res) {
        try {
            const result = await NcrService.updateStage5(req.user.company_id, req.params.id, req.body);
            res.status(200).json({ success: true, message: 'NCR closed successfully', data: result });
        } catch (error) {
            console.error('NCR updateStage5 error:', error);
            res.status(400).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async getUsers(req, res) {
        try {
            const result = await NcrService.getUsers(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('NCR getUsers error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getActiveFilters(req, res) {
        try {
            const result = await NcrService.getActiveFilters(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('NCR getActiveFilters error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async downloadPdf(req, res) {
        try {
            const ncr = await NcrService.getById(req.user.company_id, req.params.id);
            
            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=NCR_${ncr.ncr_no.replace(/\//g, '_')}.pdf`);

            // Fetch company info
            const companyInfo = await getCompanyInfo(req.user.company_id);

            // Generate PDF
            NCRPdfGenerator.generateNCR(ncr, res, companyInfo);
        } catch (error) {
            console.error('NCR downloadPdf error:', error);
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async toggleStatus(req, res) {
        try {
            const result = await NcrService.toggleStatus(req.user.company_id, req.params.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: result.is_active ? 'activated' : 'deactivated',
                module: 'Non-Conformance Report',
                description: `${result.is_active ? 'Activated' : 'Deactivated'} NCR "${result.ncr_no}"`,
                metadata: { target_ncr_id: result.id, is_active: result.is_active },
            });

            res.status(200).json({ 
                success: true, 
                message: `NCR ${result.is_active ? 'activated' : 'deactivated'} successfully`,
                data: result 
            });
        } catch (error) {
            console.error('NCR toggleStatus error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    async archive(req, res) {
        try {
            const result = await NcrService.archive(req.user.company_id, req.params.id);
            
            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.id || req.user.userid,
                action: 'deleted',
                module: 'Non-Conformance Report',
                description: `Archived NCR "${result.ncr_no}"`,
                metadata: { target_ncr_id: result.id },
            });

            res.status(200).json({ success: true, message: 'NCR archived successfully' });
        } catch (error) {
            console.error('NCR archive error:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    _mapNcrAttachments(ncr) {
        if (ncr && ncr.attachments && Array.isArray(ncr.attachments)) {
            const baseUrl = process.env.BACKEND_URL || '';
            ncr.attachments = ncr.attachments.map(att => ({
                ...att,
                url: att.url && !att.url.startsWith('http') ? `${baseUrl}${att.url}` : att.url
            }));
        }
        return ncr;
    }
}

module.exports = new NcrController();
