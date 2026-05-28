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

        if (existingCustomer) {
            if (existingCustomer.is_deleted) {
                return await prisma.customer.update({
                    where: { id: existingCustomer.id },
                    data: {
                        customer_name: customer_name.trim(),
                        customer_short_name: customer_short_name.trim(),
                        mobile: mobile ? mobile.trim() : null,
                        is_deleted: false,
                        is_active: true
                    },
                });
            }
            throw new Error('Customer with this email already exists in your company');
        }

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

        const columnFilters = typeof params.columnFilters === 'string' ? JSON.parse(params.columnFilters) : (params.columnFilters || {});

        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);

        const where = {
            company_id: company_id,
            is_deleted: false
        };

        if (search) {
            where.OR = [
                { customer_name: { contains: search, mode: 'insensitive' } },
                { customer_short_name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { mobile: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Column Filters
        if (columnFilters.customer_name && columnFilters.customer_name !== 'all') {
            where.customer_name = { in: Array.isArray(columnFilters.customer_name) ? columnFilters.customer_name : [columnFilters.customer_name] };
        }
        if (columnFilters.customer_short_name && columnFilters.customer_short_name !== 'all') {
            where.customer_short_name = { in: Array.isArray(columnFilters.customer_short_name) ? columnFilters.customer_short_name : [columnFilters.customer_short_name] };
        }
        if (columnFilters.email && columnFilters.email !== 'all') {
            where.email = { in: Array.isArray(columnFilters.email) ? columnFilters.email : [columnFilters.email] };
        }

        // is_active column filter
        if (columnFilters.is_active && columnFilters.is_active !== 'all') {
            const vals = Array.isArray(columnFilters.is_active) ? columnFilters.is_active : [columnFilters.is_active];
            const wantsActive = vals.includes('true');
            const wantsInactive = vals.includes('false');
            if (wantsActive && !wantsInactive) where.is_active = true;
            if (wantsInactive && !wantsActive) where.is_active = false;
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
                totalPages: (limit === undefined || limit === null) ? 1 : Math.ceil(total / take)
            }
        };
    }

    async getCustomerFilters(company_id) {
        const customers = await prisma.customer.findMany({
            where: { company_id, is_deleted: false },
            select: {
                customer_name: true,
                customer_short_name: true,
                email: true
            }
        });

        const records = customers.map(c => ({
            customer_name: c.customer_name,
            customer_short_name: c.customer_short_name,
            email: c.email
        }));

        return { records };
    }

    async updateCustomer(company_id, id, data) {
        const { customer_name, customer_short_name, email, mobile } = data;
        return await prisma.customer.update({
            where: { id, company_id },
            data: {
                customer_name: customer_name?.trim(),
                customer_short_name: customer_short_name?.trim(),
                email: email?.toLowerCase().trim(),
                mobile: mobile ? mobile.trim() : null,
            },
        });
    }

    async deleteCustomer(company_id, id) {
        return await prisma.customer.update({
            where: { id, company_id },
            data: { is_deleted: true, is_active: false }
        });
    }

    async toggleCustomerStatus(company_id, id) {
        const existing = await prisma.customer.findFirst({ where: { id, company_id } });
        if (!existing) throw new Error('Customer not found');
        return await prisma.customer.update({
            where: { id },
            data: { is_active: !existing.is_active }
        });
    }

    async toggleLocationStatus(company_id, id) {
        const existing = await prisma.customer_location.findFirst({ where: { id, company_id } });
        if (!existing) throw new Error('Location not found');
        return await prisma.customer_location.update({
            where: { id },
            data: { is_active: !existing.is_active }
        });
    }

    async togglePoStatus(company_id, id) {
        const existing = await prisma.po.findFirst({ where: { id, company_id } });
        if (!existing) throw new Error('PO not found');
        return await prisma.po.update({
            where: { id },
            data: { is_active: !existing.is_active }
        });
    }

    async toggleJobStatus(company_id, id) {
        const existing = await prisma.job.findFirst({ where: { id, company_id } });
        if (!existing) throw new Error('Job not found');
        return await prisma.job.update({
            where: { id },
            data: { is_active: !existing.is_active }
        });
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
        const { page = 1, limit, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = params;
        const columnFilters = typeof params.columnFilters === 'string' ? JSON.parse(params.columnFilters) : (params.columnFilters || {});

        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);
        const where = {
            company_id,
            is_deleted: false
        };

        if (params.customer_id) {
            where.customer_id = params.customer_id;
        }

        if (search) {
            where.OR = [
                { location_name: { contains: search, mode: 'insensitive' } },
                { customer: { customer_name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        // Column Filters
        if (columnFilters.customer_name && columnFilters.customer_name !== 'all') {
            where.customer = { customer_name: { in: Array.isArray(columnFilters.customer_name) ? columnFilters.customer_name : [columnFilters.customer_name] } };
        }
        if (columnFilters.location_name && columnFilters.location_name !== 'all') {
            where.location_name = { in: Array.isArray(columnFilters.location_name) ? columnFilters.location_name : [columnFilters.location_name] };
        }

        // is_active column filter
        if (columnFilters.is_active && columnFilters.is_active !== 'all') {
            const vals = Array.isArray(columnFilters.is_active) ? columnFilters.is_active : [columnFilters.is_active];
            const wantsActive = vals.includes('true');
            const wantsInactive = vals.includes('false');
            if (wantsActive && !wantsInactive) where.is_active = true;
            if (wantsInactive && !wantsActive) where.is_active = false;
        }

        const [total, data] = await prisma.$transaction([
            prisma.customer_location.count({ where }),
            prisma.customer_location.findMany({
                where, skip, take,
                include: { customer: { select: { customer_name: true } } },
                orderBy: { [sortBy]: sortOrder }
            })
        ]);

        return { data, meta: { total, page: parseInt(page), limit: (limit === undefined || limit === null) ? total : take, totalPages: (limit === undefined || limit === null) ? 1 : Math.ceil(total / take) } };
    }

    async getLocationFilters(company_id) {
        const locations = await prisma.customer_location.findMany({
            where: { company_id, is_deleted: false },
            include: { customer: { select: { customer_name: true } } }
        });

        const records = locations.map(l => ({
            customer_name: l.customer?.customer_name,
            location_name: l.location_name
        }));

        return { records };
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
        const {
            page = 1,
            limit,
            search = '',
            customer_id,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params;

        const columnFilters = typeof params.columnFilters === 'string' ? JSON.parse(params.columnFilters) : (params.columnFilters || {});

        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);
        const where = {
            company_id,
            is_deleted: false
        };

        if (customer_id) where.customer_id = customer_id.trim();
        if (params.location_id) where.customer_location_id = params.location_id.trim();
        if (params.po_id) where.id = params.po_id.trim();

        if (search) {
            where.OR = [
                { po_number: { contains: search, mode: 'insensitive' } },
                { customer: { customer_name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        // Column Filters
        if (columnFilters.po_number && columnFilters.po_number !== 'all') {
            where.po_number = { in: Array.isArray(columnFilters.po_number) ? columnFilters.po_number : [columnFilters.po_number] };
        }
        if (columnFilters.customer_name && columnFilters.customer_name !== 'all') {
            where.customer = { customer_name: { in: Array.isArray(columnFilters.customer_name) ? columnFilters.customer_name : [columnFilters.customer_name] } };
        }
        if (columnFilters.location_name && columnFilters.location_name !== 'all') {
            where.customer_location = { location_name: { in: Array.isArray(columnFilters.location_name) ? columnFilters.location_name : [columnFilters.location_name] } };
        }

        // is_active column filter
        if (columnFilters.is_active && columnFilters.is_active !== 'all') {
            const vals = Array.isArray(columnFilters.is_active) ? columnFilters.is_active : [columnFilters.is_active];
            const wantsActive = vals.includes('true');
            const wantsInactive = vals.includes('false');
            if (wantsActive && !wantsInactive) where.is_active = true;
            if (wantsInactive && !wantsActive) where.is_active = false;
        }

        const [total, data] = await prisma.$transaction([
            prisma.po.count({ where }),
            prisma.po.findMany({
                where, skip, take,
                include: {
                    customer: { select: { id: true, customer_name: true } },
                    customer_location: { select: { id: true, location_name: true, gst_number: true } },
                    po_communication_matrix: true,
                    po_attachment_history: {
                        orderBy: { revision: 'desc' }
                    }
                },
                orderBy: { [sortBy]: sortOrder }
            })
        ]);

        // Expand PO URLs for UI use
        const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        const expandedData = data.map(po => {
            // Expand main URL
            let mainUrl = po.po_doc_url;
            if (mainUrl && !mainUrl.startsWith('http')) {
                const pathUrl = mainUrl.startsWith('/') ? mainUrl : `/api/files/${mainUrl}`;
                mainUrl = `${backendUrl}${pathUrl}`;
            }

            // Expand history attachments
            const formattedHistory = po.po_attachment_history ? po.po_attachment_history.map(history => {
                let parsed = history.po_attachments;
                if (typeof parsed === 'string') {
                    try { parsed = JSON.parse(parsed); } catch (e) { parsed = []; }
                }
                if (!Array.isArray(parsed)) parsed = [];

                const mappedAttachments = parsed.map(doc => {
                    let safeUrl = doc.url;
                    if (safeUrl && !safeUrl.startsWith('http')) {
                        if (safeUrl.startsWith('/')) safeUrl = `${backendUrl}${safeUrl}`;
                        else safeUrl = `${backendUrl}/api/files/${safeUrl}`;
                    }
                    return { ...doc, url: safeUrl };
                });

                return { ...history, po_attachments: mappedAttachments };
            }) : [];

            return {
                ...po,
                po_doc_url: mainUrl,
                po_attachment_history: formattedHistory
            };
        });

        const metaLimit = (limit === undefined || limit === null) ? total : take;
        const totalPages = (limit === undefined || limit === null) ? 1 : Math.max(1, Math.ceil(total / take));

        return { data: expandedData, meta: { total, page: parseInt(page), limit: metaLimit, totalPages } };
    }

    /**
     * Get unique filters for POs
     */
    async getPoFilters(company_id) {
        const data = await prisma.po.findMany({
            where: { company_id, is_deleted: false },
            select: {
                po_number: true,
                customer: { select: { customer_name: true } },
                customer_location: { select: { location_name: true } }
            }
        });

        const records = data.map(po => ({
            po_number: po.po_number,
            customer_name: po.customer?.customer_name || 'N/A',
            location_name: po.customer_location?.location_name || 'N/A'
        }));

        return { records };
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
        const columnFilters = typeof params.columnFilters === 'string' ? JSON.parse(params.columnFilters) : (params.columnFilters || {});

        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);
        const where = {
            company_id,
            is_deleted: false
        };

        if (customer_id) where.customer_id = customer_id.trim();
        if (po_id) where.po_id = po_id.trim();
        if (customer_location_id) where.customer_location_id = customer_location_id.trim();

        if (search) {
            where.OR = [
                { job_number: { contains: search, mode: 'insensitive' } },
                { customer: { customer_name: { contains: search, mode: 'insensitive' } } },
                { po: { po_number: { contains: search, mode: 'insensitive' } } },
                { equipement_name: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (columnFilters.job_number) {
            where.job_number = { in: Array.isArray(columnFilters.job_number) ? columnFilters.job_number : [columnFilters.job_number] };
        }
        if (columnFilters.customer) {
            where.customer = { customer_name: { in: Array.isArray(columnFilters.customer) ? columnFilters.customer : [columnFilters.customer] } };
        }
        if (columnFilters.location) {
            where.customer_location = { location_name: { in: Array.isArray(columnFilters.location) ? columnFilters.location : [columnFilters.location] } };
        }
        if (columnFilters.po_number) {
            where.po = { po_number: { in: Array.isArray(columnFilters.po_number) ? columnFilters.po_number : [columnFilters.po_number] } };
        }
        if (columnFilters.project_id) {
            where.project_id = { contains: columnFilters.project_id, mode: 'insensitive' };
        }

        // is_active column filter
        if (columnFilters.is_active && columnFilters.is_active !== 'all') {
            const vals = Array.isArray(columnFilters.is_active) ? columnFilters.is_active : [columnFilters.is_active];
            const wantsActive = vals.includes('true');
            const wantsInactive = vals.includes('false');
            if (wantsActive && !wantsInactive) where.is_active = true;
            if (wantsInactive && !wantsActive) where.is_active = false;
        }
        if (columnFilters.equipment) {
            where.equipement_name = { contains: columnFilters.equipment, mode: 'insensitive' };
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

    async getManageJobFilters(company_id) {
        const jobs = await prisma.job.findMany({
            where: { company_id, is_deleted: false },
            select: {
                job_number: true,
                customer: { select: { customer_name: true } },
                customer_location: { select: { location_name: true } },
                po: { select: { po_number: true } }
            }
        });

        const records = jobs.map(j => ({
            job_number: j.job_number,
            customer: j.customer?.customer_name || 'N/A',
            location: j.customer_location?.location_name || 'N/A',
            po_number: j.po?.po_number || 'N/A'
        }));

        return { records };
    }

    /**
     * Get unique filters (Customers, POs, Jobs) that actually have assigned documents
     */
    async getActiveFilters(company_id, user_id = null, options = {}) {
        const getFilters = async (uid = null) => {
            const whereClause = { company_id, is_deleted: false, is_active: true };
            if (uid) whereClause.user_id = uid;

            // Check for specific document status/approval filters
            if (options.isApproved) {
                whereClause.status = 'Approved';
            }
            if (options.isTransmittable) {
                // Ensure document has at least one approved version not yet transmitted
                whereClause.status = 'Approved';
                whereClause.versions = {
                    some: {
                        status: 'Approved',
                        transmission_items: { none: {} }
                    }
                };
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

        // Generate System Document Number: DOC-YYYY-MM-XXXXX
        const maxDoc = await prisma.document_master.findFirst({
            where: { company_id },
            orderBy: { serial_no: 'desc' }
        });

        const serial_no = (maxDoc?.serial_no || 0) + 1;
        const document_number = this._getFormattedDocNumber(serial_no);

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
            job_number_filter,
            shreno_doc_no_filter,
            client_doc_no_filter,
            document_number_filter
        } = params;

        const where = { company_id, user_id, is_deleted: false };

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

        if (customer_name_filter) {
            where.customer = { customer_name: this._processFilter(customer_name_filter) };
        }
        if (po_number_filter) {
            where.po = { po_number: this._processFilter(po_number_filter) };
        }
        if (job_number_filter) {
            where.group = {
                job_group: {
                    some: { job: { job_number: this._processFilter(job_number_filter) } }
                }
            };
        }

        if (shreno_doc_no_filter) {
            where.shreno_doc_no = this._processFilter(shreno_doc_no_filter);
        }
        if (client_doc_no_filter) {
            where.client_doc_no = this._processFilter(client_doc_no_filter);
        }
        if (document_number_filter) {
            where.document = { ...where.document, document_number: this._processFilter(document_number_filter) };
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
            include: { uploader: true, files: { where: { is_active: true } } }
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
            job_number_filter,
            shreno_doc_no_filter,
            client_doc_no_filter,
            user_id_filter
        } = params;

        const where = { company_id, is_deleted: false };

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

        if (customer_name_filter) {
            where.customer = { customer_name: this._processFilter(customer_name_filter) };
        }
        if (po_number_filter) {
            where.po = { po_number: this._processFilter(po_number_filter) };
        }
        if (job_number_filter) {
            where.group = {
                job_group: {
                    some: { job: { job_number: this._processFilter(job_number_filter) } }
                }
            };
        }

        if (shreno_doc_no_filter) {
            where.shreno_doc_no = this._processFilter(shreno_doc_no_filter);
        }
        if (client_doc_no_filter) {
            where.client_doc_no = this._processFilter(client_doc_no_filter);
        }

        if (user_id_filter) {
            if (user_id_filter === 'pending_assignee' || (Array.isArray(user_id_filter) && user_id_filter.includes('pending_assignee'))) {
                if (Array.isArray(user_id_filter)) {
                    where.OR = [
                        { user_id: null },
                        { user_id: { in: user_id_filter.filter(v => v !== 'pending_assignee') } }
                    ];
                } else {
                    where.user_id = null;
                }
            } else {
                where.user_id = this._processFilter(user_id_filter);
            }
        }

        if (params.columnFilters) {
            const cFilters = typeof params.columnFilters === 'string' ? JSON.parse(params.columnFilters) : params.columnFilters;
            if (cFilters.is_active && cFilters.is_active !== 'all') {
                const vals = Array.isArray(cFilters.is_active) ? cFilters.is_active : [cFilters.is_active];
                const wantsActive = vals.includes('true');
                const wantsInactive = vals.includes('false');
                if (wantsActive && !wantsInactive) where.is_active = true;
                if (wantsInactive && !wantsActive) where.is_active = false;
            }
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
                        include: { uploader: true, files: { where: { is_active: true } } }
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
     * Upload Document Version (Multi-file support)
     */
    async uploadDocumentVersion(company_id, user_id, document_id, files, remarks) {
        if (!files || files.length === 0) throw new Error('Files are required');

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

        const result = await prisma.$transaction(async (tx) => {
            // ── Resolve target directory version using the same 3-case logic as createNewVersion ──
            // This ensures the file lands in the same folder number the DB record will use.

            // Case 1: Pending placeholder created at assignment → use its version_no (v0)
            const pendingPlaceholder = await tx.document_version.findFirst({
                where: { group_document_id: document_id, status: 'Pending' },
                orderBy: { version_no: 'asc' }
            });

            // Case 2: Last version was internally rejected → overwrite same slot
            const rejectedVersion = !pendingPlaceholder
                ? await tx.document_version.findFirst({
                    where: { group_document_id: document_id, status: 'Rejected' },
                    orderBy: { version_no: 'desc' }
                })
                : null;

            let targetVersionNo;
            if (pendingPlaceholder) {
                // Case 1: First upload — use the placeholder's version_no (always 0)
                targetVersionNo = pendingPlaceholder.version_no;
            } else if (rejectedVersion) {
                // Case 2: Re-upload after rejection — use same version slot
                targetVersionNo = rejectedVersion.version_no;
            } else {
                // Case 3: Normal new revision — find the highest existing version and increment
                const masterDocId = groupDoc.document_id;
                const lastVersion = await tx.document_version.findFirst({
                    where: { group_document: { document_id: masterDocId } },
                    orderBy: { version_no: 'desc' }
                });
                targetVersionNo = lastVersion ? lastVersion.version_no + 1 : 0;
            }

            // 1. Process storage — move file to the correct version directory
            const job_number = groupDoc.group?.job_group[0]?.job?.job_number || 'NA';
            const document_number = groupDoc.document?.document_number || 'NA';

            const targetDir = StorageUtils.getDocRevisionDir(company_id, job_number, document_number, targetVersionNo);
            const storageDataArray = await fileService.processMultipleStorage(files, targetDir);

            // 2. Create / update version record in DB
            const version = await fileService.createNewVersion(tx, document_id, user_id, storageDataArray, remarks);

            // 3. Automated Approval for "As Built" documents
            // If the document was in "As Built" state, this upload is the final acknowledgment.
            if (groupDoc.status === 'As Built') {
                // Find the original transmission where it was marked As Built
                const lastTransDoc = await tx.transmission_document.findFirst({
                    where: { group_document_id: document_id, client_status: 'As Built' }
                });

                if (lastTransDoc) {
                    // Create a new entry for this version in the SAME transmission to append history
                    await tx.transmission_document.create({
                        data: {
                            transmission_id: lastTransDoc.transmission_id,
                            group_document_id: document_id,
                            version_id: version.id,
                            client_status: 'Approved',
                            client_remarks: 'Finalized As-Built Version Uploaded'
                        }
                    });
                }

                await tx.document_version.update({
                    where: { id: version.id },
                    data: { status: 'Approved' }
                });
                await tx.group_document.update({
                    where: { id: document_id },
                    data: { status: 'Approved' }
                });
                version.status = 'Approved'; // Update local object for activity log
            }

            // 4. Log Activity
            await ActivityService.logActivity({
                company_id,
                group_document_id: document_id,
                user_id,
                action: groupDoc.status === 'As Built' ? 'As Built Finalized' : 'Uploaded',
                remarks: groupDoc.status === 'As Built'
                    ? `Final As-Built version ${targetVersionNo} uploaded and automatically approved`
                    : (rejectedVersion
                        ? `Version ${targetVersionNo} (Correction) uploaded`
                        : `Version ${targetVersionNo} uploaded`),
                metadata: {
                    version_no: targetVersionNo,
                    is_correction: !!rejectedVersion,
                    file_name: files[0].originalname, // Log primary file name
                    files: storageDataArray.map(f => {
                        const versionFile = version.files?.find(v => v.original_filename === f.original_filename);
                        return {
                            original_filename: f.original_filename,
                            file_url: versionFile?.file_url || version.file_url,
                            mime_type: f.mimeType || versionFile?.mime_type || '',
                            file_path: f.filePath || versionFile?.file_path || ''
                        };
                    }),
                    file_url: version.file_url,
                    was_as_built: groupDoc.status === 'As Built'
                }
            }, tx);

            // Prepend BACKEND_URL for immediate use in UI
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            if (version.file_url && version.file_url.startsWith('/') && !version.file_url.startsWith('http')) {
                version.file_url = `${backendUrl}${version.file_url}`;
            }

            return version;
        });

        // 5. Trigger Notification to Admins in background
        this._sendUploadNotificationToAdmins(company_id, document_id, user_id, result.version_no).catch(e =>
            console.error("[DccService] Upload notification error:", e)
        );

        return result;
    }

    /**
     * getDocumentsForApproval
     * Primary method for the Document Approval / Review screen.
     * Handles complex status mapping for approvers (Pending, Awaiting Upload, Rejected, etc.)
     * and filters based on uploader/approver specific status aliases.
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
            shreno_doc_no_filter,
            client_doc_no_filter
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

        if (customer_name_filter) {
            where.customer = { customer_name: this._processFilter(customer_name_filter) };
        }
        if (po_number_filter) {
            where.po = { po_number: this._processFilter(po_number_filter) };
        }
        if (job_number_filter) {
            where.group = {
                job_group: {
                    some: { job: { job_number: this._processFilter(job_number_filter) } }
                }
            };
        }

        if (shreno_doc_no_filter) {
            where.shreno_doc_no = this._processFilter(shreno_doc_no_filter);
        }
        if (client_doc_no_filter) {
            where.client_doc_no = this._processFilter(client_doc_no_filter);
        }
        if (approver_status_filter) {
            const filterVal = approver_status_filter.toLowerCase();
            if (filterVal === 'pending_approval' || filterVal === 'pending for approval') {
                where.status = 'Pending for Approval';
            } else if (filterVal === 'awaiting_upload') {
                where.status = { in: ['Pending', 'Upload Due'] };
            } else {
                where.status = this._processFilter(approver_status_filter);
            }
        }

        if (customer_id) where.customer_id = customer_id.trim();
        if (po_id) where.po_id = po_id.trim();

        // Standard version filter for Approver: must have an uploaded file
        where.versions = { some: { status: { not: 'Pending' } } };

        if (search) {
            where.OR = [
                { document: { document_name: { contains: search, mode: 'insensitive' } } },
                { document: { document_number: { contains: search, mode: 'insensitive' } } },
                { customer: { customer_name: { contains: search, mode: 'insensitive' } } },
                { po: { po_number: { contains: search, mode: 'insensitive' } } }
            ];
        }

        // Dynamic Version Include
        // Note: We used to exclude Pending, but now we include them to show pre-allocated revisions
        let versionsInclude = {
            orderBy: { version_no: 'desc' },
            take: 1,
            include: {
                uploader: true,
                transmission_items: true,
                files: { where: { is_active: true } }
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
     * getApprovedDocumentsForTransmission
     * Specifically for the 'Create Transmission' screen.
     * This method is strictly restricted to documents with 'Approved' status.
     * It includes logic to exclude documents that are already part of a transmission.
     */
    async getApprovedDocumentsForTransmission(company_id, params = {}) {
        const {
            page = 1,
            limit,
            search = '',
            customer_name_filter,
            po_number_filter,
            job_number_filter,
            exclude_transmitted = true,
            job_ids
        } = params;

        const skip = (limit === undefined || limit === null) ? undefined : (page - 1) * parseInt(limit);
        const take = (limit === undefined || limit === null) ? undefined : parseInt(limit);

        // Transmission screen ONLY needs Approved documents
        const where = {
            company_id,
            status: 'Approved',
            is_deleted: false
        };

        if (customer_name_filter) {
            where.customer = { customer_name: this._processFilter(customer_name_filter) };
        }
        if (po_number_filter) {
            where.po = { po_number: this._processFilter(po_number_filter) };
        }
        if (job_number_filter) {
            where.group = {
                job_group: {
                    some: { job: { job_number: this._processFilter(job_number_filter) } }
                }
            };
        }

        if (job_ids) {
            const jobIdsArray = Array.isArray(job_ids) ? job_ids : job_ids.split(',');
            where.group = {
                job_group: {
                    some: { job_id: { in: jobIdsArray } }
                }
            };
        }

        const versionConditions = {};
        if (exclude_transmitted === 'true' || exclude_transmitted === true) {
            versionConditions.transmission_items = { none: {} };
        }

        // Ensure we only show docs with at least one uploaded file (not Pending placeholder)
        const nonPendingVersionFilter = { status: { not: 'Pending' } };

        if (Object.keys(versionConditions).length > 0) {
            where.versions = { some: { ...versionConditions, ...nonPendingVersionFilter } };
        } else {
            where.versions = { some: nonPendingVersionFilter };
        }

        if (search) {
            where.OR = [
                { document: { document_name: { contains: search, mode: 'insensitive' } } },
                { document: { document_number: { contains: search, mode: 'insensitive' } } },
                { customer: { customer_name: { contains: search, mode: 'insensitive' } } },
                { po: { po_number: { contains: search, mode: 'insensitive' } } }
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
                    customer: true,
                    po: true,
                    versions: {
                        orderBy: { version_no: 'desc' },
                        take: 1,
                        include: {
                            uploader: true,
                            transmission_items: true,
                            files: { where: { is_active: true } }
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            })
        ]);

        // APPLY ENRICHMENT HELPERS (Restores display_version_no and file URLs)
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
                versions: {
                    orderBy: { version_no: 'desc' },
                    take: 1,
                    include: { files: { where: { is_active: true } } }
                },
                document: true
            }
        });

        if (!groupDoc) throw new Error('Document not found');

        const latestVersion = groupDoc.versions[0];
        if (!latestVersion) throw new Error('No version to review');

        const result = await prisma.$transaction(async (tx) => {
            // 1. Process archiving if rejecting
            let rejectedVersionPath = null;
            const versionFiles = [];

            if (status === 'Rejected') {
                if (latestVersion.files && latestVersion.files.length > 0) {
                    for (const file of latestVersion.files) {
                        let archivedPath = file.file_path;
                        if (file.file_path) {
                            archivedPath = StorageUtils.archiveRejectedFile(file.file_path) || file.file_path;
                            // Update document_file record in DB
                            await tx.document_file.update({
                                where: { id: file.id },
                                data: { file_path: archivedPath }
                            });
                        }
                        versionFiles.push({
                            original_filename: file.original_filename,
                            mime_type: file.mime_type,
                            file_path: archivedPath,
                            file_url: file.file_url
                        });

                        // Set primary version file path when it matches
                        if (file.file_path === latestVersion.file_path) {
                            rejectedVersionPath = archivedPath;
                        }
                    }
                } else if (latestVersion.file_path) {
                    rejectedVersionPath = StorageUtils.archiveRejectedFile(latestVersion.file_path);
                }
            } else {
                // If Approved, populate versionFiles for logging metadata
                if (latestVersion.files && latestVersion.files.length > 0) {
                    for (const file of latestVersion.files) {
                        versionFiles.push({
                            original_filename: file.original_filename,
                            mime_type: file.mime_type,
                            file_path: file.file_path,
                            file_url: file.file_url
                        });
                    }
                }
            }

            // 2. Update Version Status + point file_path to _rejected/ location
            const versionUpdateData = { status, remarks };
            if (status === 'Rejected' && rejectedVersionPath) {
                versionUpdateData.file_path = rejectedVersionPath;
            }
            await tx.document_version.update({
                where: { id: latestVersion.id },
                data: versionUpdateData
            });

            // 3. Update Group Document Status
            await tx.group_document.update({
                where: { id: document_id },
                data: { status: status === 'Rejected' ? 'Pending' : 'Approved' }
            });

            // 4. Log Activity
            await ActivityService.logActivity({
                company_id,
                group_document_id: document_id,
                user_id,
                action: status === 'Approved' ? 'Internal Approved' : 'Internal Rejected',
                remarks: remarks || null,
                metadata: {
                    version_no: latestVersion.version_no,
                    file_name: latestVersion.file_path ? latestVersion.file_path.split('/').pop() : '',
                    file_path: rejectedVersionPath || latestVersion.file_path,
                    file_url: latestVersion.file_url,
                    files: versionFiles.length > 0 ? versionFiles : undefined
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

        // 1. Fetch group documents with their latest versions in a single query
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
                    include: { uploader: true, files: { where: { is_active: true } } }
                }
            }
        });

        if (docsWithVersions.length !== document_ids.length) throw new Error('Some documents not found');

        // Map to ensure each doc has its latest version attached
        const finalDocs = docsWithVersions.map(doc => {
            if (!doc.versions || doc.versions.length === 0) {
                throw new Error(`No versions found for document ID: ${doc.id}`);
            }
            doc.latestVersion = doc.versions[0];
            return doc;
        });

        const invalidDocs = finalDocs.filter(d => d.status !== 'Approved');
        if (invalidDocs.length > 0) {
            throw new Error(`Documents not approved: ${invalidDocs.map(d => d.document.document_number).join(', ')}`);
        }

        // Generate Transmission Number
        const count = await prisma.transmission.count({ where: { company_id } });
        const transNum = `SHRENO-TR-${(count + 1).toString().padStart(2, '0')}`;
        const password = Math.random().toString(36).slice(-8).toUpperCase();

        // 2. Generate ZIP File
        const transmissionZipName = `${transNum}.zip`;
        const ZipUtils = require('../utils/zip.utils');
        await ZipUtils.createTransmissionZip(transmissionZipName, finalDocs);

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const transmissionId = require('crypto').randomUUID();
        const zipDownloadLink = `/api/secure/download/${transmissionId}`;

        const result = await prisma.$transaction(async (tx) => {
            const transmission = await tx.transmission.create({
                data: {
                    id: transmissionId,
                    company_id,
                    transmission_number: transNum,
                    customer_id,
                    customer_location_id,
                    po_id,
                    password: password,
                    created_by: user_id,
                    zip_url: zipDownloadLink
                },
                include: { po: true }
            });

            // Create transmission documents in bulk
            await tx.transmission_document.createMany({
                data: finalDocs.map(doc => ({
                    transmission_id: transmission.id,
                    group_document_id: doc.id,
                    version_id: doc.versions[0].id
                }))
            });

            // Log activities concurrently
            const activityPromises = finalDocs.map(doc =>
                ActivityService.logActivity({
                    company_id,
                    group_document_id: doc.id,
                    transmission_id: transmission.id,
                    user_id,
                    action: 'Transmittal Created',
                    remarks: `Document included in Transmittal ${transNum}`,
                    metadata: { transmission_no: transNum, version_no: doc.versions[0].version_no }
                }, tx)
            );

            activityPromises.push(
                ActivityService.logActivity({
                    company_id,
                    transmission_id: transmission.id,
                    user_id,
                    action: 'Transmittal Created',
                    remarks: `Transmission ${transNum} created and ready for client`,
                    metadata: { transmission_no: transNum, document_count: finalDocs.length }
                }, tx)
            );

            await Promise.all(activityPromises);

            return transmission;
        });

        // 5. Trigger Internal Alert in background (Removed as per user request)

        return result;
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
        const { po_id, page = 1, limit = 10, search, status, customer_name_filter, po_number_filter, transmission_number_filter } = params;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const where = { company_id };
        if (po_id) where.po_id = po_id;
        if (status) where.status = status;

        // Apply Column Specific Filters
        if (customer_name_filter) {
            where.customer = {
                customer_name: this._processFilter(customer_name_filter)
            };
        }
        if (po_number_filter) {
            where.po = {
                po_number: this._processFilter(po_number_filter)
            };
        }
        if (transmission_number_filter) {
            where.transmission_number = this._processFilter(transmission_number_filter);
        }

        if (search) {
            where.OR = [
                { transmission_number: { contains: search, mode: 'insensitive' } },
                { po: { po_number: { contains: search, mode: 'insensitive' } } }
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
                            include: { uploader: true, files: { where: { is_active: true } } }
                        }
                    }
                },
                version: {
                    include: {
                        uploader: true,
                        files: { where: { is_active: true } }
                    }
                },
                feedback_files: true
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

    async sendTransmissionEmail(company_id, user_id, data) {
        const { transmission_id, shreno_emails, client_emails, include_zip = true, custom_subject, custom_body } = data;

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

        // 3. Prepare attachments
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

        // 4. Send Email
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const absoluteZipUrl = (transmission.zip_url && transmission.zip_url.startsWith('/') && !transmission.zip_url.startsWith('http'))
            ? `${backendUrl}${transmission.zip_url}`
            : transmission.zip_url;

        let customContent = {};
        if (custom_subject || custom_body) {
            customContent.subject = this._replacePlaceholders(custom_subject, transmission, documentsData, absoluteZipUrl);
            customContent.html = this._replacePlaceholders(custom_body, transmission, documentsData, absoluteZipUrl, include_zip);
        }

        await EmailService.sendTransmissionEmail(client_emails, shreno_emails, {
            transmission_number: transmission.transmission_number,
            po_number: transmission.po?.po_number || 'N/A',
            customer_name: transmission.customer?.customer_name || 'N/A',
            document_count: transmission.documents?.length || 0,
            password: transmission.password,
            zip_url: absoluteZipUrl || '#',
            include_zip: !!include_zip
        }, attachments, customContent);

        // 5. Log activity for each document in the transmission
        const transDocs = await prisma.transmission_document.findMany({
            where: { transmission_id: transmission.id },
            include: { group_document: true }
        });

        for (const td of transDocs) {
            await ActivityService.logActivity({
                company_id,
                group_document_id: td.group_document_id,
                transmission_id: transmission.id,
                user_id,
                action: 'Transmitted Mail Sent',
                remarks: `Transmittal email sent for ${transmission.transmission_number}`,
                metadata: {
                    transmission_no: transmission.transmission_number,
                    recipients: [...(client_emails || []), ...(shreno_emails || [])].join(', ')
                }
            });
        }

        // Also log for the transmission itself
        await ActivityService.logActivity({
            company_id,
            transmission_id: transmission.id,
            user_id,
            action: 'Transmitted Mail Sent',
            remarks: `Notification email successfully sent for review`,
            metadata: { transmission_no: transmission.transmission_number }
        });

        // Update status to 'Sent'
        await prisma.transmission.update({
            where: { id: transmission_id },
            data: { status: 'Sent' }
        });

        console.log(`Email sent for transmission: ${transmission.transmission_number}`);
        return { success: true, message: 'Email sent successfully' };
    }

    _replacePlaceholders(text, transmission, documentsData, absoluteZipUrl, include_zip = true) {
        if (!text) return '';

        let processedText = text;

        // If include_zip is false, remove the download section if standard placeholders are found
        if (!include_zip) {
            // Regex to remove the part from "You can download" until after {{password}} if it exists
            // This is a bit heuristic but matches the default template structure
            processedText = processedText.replace(/You can download the documents using the link below:[\s\S]*?{{password}}/g, '');
            // Also cleanup empty zip/pass if they were used standalone
            processedText = processedText.replace(/{{zip_url}}/g, '').replace(/{{password}}/g, '');
        }

        processedText = processedText
            .replace(/{{transmission_number}}/g, transmission.transmission_number || '')
            .replace(/{{customer_name}}/g, transmission.customer?.customer_name || '')
            .replace(/{{po_number}}/g, transmission.po?.po_number || '')
            .replace(/{{document_count}}/g, documentsData?.length || 0)
            .replace(/{{zip_url}}/g, absoluteZipUrl || '')
            .replace(/{{password}}/g, transmission.password || '');

        // Convert newlines to <br/> for HTML rendering (handle both Windows and Unix line endings)
        return processedText.replace(/\r?\n/g, '<br/>');
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

        const result = await prisma.$transaction(async (tx) => {
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
                // Fetch current docs to get createdAt and current upload_due_days
                const docs = await tx.group_document.findMany({
                    where: { id: { in: groupDocIds } }
                });

                for (const doc of docs) {
                    let nextGroupStatus = doc.status;
                    let nextUploadDueDays = doc.upload_due_days;

                    if (['Approved', 'Final Approved'].includes(status)) {
                        nextGroupStatus = 'Approved';
                    } else if (['Rejected', 'Commented', 'Re-approval', 'As Built'].includes(status)) {
                        nextGroupStatus = status === 'As Built' ? 'As Built' : 'Pending';

                        // Auto-calculate new upload deadline: Current Date + 5 Days
                        const now = new Date();
                        const createdAt = new Date(doc.createdAt);
                        const diffMs = Math.max(0, now.getTime() - createdAt.getTime());
                        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        nextUploadDueDays = diffDays + 5;
                    }

                    await tx.group_document.update({
                        where: { id: doc.id },
                        data: {
                            status: nextGroupStatus,
                            upload_due_days: nextUploadDueDays
                        }
                    });

                    await ActivityService.logActivity({
                        company_id,
                        group_document_id: doc.id,
                        transmission_id,
                        user_id: updatedTransmission.created_by,
                        action: status === 'Approved' ? 'Client Approved' : `Client ${status}`,
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

        // 5. Trigger Email Notifications in background
        this._sendBulkClientReviewNotifications(company_id, transmission_id, status, remarks).catch(e =>
            console.error("[DccService] Bulk client review notification error:", e)
        );

        return result;
    }

    /**
     * Update Client Status for an individual Document within a Transmission
     * Creates a new version for the document feedback.
     * Statuses: Approved, Rejected, Commented
     */
    async updateTransmissionDocumentClientStatus(company_id, user_id, transmission_document_id, status, remarks, files) {
        const validStatuses = ['Approved', 'Rejected', 'Commented', 'Final Approved', 'Re-approval', 'As Built'];
        if (!validStatuses.includes(status)) throw new Error('Invalid status');

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
        const reviewedVersionId = transDoc.version_id;

        const result = await prisma.$transaction(async (tx) => {
            const savedFiles = [];

            // 2. Process Files if provided (Store as Feedback Attachments)
            if (files && files.length > 0) {
                const docNumber = groupDoc.document.document_number;
                const transNumber = transDoc.transmission.transmission_number;

                // Fetch version info for directory structure
                const reviewedVersion = await tx.document_version.findUnique({ where: { id: reviewedVersionId } });
                const vNo = reviewedVersion?.version_no ?? 0;

                // Directory pattern: transmissions/[TR_NO]/client_feedback/[DOC_NO]/rev_[REV_NO]
                const targetDir = StorageUtils.getTransmissionDocumentFeedbackDir(company_id, transNumber, docNumber, vNo);

                for (const file of files) {
                    const targetPath = path.join(targetDir, file.filename || file.originalname);

                    // Move file from temp to final destination
                    fs.renameSync(file.path, targetPath);

                    const relativePath = StorageUtils.getRelativePath(targetPath);

                    // Feedback URL for the trail (Public/Secure route)
                    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
                    const feedbackUrl = `${backendUrl}/api/dcc/document/feedback?filename=${encodeURIComponent(file.originalname)}&filepath=${encodeURIComponent(relativePath)}`;

                    // Save DB record
                    const dbFile = await tx.client_reviewed_document_file.create({
                        data: {
                            transmission_document_id,
                            original_filename: file.originalname,
                            file_url: feedbackUrl,
                            file_path: relativePath,
                            file_size: file.size,
                            mime_type: file.mimetype
                        }
                    });

                    savedFiles.push({
                        original_filename: dbFile.original_filename,
                        file_url: dbFile.file_url,
                        file_path: dbFile.file_path,
                        file_size: dbFile.file_size,
                        mime_type: dbFile.mime_type
                    });
                }
            }

            // 3. Update the transmission_document with per-document client status
            await tx.transmission_document.update({
                where: { id: transmission_document_id },
                data: {
                    client_status: status,
                    client_remarks: remarks || null
                }
            });

            // 4. Update the reviewed version record status
            await tx.document_version.update({
                where: { id: reviewedVersionId },
                data: { status, remarks: remarks || `Reviewed by Client as ${status}` }
            });

            // 5. Update Group Document Status and Auto-calculate next upload deadline if needed
            let nextGroupStatus = groupDoc.status;
            let nextUploadDueDays = groupDoc.upload_due_days;

            if (['Approved', 'Final Approved'].includes(status)) {
                nextGroupStatus = 'Approved';
            } else if (['Rejected', 'Commented', 'Re-approval'].includes(status)) {
                nextGroupStatus = 'Pending';

                // Auto-calculate new upload deadline: Current Date + 5 Days
                const now = new Date();
                const createdAt = new Date(groupDoc.createdAt);
                const diffMs = Math.max(0, now.getTime() - createdAt.getTime());
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                nextUploadDueDays = diffDays + 5;
            } else if (status === 'As Built') {
                nextGroupStatus = 'As Built';

                // Auto-calculate new upload deadline: Current Date + 5 Days
                const now = new Date();
                const createdAt = new Date(groupDoc.createdAt);
                const diffMs = Math.max(0, now.getTime() - createdAt.getTime());
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                nextUploadDueDays = diffDays + 5;
            }

            // Update database
            await tx.group_document.update({
                where: { id: groupDoc.id },
                data: {
                    status: nextGroupStatus,
                    upload_due_days: nextUploadDueDays
                }
            });

            // 6. Bulk update parent Transmission client_status
            const allTransDocs = await tx.transmission_document.findMany({
                where: { transmission_id: transDoc.transmission_id },
                select: { client_status: true }
            });

            const statuses = allTransDocs.map(d => d.client_status);
            let transmissionStatus = 'Pending';
            if (statuses.every(s => s === 'Approved')) transmissionStatus = 'Approved';
            else if (statuses.every(s => s === 'Rejected')) transmissionStatus = 'Rejected';
            else if (statuses.some(s => s !== 'Pending')) transmissionStatus = 'Partially Approved';

            await tx.transmission.update({
                where: { id: transDoc.transmission_id },
                data: { client_status: transmissionStatus }
            });

            // 7. Log Activity with feedback_url for trail display
            const actionLabel = status === 'Approved' ? 'Client Approved'
                : status === 'Final Approved' ? 'Client Final Approved'
                    : status === 'Rejected' ? 'Client Rejected'
                        : status === 'As Built' ? 'Client As Built'
                            : status === 'Re-approval' ? 'Client Re-approval'
                                : 'Client Commented';

            const reviewedVersion = await tx.document_version.findUnique({ where: { id: reviewedVersionId } });

            await ActivityService.logActivity({
                company_id,
                group_document_id: groupDoc.id,
                transmission_id: transDoc.transmission_id,
                user_id,
                action: actionLabel,
                remarks: remarks || `Document reviewed as ${status} from Transmission ${transDoc.transmission.transmission_number}`,
                metadata: {
                    status,
                    transmission_no: transDoc.transmission.transmission_number,
                    document_number: groupDoc.document.document_number,
                    document_name: groupDoc.document.document_name,
                    version_no: reviewedVersion?.version_no,
                    has_file: savedFiles.length > 0,
                    feedback_url: savedFiles.length > 0 ? savedFiles[0].file_url : null,
                    feedback_files: savedFiles,
                    transmission_status: transmissionStatus
                }
            }, tx);

            // 8. Pre-allocate Next Revision if status requires re-upload
            // If Rejected, Commented, Re-approval, or As Built, we prepare the next Rev slot
            if (['Rejected', 'Commented', 'Re-approval', 'As Built'].includes(status)) {
                const reviewedVersion = await tx.document_version.findUnique({
                    where: { id: reviewedVersionId },
                    include: { group_document: { include: { group: { include: { job_group: { include: { job: true } } } } } } }
                });

                if (reviewedVersion) {
                    const nextVersionNo = reviewedVersion.version_no + 1;
                    const docNumber = groupDoc.document.document_number;
                    const job_number = reviewedVersion.group_document.group?.job_group[0]?.job?.job_number || 'NA';

                    // Create physical folder for the next revision
                    StorageUtils.getDocRevisionDir(company_id, job_number, docNumber, nextVersionNo);

                    // Deactivate current version and create Pending placeholder
                    await tx.document_version.update({
                        where: { id: reviewedVersionId },
                        data: { is_active: false }
                    });

                    await tx.document_version.create({
                        data: {
                            group_document_id: groupDoc.id,
                            version_no: nextVersionNo,
                            file_url: '', // Empty until user uploads
                            file_path: '',
                            status: 'Pending',
                            remarks: `Awaiting re-upload after Client Review (${status})`,
                            uploaded_by: user_id,
                            is_active: true
                        }
                    });
                }
            }

            return { group_document: groupDoc, transmission_status: transmissionStatus };
        });

        // 9. Trigger Email Notification in background
        this._sendClientReviewNotification(groupDoc, reviewedVersionId, status, remarks, transDoc.transmission.transmission_number).catch(e =>
            console.error("[DccService] Client review notification error:", e)
        );

        return result;
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

    /**
     * Helper to send client review notification in background
     * @private
     */
    async _sendClientReviewNotification(groupDoc, versionId, status, remarks, transmissionNo) {
        try {
            const [uploader, version] = await Promise.all([
                prisma.user.findUnique({ where: { id: groupDoc.user_id } }),
                prisma.document_version.findUnique({ where: { id: versionId } })
            ]);

            if (uploader && uploader.email) {
                await EmailService.sendClientReviewNotification(uploader.email, uploader.name, {
                    documentName: groupDoc.document?.document_name || 'Document',
                    documentNumber: groupDoc.document?.document_number || 'N/A',
                    versionNo: version?.version_no ?? 0,
                    status: status,
                    remarks: remarks || '',
                    transmissionNo: transmissionNo
                });
                console.log(`[DccService] Client review email sent to ${uploader.email} for ${groupDoc.document?.document_number}`);
            }
        } catch (error) {
            console.error("[DccService] Failed to send client review notification:", error);
        }
    }

    /**
     * Helper to send bulk client review notifications
     * @private
     */
    async _sendBulkClientReviewNotifications(company_id, transmission_id, status, remarks) {
        try {
            const transmission = await prisma.transmission.findUnique({
                where: { id: transmission_id },
                include: {
                    documents: {
                        include: {
                            group_document: { include: { document: true } },
                            version: true
                        }
                    }
                }
            });

            if (!transmission) return;

            for (const td of transmission.documents) {
                if (td.group_document) {
                    await this._sendClientReviewNotification(
                        td.group_document,
                        td.version_id,
                        status,
                        remarks,
                        transmission.transmission_number
                    );
                }
            }
        } catch (error) {
            console.error("[DccService] Failed to send bulk client review notifications:", error);
        }
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

                // Manual Assignment requirement: user_id is mandatory
                if (!assignedUserId) throw new Error("Assignee (User) is mandatory for document assignment. Please select a user for all documents.");

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
                    user_id: assign_user_id === undefined ? undefined : assign_user_id,
                    upload_due_days: upload_due_days === undefined ? undefined : (upload_due_days ? parseInt(upload_due_days) : null),
                    response_due_days: response_due_days === undefined ? undefined : (response_due_days ? parseInt(response_due_days) : null),
                    shreno_doc_no: shreno_document_no === undefined ? undefined : (shreno_document_no || null),
                    shreno_reference_no: shreno_reference_no === undefined ? undefined : (shreno_reference_no || null),
                    client_doc_no: client_document_no === undefined ? undefined : (client_document_no || null),
                    client_reference_no: client_reference_no === undefined ? undefined : (client_reference_no || null)
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
     * Delete an assigned document (soft delete)
     */
    async deleteAssignedDocument(company_id, id) {
        return await prisma.group_document.update({
            where: { id, company_id },
            data: { is_deleted: true, is_active: false }
        });
    }

    /**
     * Toggle status of an assigned document
     */
    async toggleAssignedDocumentStatus(company_id, id) {
        const existing = await prisma.group_document.findFirst({ where: { id, company_id } });
        if (!existing) throw new Error('Assignment not found');
        return await prisma.group_document.update({
            where: { id },
            data: { is_active: !existing.is_active }
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

            return doc;
        });
    }

    /**
     * Helper to show version context (v0, v1, v2...) for all documents.
     * - For documents with uploaded versions: shows the latest uploaded version_no.
     * - For pending-only documents (no file yet): shows the placeholder version_no (v0).
     * The frontend status badge communicates whether a file has been uploaded.
     * @private
     */
    async _enrichWithVersionContext(docs) {
        if (!docs || docs.length === 0) return docs;

        return docs.map(doc => {
            if (doc.versions && doc.versions.length > 0) {
                // Prefer the first non-Pending version (real uploaded file)
                const uploadedVersion = doc.versions.find(v => v.status !== 'Pending');
                const versionToDisplay = uploadedVersion || doc.versions[0];
                doc.display_version_no = versionToDisplay.version_no;
            } else {
                // No versions at all (edge case: pre-existing docs before this feature)
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
    async bulkAssignDocuments(company_id, data, performer_id) {
        const { assignments } = data;

        if (!assignments || !Array.isArray(assignments)) {
            throw new Error('Invalid assignment data');
        }

        const results = await prisma.$transaction(async (tx) => {

            const results = [];

            // Fetch all job details for the assignments to get Customer, Location, PO, and Job Number
            // Flatten jobIds because a.job_id can now be an array
            const jobIds = [...new Set(assignments.flatMap(a => Array.isArray(a.job_id) ? a.job_id : [a.job_id]).filter(Boolean))];
            const foundJobs = await tx.job.findMany({
                where: { id: { in: jobIds } },
                select: { id: true, job_number: true, customer_id: true, customer_location_id: true, po_id: true }
            });
            const jobMap = Object.fromEntries(foundJobs.map(j => [j.id, j]));

            // Pre-fetch latest serial number once for the batch to ensure concurrency-safe consecutive numbering
            const maxDocAtStart = await tx.document_master.findFirst({
                where: { company_id },
                orderBy: { serial_no: 'desc' }
            });
            let batchSerialCounter = maxDocAtStart?.serial_no || 0;

            for (const assign of assignments) {
                const {
                    job_id,
                    document_name,
                    document_type_id,
                    assign_user_id,
                    upload_due_days,
                    response_due_days,
                    shreno_document_no,
                    shreno_reference_no,
                    client_document_no,
                    client_reference_no
                } = assign;

                if (!job_id || !document_name) continue;

                // Handle both single job_id and array of job_ids
                const jobIdsToProcess = Array.isArray(job_id) ? job_id : [job_id];
                if (jobIdsToProcess.length === 0) continue;

                // Backend Cleaning: Final trim and sanitize
                const cleanDocName = document_name.trim();

                // Extract customer, location, and po from the verified job mapping
                const firstJobId = jobIdsToProcess[0];
                const targetJob = jobMap[firstJobId];
                if (!targetJob) continue;

                const customer_id = targetJob.customer_id;
                const customer_location_id = targetJob.customer_location_id;
                const po_id = targetJob.po_id;

                // 1. Find or Create Document Master for this name and type
                let documentMaster = await tx.document_master.findFirst({
                    where: {
                        company_id,
                        document_name: cleanDocName
                    }
                });

                if (!documentMaster) {
                    // Increment batch counter for the new document
                    batchSerialCounter++;
                    const docNumber = this._getFormattedDocNumber(batchSerialCounter);

                    documentMaster = await tx.document_master.create({
                        data: {
                            company_id,
                            serial_no: batchSerialCounter,
                            document_name: cleanDocName,
                            document_number: docNumber,
                            document_type_id: document_type_id || null
                        }
                    });
                }

                // 2. Create a unique Group for this specific assignment
                // Check if this document name is already assigned to ANY of the selected jobs
                const existingAssignments = await tx.group_document.findMany({
                    where: {
                        company_id,
                        document_id: documentMaster.id,
                        group: {
                            job_group: {
                                some: { job_id: { in: jobIdsToProcess } }
                            }
                        }
                    }
                });

                if (existingAssignments.length > 0) {
                    results.push({
                        status: 'skipped',
                        message: `Document "${cleanDocName}" is already assigned to one or more of the selected jobs.`,
                        document_name: cleanDocName,
                        job_id: jobIdsToProcess
                    });
                    continue;
                }

                const group = await tx.group.create({
                    data: { company_id }
                });

                for (const currentJobId of jobIdsToProcess) {
                    await tx.job_group.create({
                        data: {
                            company_id,
                            group_id: group.id,
                            job_id: currentJobId
                        }
                    });
                }

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
                        shreno_doc_no: shreno_document_no || null,
                        shreno_reference_no: shreno_reference_no || null,
                        client_doc_no: client_document_no || null,
                        client_reference_no: client_reference_no || null
                    }
                });

                // 3. Create initial v0 directory + placeholder version record
                const job_number = targetJob.job_number || 'NA';
                const document_number = documentMaster.document_number || 'NA';

                // Create the empty v0 directory on the filesystem
                StorageUtils.getDocRevisionDir(company_id, job_number, document_number, 0);

                // Create a placeholder document_version row (no file yet)
                // The upload flow's Case 1 logic will fill this in on first upload
                await tx.document_version.create({
                    data: {
                        group_document_id: groupDoc.id,
                        version_no: 0,
                        file_url: '',
                        file_path: null,
                        is_active: true,
                        status: 'Pending',
                        uploaded_by: assign_user_id,
                        remarks: 'Initial assignment placeholder'
                    }
                });

                results.push(groupDoc);

                // 4. Log Activity
                const allJobNumbers = jobIdsToProcess.map(jid => jobMap[jid]?.job_number).filter(Boolean).join(', ');
                await ActivityService.logActivity({
                    company_id,
                    group_document_id: groupDoc.id,
                    user_id: performer_id,
                    action: 'Assigned',
                    remarks: `Document assigned for jobs: ${allJobNumbers}`
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
            const uploadOverdueByCompany = {}; // companyId -> docs[]

            for (const doc of pendingDocs) {
                const created = new Date(doc.createdAt);
                const deadline = new Date(created.getTime() + (doc.upload_due_days * 24 * 60 * 60 * 1000));

                if (now > deadline) {
                    if (!uploadOverdueUsers[doc.user_id]) uploadOverdueUsers[doc.user_id] = { user: doc.user, docs: [] };

                    const docDetails = {
                        document_name: doc.document.document_name,
                        document_number: doc.document.document_number,
                        job_number: doc.group?.job_group?.map(jg => jg.job?.job_number).join(', ') || 'N/A',
                        assigned_user: doc.user?.name || 'Unknown'
                    };

                    uploadOverdueUsers[doc.user_id].docs.push(docDetails);

                    if (!uploadOverdueByCompany[doc.company_id]) uploadOverdueByCompany[doc.company_id] = [];
                    uploadOverdueByCompany[doc.company_id].push(docDetails);
                }
            }

            // Send Upload Overdue emails to Users
            for (const userId in uploadOverdueUsers) {
                const { user, docs } = uploadOverdueUsers[userId];
                if (user && user.email) {
                    await EmailService.sendDocumentOverdueNotification(user.email, user.name, 'upload', docs);
                    console.log(`[DccService] Upload Overdue email sent to User ${user.email} for ${docs.length} items`);
                }
            }

            // Send Upload Overdue emails to DCC Admins
            for (const companyId in uploadOverdueByCompany) {
                const uploadOverdueDocs = uploadOverdueByCompany[companyId];
                if (uploadOverdueDocs.length === 0) continue;

                const dccAdmins = await prisma.user.findMany({
                    where: {
                        company_id: companyId,
                        user_roles: { some: { role: { name: { in: ['DCC'] } } } }
                    }
                });

                const adminEmails = [...new Set(dccAdmins.map(a => a.email).filter(Boolean))];
                if (adminEmails.length > 0) {
                    const toEmails = adminEmails.join(', ');
                    await EmailService.sendDocumentOverdueNotification(toEmails, 'DCC Team', 'upload', uploadOverdueDocs);
                    console.log(`[DccService] Upload Overdue email sent to DCC Team (${toEmails}) (Company ${companyId}) for ${uploadOverdueDocs.length} items`);
                }
            }

            // 2. Check for RESPONSE OVERDUE (Uploaded docs awaiting approval)
            const submittedDocs = await prisma.group_document.findMany({
                where: {
                    status: 'Pending for Approval',
                    response_due_days: { not: null }
                },
                include: {
                    user: true,
                    document: true,
                    group: { include: { job_group: { include: { job: true } } } },
                    versions: { orderBy: { version_no: 'desc' }, take: 1 }
                }
            });

            // Group overdue docs by company_id
            const overdueByCompany = {};

            for (const doc of submittedDocs) {
                const lastVersion = doc.versions[0];
                if (!lastVersion) continue;

                const uploadedAt = new Date(lastVersion.createdAt);
                const deadline = new Date(uploadedAt.getTime() + (doc.response_due_days * 24 * 60 * 60 * 1000));

                if (now > deadline) {
                    if (!overdueByCompany[doc.company_id]) {
                        overdueByCompany[doc.company_id] = [];
                    }
                    overdueByCompany[doc.company_id].push({
                        document_name: doc.document.document_name,
                        document_number: doc.document.document_number,
                        job_number: doc.group?.job_group?.map(jg => jg.job?.job_number).join(', ') || 'N/A',
                        assigned_user: doc.user?.name || 'Unknown'
                    });
                }
            }

            // Notify DCC admins PER company
            for (const companyId in overdueByCompany) {
                const responseOverdueDocs = overdueByCompany[companyId];
                if (responseOverdueDocs.length === 0) continue;

                const dccAdmins = await prisma.user.findMany({
                    where: {
                        company_id: companyId,
                        user_roles: {
                            some: {
                                role: {
                                    name: { in: ['DCC'] }
                                }
                            }
                        }
                    }
                });

                const adminEmails = [...new Set(dccAdmins.map(a => a.email).filter(Boolean))];
                if (adminEmails.length > 0) {
                    const toEmails = adminEmails.join(', ');
                    await EmailService.sendDocumentOverdueNotification(toEmails, 'DCC Team', 'response', responseOverdueDocs);
                    console.log(`[DccService] Response Overdue email sent to DCC Team (${toEmails}) (Company ${companyId}) for ${responseOverdueDocs.length} items`);
                }
            }

        } catch (error) {
            console.error("[DccService] Overdue check error:", error);
        }
    }

    // --- Email Template CRUD ---

    async getEmailTemplates(company_id) {
        return await prisma.email_template.findMany({
            where: { company_id },
            orderBy: { name: 'asc' }
        });
    }

    async createEmailTemplate(company_id, data) {
        const { name, subject, body } = data;
        if (!name || !subject || !body) throw new Error('Name, Subject, and Body are all required');

        return await prisma.email_template.create({
            data: {
                company_id,
                name: name.trim(),
                subject: subject.trim(),
                body: body.trim()
            }
        });
    }

    async updateEmailTemplate(company_id, id, data) {
        const { name, subject, body } = data;
        return await prisma.email_template.update({
            where: { id, company_id },
            data: {
                name: name ? name.trim() : undefined,
                subject: subject ? subject.trim() : undefined,
                body: body ? body.trim() : undefined
            }
        });
    }

    async deleteEmailTemplate(company_id, id) {
        return await prisma.email_template.delete({
            where: { id, company_id }
        });
    }

    /**
     * Shared filter processing utility
     */
    _processFilter(val) {
        if (!val) return null;
        if (Array.isArray(val)) return { in: val };
        if (typeof val === 'string' && (val.includes(',') || val.includes('|'))) {
            // Handle comma or pipe separated values
            const splitChar = val.includes('|') ? '|' : ',';
            return { in: val.split(splitChar).map(v => v.trim()).filter(Boolean) };
        }
        // Single string value — exact match
        return val;
    }

    /**
     * Helper to notify DCC Admins of a new upload
     * @private
     */
    async _sendUploadNotificationToAdmins(company_id, group_document_id, uploader_id, versionNo) {
        try {
            console.log(`[DccService] Attempting upload notification for doc ${group_document_id} (uploader: ${uploader_id})`);

            const [groupDoc, uploader, dccAdmins] = await Promise.all([
                prisma.group_document.findUnique({
                    where: { id: group_document_id },
                    include: {
                        document: true,
                        group: { include: { job_group: { include: { job: true } } } }
                    }
                }),
                prisma.user.findUnique({ where: { id: uploader_id } }),
                prisma.user.findMany({
                    where: {
                        company_id,
                        user_roles: {
                            some: {
                                role: {
                                    name: {
                                        in: ['DCC']
                                    }
                                }
                            }
                        }
                    }
                })
            ]);

            if (!groupDoc) {
                console.warn(`[DccService] Notification failed: groupDoc ${group_document_id} not found`);
                return;
            }
            if (!uploader) {
                console.warn(`[DccService] Notification failed: uploader ${uploader_id} not found`);
                return;
            }

            if (dccAdmins.length === 0) {
                console.warn(`[DccService] No DCC/ADMIN users found for company ${company_id} to notify of upload`);
                return;
            }

            const details = {
                documentName: groupDoc.document?.document_name || 'Document',
                documentNumber: groupDoc.document?.document_number || 'N/A',
                uploaderName: uploader.name,
                versionNo: versionNo,
                jobNo: groupDoc.group?.job_group?.map(jg => jg.job?.job_number).join(', ') || 'N/A'
            };

            let sentCount = 0;
            const uniqueEmails = new Set();
            for (const admin of dccAdmins) {
                if (admin.email && !uniqueEmails.has(admin.email)) {
                    uniqueEmails.add(admin.email);
                    await EmailService.sendDocumentUploadedNotification(admin.email, admin.name, details);
                    sentCount++;
                }
            }
            console.log(`[DccService] Upload notification sent to ${sentCount}/${dccAdmins.length} admins for ${details.documentNumber}`);
        } catch (error) {
            console.error("[DccService] Failed to send upload notification to admins:", error);
        }
    }



    async getDocumentFileDetails(fileId) {
        return await prisma.document_file.findFirst({
            where: { id: fileId }
        });
    }

    _getFormattedDocNumber(serial_no) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `DOC-${year}-${month}-${String(serial_no).padStart(5, '0')}`;
    }
}

module.exports = new DccService();
