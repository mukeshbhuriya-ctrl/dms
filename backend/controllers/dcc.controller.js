const DccService = require('../services/dcc.service');
const fs = require('fs');
const path = require('path');
const prisma = require('#prisma');
const StorageUtils = require('../utils/storage.utils');
const ActivityService = require('../services/activity.service');
const { ROOT_DIR } = require('../utils/upload');

const Audit = require('#utils/audit.js');

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

    async getCustomerFilters(req, res) {
        try {
            const result = await DccService.getCustomerFilters(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateCustomer(req, res) {
        try {
            const result = await DccService.updateCustomer(req.user.company_id, req.params.id, req.body);
            res.status(200).json({ success: true, message: 'Customer updated successfully', data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteCustomer(req, res) {
        try {
            await DccService.deleteCustomer(req.user.company_id, req.params.id);
            res.status(200).json({ success: true, message: 'Customer deleted successfully' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async toggleCustomerStatus(req, res) {
        try {
            const result = await DccService.toggleCustomerStatus(req.user.company_id, req.params.id);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: result.is_active ? 'activated' : 'deactivated',
                module: 'Customer Management',
                description: `${result.is_active ? 'Activated' : 'Deactivated'} customer "${result.customer_name}"`,
                metadata: { customer_id: result.id, customer_name: result.customer_name, is_active: result.is_active },
            });

            res.status(200).json({ success: true, message: `Customer ${result.is_active ? 'activated' : 'deactivated'} successfully`, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async toggleLocationStatus(req, res) {
        try {
            const result = await DccService.toggleLocationStatus(req.user.company_id, req.params.id);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: result.is_active ? 'activated' : 'deactivated',
                module: 'Customer Management',
                description: `${result.is_active ? 'Activated' : 'Deactivated'} location "${result.location_name}"`,
                metadata: { location_id: result.id, location_name: result.location_name, is_active: result.is_active },
            });

            res.status(200).json({ success: true, message: `Location ${result.is_active ? 'activated' : 'deactivated'} successfully`, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async togglePoStatus(req, res) {
        try {
            const result = await DccService.togglePoStatus(req.user.company_id, req.params.id);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: result.is_active ? 'activated' : 'deactivated',
                module: 'Purchase Orders',
                description: `${result.is_active ? 'Activated' : 'Deactivated'} PO #${result.po_number}`,
                metadata: { po_id: result.id, po_number: result.po_number, is_active: result.is_active },
            });

            res.status(200).json({ success: true, message: `PO ${result.is_active ? 'activated' : 'deactivated'} successfully`, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async toggleJobStatus(req, res) {
        try {
            const result = await DccService.toggleJobStatus(req.user.company_id, req.params.id);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: result.is_active ? 'activated' : 'deactivated',
                module: 'Job Management',
                description: `${result.is_active ? 'Activated' : 'Deactivated'} Job #${result.job_number}`,
                metadata: { job_id: result.id, job_number: result.job_number, is_active: result.is_active },
            });

            res.status(200).json({ success: true, message: `Job ${result.is_active ? 'activated' : 'deactivated'} successfully`, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
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

    async getLocationFilters(req, res) {
        try {
            const result = await DccService.getLocationFilters(req.user.company_id);
            res.status(200).json({ success: true, data: result });
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

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'Document Master',
                description: `Updated Document Master "${result.document_number}"`,
                metadata: { target_document_master_id: result.id },
            });

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
            const userId = req.user.userid || req.user.id;
            const roles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
            const upperRoles = roles.map(r => String(r).toUpperCase());
            const isPowerUser = upperRoles.includes('ADMIN') || upperRoles.includes('DCC');

            let result;
            if (isPowerUser) {
                result = await DccService.getAllAssignedDocuments(req.user.company_id, req.query);
            } else {
                result = await DccService.getMyAssignedDocuments(req.user.company_id, userId, req.query);
            }
            res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getUserDashboardStats(req, res) {
        try {
            const userId = req.user.userid || req.user.id;
            const roles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
            const upperRoles = roles.map(r => String(r).toUpperCase());
            const isPowerUser = upperRoles.includes('ADMIN') || upperRoles.includes('DCC');
            const company_id = req.user.company_id;

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            // Internal Status Conditions
            const docWhere = { company_id, is_deleted: false, is_active: true };
            if (!isPowerUser) {
                docWhere.user_id = userId;
            }

            const awaitingUploadWhere = { ...docWhere, status: { in: ['Pending', 'Upload Due'] } };
            const pendingApprovalWhere = { ...docWhere, status: { in: ['Uploaded', 'Pending for Approval'] } };
            const approvedWhere = { 
                ...docWhere, 
                status: 'Approved',
                versions: {
                    some: {
                        status: { not: 'Pending' },
                        transmission_items: { none: {} }
                    }
                }
            };

            // Execute Internal count queries
            const [
                totalInternalCount,
                awaitingUploadCount,
                pendingApprovalCount,
                approvedCount
            ] = await prisma.$transaction([
                prisma.group_document.count({ where: docWhere }),
                prisma.group_document.count({ where: awaitingUploadWhere }),
                prisma.group_document.count({ where: pendingApprovalWhere }),
                prisma.group_document.count({ where: approvedWhere })
            ]);

            // Calculate Client Status by Unique Documents (using the latest transmission)
            const transmittedDocsWhere = { 
                ...docWhere, 
                transmission_items: { some: {} } 
            };
            
            const transmittedDocs = await prisma.group_document.findMany({
                where: transmittedDocsWhere,
                select: {
                    id: true,
                    transmission_items: {
                        orderBy: { transmission: { createdAt: 'desc' } },
                        take: 1,
                        select: { client_status: true }
                    }
                }
            });

            let totalClientCount = 0;
            let clientUnderReviewCount = 0;
            let clientApprovedCount = 0;
            let clientRejectedCount = 0;
            let clientCommentedCount = 0;
            let clientAsBuiltCount = 0;
            let clientReApprovalCount = 0;

            for (const doc of transmittedDocs) {
                if (doc.transmission_items.length > 0) {
                    totalClientCount++;
                    const status = doc.transmission_items[0].client_status;
                    if (status === 'Pending') clientUnderReviewCount++;
                    else if (status === 'Approved' || status === 'Final Approved') clientApprovedCount++;
                    else if (status === 'Rejected') clientRejectedCount++;
                    else if (status === 'Commented') clientCommentedCount++;
                    else if (status === 'As Built' || status === 'As-Built') clientAsBuiltCount++;
                    else if (status === 'Re-approval' || status === 'Re-Approval') clientReApprovalCount++;
                }
            }

            // Query Recent Activities (using document_version for now)
            const recentVersions = await prisma.document_version.findMany({
                where: isPowerUser ? {
                    group_document: { company_id, is_deleted: false, is_active: true }
                } : {
                    group_document: { company_id, user_id: userId, is_deleted: false, is_active: true }
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    group_document: {
                        include: { document: true }
                    },
                    uploader: {
                        select: { name: true, empid: true }
                    }
                }
            });

            // Format recent activities helper
            const formatTimeAgo = (date) => {
                const seconds = Math.floor((new Date() - new Date(date)) / 1000);
                if (seconds < 0) return 'Just now';
                if (seconds < 60) return 'Just now';
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) return `${minutes}m ago`;
                const hours = Math.floor(minutes / 60);
                if (hours < 24) return `${hours}h ago`;
                const days = Math.floor(hours / 24);
                if (days === 1) return 'Yesterday';
                return `${days} days ago`;
            };

            const recentActivities = recentVersions.map(v => {
                let title = 'Document Uploaded';
                let status = 'pending';
                if (v.status === 'Approved') {
                    title = 'Document Approved';
                    status = 'approved';
                } else if (v.status === 'Rejected') {
                    title = 'Document Rejected';
                    status = 'rejected';
                }

                return {
                    id: v.id,
                    title,
                    description: `${v.group_document?.document?.document_name || 'Document'} (v${v.version_no})`,
                    time: formatTimeAgo(v.createdAt),
                    status
                };
            });

            res.status(200).json({
                success: true,
                data: {
                    internal: {
                        total: totalInternalCount,
                        awaitingUpload: awaitingUploadCount,
                        pendingApproval: pendingApprovalCount,
                        approved: approvedCount,
                    },
                    client: {
                        total: totalClientCount,
                        underReview: clientUnderReviewCount,
                        approved: clientApprovedCount,
                        rejected: clientRejectedCount,
                        commented: clientCommentedCount,
                        asBuilt: clientAsBuiltCount,
                        reApproval: clientReApprovalCount,
                    },
                    recentActivities
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getAllAssignedDocuments(req, res) {
        try {
            const result = await DccService.getAllAssignedDocuments(req.user.company_id, req.query);
            return res.status(200).json({ success: true, data: result.data, meta: result.meta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }


    async uploadDocumentVersion(req, res) {
        try {
            // Middleware attaches userid
            const userId = req.user.userid || req.user.id;
            const result = await DccService.uploadDocumentVersion(req.user.company_id, userId, req.body.document_id, req.files, req.body.remarks);
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
    
    async getApprovedDocumentsForTransmission(req, res) {
        try {
            const result = await DccService.getApprovedDocumentsForTransmission(req.user.company_id, req.query);
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

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: userId,
                action: 'created',
                module: 'Transmissions',
                description: `Created new Transmission "${result.transmission_number}"`,
                metadata: { target_transmission_id: result.id },
            });

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

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'created',
                module: 'Document Assignment',
                description: `Bulk assigned ${result.length || 0} document(s)`,
                metadata: { assignment_count: result.length || 0 },
            });

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

            const transmission = await prisma.transmission.findUnique({
                where: { id: req.body.transmission_id },
                select: { transmission_number: true }
            });

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'created',
                module: 'Transmissions',
                description: `Sent Transmission Email for "${transmission?.transmission_number || req.body.transmission_id}"`,
                metadata: { target_transmission_id: req.body.transmission_id },
            });

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
            const files = req.files || []; // multiple files for individual doc
            const userId = req.user.userid || req.user.id;

            const result = await DccService.updateTransmissionDocumentClientStatus(
                req.user.company_id,
                userId,
                transmission_document_id,
                status,
                remarks,
                files
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
            const performer_id = req.user.userid || req.user.id;
            const result = await DccService.updateAssignedDocument(req.user.company_id, req.params.id, req.body, performer_id);

            let sysDocId = req.params.id;
            if (result && result.document_id) {
                const docMaster = await prisma.document_master.findUnique({ where: { id: result.document_id } });
                if (docMaster) sysDocId = docMaster.document_number;
            }

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'Document Assignment',
                description: `Updated Document Assignment for "${sysDocId}"`,
                metadata: { target_assigned_document_id: req.params.id },
            });

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

    async deleteAssignedDocument(req, res) {
        try {
            const groupDoc = await prisma.group_document.findUnique({
                where: { id: req.params.id },
                include: { document: true }
            });
            const sysDocId = groupDoc?.document?.document_number || req.params.id;

            await DccService.deleteAssignedDocument(req.user.company_id, req.params.id);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'deleted',
                module: 'Document Assignment',
                description: `Deleted Document Assignment for "${sysDocId}"`,
                metadata: { target_assigned_document_id: req.params.id },
            });

            res.status(200).json({ success: true, message: 'Assignment deleted successfully' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async toggleAssignedDocumentStatus(req, res) {
        try {
            const result = await DccService.toggleAssignedDocumentStatus(req.user.company_id, req.params.id);

            let sysDocId = req.params.id;
            if (result && result.document_id) {
                const docMaster = await prisma.document_master.findUnique({ where: { id: result.document_id } });
                if (docMaster) sysDocId = docMaster.document_number;
            }

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: result.is_active ? 'activated' : 'deactivated',
                module: 'Document Assignment',
                description: `${result.is_active ? 'Activated' : 'Deactivated'} Document Assignment for "${sysDocId}"`,
                metadata: { target_assigned_document_id: result.id, is_active: result.is_active },
            });

            res.status(200).json({ success: true, message: `Assignment ${result.is_active ? 'activated' : 'deactivated'} successfully`, data: result });
        } catch (error) {
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

                if (!activity || !activity.metadata) {
                    return res.status(404).json({ success: false, message: 'Archived file or activity record not found' });
                }

                // Check if we are looking for a specific file in metadata.files (multi-file)
                const targetFilename = req.params.filename || req.query.filename;
                if (targetFilename && activity.metadata.files && Array.isArray(activity.metadata.files)) {
                    const fileObj = activity.metadata.files.find(f => 
                        f.original_filename === targetFilename || 
                        (f.file_path && f.file_path.split('/').pop() === targetFilename) ||
                        (f.file_path && f.file_path.split('\\').pop() === targetFilename)
                    );
                    if (fileObj) {
                        filePathToServe = fileObj.file_path;
                        mimeType = fileObj.mime_type;
                    }
                }

                if (!filePathToServe) {
                    if (!activity.metadata.file_path) {
                        return res.status(404).json({ success: false, message: 'Archived file path not found' });
                    }
                    filePathToServe = activity.metadata.file_path;
                }
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

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'created',
                module: 'Email Templates',
                description: `Created Email Template "${result.name}"`,
                metadata: { target_email_template_id: result.id },
            });

            res.status(201).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateEmailTemplate(req, res) {
        try {
            const result = await DccService.updateEmailTemplate(req.user.company_id, req.params.id, req.body);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'Email Templates',
                description: `Updated Email Template "${result.name}"`,
                metadata: { target_email_template_id: result.id },
            });

            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteEmailTemplate(req, res) {
        try {
            await DccService.deleteEmailTemplate(req.user.company_id, req.params.id);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'deleted',
                module: 'Email Templates',
                description: `Deleted Email Template ID: ${req.params.id}`,
                metadata: { target_email_template_id: req.params.id },
            });

            res.status(200).json({ success: true, message: 'Template deleted successfully' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    async downloadDocumentFile(req, res) {
        try {
            const { fileId } = req.params;
            const fileData = await DccService.getDocumentFileDetails(fileId);
            
            const errorHtml = (msg) => `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#64748b;background:#f8fafc;text-align:center;padding:2rem;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:1rem;color:#94a3b8;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    <h2 style="margin:0 0 0.5rem 0;color:#334155;font-size:1.25rem;font-weight:600;">Document Unavailable</h2>
                    <p style="margin:0;font-size:0.875rem;">${msg}</p>
                </div>
            `;

            if (!fileData || !fileData.file_path) {
                return res.status(404).send(errorHtml("The requested file record could not be found in the system."));
            }

            // Normalize path and reconstruct absolute path against ROOT_DIR
            const absolutePath = path.join(ROOT_DIR, fileData.file_path.replace(/^[\\/]+/, ''));

            if (!fs.existsSync(absolutePath)) {
                return res.status(404).send(errorHtml("The physical file is missing from the secure server disk."));
            }

            const mime = require('mime-types');
            const mimeType = fileData.mime_type || mime.lookup(absolutePath) || 'application/octet-stream';

            // Set appropriate headers for inline viewing (Preview)
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${fileData.original_filename || 'document'}"`);

            const fileStream = fs.createReadStream(absolutePath);
            fileStream.pipe(res);
        } catch (error) {
            console.error('downloadDocumentFile error:', error);
            res.status(500).send("An unexpected error occurred while loading the document.");
        }
    }

    async requestRevision(req, res) {
        try {
            const userId = req.user.userid || req.user.id;
            const result = await DccService.requestRevision(req.user.company_id, userId, req.params.id, req.body.remarks);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: userId,
                action: 'created',
                module: 'Revision Request',
                description: `Requested Revision for Assigned Document ID: ${req.params.id}`,
                metadata: { target_document_id: req.params.id },
            });

            res.status(200).json({ success: true, data: result, message: 'Revision requested successfully' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async approveRevisionRequest(req, res) {
        try {
            const adminUserId = req.user.userid || req.user.id;
            const result = await DccService.approveRevisionRequest(req.user.company_id, adminUserId, req.params.id);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: adminUserId,
                action: 'approved',
                module: 'Revision Request',
                description: `Approved Revision Request for Assigned Document ID: ${req.params.id}`,
                metadata: { target_document_id: req.params.id },
            });

            res.status(200).json({ success: true, data: result, message: 'Revision request approved successfully' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async rejectRevisionRequest(req, res) {
        try {
            const adminUserId = req.user.userid || req.user.id;
            const result = await DccService.rejectRevisionRequest(req.user.company_id, adminUserId, req.params.id, req.body.remarks);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: adminUserId,
                action: 'rejected',
                module: 'Revision Request',
                description: `Rejected Revision Request for Assigned Document ID: ${req.params.id}`,
                metadata: { target_document_id: req.params.id },
            });

            res.status(200).json({ success: true, data: result, message: 'Revision request rejected successfully' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new DccController();
