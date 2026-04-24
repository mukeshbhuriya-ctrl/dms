const DccService = require('../services/dcc.service');
const fs = require('fs');
const path = require('path');
const prisma = require('#prisma');
const StorageUtils = require('../utils/storage.utils');
const ActivityService = require('../services/activity.service');
const { ROOT_DIR } = require('../utils/upload');

class DccController {
    async createCustomer(req, res) {
        try {
            const customer = await DccService.createCustomer(req.user.company_id, req.body);
            res.status(201).json({
                success: true,
                message: 'Customer created successfully',
                data: customer
            });
        } catch (error) {
            console.error('Create customer error:', error);
            const status = error.message.includes('exists') ? 409 : 400;
            res.status(status).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }

    async getCustomers(req, res) {
        try {
            const result = await DccService.getCustomers(req.user.company_id, req.query);
            res.status(200).json({
                success: true,
                message: 'Customers fetched successfully',
                data: result.data,
                meta: result.meta
            });
        } catch (error) {
            console.error('Get customers error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async createCustomerLocation(req, res) {
        try {
            const result = await DccService.createCustomerLocation(req.user.company_id, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getCustomerLocations(req, res) {
        try {
            const result = await DccService.getCustomerLocations(req.user.company_id, req.query);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createPo(req, res) {
        try {
            const result = await DccService.createPo(req.user.company_id, req.body, req.file);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getPos(req, res) {
        try {
            const result = await DccService.getPos(req.user.company_id, req.query);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getPoFilters(req, res) {
        try {
            const result = await DccService.getPoFilters(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async createJob(req, res) {
        try {
            const result = await DccService.createJob(req.user.company_id, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getJobs(req, res) {
        try {
            const params = {
                ...req.query,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50,
                search: req.query.search || ""
            };
            const result = await DccService.getJobs(req.user.company_id, params);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            console.error('getJobs error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getManageJobFilters(req, res) {
        try {
            const result = await DccService.getManageJobFilters(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('getManageJobFilters error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getTransmissionFilters(req, res) {
        try {
            const result = await DccService.getTransmissionFilters(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getActiveFilters(req, res) {
        try {
            const { userid, role, company_id: companyId } = req.user;
            const { is_approved, is_transmittable } = req.query;

            const roles = Array.isArray(role) ? role : [role];
            const upperRoles = roles.map(r => r.toUpperCase());

            // Case-insensitive role check for robustness
            const isPowerUser = upperRoles.includes('ADMIN') || upperRoles.includes('DCC');
            const isUploader = upperRoles.includes('USER');

            const getOnlyForUser = !isPowerUser && isUploader ? userid : null;
            const options = {
                isApproved: is_approved === 'true',
                isTransmittable: is_transmittable === 'true'
            };

            const result = await DccService.getActiveFilters(companyId, getOnlyForUser, options);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createDocumentMaster(req, res) {
        try {
            const result = await DccService.createDocumentMaster(req.user.company_id, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            const status = error.message.includes('exists') ? 409 : 400;
            res.status(status).json({ success: false, message: error.message });
        }
    }

    async updateDocumentMaster(req, res) {
        try {
            const result = await DccService.updateDocumentMaster(req.user.company_id, req.params.id, req.body);
            res.status(200).json({ success: true, message: 'Document master updated successfully', data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getDocuments(req, res) {
        try {
            const result = await DccService.getDocuments(req.user.company_id, req.query);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getMyAssignedDocuments(req, res) {
        try {
            // Middleware attaches userid, not id
            const userId = req.user.userid || req.user.id;
            const result = await DccService.getMyAssignedDocuments(req.user.company_id, userId, req.query);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getAllAssignedDocuments(req, res) {
        try {
            const userRoles = req.user.role || [];
            // Check if user has DCC or ADMIN role
            if (userRoles.includes('DCC') || userRoles.includes('ADMIN')) {
                const result = await DccService.getAllAssignedDocuments(req.user.company_id, req.query);
                return res.status(200).json({ success: true, data: result.data, meta: result.meta });
            } else {
                // For other users, only show documents assigned to them
                // Using req.user.userid as per middleware definition
                const userId = req.user.userid || req.user.id;
                const result = await DccService.getMyAssignedDocuments(req.user.company_id, userId, req.query);
                return res.status(200).json({ success: true, data: result.data, meta: result.meta });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }


    async uploadDocumentVersion(req, res) {
        try {
            // Middleware attaches userid
            const userId = req.user.userid || req.user.id;
            const result = await DccService.uploadDocumentVersion(req.user.company_id, userId, req.body.document_id, req.file, req.body.remarks);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getDocumentsForApproval(req, res) {
        try {
            const result = await DccService.getDocumentsForApproval(req.user.company_id, req.query);
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async reviewDocument(req, res) {
        try {
            const userId = req.user.userid || req.user.id;
            const result = await DccService.reviewDocument(req.user.company_id, userId, req.body.document_id, req.body.status, req.body.remarks);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async createTransmission(req, res) {
        try {
            const userId = req.user.userid || req.user.id;
            const result = await DccService.createTransmission(req.user.company_id, userId, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async assignDocument(req, res) {
        try {
            const result = await DccService.assignDocument(req.user.company_id, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            console.error('Assign document error:', error);
            res.status(400).json({ success: false, message: 'Failed to assign document. Please check your inputs.' });
        }
    }

    async bulkAssignDocuments(req, res) {
        try {
            const result = await DccService.bulkAssignDocuments(req.user.company_id, req.body, req.user.userid || req.user.id);
            res.status(201).json({ success: true, data: result, message: 'Documents assigned successfully' });
        } catch (error) {
            console.error('Bulk assign document error:', error);
            res.status(400).json({ success: false, message: error.message || 'Failed to assign documents' });
        }
    }

    async getTransmissionDocuments(req, res) {
        try {
            const result = await DccService.getTransmissionDocuments(req.user.company_id, req.query.transmission_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getTransmissions(req, res) {
        try {
            const result = await DccService.getTransmissions(req.user.company_id, req.query);
            res.status(200).json({
                success: true,
                data: result.data,
                meta: result.meta
            });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async sendTransmissionEmail(req, res) {
        try {
            const result = await DccService.sendTransmissionEmail(req.user.company_id, req.user.userid || req.user.id, req.body);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async downloadTransmittalPDF(req, res) {
        try {
            const { filename, buffer } = await DccService.getTransmissionTransmittalPDF(req.user.company_id, req.params.id);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(buffer);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async previewTransmittalPDF(req, res) {
        try {
            const { filename, buffer } = await DccService.getTransmissionTransmittalPDF(req.user.company_id, req.params.id);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.send(buffer);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    async updateTransmissionClientStatus(req, res) {
        try {
            const { transmission_id, status, remarks } = req.body;
            const files = req.files || [];
            const result = await DccService.updateTransmissionClientStatus(req.user.company_id, transmission_id, status, remarks, files);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateTransmissionDocumentClientStatus(req, res) {
        try {
            const { transmission_document_id, status, remarks } = req.body;
            const file = req.file; // single file for individual doc
            const userId = req.user.userid || req.user.id;

            const result = await DccService.updateTransmissionDocumentClientStatus(
                req.user.company_id,
                userId,
                transmission_document_id,
                status,
                remarks,
                file
            );

            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('Update transmission document client status error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async downloadTransmissionFeedback(req, res) {
        try {
            const { id } = req.params;
            const transmission = await prisma.transmission.findFirst({
                where: { id, company_id: req.user.company_id }
            });

            if (!transmission || !transmission.client_archive_url) {
                return res.status(404).json({ success: false, message: 'Feedback archive not found' });
            }

            const { baseDir } = StorageUtils.getTransmissionFeedbackDir(req.user.company_id, transmission.transmission_number);
            const feedbackZipName = `Feedback_${transmission.transmission_number}.zip`;
            const filePath = path.join(baseDir, feedbackZipName);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ success: false, message: 'File not found on server' });
            }

            res.download(filePath, feedbackZipName);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateAssignedDocument(req, res) {
        try {
            const result = await DccService.updateAssignedDocument(req.user.company_id, req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Assignment updated successfully',
                data: result
            });
        } catch (error) {
            console.error('Update assignment error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }
    async getDocumentTrail(req, res) {
        try {
            const { id } = req.params;
            const result = await ActivityService.getDocumentTrail(req.user.company_id, id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getTransmissionTrail(req, res) {
        try {
            const { id } = req.params;
            const result = await ActivityService.getTransmissionTrail(req.user.company_id, id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async previewDocument(req, res) {
        try {
            const { versionId } = req.params;
            const { activityId } = req.query;
            const companyId = req.user.company_id;

            let filePathToServe = null;
            let mimeType = null;

            if (activityId) {
                // Case A: Requesting an archived file from activity trail (e.g., Rejected copy)
                const activity = await prisma.document_activity.findFirst({
                    where: { id: activityId, company_id: companyId }
                });

                if (!activity || !activity.metadata || !activity.metadata.file_path) {
                    return res.status(404).json({ success: false, message: 'Archived file or activity record not found' });
                }
                filePathToServe = activity.metadata.file_path;
                // mimeType will be determined by extension below for archives
            } else {
                // Case B: standard version request
                const version = await DccService.getDocumentVersionById(companyId, versionId);
                if (!version || !version.file_path) {
                    return res.status(404).json({ success: false, message: 'Document version or file path not found' });
                }
                filePathToServe = version.file_path;
                mimeType = version.mime_type;
            }

            if (!filePathToServe) {
                return res.status(404).json({ success: false, message: 'File path not found' });
            }

            // Normalize path and reconstruct absolute path
            const absolutePath = path.join(ROOT_DIR, filePathToServe.replace(/^[\\/]+/, ''));

            if (!fs.existsSync(absolutePath)) {
                console.error(`Preview file not found: ${absolutePath}`);
                return res.status(404).json({ success: false, message: 'Document file not found on server' });
            }

            const stats = fs.statSync(absolutePath);

            // Determine content type
            let contentType = mimeType;
            if (!contentType || contentType === 'application/octet-stream') {
                const ext = path.extname(absolutePath).toLowerCase();
                if (ext === '.pdf') contentType = 'application/pdf';
                else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
                else if (ext === '.png') contentType = 'image/png';
                else if (ext === '.webp') contentType = 'image/webp';
            }

            res.setHeader('Content-Type', contentType || 'application/octet-stream');
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Content-Disposition', 'inline');

            const fileStream = fs.createReadStream(absolutePath);
            fileStream.pipe(res);
        } catch (error) {
            console.error('Preview document error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Preview or Download an archived file from activity metadata (e.g., Rejected copies)
     */
    async previewArchivedFile(req, res) {
        try {
            const { activityId } = req.params;
            const { company_id } = req.user;

            const activity = await prisma.document_activity.findFirst({
                where: { id: activityId, company_id }
            });

            if (!activity || !activity.metadata || !activity.metadata.rejected_file_archive) {
                return res.status(404).json({ success: false, message: 'Archived file or activity record not found' });
            }

            const relativePath = activity.metadata.rejected_file_archive.replace(/^[\\/]+/, '');
            const absolutePath = path.join(ROOT_DIR, relativePath);

            if (!fs.existsSync(absolutePath)) {
                console.error(`Archived file not found: ${absolutePath}`);
                return res.status(404).json({ success: false, message: 'Archived file not found on server' });
            }

            const stats = fs.statSync(absolutePath);

            // Determine content type from extension
            let contentType = 'application/octet-stream';
            const ext = path.extname(absolutePath).toLowerCase();
            if (ext === '.pdf') contentType = 'application/pdf';
            else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            else if (ext === '.png') contentType = 'image/png';
            else if (ext === '.webp') contentType = 'image/webp';

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Content-Disposition', 'inline');

            const fileStream = fs.createReadStream(absolutePath);
            fileStream.pipe(res);
        } catch (error) {
            console.error('Preview archived file error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Preview or Download a feedback file using path and filename from query
     */
    async downloadFeedbackFile(req, res) {
        try {
            const { filepath, filename } = req.query;

            if (!filepath) {
                return res.status(400).json({ success: false, message: 'File path is required' });
            }

            // Normalize path and reconstruct absolute path
            // ROOT_DIR comes from upload utils
            const absolutePath = path.join(ROOT_DIR, filepath.replace(/^[\\/]+/, ''));

            if (!fs.existsSync(absolutePath)) {
                return res.status(404).json({ success: false, message: 'File not found on server' });
            }

            const stats = fs.statSync(absolutePath);

            // Determine content type
            let contentType = 'application/octet-stream';
            const ext = path.extname(absolutePath).toLowerCase();
            if (ext === '.pdf') contentType = 'application/pdf';
            else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            else if (ext === '.png') contentType = 'image/png';

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Content-Disposition', `inline; filename="${filename || 'feedback-file'}"`);

            const fileStream = fs.createReadStream(absolutePath);
            fileStream.pipe(res);
        } catch (error) {
            console.error('Download feedback file error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    // --- Email Template CRUD ---

    async getEmailTemplates(req, res) {
        try {
            const result = await DccService.getEmailTemplates(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createEmailTemplate(req, res) {
        try {
            const result = await DccService.createEmailTemplate(req.user.company_id, req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateEmailTemplate(req, res) {
        try {
            const result = await DccService.updateEmailTemplate(req.user.company_id, req.params.id, req.body);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteEmailTemplate(req, res) {
        try {
            await DccService.deleteEmailTemplate(req.user.company_id, req.params.id);
            res.status(200).json({ success: true, message: 'Template deleted successfully' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new DccController();
