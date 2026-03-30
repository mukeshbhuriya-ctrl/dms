const fs = require('fs');
const path = require('path');
const prisma = require('#prisma');
const EmailService = require('./email.service');
const { generateTransmittalPDF } = require('../utils/pdfGeneratorTransmittal');
const fileService = require('./file.service');
const logService = require('./log.service');
const ActivityService = require('./activity.service');
const StorageUtils = require('../utils/storage.utils');

class DccService {
    /**
     * Create a new customer
     */
    async createCustomer(company_id, data) {
        const { customer_name, customer_short_name, email, mobile } = data;

        if (!customer_name || customer_name.trim() === '') throw new Error('Customer name is required');
        if (!customer_short_name || customer_short_name.trim() === '') throw new Error('Customer short name is required');
        if (!email || email.trim() === '') throw new Error('Email is required');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) throw new Error('Invalid email format');

        const existingCustomer = await prisma.customer.findFirst({
            where: {
                company_id: company_id,
                email: email.toLowerCase().trim(),
            },
        });

        if (existingCustomer) throw new Error('Customer with this email already exists in your company');

        return await prisma.customer.create({
            data: {
                company_id: company_id,
                customer_name: customer_name.trim(),
                customer_short_name: customer_short_name.trim(),
                email: email.toLowerCase().trim(),
                mobile: mobile ? mobile.trim() : null,
            },
        });
    }

    /**
     * Get customers
     */
    async getCustomers(company_id, params = {}) {
        const {
            page = 1,
            limit = 50,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params;

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const where = {
            company_id: company_id
        };

        if (search) {
            where.OR = [
                { customer_name: { contains: search, mode: 'insensitive' } },
                { customer_short_name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { mobile: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [total, customers] = await prisma.$transaction([
            prisma.customer.count({ where }),
            prisma.customer.findMany({
                where,
                skip,
                take,
                orderBy: {
                    [sortBy]: sortOrder
                },
                include: {
                    customer_locations: {
                        include: {
                            pos: {
                                include: {
                                    jobs: true,
                                    po_communication_matrix: true,
                                },
                            },
                        },
                    },
                }
            })
        ]);

        return {
            data: customers,
            meta: {
                total,
                page: parseInt(page),
                limit: take,
                totalPages: Math.ceil(total / take)
            }
        };
    }

    /**
     * Create customer locations
     */
    async createCustomerLocation(company_id, data) {
        const { customer_id, locations } = data;

        if (!customer_id) throw new Error('Customer ID is required');
        if (!Array.isArray(locations) || locations.length === 0) throw new Error('Locations array is required');

        const customer = await prisma.customer.findFirst({
            where: { id: customer_id, company_id }
        });
        if (!customer) throw new Error('Customer not found');

        // Validate each location
        for (const loc of locations) {
            if (!loc.location_name) throw new Error('Location name is required');
            if (!loc.customer_number_as_per_sap) throw new Error('Customer number as per SAP is required');
            if (!loc.gst_number) throw new Error('GST number is required');
        }

        return await prisma.$transaction(
            locations.map(loc => prisma.customer_location.create({
                data: {
                    company_id,
                    customer_id: customer_id,
                    location_name: loc.location_name,
                    customer_number_as_per_sap: loc.customer_number_as_per_sap,
                    gst_number: loc.gst_number
                }
            }))
        );
    }

    async getCustomerLocations(company_id, params = {}) {
        const { page = 1, limit = 50, search = '' } = params;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { company_id };

        if (search) {
            where.OR = [
                { location_name: { contains: search, mode: 'insensitive' } },
                { customer: { customer_name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [total, data] = await prisma.$transaction([
            prisma.customer_location.count({ where }),
            prisma.customer_location.findMany({
                where, skip, take,
                include: { customer: { select: { customer_name: true } } },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return { data, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
    }

    /**
     * Create PO
     */
    async createPo(company_id, data, file) {
        const { customer_id, customer_location_id, po_number, po_date, communication_matrix } = data;

        if (!customer_id) throw new Error('Customer is required');
        if (!customer_location_id) throw new Error('Location is required');
        if (!po_number) throw new Error('PO Number is required');
        if (!po_date) throw new Error('PO Date is required');

        let finalPoDocUrl = null;
        if (file) {
            // Store ONLY the bare filename
            finalPoDocUrl = file.filename;
        } else if (data.po_doc_url) {
            finalPoDocUrl = data.po_doc_url;
        }

        // Parse communication_matrix if it's a string
        let parsedCommunicationMatrix = null;
        if (communication_matrix) {
            if (typeof communication_matrix === 'string') {
                try {
                    parsedCommunicationMatrix = JSON.parse(communication_matrix);
                } catch (e) {
                    throw new Error('Invalid communication_matrix format');
                }
            } else {
                parsedCommunicationMatrix = communication_matrix;
            }
        }

        return await prisma.$transaction(async (tx) => {
            // Create PO
            const po = await tx.po.create({
                data: {
                    company_id,
                    customer_id: customer_id,
                    customer_location_id: customer_location_id,
                    po_number,
                    po_date: new Date(po_date),
                    po_doc_url: finalPoDocUrl,
                }
            });

            // Expand URL for immediate return
            const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
            if (po.po_doc_url && !po.po_doc_url.startsWith('http')) {
                const rawUrl = po.po_doc_url;
                const pathUrl = rawUrl.startsWith('/') ? rawUrl : `/api/files/${rawUrl}`;
                po.po_doc_url = `${backendUrl}${pathUrl}`;
            }

            // Create communication matrix entries
            if (parsedCommunicationMatrix) {
                if (parsedCommunicationMatrix.shreno && Array.isArray(parsedCommunicationMatrix.shreno)) {
                    for (const person of parsedCommunicationMatrix.shreno) {
                        if (person.name && person.email) {
                            await tx.po_communication_matrix.create({
                                data: {
                                    company_id,
                                    po_id: po.id,
                                    name: person.name,
                                    email: person.email.toLowerCase(),
                                    type: 'shreno'
                                }
                            });
                        }
                    }
                }
                if (parsedCommunicationMatrix.client && Array.isArray(parsedCommunicationMatrix.client)) {
                    for (const person of parsedCommunicationMatrix.client) {
                        if (person.name && person.email) {
                            await tx.po_communication_matrix.create({
                                data: {
                                    company_id,
                                    po_id: po.id,
                                    name: person.name,
                                    email: person.email.toLowerCase(),
                                    type: 'client'
                                }
                            });
                        }
                    }
                }
            }

            return po;
        });
    }

    async getPos(company_id, params = {}) {
        const { page = 1, limit = 50, search = '' } = params;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { company_id };

        if (search) {
            where.OR = [
                { po_number: { contains: search, mode: 'insensitive' } },
                { customer: { customer_name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [total, data] = await prisma.$transaction([
            prisma.po.count({ where }),
            prisma.po.findMany({
                where, skip, take,
                include: {
                    customer: { select: { id: true, customer_name: true } },
                    customer_location: { select: { id: true, location_name: true, gst_number: true } },
                    po_communication_matrix: true
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Expand PO URLs for UI use
        const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        const expandedData = data.map(po => {
            if (po.po_doc_url && !po.po_doc_url.startsWith('http')) {
                const rawUrl = po.po_doc_url;
                const pathUrl = rawUrl.startsWith('/') ? rawUrl : `/api/files/${rawUrl}`;
                return { ...po, po_doc_url: `${backendUrl}${pathUrl}` };
            }
            return po;
        });

        return { data: expandedData, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
    }

    /**
     * Create Job
     */
    async createJob(company_id, data) {
        const { customer_id, customer_location_id, po_id, jobs } = data;

        if (!customer_id || !customer_location_id || !po_id || !jobs || !Array.isArray(jobs)) {
            throw new Error('Invalid job data');
        }

        return await prisma.$transaction(
            jobs.map(job => prisma.job.create({
                data: {
                    company_id,
                    customer_id: customer_id,
                    customer_location_id: customer_location_id,
                    po_id: po_id,
                    job_number: job.job_number,
                    project_id: job.project_id,
                    equipement_name: job.equipement_name,
                    tag_number: job.tag_number,
                    code: job.code
                }
            }))
        );
    }

    async getJobs(company_id, params = {}) {
        const { page = 1, limit = 50, search = '', po_id, customer_id, customer_location_id } = params;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { company_id };

        if (po_id) where.po_id = po_id.trim();
        if (customer_id) where.customer_id = customer_id.trim();
        if (customer_location_id) where.customer_location_id = customer_location_id.trim();

        if (search) {
            where.OR = [
                { job_number: { contains: search, mode: 'insensitive' } },
                { customer: { customer_name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [total, data] = await prisma.$transaction([
            prisma.job.count({ where }),
            prisma.job.findMany({
                where, skip, take,
                include: {
                    customer: { select: { id: true, customer_name: true } },
                    customer_location: { select: { id: true, location_name: true } },
                    po: { select: { id: true, po_number: true } }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return { data, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
    }

    /**
     * Document Master
     */
    async createDocumentMaster(company_id, data) {
        const { document_name, document_type_id } = data;

        if (!document_name) throw new Error('Document name is required');

        // Generate System Document Number: DOC-1
        const maxDoc = await prisma.document_master.findFirst({
            where: { company_id },
            orderBy: { serial_no: 'desc' }
        });
        const serial_no = (maxDoc?.serial_no || 0) + 1;
        const document_number = `DOC-${serial_no}`;

        return await prisma.document_master.create({
            data: {
                company_id,
                serial_no,
                document_number,
                document_name: document_name.trim(),
                document_type_id: document_type_id || null
            }
        });
    }

    async getDocuments(company_id, params = {}) {
        const { page = 1, limit = 50, search = '', exclude_transmitted, exclude_assigned, include_id } = params;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { company_id };

        if (search) {
            where.OR = [
                { document_number: { contains: search, mode: 'insensitive' } },
                { document_name: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (exclude_transmitted === 'true' || exclude_transmitted === true) {
            const excludedDocumentMasterIds = new Set();

            // 1. Exclude documents already linked to a transmission
            const transmittedGroupDocIds = await prisma.transmission_document.findMany({
                where: { group_document_id: { not: null } },
                select: { group_document_id: true },
                distinct: ['group_document_id']
            });

            if (transmittedGroupDocIds.length > 0) {
                const docs = await prisma.group_document.findMany({
                    where: { id: { in: transmittedGroupDocIds.map(t => t.group_document_id) } },
                    select: { document_id: true },
                    distinct: ['document_id']
                });
                docs.forEach(d => excludedDocumentMasterIds.add(d.document_id));
            }

            // 2. Exclude documents already approved by the Document Approver
            const approvedDocs = await prisma.group_document.findMany({
                where: { company_id, status: 'Approved' },
                select: { document_id: true },
                distinct: ['document_id']
            });
            approvedDocs.forEach(d => excludedDocumentMasterIds.add(d.document_id));

            if (excludedDocumentMasterIds.size > 0) {
                where.id = { ...where.id, notIn: [...(where.id?.notIn || []), ...excludedDocumentMasterIds] };
            }
        }

        if (exclude_assigned === 'true' || exclude_assigned === true) {
            // Find all unique document_id from group_document which represents assigned documents
            const assignedDocs = await prisma.group_document.findMany({
                where: { company_id },
                select: { document_id: true },
                distinct: ['document_id']
            });

            const assignedDocIds = assignedDocs.map(d => d.document_id);

            if (assignedDocIds.length > 0) {
                let idsToExclude = assignedDocIds;
                if (include_id) {
                    idsToExclude = assignedDocIds.filter(id => id !== include_id);
                }
                
                if (idsToExclude.length > 0) {
                    where.id = { ...where.id, notIn: [...(where.id?.notIn || []), ...idsToExclude] };
                }
            }
        }

        const [total, data] = await prisma.$transaction([
            prisma.document_master.count({ where }),
            prisma.document_master.findMany({
                where, skip, take,
                include: { document_type: true },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return { data, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
    }



    /**
     * Get documents assigned to user (for Upload)
     */
    async getMyAssignedDocuments(company_id, user_id, params = {}) {
        const { page = 1, limit = 50, search = '' } = params;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const where = {
            company_id,
            user_id
        };

        if (search) {
            where.OR = [
                { document: { document_name: { contains: search, mode: 'insensitive' } } },
                { document: { document_number: { contains: search, mode: 'insensitive' } } }
            ];
        }

        // Server-side Filtering Logic
        const { status_filter, approver_status_filter } = params;

        if (status_filter && status_filter !== 'all') {
            if (status_filter === 'pending') {
                where.status = { in: ['Pending', 'Rejected'] };
            } else if (status_filter === 'done') {
                where.status = { in: ['Approved', 'Uploaded', 'Pending'] };
            }
        }

        if (approver_status_filter && approver_status_filter !== 'all') {
            const filterVal = approver_status_filter.toLowerCase();
            if (filterVal === 'pending for approval' || filterVal === 'pending') {
                where.status = { in: ['Uploaded', 'Pending'] };
            } else if (filterVal === 'approved') {
                where.status = 'Approved';
            } else if (filterVal === 'rejected') {
                // Filter by version history: Check if ANY version has been rejected.
                where.versions = {
                    some: {
                        status: { in: ['Rejected', 'rejected'] }
                    }
                };
            } else if (filterVal === 'na') {
                where.status = { notIn: ['Uploaded', 'Pending', 'Approved', 'Rejected'] }; // Likely just 'Pending'
            }
        }

        // Dynamic Version Include
        let versionsInclude = {
            orderBy: { version_no: 'desc' },
            take: 1,
            include: { uploader: true }
        };

        if (approver_status_filter && approver_status_filter.toLowerCase() === 'rejected') {
            versionsInclude.where = { status: { in: ['Rejected', 'rejected'] } };
        }

        const [total, data] = await prisma.$transaction([
            prisma.group_document.count({ where }),
            prisma.group_document.findMany({
                where, skip, take,
                include: {
                    document: { include: { document_type: true } },
                    group: {
                        include: {
                            job_group: {
                                include: { job: true }
                            }
                        }
                    },
                    user: true,
                    customer: true,
                    customer_location: true,
                    po: true,
                    versions: versionsInclude
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        const EnhancedData = this._enhanceWithDueStatuses(data, params);
        const enrichedData = await this._enrichWithVersionContext(EnhancedData);
        const expandedData = this._expandFileUrls(enrichedData);

        return { data: expandedData, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
    }
    /**
     * Get all assigned documents (Admin View)
     */
    async getAllAssignedDocuments(company_id, params = {}) {
        const { page = 1, limit = 50, search = '', customer_id, location_id, po_id, job_id, status } = params;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const { status_filter } = params;
        const where = { company_id };

        if (status_filter && status_filter !== 'all') {
            const filterVal = status_filter.toLowerCase();
            if (filterVal === 'pending') {
                where.status = { in: ['Pending', 'Rejected', 'Upload Due'] };
            } else if (filterVal === 'done') {
                where.status = { in: ['Approved', 'Uploaded', 'Response Due'] };
            } else {
                // Literal match (e.g., 'Approved', 'Uploaded', 'Upload Due')
                where.status = status_filter;
            }
        } else if (status) {
            where.status = status;
        }

        if (customer_id) where.customer_id = customer_id;
        if (location_id) where.customer_location_id = location_id;
        if (po_id) where.po_id = po_id;

        // Handle Job filtering
        if (job_id) {
            where.group = {
                job_group: {
                    some: { job_id: job_id }
                }
            };
        }

        if (search) {
            where.OR = [
                { document: { document_name: { contains: search, mode: 'insensitive' } } },
                { document: { document_number: { contains: search, mode: 'insensitive' } } },
                { shreno_doc_no: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [total, data] = await prisma.$transaction([
            prisma.group_document.count({ where }),
            prisma.group_document.findMany({
                where, skip, take,
                include: {
                    document: { include: { document_type: true } },
                    group: {
                        include: {
                            job_group: {
                                include: { job: true }
                            }
                        }
                    },
                    user: true,
                    customer: true,
                    customer_location: true,
                    po: true,
                    versions: {
                        orderBy: { version_no: 'desc' },
                        take: 1,
                        include: { uploader: true }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            })
        ]);

        const EnhancedData = this._enhanceWithDueStatuses(data, params);
        const enrichedData = await this._enrichWithVersionContext(EnhancedData);
        const expandedData = this._expandFileUrls(enrichedData);
        return { data: expandedData, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
    }


    /**
     * Upload Document Version
     */
    async uploadDocumentVersion(company_id, user_id, document_id, file, remarks) {
        if (!file) throw new Error('File is required');

        const groupDoc = await prisma.group_document.findFirst({
            where: { id: document_id, company_id },
            include: {
                document: true,
                group: {
                    include: {
                        job_group: {
                            include: { job: true }
                        }
                    }
                }
            }
        });

        if (!groupDoc) throw new Error('Document assignment not found');

        return await prisma.$transaction(async (tx) => {
            // Get last version for folder naming
            const lastVersion = await tx.document_version.findFirst({
                where: { group_document_id: document_id },
                orderBy: { version_no: 'desc' }
            });
            const nextVersionNo = lastVersion ? lastVersion.version_no + 1 : 1;

            // 1. Process storage (move to structured directory)
            const job_number = groupDoc.group?.job_group[0]?.job?.job_number || 'NA';
            const document_number = groupDoc.document?.document_number || 'NA';
            
            const targetDir = StorageUtils.getDocRevisionDir(company_id, job_number, document_number, nextVersionNo);
            const storageData = await fileService.processStorage(file, targetDir);

            // 2. Create new version in DB and update document status
            const version = await fileService.createNewVersion(tx, document_id, user_id, storageData, remarks);

            // 3. Log Activity
            await ActivityService.logActivity({
                company_id,
                group_document_id: document_id,
                user_id,
                action: 'Uploaded',
                remarks: `Version ${nextVersionNo} uploaded`,
                metadata: { 
                    version_no: nextVersionNo, 
                    file_name: file.originalname,
                    file_url: version.file_url // Added for trail download
                }
            }, tx);

            // Prepend BACKEND_URL for immediate use in UI
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            if (version.file_url && version.file_url.startsWith('/') && !version.file_url.startsWith('http')) {
                version.file_url = `${backendUrl}${version.file_url}`;
            }

            return version;
        });
    }

    /**
     * Get Documents for Approval
     */
    async getDocumentsForApproval(company_id, params = {}) {
        const { page = 1, limit = 50, search = '', customer_id, po_id, job_id, status } = params;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const where = {
            company_id
        };

        // Server-side Filtering Logic
        const { status_filter, approver_status_filter } = params;

        if (status_filter && status_filter !== 'all') {
            if (status_filter === 'pending') {
                where.status = 'Pending for Approval';
            } else if (status_filter === 'done') {
                where.status = 'Approved';
            }
        } else {
            // Default: Show documents that have been uploaded, approved, or rejected (Pending with versions).
            // strictly exclude 'Pending' documents that have NO versions (newly assigned but not yet uploaded).
            if (!approver_status_filter || approver_status_filter === 'all') {
                where.status = { in: ['Pending for Approval', 'Approved', 'Pending'] };
                where.versions = { some: {} }; // Crucial: Only show documents with at least one upload/version
            }
        }

        if (approver_status_filter && approver_status_filter !== 'all') {
            const filterVal = approver_status_filter.toLowerCase();
            if (filterVal === 'pending for approval' || filterVal === 'pending') {
                where.status = 'Pending for Approval';
            } else if (filterVal === 'approved') {
                where.status = 'Approved';
            } else if (filterVal === 'rejected') {
                // Documents that have been rejected in their history.
                // Since they are now 'Pending', we MUST allow 'Pending' status here.
                where.status = 'Pending'; 
                where.versions = {
                    some: {
                        status: { in: ['Rejected', 'rejected'] }
                    }
                };
            }
        }

        // Backward compatibility for direct status filter (if used)
        if (status && status !== 'All' && !status_filter && !approver_status_filter) {
            where.status = status;
        }

        if (customer_id) where.customer_id = customer_id.trim();
        if (po_id) where.po_id = po_id.trim();

        // Filter by specific job IDs (from Create Transmission)
        const { job_ids } = params;
        if (job_ids) {
            const jobIds = Array.isArray(job_ids) ? job_ids : job_ids.split(',');
            where.group = {
                job_group: {
                    some: {
                        job_id: { in: jobIds }
                    }
                }
            };
        } else if (job_id) {
            // Fallback for single job_id (though likely not used if we use numbers)
            // Check if job_id is valid relation
            where.group = {
                job_group: {
                    some: { job_id: job_id.trim() }
                }
            };
        }



        if (search) {
            where.OR = [
                { document: { document_name: { contains: search, mode: 'insensitive' } } },
                { document: { document_number: { contains: search, mode: 'insensitive' } } }
            ];
        }

        // Dynamic Version Include
        let versionsInclude = {
            orderBy: { version_no: 'desc' },
            take: 1,
            include: {
                uploader: true,
                transmission_items: true // needed to check if already transmitted
            }
        };

        if (approver_status_filter && approver_status_filter.toLowerCase() === 'rejected') {
            versionsInclude.where = { status: { in: ['Rejected', 'rejected'] } };
        }

        const [total, data] = await prisma.$transaction([
            prisma.group_document.count({ where }),
            prisma.group_document.findMany({
                where, skip, take,
                include: {
                    document: { include: { document_type: true } },
                    group: {
                        include: {
                            job_group: {
                                include: { job: true }
                            }
                        }
                    },
                    user: true,
                    customer: true,
                    customer_location: true,
                    po: true,
                    versions: versionsInclude
                },
                orderBy: [
                    { status: 'desc' },
                    { updatedAt: 'desc' }
                ]
            })
        ]);

        // Filter out transmitted documents if requested
        let processingData = data;
        const { exclude_transmitted } = params;
        if (exclude_transmitted === 'true' || exclude_transmitted === true) {
            processingData = data.filter(doc => {
                const latestVersion = doc.versions[0];
                // If latest version has transmission items, it's already transmitted.
                if (latestVersion && latestVersion.transmission_items && latestVersion.transmission_items.length > 0) {
                    return false; // Exclude
                }
                return true;
            });
        }

        const EnhancedData = this._enhanceWithDueStatuses(processingData, params);
        const enrichedData = await this._enrichWithVersionContext(EnhancedData);
        const expandedData = this._expandFileUrls(enrichedData);

        // Note: total might optionally be adjusted if we want precise pagination metadata, 
        // but since this is usually limited to 1000/one-page for creation, keeping original count is acceptable or we accept slight mismatch.
        // For correctness in list view, let's update total if filtered? 
        // Actually total is DB count. We can't easily adjust typical pagination.
        // But for 'Create Transmission' we generally pull all.

        return { data: expandedData, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
    }

    /**
     * Review Document
     */
    async reviewDocument(company_id, user_id, document_id, status, remarks) {
        if (!['Approved', 'Rejected'].includes(status)) throw new Error('Invalid status');

        const groupDoc = await prisma.group_document.findFirst({
            where: { id: document_id, company_id },
            include: { versions: { orderBy: { version_no: 'desc' }, take: 1 } }
        });

        if (!groupDoc) throw new Error('Document not found');

        const latestVersion = groupDoc.versions[0];
        if (!latestVersion) throw new Error('No version to review');

        return await prisma.$transaction(async (tx) => {
            // 1. Update Version Status
            await tx.document_version.update({
                where: { id: latestVersion.id },
                data: { status, remarks }
            });

            // 2. Update Group Document Status
            await tx.group_document.update({
                where: { id: document_id },
                data: { status: status === 'Rejected' ? 'Pending' : 'Approved' }
            });

            // 3. Log Activity
            await ActivityService.logActivity({
                company_id,
                group_document_id: document_id,
                user_id,
                action: status === 'Approved' ? 'Internal Approved' : 'Internal Rejected',
                remarks: remarks || null,
                metadata: { 
                    version_no: latestVersion.version_no,
                    file_url: latestVersion.file_url // Added for trail download
                }
            }, tx);

            return { id: document_id, status };
        });
    }

    /**
     * Create Transmission
     */
    async createTransmission(company_id, user_id, data) {
        const { customer_id, customer_location_id, po_id, document_ids } = data; // document_ids is array of group_document.id

        if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
            throw new Error('No documents selected');
        }

        // 1. Fetch group documents
        const docs = await prisma.group_document.findMany({
            where: { id: { in: document_ids }, company_id },
            include: {
                document: true,
                group: {
                    include: {
                        job_group: {
                            include: { job: true }
                        }
                    }
                }
            }
        });

        if (docs.length !== document_ids.length) throw new Error('Some documents not found');

        // 2. Fetch the latest version for each of these group_documents
        // We need the specific version associated with each group_document for the transmission.
        // The `versions` relation on `group_document` is the correct way to get the versions belonging to that specific group_document.
        // We need the *latest* version of each selected group_document.
        const docsWithVersions = await prisma.group_document.findMany({
            where: { id: { in: document_ids }, company_id },
            include: {
                document: true,
                group: {
                    include: {
                        job_group: {
                            include: { job: true }
                        }
                    }
                },
                versions: {
                    orderBy: { version_no: 'desc' },
                    take: 1,
                    include: { uploader: true } // Include uploader for potential use in ZIP creation or logging
                }
            }
        });

        // Map to ensure each doc has its latest version attached
        const finalDocs = docsWithVersions.map(doc => {
            if (!doc.versions || doc.versions.length === 0) {
                throw new Error(`No versions found for document ID: ${doc.id}`);
            }
            // Attach the latest version directly to the doc object for easier access
            doc.latestVersion = doc.versions[0];
            return doc;
        });

        const invalidDocs = finalDocs.filter(d => d.status !== 'Approved');
        if (invalidDocs.length > 0) {
            throw new Error(`Documents not approved: ${invalidDocs.map(d => d.document.document_number).join(', ')}`);
        }

        // Generate Transmission Number
        // Format: SHRENO-TR-0000001
        const count = await prisma.transmission.count({ where: { company_id } });
        const transNum = `SHRENO-TR-${(count + 1).toString().padStart(7, '0')}`;
        const password = Math.random().toString(36).slice(-8).toUpperCase();

        // 2. Generate ZIP File
        const transmissionZipName = `${transNum}.zip`;
        const ZipUtils = require('../utils/zip.utils');
        await ZipUtils.createTransmissionZip(transmissionZipName, finalDocs); // Now stored in uploads/generated

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

        // Generate UUID first.
        const transmissionId = require('crypto').randomUUID();
        // Use PUBLIC route
        // Use relative link for storage
        const zipDownloadLink = `/api/secure/download/${transmissionId}`;

        return await prisma.$transaction(async (tx) => {
            const transmission = await tx.transmission.create({
                data: {
                    id: transmissionId, // Use pre-generated UUID
                    company_id,
                    transmission_number: transNum,
                    customer_id,
                    customer_location_id,
                    po_id,
                    password: password,
                    created_by: user_id,
                    zip_url: zipDownloadLink // Use secure public link
                },
                include: { po: true }
            });

            // Create items
            for (const doc of finalDocs) {
                await tx.transmission_document.create({
                    data: {
                        transmission_id: transmission.id,
                        group_document_id: doc.id,
                        version_id: doc.versions[0].id
                    }
                });

                // Log Activity for each document
                await ActivityService.logActivity({
                    company_id,
                    group_document_id: doc.id,
                    transmission_id: transmission.id,
                    user_id,
                    action: 'Transmitted',
                    remarks: `Document transmitted in ${transNum}`,
                    metadata: { transmission_no: transNum, version_no: doc.versions[0].version_no }
                }, tx);
            }

            // Log Activity for the transmission itself
            await ActivityService.logActivity({
                company_id,
                transmission_id: transmission.id,
                user_id,
                action: 'Transmitted',
                remarks: `Transmission ${transNum} created and ready for client`,
                metadata: { transmission_no: transNum, document_count: finalDocs.length }
            }, tx);

            // Return transmission details for UI
            return transmission;
        });
    }

    async getTransmissions(company_id, params = {}) {
        const { po_id, page = 1, limit = 10, search, status } = params;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const where = { company_id };
        if (po_id) where.po_id = po_id;
        if (status) where.status = status;

        if (search) {
            where.OR = [
                { transmission_number: { contains: search } },
                { po: { po_number: { contains: search } } }
            ];
        }

        const [data, total] = await Promise.all([
            prisma.transmission.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: skip,
                take: limitNum,
                include: {
                    po: true,
                    customer: true, // Include customer for display
                    documents: {
                        include: {
                            group_document: { // Use group_document
                                include: { document: true }
                            },
                            version: true // Include version for display
                        }
                    }
                }
            }),
            prisma.transmission.count({ where })
        ]);

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const expandedData = data.map(trans => {
            if (trans.zip_url && trans.zip_url.startsWith('/') && !trans.zip_url.startsWith('http')) {
                trans.zip_url = `${backendUrl}${trans.zip_url}`;
            }
            return trans;
        });

        return {
            data: expandedData,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        };
    }

    async getTransmissionDocuments(company_id, transmission_id) {
        const data = await prisma.transmission_document.findMany({
            where: {
                transmission: {
                    id: transmission_id,
                    company_id
                }
            },
            include: {
                group_document: {
                    include: {
                        document: { include: { document_type: true } },
                        group: {
                            include: {
                                job_group: {
                                    include: { job: true }
                                }
                            }
                        },
                        user: true,
                        customer: true,
                        customer_location: true,
                        po: true
                    }
                },
                version: {
                    include: {
                        uploader: true
                    }
                }
            }
        });

        // Enrich with version context
        return data.map(item => {
            if (item.version) {
                item.display_version_no = item.version.version_no;
            }
            return item;
        });
    }

    async getTransmissionTransmittalPDF(company_id, transmission_id) {
        // 1. Fetch transmission details
        const transmission = await prisma.transmission.findFirst({
            where: { id: transmission_id, company_id },
            include: {
                po: true,
                customer: true,
                location: true,
                creator: true,
                documents: true
            }
        });

        if (!transmission) throw new Error('Transmission not found');

        // 2. Fetch full document details
        const documentsData = await this.getTransmissionDocuments(company_id, transmission_id);

        // 3. Generate the PDF Buffer
        const pdfBuffer = await generateTransmittalPDF(
            transmission,
            transmission.customer,
            transmission.location,
            transmission.po,
            documentsData,
            transmission.creator
        );

        const filename = `Document_Transmittal_${transmission.transmission_number}.pdf`;
        return { filename, buffer: pdfBuffer };
    }

    async sendTransmissionEmail(company_id, data) {
        const { transmission_id, shreno_emails, client_emails } = data;

        // 1. Fetch transmission details with required relations for the PDF
        const transmission = await prisma.transmission.findFirst({
            where: { id: transmission_id, company_id },
            include: {
                po: true,
                customer: true,
                location: true,
                creator: true,
                documents: true // To get simple count
            }
        });

        if (!transmission) throw new Error('Transmission not found');

        // 2. Fetch full document details using the existing service method
        const fullDocsResponse = await this.getTransmissionDocuments(company_id, transmission_id);
        const documentsData = fullDocsResponse || [];

        // 3. Generate the PDF Buffer
        const pdfBuffer = await generateTransmittalPDF(
            transmission,
            transmission.customer,
            transmission.location,
            transmission.po,
            documentsData,
            transmission.creator
        );

        const attachments = [
            {
                filename: `Document_Transmittal_${transmission.transmission_number}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ];

        // 4. Send Email using EmailService and attach the PDF
        // Client -> To, Shreno -> CC
        // CC to Shreno, To Client
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const absoluteZipUrl = (transmission.zip_url && transmission.zip_url.startsWith('/') && !transmission.zip_url.startsWith('http'))
            ? `${backendUrl}${transmission.zip_url}`
            : transmission.zip_url;

        await EmailService.sendTransmissionEmail(client_emails, shreno_emails, {
            transmission_number: transmission.transmission_number,
            po_number: transmission.po?.po_number || 'N/A',
            customer_name: transmission.customer?.customer_name || 'N/A',
            document_count: transmission.documents?.length || 0,
            password: transmission.password,
            zip_url: absoluteZipUrl || '#'
        }, attachments);

        // Update status to 'Sent'
        await prisma.transmission.update({
            where: { id: transmission_id },
            data: { status: 'Sent' }
        });

        // Log locally as well
        console.log(`Email sent for transmission: ${transmission.transmission_number}`);

        return { success: true, message: 'Email sent successfully via EmailService' };
    }

    async updateTransmissionClientStatus(company_id, transmission_id, status, remarks, files = []) {
        if (!['Approved', 'Rejected'].includes(status)) throw new Error('Invalid status');

        const transmission = await prisma.transmission.findFirst({
            where: { id: transmission_id, company_id },
            include: { documents: true }
        });

        if (!transmission) throw new Error('Transmission not found');

        let client_archive_url = null;
        const savedFiles = [];

        // 1. Process Client Feedback Files
        if (files && files.length > 0) {
            const { baseDir, uploadDir } = StorageUtils.getTransmissionFeedbackDir(company_id, transmission.transmission_number);
            
            // Move files to feedback directory
            for (const file of files) {
                const targetPath = path.join(uploadDir, file.filename);
                fs.renameSync(file.path, targetPath);
                savedFiles.push({ name: file.originalname, path: targetPath });
            }

            // Generate ZIP of feedback files
            const feedbackZipName = `Feedback_${transmission.transmission_number}.zip`;
            const zipPath = path.join(baseDir, feedbackZipName);
            
            const archiver = require('archiver');
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            await new Promise((resolve, reject) => {
                output.on('close', resolve);
                archive.on('error', reject);
                archive.pipe(output);
                for (const sf of savedFiles) {
                    archive.file(sf.path, { name: sf.name });
                }
                archive.finalize();
            });

            // Store relative path for download
            client_archive_url = `/api/dcc/transmission/${transmission_id}/download-feedback`;
        }

        return await prisma.$transaction(async (tx) => {
            // 2. Update Transmission Record
            const updatedTransmission = await tx.transmission.update({
                where: { id: transmission_id },
                data: {
                    client_status: status,
                    client_remarks: remarks,
                    client_archive_url: client_archive_url
                }
            });

            // 3. Log Activity for Transmission
            await ActivityService.logActivity({
                company_id,
                transmission_id,
                user_id: updatedTransmission.created_by,
                action: status === 'Approved' ? 'Client Approved' : 'Client Rejected',
                remarks: remarks || null,
                metadata: { 
                    file_count: files.length, 
                    transmission_no: updatedTransmission.transmission_number,
                    feedback_files: savedFiles.map(f => f.name),
                    feedback_url: client_archive_url
                }
            }, tx);

            // 4. Update Document Statuses & Log for each document
            const transmissionDocs = await tx.transmission_document.findMany({
                where: { transmission_id }
            });

            const groupDocIds = transmissionDocs
                .map(td => td.group_document_id)
                .filter(id => id);

            const versionIds = transmissionDocs
                .map(td => td.version_id)
                .filter(id => id);

            if (groupDocIds.length > 0) {
                // Update and Log for each Group Document
                // Logic Change: If client rejected, we reset to Pending to allow new revision uploads.
                await tx.group_document.updateMany({
                    where: { id: { in: groupDocIds } },
                    data: { status: status === 'Rejected' ? 'Pending' : 'Approved' }
                });

                for (const gId of groupDocIds) {
                    await ActivityService.logActivity({
                        company_id,
                        group_document_id: gId,
                        transmission_id,
                        user_id: updatedTransmission.created_by,
                        action: status === 'Approved' ? 'Client Approved' : 'Client Rejected',
                        remarks: `Transmission ${updatedTransmission.transmission_number} reviewed by client`,
                        metadata: { status, feedback_url: client_archive_url }
                    }, tx);
                }
            }

            if (versionIds.length > 0) {
                // Update Versions to match client status
                await tx.document_version.updateMany({
                    where: { id: { in: versionIds } },
                    data: {
                        status,
                        remarks: remarks || `Reviewed by Client as ${status}`
                    }
                });
            }

            // (Already handled in Step 4 above: existing group_document status reset to Pending)
            return updatedTransmission;
        });
    }

    async getDocumentVersionById(company_id, version_id) {
        return await prisma.document_version.findFirst({
            where: {
                id: version_id,
                group_document: {
                    company_id: company_id
                }
            },
            include: {
                group_document: true
            }
        });
    }

    async verifyZipPassword(transmissionId, password) {
        if (!transmissionId || !password) return { isValid: false };

        const transmission = await prisma.transmission.findUnique({
            where: { id: transmissionId }
        });

        if (!transmission) return { isValid: false };

        // Simple string comparison
        if (transmission.password === password || transmission.password === password.trim()) {
            const ZipUtils = require('../utils/zip.utils');
            const path = require('path');

            // Reconstruct filename from transmission number
            const filename = `${transmission.transmission_number}.zip`;
            const filePath = ZipUtils.getZipPath(filename);

            if (filePath) {
                return { isValid: true, filePath, fileName: filename };
            }
        }

        return { isValid: false };
    }


    /**
     * Assign Document to Job/User
     */
    async assignDocument(company_id, data) {
        // data = { customer_id, customer_location_id, po_id, job_ids: [], documents: [], user_id, ... }
        const { job_ids, documents, user_id, customer_id, customer_location_id, po_id } = data;

        if (!job_ids || !Array.isArray(job_ids) || job_ids.length === 0) throw new Error('No jobs selected');
        if (!documents || !Array.isArray(documents) || documents.length === 0) throw new Error('No documents selected');
        if (!customer_id) throw new Error("Missing customer_id");
        if (!customer_location_id) throw new Error("Missing customer_location_id");
        if (!po_id) throw new Error("Missing po_id");

        return await prisma.$transaction(async (tx) => {
            // 1. Create Group
            const group = await tx.group.create({
                data: { company_id }
            });

            // 2. Create Job Groups
            const validJobs = await tx.job.findMany({
                where: { id: { in: job_ids }, company_id }
            });

            for (const job of validJobs) {
                await tx.job_group.create({
                    data: {
                        company_id,
                        group_id: group.id,
                        job_id: job.id
                    }
                });
            }

            const results = [];
            // 3. Create Group Documents
            for (const docData of documents) {
                const { document_id, id, assignUserId, assign_user_id, uploadDueDays, upload_due_days, responseDueDays, response_due_days, shrenoDocumentNo, shreno_document_no, shrenoReferenceNo, shreno_reference_no, clientDocumentNo, client_document_no, clientReferenceNo, client_reference_no } = docData;
                const document_master_id = document_id || id;
                const assignedUserId = assignUserId || assign_user_id || user_id; // Prefer doc specific, then global

                if (!document_master_id) continue;

                const groupDoc = await tx.group_document.create({
                    data: {
                        company_id,
                        customer_id,
                        customer_location_id,
                        po_id,
                        group_id: group.id,
                        document_id: document_master_id,
                        user_id: assignedUserId, // User is mandatory in group_document as per schema

                        status: 'Pending',
                        upload_due_days: (uploadDueDays || docData.upload_due_days) ? parseInt(uploadDueDays || docData.upload_due_days) : null,
                        response_due_days: (responseDueDays || docData.response_due_days) ? parseInt(responseDueDays || docData.response_due_days) : null,
                        shreno_doc_no: shrenoDocumentNo || docData.shreno_document_no || null,
                        shreno_reference_no: shrenoReferenceNo || docData.shreno_reference_no || null,
                        client_doc_no: clientDocumentNo || docData.client_document_no || null,
                        client_reference_no: clientReferenceNo || docData.client_reference_no || null
                    }
                });
                results.push(groupDoc);
            }
            return results;
        });
    }

    async updateDocumentMaster(company_id, id, data) {
        const { document_number, document_name, document_type_id } = data;

        // Check duplicates if document_number is being changed
        if (document_number) {
            const existing = await prisma.document_master.findFirst({
                where: {
                    company_id,
                    document_number,
                    NOT: { id: id }
                }
            });
            if (existing) throw new Error('Document number already exists');
        }

        return await prisma.document_master.update({
            where: { id, company_id },
            data: {
                document_number: document_number ? document_number.trim() : undefined,
                document_name: document_name ? document_name.trim() : undefined,
                document_type_id: document_type_id !== undefined ? document_type_id : undefined
            }
        });
    }

    /**
     * Update Assigned Document
     */
    async updateAssignedDocument(company_id, id, data) {
        const { document_id, job_ids, assign_user_id, upload_due_days, response_due_days, shreno_document_no, shreno_reference_no, client_document_no, client_reference_no } = data;

        const groupDoc = await prisma.group_document.findFirst({
            where: { id, company_id },
            include: { group: true }
        });

        if (!groupDoc) throw new Error('Assignment not found');

        return await prisma.$transaction(async (tx) => {
            // 1. Update Group Document
            const updatedGroupDoc = await tx.group_document.update({
                where: { id },
                data: {
                    document_id: document_id || undefined,
                    user_id: assign_user_id || undefined,
                    upload_due_days: upload_due_days !== undefined ? parseInt(upload_due_days) : undefined,
                    response_due_days: response_due_days !== undefined ? parseInt(response_due_days) : undefined,
                    shreno_doc_no: shreno_document_no || undefined,
                    shreno_reference_no: shreno_reference_no || undefined,
                    client_doc_no: client_document_no || undefined,
                    client_reference_no: client_reference_no || undefined
                }
            });

            // 2. Update Job Groups if job_ids provided
            if (job_ids && Array.isArray(job_ids)) {
                const groupId = groupDoc.group_id;
                
                // Delete old job groups
                await tx.job_group.deleteMany({
                    where: { group_id: groupId, company_id }
                });

                // Create new job groups
                for (const jobId of job_ids) {
                    await tx.job_group.create({
                        data: {
                            company_id,
                            group_id: groupId,
                            job_id: jobId
                        }
                    });
                }
            }

            return updatedGroupDoc;
        });
    }

    /**
     * Helper to calculate "Upload Due" and "Response Due" statuses
     * @private
     */
    _enhanceWithDueStatuses(docs, params = {}) {
        const { approver_status_filter } = params;
        const now = new Date();

        return docs.map(doc => {
            // 1. Handle Rejected status (flatten version status if filtering by rejected)
            if (approver_status_filter && approver_status_filter.toLowerCase() === 'rejected') {
                const rejectedVersion = doc.versions[0];
                if (rejectedVersion) {
                    doc.status = rejectedVersion.status;
                    doc.updatedAt = rejectedVersion.createdAt; 
                }
            }

            // 2. Logic for "Upload Due"
            // If Pending and deadline passed since assignment (createdAt)
            if (doc.status === 'Pending' && doc.upload_due_days) {
                const created = new Date(doc.createdAt);
                const uploadDeadline = new Date(created.getTime() + (doc.upload_due_days * 24 * 60 * 60 * 1000));
                if (now > uploadDeadline) {
                    doc.status = 'Upload Due';
                }
            }

            // 3. Logic for "Response Due"
            // If Uploaded and deadline passed since the last upload
            if (doc.status === 'Uploaded' && doc.response_due_days) {
                const lastVersion = doc.versions[0];
                if (lastVersion) {
                    const uploadedAt = new Date(lastVersion.createdAt);
                    const responseDeadline = new Date(uploadedAt.getTime() + (doc.response_due_days * 24 * 60 * 60 * 1000));
                    if (now > responseDeadline) {
                        doc.status = 'Response Due';
                    }
                }
            }

            return doc;
        });
    }

    /**
     * Helper to show version context (v1, v2, v3...) only for uploaded documents
     * @private
     */
    async _enrichWithVersionContext(docs) {
        if (!docs || docs.length === 0) return docs;

        return docs.map(doc => {
            // If the task has a version, use it. Otherwise, return null (for Pending tasks)
            if (doc.versions && doc.versions.length > 0) {
                doc.display_version_no = doc.versions[0].version_no;
            } else {
                doc.display_version_no = null;
            }
            return doc;
        });
    }

    /**
     * Helper to expand relative file_urls to full URLs for Frontend
     * @private
     */
    _expandFileUrls(docs) {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        return docs.map(doc => {
            if (doc.versions && doc.versions.length > 0) {
                doc.versions = doc.versions.map(v => {
                    if (v.file_url && v.file_url.startsWith('/') && !v.file_url.startsWith('http')) {
                        v.file_url = `${backendUrl}${v.file_url}`;
                    }
                    return v;
                });
            }
            return doc;
        });
    }

    /**
     * Bulk Assign Documents
     */
    async bulkAssignDocuments(company_id, data) {
        const { customer_id, customer_location_id, po_id, assignments } = data;

        if (!customer_id || !customer_location_id || !po_id || !assignments || !Array.isArray(assignments)) {
            throw new Error('Invalid assignment data');
        }

        return await prisma.$transaction(async (tx) => {
            const results = [];

            // Fetch all job numbers for the assignments to use in logging
            const jobIds = [...new Set(assignments.map(a => a.job_id).filter(Boolean))];
            const foundJobs = await tx.job.findMany({
                where: { id: { in: jobIds } },
                select: { id: true, job_number: true }
            });
            const jobMap = Object.fromEntries(foundJobs.map(j => [j.id, j.job_number]));

            for (const assign of assignments) {
                const { 
                    job_id, 
                    document_name, 
                    document_type_id,
                    assign_user_id, 
                    upload_due_days, 
                    response_due_days, 
                    actual_due_days,
                    shreno_document_no, 
                    shreno_reference_no, 
                    client_document_no, 
                    client_reference_no 
                } = assign;

                if (!job_id || !document_name || !assign_user_id) continue;

                // 1. Find or Create Document Master for this name and type
                let documentMaster = await tx.document_master.findFirst({
                    where: { 
                        company_id, 
                        document_name: document_name.trim()
                    }
                });

                if (!documentMaster) {
                    // Generate a unique sequential document number
                    const maxDoc = await tx.document_master.findFirst({
                        where: { company_id },
                        orderBy: { serial_no: 'desc' }
                    });
                    const serial_no = (maxDoc?.serial_no || 0) + 1;
                    const document_number = `DOC-${serial_no}`;

                    documentMaster = await tx.document_master.create({
                        data: {
                            company_id,
                            serial_no,
                            document_name: document_name.trim(),
                            document_number: document_number,
                            document_type_id: document_type_id || null
                        }
                    });
                }

                // 2. Create a unique Group for this specific assignment
                const group = await tx.group.create({
                    data: { company_id }
                });

                await tx.job_group.create({
                    data: {
                        company_id,
                        group_id: group.id,
                        job_id: job_id
                    }
                });

                const groupDoc = await tx.group_document.create({
                    data: {
                        company_id,
                        customer_id,
                        customer_location_id,
                        po_id,
                        group_id: group.id,
                        document_id: documentMaster.id,
                        user_id: assign_user_id,

                        status: 'Pending',
                        upload_due_days: upload_due_days ? parseInt(upload_due_days) : null,
                        response_due_days: response_due_days ? parseInt(response_due_days) : null,
                        actual_due_days: actual_due_days ? parseInt(actual_due_days) : null,
                        shreno_doc_no: shreno_document_no || null,
                        shreno_reference_no: shreno_reference_no || null,
                        client_doc_no: client_document_no || null,
                        client_reference_no: client_reference_no || null
                    }
                });

                results.push(groupDoc);

                // 3. Log Activity
                await ActivityService.logActivity({
                    company_id,
                    group_document_id: groupDoc.id,
                    user_id: assign_user_id, // Logged against destination user
                    action: 'Assigned',
                    remarks: `Document assigned for job ${jobMap[job_id] || job_id}`
                }, tx);
            }

            return results;
        });
    }
}

module.exports = new DccService();
