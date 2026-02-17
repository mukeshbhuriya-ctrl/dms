const prisma = require('#prisma');
const EmailService = require('./email.service');

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
                    customer: { select: { customer_name: true } },
                    customer_location: { select: { location_name: true } }
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
                    customer: { select: { customer_name: true } },
                    customer_location: { select: { location_name: true } },
                    po: { select: { po_number: true } }
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
        const { page = 1, limit = 50, search = '' } = params;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { company_id };

        if (search) {
            where.OR = [
                { document_number: { contains: search, mode: 'insensitive' } },
                { document_name: { contains: search, mode: 'insensitive' } }
            ];
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
                where.status = 'Rejected';
            } else if (filterVal === 'na') {
                where.status = { notIn: ['Uploaded', 'Pending', 'Approved', 'Rejected'] }; // Likely just 'Pending'
            }
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
        }

        if (approver_status_filter && approver_status_filter !== 'all') {
            const filterVal = approver_status_filter.toLowerCase();
            if (filterVal === 'pending for approval' || filterVal === 'pending') {
                where.status = { in: ['Uploaded', 'Pending'] };
            } else if (filterVal === 'approved') {
                where.status = 'Approved';
            } else if (filterVal === 'rejected') {
                where.status = 'Rejected';
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
            await tx.document_version.update({
                where: { id: latestVersion.id },
                data: { status, remarks }
            });

            await tx.group_document.update({
                where: { id: document_id },
                data: { status }
            });

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
                document: true
            }
        });

        if (docs.length !== document_ids.length) throw new Error('Some documents not found');

        const invalidDocs = docs.filter(d => d.status !== 'Approved');
        if (invalidDocs.length > 0) {
            throw new Error(`Documents not approved: ${invalidDocs.map(d => d.document.document_number).join(', ')}`);
        }

        // Generate Transmission Number
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.transmission.count({ where: { company_id } });
        const transNum = `TR-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;
        const password = Math.random().toString(36).slice(-8).toUpperCase();

        // 2. Generate ZIP File
        const fs = require('fs');
        const path = require('path');
        const archiver = require('archiver');
        const uploadsDir = path.join(__dirname, '../../uploads'); // Adjust based on actual structure
        const transmissionZipName = `${transNum}.zip`;
        const transmissionZipPath = path.join(uploadsDir, transmissionZipName);

        // Ensure uploads dir exists (it should)
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const output = fs.createWriteStream(transmissionZipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        // Promise to handle ZIP generation
        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);

            docs.forEach(doc => {
                const version = doc.versions[0];
                if (version && version.file_url) {
                    // Extract filename from URL: http://localhost:3000/uploads/filename.ext
                    const filename = version.file_url.split('/').pop();
                    const filePath = path.join(uploadsDir, filename);
                    if (fs.existsSync(filePath)) {
                        archive.file(filePath, { name: `${doc.document.document_number}-${doc.document.document_name}${path.extname(filename)}` });
                    }
                }
            });

            archive.finalize();
        });

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const zipUrl = `${backendUrl}/uploads/${transmissionZipName}`;

        return await prisma.$transaction(async (tx) => {
            const transmission = await tx.transmission.create({
                data: {
                    company_id,
                    transmission_number: transNum,
                    customer_id,
                    customer_location_id,
                    po_id,
                    password: password,
                    created_by: user_id,
                    zip_url: zipUrl
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
        const { po_id, page = 1, limit = 10, search } = params;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const where = { company_id };
        if (po_id) where.po_id = po_id;

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

        // 1. Fetch transmission details
        const transmission = await prisma.transmission.findFirst({
            where: { id: transmission_id, company_id },
            include: {
                po: true,
                customer: true,
                location: true
            }
        });

        if (!transmission) throw new Error('Transmission not found');

        // 2. Generate ZIP (Placeholder for now)
        // const zipUrl = await generateZipForTransmission(transmission_id);

        // 3. Send Email using EmailService
        // Client -> To, Shreno -> CC
        await EmailService.sendTransmissionEmail(client_emails, shreno_emails, {
            transmission_number: transmission.transmission_number,
            po_number: transmission.po.po_number,
            password: transmission.password,
            zip_url: transmission.zip_url || '#'
        });

        // Log locally as well
        console.log(`Email sent for transmission: ${transmission.transmission_number}`);

        // Note: Transmission table doesn't have a status field
        // Email delivery status is tracked via the email service

        return { success: true, message: 'Email sent successfully via EmailService' };
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
}

module.exports = new DccService();
