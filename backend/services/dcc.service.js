const prisma = require('#prisma');
const EmailService = require('./email.service');
const { generateTransmittalPDF } = require('../utils/pdfGeneratorTransmittal');

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
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            finalPoDocUrl = `${backendUrl}/uploads/${file.filename}`;
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

        return { data, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
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
        const { document_number, document_name, document_type_id } = data;

        if (!document_number || !document_name || !document_type_id) throw new Error('Missing required fields');

        // Verify document type exists
        const documentType = await prisma.document_type.findFirst({
            where: { id: document_type_id, company_id }
        });
        if (!documentType) throw new Error('Document type not found');

        // Check duplicates
        const existing = await prisma.document_master.findFirst({
            where: { company_id, document_number }
        });
        if (existing) throw new Error('Document number already exists');

        return await prisma.document_master.create({
            data: {
                company_id,
                document_number,
                document_name,
                document_type_id: document_type_id
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
                include: {
                    document_type: true
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return { data, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
    }

    // Document Types Helper
    async getDocumentTypes(company_id) {
        return await prisma.document_type.findMany({
            where: { company_id },
            orderBy: { name: 'asc' }
        });
    }

    async createDocumentType(company_id, name) {
        if (!name) throw new Error('Name is required');
        return await prisma.document_type.create({
            data: { company_id, name }
        });
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
                    document: {
                        include: { document_type: true }
                    },
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
                orderBy: { updatedAt: 'desc' }
            })
        ]);

        // Calculate Dynamic Status (Upload Due / Response Due)
        const EnhancedData = data.map(doc => {
            // If filtering by rejected, expose the rejected version details
            if (approver_status_filter && approver_status_filter.toLowerCase() === 'rejected') {
                const rejectedVersion = doc.versions[0];
                if (rejectedVersion) {
                    doc.status = rejectedVersion.status;
                    doc.updatedAt = rejectedVersion.createdAt; // Use version date
                }
            }

            const now = new Date();
            const created = new Date(doc.createdAt);

            // Logic for "Upload Due"
            // If status is "Pending" (not uploaded) and time since creation > upload_due_days
            if (doc.status === 'Pending' && doc.upload_due_days) {
                const uploadDeadline = new Date(created.getTime() + (doc.upload_due_days * 24 * 60 * 60 * 1000));
                if (now > uploadDeadline) {
                    doc.status = 'Upload Due';
                    // Optional: doc.isOverdue = true;
                }
            }

            // Logic for "Response Due"
            // If status is "Uploaded" (waiting for approval) and time since upload > response_due_days
            // We need the date of the last upload (version creation date)
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

        return { data: EnhancedData, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
    }
    /**
     * Get all assigned documents (Admin View)
     */
    async getAllAssignedDocuments(company_id, params = {}) {
        const { page = 1, limit = 50, search = '', customer_id, location_id, po_id, job_id, status } = params;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const where = { company_id };

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

        if (status) where.status = status;

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
                    document: {
                        include: { document_type: true }
                    },
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

        return { data, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
    }


    /**
     * Upload Document Version
     */
    async uploadDocumentVersion(company_id, user_id, document_id, file, remarks) {
        if (!file) throw new Error('File is required');

        const groupDoc = await prisma.group_document.findFirst({
            where: { id: document_id, company_id }
        });

        if (!groupDoc) throw new Error('Document assignment not found');

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const fileUrl = `${backendUrl}/uploads/${file.filename}`;

        const lastVersion = await prisma.document_version.findFirst({
            where: { group_document_id: document_id },
            orderBy: { version_no: 'desc' }
        });
        const versionNo = lastVersion ? lastVersion.version_no + 1 : 1;

        return await prisma.$transaction(async (tx) => {
            const version = await tx.document_version.create({
                data: {
                    group_document_id: document_id,
                    version_no: versionNo,
                    file_url: fileUrl,
                    remarks,
                    status: 'Uploaded',
                    uploaded_by: user_id
                }
            });

            await tx.group_document.update({
                where: { id: document_id },
                data: { status: 'Uploaded' }
            });

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
                where.status = { in: ['Pending', 'Rejected'] };
            } else if (status_filter === 'done') {
                where.status = { in: ['Approved', 'Uploaded', 'Pending'] };
            }
        } else {
            // Default: Show Uploaded, Approved, and Rejected.
            // Explicitly exclude 'Pending' (not uploaded) to declutter.
            if (!where.status) {
                where.status = { in: ['Uploaded', 'Approved', 'Rejected'] };
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
                // This allows retrieving documents that were rejected and then re-uploaded (currently 'Uploaded').
                where.versions = {
                    some: {
                        status: { in: ['Rejected', 'rejected'] }
                    }
                };
            } else if (filterVal === 'na') {
                where.status = { notIn: ['Uploaded', 'Pending', 'Approved', 'Rejected'] }; // Likely just 'Pending'
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
                    document: {
                        include: { document_type: true }
                    },
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
                orderBy: { updatedAt: 'desc' }
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

        // Calculate Dynamic Status (Upload Due / Response Due)
        const EnhancedData = processingData.map(doc => {
            // If filtering by rejected, expose the rejected version details
            if (approver_status_filter && approver_status_filter.toLowerCase() === 'rejected') {
                const rejectedVersion = doc.versions[0];
                if (rejectedVersion) {
                    doc.status = rejectedVersion.status;
                    doc.updatedAt = rejectedVersion.createdAt; // Use version date
                    // Note: Remarks are already pulled from versions[0] in frontend
                }
            }

            const now = new Date();
            const created = new Date(doc.createdAt); // Assignment date

            // Logic for "Upload Due"
            if (doc.status === 'Pending' && doc.upload_due_days) {
                const uploadDeadline = new Date(created.getTime() + (doc.upload_due_days * 24 * 60 * 60 * 1000));
                if (now > uploadDeadline) {
                    doc.status = 'Upload Due';
                }
            }

            // Logic for "Response Due"
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

        // Note: total might optionally be adjusted if we want precise pagination metadata, 
        // but since this is usually limited to 1000/one-page for creation, keeping original count is acceptable or we accept slight mismatch.
        // For correctness in list view, let's update total if filtered? 
        // Actually total is DB count. We can't easily adjust typical pagination.
        // But for 'Create Transmission' we generally pull all.

        return { data: EnhancedData, meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) } };
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
                data: { status }
            });

            // 3. Handle Re-entry on Rejection
            if (status === 'Rejected') {
                await tx.group_document.create({
                    data: {
                        company_id: groupDoc.company_id,
                        customer_id: groupDoc.customer_id,
                        customer_location_id: groupDoc.customer_location_id,
                        po_id: groupDoc.po_id,
                        group_id: groupDoc.group_id,
                        document_id: groupDoc.document_id,
                        shreno_doc_no: groupDoc.shreno_doc_no,
                        shreno_reference_no: groupDoc.shreno_reference_no,
                        client_doc_no: groupDoc.client_doc_no,
                        client_reference_no: groupDoc.client_reference_no,
                        upload_due_days: groupDoc.upload_due_days,
                        response_due_days: groupDoc.response_due_days,
                        user_id: groupDoc.user_id,
                        status: 'Pending' // Reset for re-upload
                    }
                });
            }

            return { id: document_id, status };
        });
    }

    /**
     * Create Transmission
     */
    async createTransmission(company_id, user_id, data) {
        const { customer_id, customer_location_id, po_id, document_ids } = data; // document_ids is array of single_document.id

        if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
            throw new Error('No documents selected');
        }

        // Fetch documents to verify they are Approved
        const docs = await prisma.group_document.findMany({
            where: {
                id: { in: document_ids },
                company_id
            },
            include: {
                // Use versions relation to get the latest version
                versions: { orderBy: { version_no: 'desc' }, take: 1 },
                document: true,
                // Fetch related jobs via group -> job_group -> job
                group: {
                    include: {
                        job_group: {
                            include: {
                                job: true
                            }
                        }
                    }
                }
            }
        });

        if (docs.length !== document_ids.length) throw new Error('Some documents not found');

        const invalidDocs = docs.filter(d => d.status !== 'Approved');
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
        await ZipUtils.createTransmissionZip(transmissionZipName, docs);

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

        // Generate UUID first.
        const transmissionId = require('crypto').randomUUID();
        // Use PUBLIC route
        const zipDownloadLink = `${backendUrl}/api/secure/download/${transmissionId}`;

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
            for (const doc of docs) {
                await tx.transmission_document.create({
                    data: {
                        transmission_id: transmission.id,
                        group_document_id: doc.id,
                        version_id: doc.versions[0].id
                    }
                });
            }

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
                            }
                        }
                    }
                }
            }),
            prisma.transmission.count({ where })
        ]);

        return {
            data,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        };
    }

    async getTransmissionDocuments(company_id, transmission_id) {
        return await prisma.transmission_document.findMany({
            where: {
                transmission: {
                    id: transmission_id,
                    company_id
                }
            },
            include: {
                group_document: {
                    include: {
                        document: {
                            include: { document_type: true }
                        },
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
        await EmailService.sendTransmissionEmail(client_emails, shreno_emails, {
            transmission_number: transmission.transmission_number,
            po_number: transmission.po?.po_number || 'N/A',
            customer_name: transmission.customer?.customer_name || 'N/A',
            document_count: transmission.documents?.length || 0,
            password: transmission.password,
            zip_url: transmission.zip_url || '#'
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

    async updateTransmissionClientStatus(company_id, transmission_id, status, remarks) {
        if (!['Approved', 'Rejected'].includes(status)) throw new Error('Invalid status');

        const result = await prisma.transmission.update({
            where: { id: transmission_id, company_id },
            data: {
                client_status: status,
                client_remarks: remarks
            }
        });

        // 3. Cascade Rejection to Documents
        if (status === 'Rejected') {
            const transmissionDocs = await prisma.transmission_document.findMany({
                where: { transmission_id }
            });

            const groupDocIds = transmissionDocs
                .map(td => td.group_document_id)
                .filter(id => id); // Filter out nulls

            if (groupDocIds.length > 0) {
                // 3a. Update Old Group Documents to Rejected
                await prisma.group_document.updateMany({
                    where: { id: { in: groupDocIds } },
                    data: { status: 'Rejected' }
                });

                // 3b. Update Old Document Versions to Rejected
                const versionIds = transmissionDocs
                    .map(td => td.version_id)
                    .filter(id => id);

                if (versionIds.length > 0) {
                    await prisma.document_version.updateMany({
                        where: { id: { in: versionIds } },
                        data: {
                            status: 'Rejected',
                            remarks: remarks || 'Rejected by Client'
                        }
                    });
                }

                // 3c. Create NEW Group Documents (Re-entry)
                // Fetch full details of the rejected group documents to clone them
                const rejectedGroupDocs = await prisma.group_document.findMany({
                    where: { id: { in: groupDocIds } }
                });

                const newGroupDocsData = rejectedGroupDocs.map(doc => ({
                    company_id: doc.company_id,
                    customer_id: doc.customer_id,
                    customer_location_id: doc.customer_location_id,
                    po_id: doc.po_id,
                    group_id: doc.group_id,
                    document_id: doc.document_id,
                    shreno_doc_no: doc.shreno_doc_no,
                    shreno_reference_no: doc.shreno_reference_no,
                    client_doc_no: doc.client_doc_no,
                    client_reference_no: doc.client_reference_no,
                    upload_due_days: doc.upload_due_days,
                    response_due_days: doc.response_due_days,
                    user_id: doc.user_id,
                    status: 'Pending' // Reset status for re-upload
                }));

                if (newGroupDocsData.length > 0) {
                    await prisma.group_document.createMany({
                        data: newGroupDocsData
                    });
                }

                console.log(`Cascaded rejection: Updated ${groupDocIds.length} docs, ${versionIds.length} versions, and created ${newGroupDocsData.length} new pending entries.`);
            }
        }

        return result;
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
                document_type_id: document_type_id || undefined
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
}

module.exports = new DccService();
