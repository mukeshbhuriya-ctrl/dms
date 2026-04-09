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
            limit,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params;

        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);

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
                limit: (limit === undefined || limit === null) ? total : take,
                totalPages: (limit === undefined || limit === null) ? 1 : Math.max(1, Math.ceil(total / take))
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
        const { page = 1, limit, search = '' } = params;
        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);
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

        return { data, meta: { total, page: parseInt(page), limit: (limit === undefined || limit === null) ? total : take, totalPages: (limit === undefined || limit === null) ? 1 : Math.ceil(total / take) } };
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
        const { page = 1, limit, search = '', customer_id } = params;
        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);
        const where = { company_id };

        if (customer_id) where.customer_id = customer_id.trim();

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

        const metaLimit = (limit === undefined || limit === null) ? total : take;
        const totalPages = (limit === undefined || limit === null) ? 1 : Math.max(1, Math.ceil(total / take));

        return { data: expandedData, meta: { total, page: parseInt(page), limit: metaLimit, totalPages } };
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
        const { page = 1, limit, search = '', po_id, customer_id, customer_location_id } = params;
        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);
        const where = { company_id };

        if (customer_id) where.customer_id = customer_id.trim();
        if (po_id) {
            where.job_group = {
                some: { group: { group_document: { some: { po_id: po_id.trim() } } } }
            };
        }

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
                    customer: true,
                    customer_location: true,
                    po: true
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return { data, meta: { total, page: parseInt(page), limit: (limit === undefined || limit === null) ? total : take, totalPages: (limit === undefined || limit === null) ? 1 : Math.ceil(total / take) } };
    }

    /**
     * Get unique filters (Customers, POs, Jobs) that actually have assigned documents
     */
    async getActiveFilters(company_id, user_id = null, options = {}) {
        const getFilters = async (uid = null) => {
            const whereClause = { company_id };
            if (uid) whereClause.user_id = uid;
            
            // Check for specific document status/approval filters
            if (options.isApproved) {
                whereClause.status = 'Approved';
            }
            if (options.isTransmittable) {
                // Ensure document is approved AND not yet transmitted
                whereClause.status = 'Approved';
                whereClause.transmission_items = { none: {} };
            }

            // Fetch the documents with their core relations
            const activeDocs = await prisma.group_document.findMany({
                where: whereClause,
                include: {
                    customer: { select: { id: true, customer_name: true } },
                    po: { select: { id: true, po_number: true, customer_id: true, customer_location: { select: { id: true, location_name: true } } } },
                    group: {
                        include: {
                            job_group: {
                                include: {
                                    job: {
                                        select: {
                                            id: true,
                                            job_number: true,
                                            po_id: true,
                                            customer_id: true,
                                            customer_location: { select: { id: true, location_name: true } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // Extract unique Customers
            const customersMap = new Map();
            // Extract unique POs
            const posMap = new Map();
            // Extract unique Jobs
            const jobsMap = new Map();

            activeDocs.forEach(doc => {
                if (doc.customer) customersMap.set(doc.customer.id, doc.customer);
                if (doc.po) posMap.set(doc.po.id, { 
                    ...doc.po, 
                    customer: doc.customer 
                });
                
                // Jobs are nested in group -> job_group
                doc.group?.job_group?.forEach(jg => {
                    if (jg.job) {
                        jobsMap.set(jg.job.id, {
                            ...jg.job,
                            po: doc.po,
                            customer: doc.customer
                        });
                    }
                });
            });

            return {
                customers: Array.from(customersMap.values()),
                pos: Array.from(posMap.values()),
                jobs: Array.from(jobsMap.values())
            };
        };

        // Try getting user-specific filters first
        let result = await getFilters(user_id);

        // Fallback: If uploader has no filters (maybe assigned via group only), 
        // fallback to company-wide active filters so dropdowns aren't empty
        if (user_id && result.customers.length === 0 && result.pos.length === 0 && result.jobs.length === 0) {
            result = await getFilters(null);
        }

        return result;
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
        const { page = 1, limit, search = '', exclude_transmitted, exclude_assigned, include_id } = params;
        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);
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

        return { data, meta: { total, page: parseInt(page), limit: (limit === undefined || limit === null) ? total : take, totalPages: (limit === undefined || limit === null) ? 1 : Math.ceil(total / take) } };
    }



    /**
     * Get documents assigned to user (for Upload)
     */
    async getMyAssignedDocuments(company_id, user_id, params = {}) {
        const { page = 1, limit, search = '' } = params;
        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);

        const {
            status_filter,
            approver_status_filter,
            uploader_status_filter,
            customer_name_filter,
            po_number_filter,
            job_number_filter
        } = params;

        const where = { company_id, user_id };

        // Standardize status filtering
        const activeStatusFilter = uploader_status_filter || approver_status_filter || (status_filter && status_filter !== 'all' ? status_filter : null);

        if (activeStatusFilter) {
            const filterVal = activeStatusFilter.toLowerCase();
            if (filterVal === 'pending' || filterVal === 'awaiting_upload') {
                where.status = { in: ['Pending', 'Upload Due'] };
            } else if (filterVal === 'pending_approval' || filterVal === 'pending for approval') {
                where.status = 'Pending for Approval';
            } else if (filterVal === 'uploaded' || filterVal === 'done') {
                where.status = { notIn: ['Pending', 'Upload Due', 'Rejected'] };
            } else if (filterVal === 'approved') {
                where.status = 'Approved';
            } else if (filterVal === 'rejected') {
                where.status = 'Rejected';
            } else {
                where.status = activeStatusFilter;
            }
        }

        // Explicit Column Filters (Robust Array/String handling for Multi-select)
        const processFilter = (val) => {
            if (!val) return null;
            if (Array.isArray(val)) return { in: val };
            if (typeof val === 'string' && val.includes(',')) return { in: val.split(',').map(v => v.trim()) };
            return { contains: val, mode: 'insensitive' };
        };

        if (customer_name_filter) {
            where.customer = { customer_name: processFilter(customer_name_filter) };
        }
        if (po_number_filter) {
            where.po = { po_number: processFilter(po_number_filter) };
        }
        if (job_number_filter) {
            where.group = {
                job_group: {
                    some: { job: { job_number: processFilter(job_number_filter) } }
                }
            };
        }

        if (search) {
            where.OR = [
                { document: { document_name: { contains: search, mode: 'insensitive' } } },
                { document: { document_number: { contains: search, mode: 'insensitive' } } },
                { customer: { customer_name: { contains: search, mode: 'insensitive' } } },
                { po: { po_number: { contains: search, mode: 'insensitive' } } },
                {
                    group: {
                        job_group: {
                            some: {
                                job: {
                                    job_number: { contains: search, mode: 'insensitive' }
                                }
                            }
                        }
                    }
                }
            ];
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

        const metaLimit = (limit === undefined || limit === null) ? total : take;
        const totalPages = (limit === undefined || limit === null) ? 1 : Math.max(1, Math.ceil(total / take));

        return { data: expandedData, meta: { total, page: parseInt(page), limit: metaLimit, totalPages } };
    }
    /**
     * Get all assigned documents (Admin View)
     */
    async getAllAssignedDocuments(company_id, params = {}) {
        const { page = 1, limit, search = '', customer_id, location_id, po_id, job_id, status } = params;
        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);

        const {
            status_filter,
            uploader_status_filter,
            customer_name_filter,
            po_number_filter,
            job_number_filter
        } = params;

        const where = { company_id };

        // Standardize status filtering across global and column-based filters
        const activeStatusFilter = uploader_status_filter || (status_filter && status_filter !== 'all' ? status_filter : null) || status;

        if (activeStatusFilter) {
            const filterVal = activeStatusFilter.toLowerCase();
            if (filterVal === 'pending' || filterVal === 'awaiting_upload') {
                where.status = { in: ['Pending', 'Upload Due'] };
            } else if (filterVal === 'pending_approval' || filterVal === 'pending for approval') {
                where.status = 'Pending for Approval';
            } else if (filterVal === 'uploaded' || filterVal === 'done') {
                where.status = { notIn: ['Pending', 'Upload Due', 'Rejected'] };
            } else if (filterVal === 'approved') {
                where.status = 'Approved';
            } else if (filterVal === 'rejected') {
                where.status = 'Rejected';
            } else {
                where.status = activeStatusFilter;
            }
        }

        // Explicit Column Filters (Robust Array/String handling for Multi-select)
        const processFilter = (val) => {
            if (!val) return null;
            if (Array.isArray(val)) return { in: val };
            if (typeof val === 'string' && val.includes(',')) return { in: val.split(',').map(v => v.trim()) };
            return { contains: val, mode: 'insensitive' };
        };

        if (customer_name_filter) {
            where.customer = { customer_name: processFilter(customer_name_filter) };
        }
        if (po_number_filter) {
            where.po = { po_number: processFilter(po_number_filter) };
        }
        if (job_number_filter) {
            where.group = {
                job_group: {
                    some: { job: { job_number: processFilter(job_number_filter) } }
                }
            };
        }

        // ID-based filters (existing)
        if (customer_id) where.customer_id = customer_id;
        if (location_id) where.customer_location_id = location_id;
        if (po_id) where.po_id = po_id;
        if (job_id) {
            // If already set via job_number_filter, this might override or combine
            // Usually only one is used at a time in the UI
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
                { shreno_doc_no: { contains: search, mode: 'insensitive' } },
                { client_doc_no: { contains: search, mode: 'insensitive' } },
                { po: { po_number: { contains: search, mode: 'insensitive' } } },
                { customer: { customer_name: { contains: search, mode: 'insensitive' } } },
                {
                    group: {
                        job_group: {
                            some: {
                                job: {
                                    job_number: { contains: search, mode: 'insensitive' }
                                }
                            }
                        }
                    }
                }
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
        const metaLimit = (limit === undefined || limit === null) ? total : take;
        const totalPages = (limit === undefined || limit === null) ? 1 : Math.max(1, Math.ceil(total / take));

        return { data: expandedData, meta: { total, page: parseInt(page), limit: metaLimit, totalPages } };
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
            const nextVersionNo = lastVersion ? lastVersion.version_no + 1 : 0;

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
        const {
            page = 1,
            limit,
            search = '',
            customer_id,
            po_id,
            status,
            status_filter,
            approver_status_filter,
            uploader_status_filter,
            customer_name_filter,
            po_number_filter,
            job_number_filter,
            exclude_transmitted,
            job_ids,
            job_id
        } = params;

        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);

        const where = { company_id };

        // Standardize status filtering
        const activeStatusFilter = uploader_status_filter || approver_status_filter || (status_filter && status_filter !== 'all' ? status_filter : null) || status;

        if (activeStatusFilter) {
            const filterVal = activeStatusFilter.toLowerCase();
            if (filterVal === 'pending' || filterVal === 'awaiting_upload') {
                where.status = { in: ['Pending', 'Upload Due'] };
            } else if (filterVal === 'pending_approval' || filterVal === 'pending for approval') {
                where.status = 'Pending for Approval';
            } else if (filterVal === 'uploaded' || filterVal === 'done') {
                where.status = { notIn: ['Pending', 'Upload Due', 'Rejected'] };
            } else if (filterVal === 'approved') {
                where.status = 'Approved';
            } else if (filterVal === 'rejected') {
                where.status = 'Rejected';
            } else {
                where.status = activeStatusFilter;
            }
        }

        // Explicit Column Filters (Robust Array/String handling for Multi-select)
        const processFilter = (val) => {
            if (!val) return null;
            if (Array.isArray(val)) return { in: val };
            if (typeof val === 'string' && val.includes(',')) return { in: val.split(',').map(v => v.trim()) };
            return { contains: val, mode: 'insensitive' };
        };

        if (customer_name_filter) {
            where.customer = { customer_name: processFilter(customer_name_filter) };
        }
        if (po_number_filter) {
            where.po = { po_number: processFilter(po_number_filter) };
        }
        if (job_number_filter) {
            where.group = {
                job_group: {
                    some: { job: { job_number: processFilter(job_number_filter) } }
                }
            };
        }
        if (approver_status_filter) {
            const filterVal = approver_status_filter.toLowerCase();
            if (filterVal === 'pending_approval' || filterVal === 'pending for approval') {
                where.status = 'Pending for Approval';
            } else if (filterVal === 'awaiting_upload') {
                where.status = { in: ['Pending', 'Upload Due'] };
            } else {
                where.status = { contains: approver_status_filter, mode: 'insensitive' };
            }
        }

        if (customer_id) where.customer_id = customer_id.trim();
        if (po_id) where.po_id = po_id.trim();

        // Optimized Exclude Transmitted & Job Filters
        // Build common conditions for versions
        const versionConditions = {};
        if (exclude_transmitted === 'true' || exclude_transmitted === true) {
            // Exclude versions that are already part of a transmission
            versionConditions.transmission_items = { none: {} };
        }

        // Apply version conditions if any, or default to checking for existence if no status filter
        if (Object.keys(versionConditions).length > 0) {
            where.versions = { some: versionConditions };
        } else if (!where.status) {
            where.versions = { some: {} };
        }

        // Filter by specific job IDs (from Create Transmission)
        if (job_ids) {
            const jobIdsArray = Array.isArray(job_ids) ? job_ids : job_ids.split(',');
            where.group = {
                job_group: {
                    some: { job_id: { in: jobIdsArray } }
                }
            };
        } else if (job_id) {
            where.group = {
                job_group: {
                    some: { job_id: job_id.trim() }
                }
            };
        }

        if (search) {
            where.OR = [
                { document: { document_name: { contains: search, mode: 'insensitive' } } },
                { document: { document_number: { contains: search, mode: 'insensitive' } } },
                { customer: { customer_name: { contains: search, mode: 'insensitive' } } },
                { po: { po_number: { contains: search, mode: 'insensitive' } } },
                {
                    group: {
                        job_group: {
                            some: {
                                job: {
                                    job_number: { contains: search, mode: 'insensitive' }
                                }
                            }
                        }
                    }
                }
            ];
        }

        // Dynamic Version Include
        let versionsInclude = {
            orderBy: { version_no: 'desc' },
            take: 1,
            include: {
                uploader: true,
                transmission_items: true
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

        const EnhancedData = this._enhanceWithDueStatuses(data, params);
        const enrichedData = await this._enrichWithVersionContext(EnhancedData);
        const expandedData = this._expandFileUrls(enrichedData);

        const metaLimit = (limit === undefined || limit === null) ? total : take;
        const totalPages = (limit === undefined || limit === null) ? 1 : Math.max(1, Math.ceil(total / take));

        return { data: expandedData, meta: { total, page: parseInt(page), limit: metaLimit, totalPages } };
    }

    /**
     * Review Document
     */
    async reviewDocument(company_id, user_id, document_id, status, remarks) {
        if (!['Approved', 'Rejected'].includes(status)) throw new Error('Invalid status');

        const groupDoc = await prisma.group_document.findFirst({
            where: { id: document_id, company_id },
            include: {
                versions: { orderBy: { version_no: 'desc' }, take: 1 },
                document: true
            }
        });

        if (!groupDoc) throw new Error('Document not found');

        const latestVersion = groupDoc.versions[0];
        if (!latestVersion) throw new Error('No version to review');

        const result = await prisma.$transaction(async (tx) => {
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
                    file_url: latestVersion.file_url
                }
            }, tx);

            return { id: document_id, status };
        });

        // 4. Trigger Email Notification to Uploader in background
        this._sendReviewNotification(groupDoc, latestVersion, status, remarks).catch(e =>
            console.error("[DccService] Review notification error:", e)
        );

        return result;
    }

    /**
     * Helper to send review notification in background
     * @private
     */
    async _sendReviewNotification(groupDoc, latestVersion, status, remarks) {
        try {
            const uploader = await prisma.user.findUnique({
                where: { id: groupDoc.user_id }
            });

            if (uploader && uploader.email) {
                await EmailService.sendDocumentReviewNotification(uploader.email, uploader.name, {
                    documentName: groupDoc.document?.document_name || 'Document',
                    documentNumber: groupDoc.document?.document_number || 'N/A',
                    versionNo: latestVersion.version_no,
                    status: status,
                    remarks: remarks || ''
                });
                console.log(`[DccService] Review email sent to ${uploader.email} for ${groupDoc.document?.document_number}`);
            }
        } catch (error) {
            console.error("[DccService] Failed to send review notification email:", error);
        }
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

    async getTransmissionFilters(company_id) {
        const transmissions = await prisma.transmission.findMany({
            where: { company_id },
            include: {
                customer: { select: { id: true, customer_name: true } },
                po: { select: { id: true, po_number: true } }
            }
        });

        const customersMap = new Map();
        const posMap = new Map();

        transmissions.forEach(t => {
            if (t.customer) customersMap.set(t.customer.id, t.customer);
            if (t.po) posMap.set(t.po.id, {
                ...t.po,
                customer: t.customer
            });
        });

        return {
            customers: Array.from(customersMap.values()),
            pos: Array.from(posMap.values())
        };
    }

    async getTransmissions(company_id, params = {}) {
        const { po_id, page = 1, limit = 10, search, status, customer_name_filter, po_number_filter } = params;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const where = { company_id };
        if (po_id) where.po_id = po_id;
        if (status) where.status = status;

        // Apply Column Specific Filters
        if (customer_name_filter) {
            where.customer = { 
                customer_name: { contains: customer_name_filter, mode: 'insensitive' } 
            };
        }
        if (po_number_filter) {
            where.po = { 
                po_number: { contains: po_number_filter, mode: 'insensitive' } 
            };
        }

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
                        po: true,
                        versions: {
                            orderBy: { version_no: 'desc' },
                            take: 1,
                            include: { uploader: true }
                        }
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
        const { transmission_id, shreno_emails, client_emails, include_zip = true } = data;

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

        // 3. Prepare attachments and format documents for email template
        let attachments = [];
            const pdfBuffer = await generateTransmittalPDF(
                transmission,
                transmission.customer,
                transmission.location,
                transmission.po,
                documentsData,
                transmission.creator
            );

            attachments.push({
                filename: `Document_Transmittal_${transmission.transmission_number}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            });

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
            zip_url: absoluteZipUrl || '#',
            include_zip: !!include_zip
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

                // Calculate and store actual_due_days on approval
                if (status === 'Approved') {
                    for (const gId of groupDocIds) {
                        try {
                            const firstVersion = await tx.document_version.findFirst({
                                where: { group_document_id: gId },
                                orderBy: { createdAt: 'asc' }
                            });

                            if (firstVersion) {
                                const start = new Date(firstVersion.createdAt);
                                const end = new Date();
                                const diffTime = Math.abs(end - start);
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                await tx.group_document.update({
                                    where: { id: gId },
                                    data: { actual_due_days: diffDays }
                                });
                            }
                        } catch (calcError) {
                            console.error(`[DccService] Error calculating actual_due_days for doc ${gId}:`, calcError);
                        }
                    }
                }

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

    /**
     * Update Client Status for an individual Document within a Transmission
     * Creates a new version for the document feedback.
     * Statuses: Approved, Rejected, Commented
     */
    async updateTransmissionDocumentClientStatus(company_id, user_id, transmission_document_id, status, remarks, file) {
        if (!['Approved', 'Rejected', 'Commented'].includes(status)) throw new Error('Invalid status');

        // 1. Fetch transmission document with all needed relations
        const transDoc = await prisma.transmission_document.findFirst({
            where: { id: transmission_document_id },
            include: {
                transmission: true,
                group_document: {
                    include: {
                        document: true,
                        versions: { orderBy: { version_no: 'desc' }, take: 1 }
                    }
                }
            }
        });

        if (!transDoc) throw new Error('Transmission document link not found');
        if (transDoc.transmission.company_id !== company_id) throw new Error('Unauthorized');

        const groupDoc = transDoc.group_document;
        const masterDocId = groupDoc.document_id;

        // Use global version counter across ALL group_documents sharing the same document_master
        // This matches the pattern in file.service.js
        const lastGlobalVersion = await prisma.document_version.findFirst({
            where: { group_document: { document_id: masterDocId } },
            orderBy: { version_no: 'desc' }
        });
        const nextVersionNo = lastGlobalVersion ? lastGlobalVersion.version_no + 1 : 0;

        return await prisma.$transaction(async (tx) => {
            let newVersion = null;

            // 2. Process File if provided (Create New Version)
            if (file) {
                const docNumber = groupDoc.document.document_number;
                const transNumber = transDoc.transmission.transmission_number;
                
                // Directory pattern: transmissions/[TR_NO]/client_feedback/[DOC_NO]/rev_[REV_NO]
                const targetDir = StorageUtils.getTransmissionDocumentFeedbackDir(company_id, transNumber, docNumber, nextVersionNo);
                const targetPath = path.join(targetDir, file.filename || file.originalname);
                
                // Move file from temp to final destination
                fs.renameSync(file.path, targetPath);

                const relativePath = StorageUtils.getRelativePath(targetPath);
                
                // Use the same URL pattern as file.service.js for consistency
                const fileUrl = `/api/dcc/document/${groupDoc.id}/download?version=${nextVersionNo}`;

                // Mark ALL previous versions of this Master Document as inactive (matching file.service.js)
                await tx.document_version.updateMany({
                    where: { 
                        group_document: { document_id: masterDocId },
                        is_active: true 
                    },
                    data: { is_active: false }
                });

                newVersion = await tx.document_version.create({
                    data: {
                        group_document_id: groupDoc.id,
                        version_no: nextVersionNo,
                        file_url: fileUrl,
                        file_path: relativePath,
                        file_size: file.size,
                        mime_type: file.mimetype,
                        status: status,
                        remarks: remarks || `Client review ${status}`,
                        uploaded_by: user_id,
                        is_active: true
                    }
                });
            }

            // 3. Update the transmission_document with per-document client status
            await tx.transmission_document.update({
                where: { id: transmission_document_id },
                data: {
                    client_status: status,
                    client_remarks: remarks || null
                }
            });

            // 4. Update Group Document Status
            // Approved → Approved, Rejected → Pending (for re-upload), Commented → No change
            if (status === 'Approved') {
                await tx.group_document.update({
                    where: { id: groupDoc.id },
                    data: { status: 'Approved' }
                });
            } else if (status === 'Rejected') {
                await tx.group_document.update({
                    where: { id: groupDoc.id },
                    data: { status: 'Pending' }
                });
            }
            // Commented: no group_document status change

            // 5. Auto-compute parent Transmission client_status
            const allTransDocs = await tx.transmission_document.findMany({
                where: { transmission_id: transDoc.transmission_id },
                select: { client_status: true }
            });

            const statuses = allTransDocs.map(d => d.client_status);
            let transmissionStatus = 'Pending';

            if (statuses.every(s => s === 'Approved')) {
                transmissionStatus = 'Approved';
            } else if (statuses.every(s => s === 'Rejected')) {
                transmissionStatus = 'Rejected';
            } else if (statuses.some(s => s !== 'Pending')) {
                transmissionStatus = 'Partially Approved';
            }

            await tx.transmission.update({
                where: { id: transDoc.transmission_id },
                data: { client_status: transmissionStatus }
            });

            // 6. Log Activity with complete metadata for audit trail
            const actionLabel = status === 'Approved' ? 'Client Approved' 
                              : status === 'Rejected' ? 'Client Rejected' 
                              : 'Client Commented';

            await ActivityService.logActivity({
                company_id,
                group_document_id: groupDoc.id,
                transmission_id: transDoc.transmission_id,
                user_id,
                action: actionLabel,
                remarks: remarks || `Document reviewed from Transmission ${transDoc.transmission.transmission_number}`,
                metadata: {
                    status,
                    transmission_number: transDoc.transmission.transmission_number,
                    document_number: groupDoc.document.document_number,
                    document_name: groupDoc.document.document_name,
                    version_no: newVersion ? nextVersionNo : (lastGlobalVersion?.version_no ?? 0),
                    has_file: !!file,
                    new_version_id: newVersion?.id,
                    transmission_status: transmissionStatus
                }
            }, tx);

            return { group_document: groupDoc, version: newVersion, transmission_status: transmissionStatus };
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

        // Trigger notifications as background task
        this._sendAssignmentNotifications(company_id, results).catch(e =>
            console.error("[DccService] Assignment notification error:", e)
        );

        return results;
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
            // 3. Logic for "Response Due"
            // If Pending for Approval and deadline passed since the last upload
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

            // 4. Logic for dynamic "Actual Due Days"
            // If not already set (e.g. not yet approved), but at least one version exists
            if (!doc.actual_due_days && doc.versions && doc.versions.length > 0) {
                // Find earliest created version
                const earliestVersion = [...doc.versions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
                if (earliestVersion) {
                    const start = new Date(earliestVersion.createdAt);
                    const diffTime = Math.abs(now - start);
                    doc.actual_due_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
        const { assignments } = data;

        if (!assignments || !Array.isArray(assignments)) {
            throw new Error('Invalid assignment data');
        }

        const results = await prisma.$transaction(async (tx) => {

            const results = [];

            // Fetch all job details for the assignments to get Customer, Location, PO, and Job Number
            const jobIds = [...new Set(assignments.map(a => a.job_id).filter(Boolean))];
            const foundJobs = await tx.job.findMany({
                where: { id: { in: jobIds } },
                select: { id: true, job_number: true, customer_id: true, customer_location_id: true, po_id: true }
            });
            const jobMap = Object.fromEntries(foundJobs.map(j => [j.id, j]));

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

                // Extract customer, location, and po from the verified job mapping
                const targetJob = jobMap[job_id];
                if (!targetJob) continue;

                const customer_id = targetJob.customer_id;
                const customer_location_id = targetJob.customer_location_id;
                const po_id = targetJob.po_id;

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
                    remarks: `Document assigned for job ${targetJob.job_number || job_id}`
                }, tx);
            }

            return results;
        });

        // Trigger notifications as background task
        this._sendAssignmentNotifications(company_id, results).catch(e =>
            console.error("[DccService] Bulk assignment notification error:", e)
        );

        return results;
    }

    /**
     * Send Assignment Notifications
     * Groups documents by user and sends a consolidated email.
     */
    async _sendAssignmentNotifications(company_id, groupDocuments) {
        if (!groupDocuments || groupDocuments.length === 0) return;

        try {
            // Group by User ID
            const userGroups = {};
            for (const gd of groupDocuments) {
                if (!userGroups[gd.user_id]) userGroups[gd.user_id] = [];
                userGroups[gd.user_id].push(gd.id);
            }

            for (const userId in userGroups) {
                const user = await prisma.user.findUnique({ where: { id: userId } });
                if (!user || !user.email) continue;

                // Fetch full doc details for the email
                const fullDocs = await prisma.group_document.findMany({
                    where: { id: { in: userGroups[userId] } },
                    include: {
                        document: true,
                        group: { include: { job_group: { include: { job: true } } } }
                    }
                });

                const emailDocs = fullDocs.map(fd => ({
                    document_name: fd.document.document_name,
                    document_number: fd.document.document_number,
                    job_number: fd.group?.job_group?.map(jg => jg.job?.job_number).join(', ') || 'N/A',
                    upload_due_days: fd.upload_due_days
                }));

                await EmailService.sendDocumentAssignmentNotification(user.email, user.name, emailDocs);
                console.log(`[DccService] Assignment email sent to ${user.email} for ${emailDocs.length} items`);
            }
        } catch (error) {
            console.error("[DccService] Error sending assignment notifications:", error);
        }
    }

    /**
     * Periodic check for overdue documents
     */
    async checkOverdueDocuments() {
        console.log(`[DccService] ${new Date().toISOString()} Starting periodic overdue check...`);
        const now = new Date();

        try {
            // 1. Check for UPLOAD OVERDUE (Pending docs)
            const pendingDocs = await prisma.group_document.findMany({
                where: {
                    status: 'Pending',
                    upload_due_days: { not: null }
                },
                include: { user: true, document: true, group: { include: { job_group: { include: { job: true } } } } }
            });

            const uploadOverdueUsers = {}; // userId -> docs[]

            for (const doc of pendingDocs) {
                const created = new Date(doc.createdAt);
                const deadline = new Date(created.getTime() + (doc.upload_due_days * 24 * 60 * 60 * 1000));

                if (now > deadline) {
                    if (!uploadOverdueUsers[doc.user_id]) uploadOverdueUsers[doc.user_id] = { user: doc.user, docs: [] };
                    uploadOverdueUsers[doc.user_id].docs.push({
                        document_name: doc.document.document_name,
                        document_number: doc.document.document_number,
                        job_number: doc.group?.job_group?.map(jg => jg.job?.job_number).join(', ') || 'N/A'
                    });
                }
            }

            // Send Upload Overdue emails
            for (const userId in uploadOverdueUsers) {
                const { user, docs } = uploadOverdueUsers[userId];
                if (user.email) {
                    await EmailService.sendDocumentOverdueNotification(user.email, user.name, 'upload', docs);
                    console.log(`[DccService] Upload Overdue email sent to ${user.email} for ${docs.length} items`);
                }
            }

            // 2. Check for RESPONSE OVERDUE (Uploaded docs awaiting approval)
            const submittedDocs = await prisma.group_document.findMany({
                where: {
                    status: 'Pending for Approval',
                    response_due_days: { not: null }
                },
                include: {
                    document: true,
                    group: { include: { job_group: { include: { job: true } } } },
                    versions: { orderBy: { version_no: 'desc' }, take: 1 }
                }
            });

            // For response overdue, we usually notify the "Approvers". 
            // In this system, approvers are typically DCC Admin or specific roles.
            // For now, let's notify the "Assigner" or a configured admin email if we have one.
            // Since we don't have a specific "Approver" per document yet, 
            // we'll fetch users with 'DCC' or 'ADMIN' roles.
            const dccAdmins = await prisma.user.findMany({
                where: {
                    user_roles: {
                        some: {
                            role: {
                                name: { in: ['DCC', 'ADMIN'] }
                            }
                        }
                    }
                }
            });

            if (dccAdmins.length > 0) {
                const responseOverdueDocs = [];

                for (const doc of submittedDocs) {
                    const lastVersion = doc.versions[0];
                    if (!lastVersion) continue;

                    const uploadedAt = new Date(lastVersion.createdAt);
                    const deadline = new Date(uploadedAt.getTime() + (doc.response_due_days * 24 * 60 * 60 * 1000));

                    if (now > deadline) {
                        responseOverdueDocs.push({
                            document_name: doc.document.document_name,
                            document_number: doc.document.document_number,
                            job_number: doc.group?.job_group?.map(jg => jg.job?.job_number).join(', ') || 'N/A'
                        });
                    }
                }

                if (responseOverdueDocs.length > 0) {
                    for (const admin of dccAdmins) {
                        if (admin.email) {
                            await EmailService.sendDocumentOverdueNotification(admin.email, admin.name, 'response', responseOverdueDocs);
                            console.log(`[DccService] Response Overdue email sent to Admin ${admin.email} for ${responseOverdueDocs.length} items`);
                        }
                    }
                }
            }

        } catch (error) {
            console.error("[DccService] Overdue check error:", error);
        }
    }
}

module.exports = new DccService();
