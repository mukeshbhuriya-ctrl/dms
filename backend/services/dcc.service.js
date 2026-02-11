const prisma = require('#prisma');

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
                            jobs: true,
                        },
                    },
                    pos: {
                        include: {
                            jobs: true,
                            po_communication_matrix: true,
                        },
                    },
                    jobs: true,
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
        const { page = 1, limit = 50, search = '' } = params;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { company_id };

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
}

module.exports = new DccService();
