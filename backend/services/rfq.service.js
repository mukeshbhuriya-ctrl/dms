const path = require('path');
const fs = require('fs');
const prisma = require('#prisma');
const StorageUtils = require('../utils/storage.utils');

class RfqService {
    /**
     * List RFQ records with pagination and search
     */
    async list(company_id, params = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const where = { company_id };

        const { quotation_no_filter } = params;

        if (quotation_no_filter) where.quotation_no = this._processFilter(quotation_no_filter);

        if (search) {
            where.OR = [
                { quotation_no: { contains: search, mode: 'insensitive' } },
                { client_name: { contains: search, mode: 'insensitive' } },
                { consultancy: { contains: search, mode: 'insensitive' } },
                { estimator: { contains: search, mode: 'insensitive' } },
                { contact_person: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [total, data] = await prisma.$transaction([
            prisma.rfq_register.count({ where }),
            prisma.rfq_register.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    _count: { select: { items: true } },
                },
            }),
        ]);

        return {
            data,
            meta: {
                total,
                page: Number(page),
                limit: take,
                totalPages: Math.ceil(total / take),
            },
        };
    }

    /**
     * Get financial year suffix (e.g., 2026-27 or 2024-25)
     */
    getFinancialYearSuffix() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1; // 1-indexed

        let startYear, endYearSuffix;
        if (month >= 4) { // April onwards
            startYear = year;
            endYearSuffix = (year + 1) % 100;
        } else {
            startYear = year - 1;
            endYearSuffix = year % 100;
        }

        return `${startYear}-${String(endYearSuffix).padStart(2, '0')}`;
    }

    /**
     * Get category prefix (MKT for Core, SPR for Spare)
     */
    getCategoryPrefix(category) {
        return category === 'Spare' ? 'SPR' : 'MKT';
    }

    /**
     * Get the next quotation number (preview before creating)
     */
    async getNextQuotationNo(company_id, category = 'Core') {
        const fySuffix = this.getFinancialYearSuffix();
        const prefix = this.getCategoryPrefix(category);

        // Find the last record for this category in the current financial year
        const lastRfq = await prisma.rfq_register.findFirst({
            where: {
                company_id,
                quotation_category: category,
                quotation_no: { contains: `/${fySuffix}` }
            },
            orderBy: { type_serial_no: 'desc' },
            select: { type_serial_no: true },
        });

        const nextTypeSerialNo = lastRfq ? lastRfq.type_serial_no + 1 : 1;
        const paddedSerial = String(nextTypeSerialNo).padStart(3, '0');
        const quotation_no = `SHR/${prefix}/${paddedSerial}/${fySuffix}`;

        return { next_quotation_no: quotation_no, next_serial_no: nextTypeSerialNo };
    }

    /**
     * Create a new RFQ record with items
     */
    async create(company_id, userId, body) {
        const {
            client_ref,
            rfq_type,
            client_name,
            consultancy,
            contact_person,
            mode_of_enquiry,
            enq_date,
            target_date,
            actual_submission_date,
            time_taken,
            mediator,
            estimator,
            shreno_status,
            client_status,
            remark,
            made_by,
            po_no,
            po_date,
            po_value,
            po_remark,
            items = [],
        } = body;

        // Enforce system-side rules
        this._enforceStatusRules(body);
        body.time_taken = this._calculateTimeTaken(body.enq_date, body.actual_submission_date);

        const rfq = await prisma.$transaction(async (tx) => {
            // 1. Calculate next global serial_no
            const lastGlobalRfq = await tx.rfq_register.findFirst({
                where: { company_id },
                orderBy: { serial_no: 'desc' },
                select: { serial_no: true },
            });
            const nextGlobalSerialNo = lastGlobalRfq ? lastGlobalRfq.serial_no + 1 : 1;

            // 2. Calculate next type-specific serial_no and quotation_no
            const quotation_category = body.quotation_category || 'Core';
            const fySuffix = this.getFinancialYearSuffix();
            const prefix = this.getCategoryPrefix(quotation_category);

            const lastTypeRfq = await tx.rfq_register.findFirst({
                where: {
                    company_id,
                    quotation_category: quotation_category,
                    quotation_no: { contains: `/${fySuffix}` }
                },
                orderBy: { type_serial_no: 'desc' },
                select: { type_serial_no: true },
            });

            const nextTypeSerialNo = lastTypeRfq ? lastTypeRfq.type_serial_no + 1 : 1;
            const paddedSerial = String(nextTypeSerialNo).padStart(3, '0');
            const quotation_no = `SHR/${prefix}/${paddedSerial}/${fySuffix}`;

            // 3. Create header record
            const header = await tx.rfq_register.create({
                data: {
                    company_id,
                    serial_no: nextGlobalSerialNo,
                    type_serial_no: nextTypeSerialNo,
                    quotation_no,
                    quotation_category,
                    client_ref: client_ref || null,
                    rfq_type: rfq_type || null,
                    client_name: client_name || null,
                    consultancy: consultancy || null,
                    contact_person: contact_person || null,
                    mode_of_enquiry: mode_of_enquiry || null,
                    enq_date: enq_date ? new Date(enq_date) : null,
                    target_date: target_date ? new Date(target_date) : null,
                    actual_submission_date: actual_submission_date ? new Date(actual_submission_date) : null,
                    time_taken: time_taken || null,
                    mediator: mediator || null,
                    estimator: estimator || null,
                    shreno_status: shreno_status || 'Quoted',
                    client_status: client_status || 'Under Review',
                    remark: remark || null,
                    made_by: made_by || null,
                    created_by: userId || null,
                    po_no: po_no || null,
                    po_date: po_date ? new Date(po_date) : null,
                    po_value: po_value ? parseFloat(po_value) : null,
                    po_remark: po_remark || null,
                },
            });

            // Create item rows
            if (items.length > 0) {
                await tx.rfq_register_item.createMany({
                    data: items.map((item, idx) => ({
                        rfq_id: header.id,
                        sr_no: item.sr_no !== undefined ? item.sr_no : idx + 1,
                        enq_description: item.enq_description || null,
                        equip_qty: item.equip_qty ? parseInt(item.equip_qty, 10) : null,
                        rev: item.rev || null,
                        total_value: item.total_value ? parseFloat(item.total_value) : null,
                    })),
                });
            }

            // Return with items
            return tx.rfq_register.findUnique({
                where: { id: header.id },
                include: {
                    items: { orderBy: { sr_no: 'asc' } },
                },
            });
        });

        return rfq;
    }

    /**
     * Update an existing RFQ record
     */
    async bulkCreate(company_id, user_id, rfqDataList) {
        return await prisma.$transaction(async (tx) => {
            const results = [];
            
            // Get current global last serial
            const lastGlobalRfq = await tx.rfq_register.findFirst({
                where: { company_id },
                orderBy: { serial_no: 'desc' },
                select: { serial_no: true },
            });
            let nextGlobalSerialNo = lastGlobalRfq ? lastGlobalRfq.serial_no + 1 : 1;

            // Track category-specific serials to handle them within the same batch
            const categoryLastSerials = {};
            const fySuffix = this.getFinancialYearSuffix();

            for (const body of rfqDataList) {
                const quotation_category = body.quotation_category || 'Core';
                const prefix = this.getCategoryPrefix(quotation_category);

                // Enforce system-side rules
                this._enforceStatusRules(body);
                body.time_taken = this._calculateTimeTaken(body.enq_date, body.actual_submission_date);

                // If we haven't fetched the last serial for this category yet, do it
                if (categoryLastSerials[quotation_category] === undefined) {
                    const lastTypeRfq = await tx.rfq_register.findFirst({
                        where: {
                            company_id,
                            quotation_category,
                            quotation_no: { contains: `/${fySuffix}` }
                        },
                        orderBy: { type_serial_no: 'desc' },
                        select: { type_serial_no: true },
                    });
                    categoryLastSerials[quotation_category] = lastTypeRfq ? lastTypeRfq.type_serial_no : 0;
                }

                categoryLastSerials[quotation_category] += 1;
                const nextTypeSerialNo = categoryLastSerials[quotation_category];
                const quotation_no = `SHR/${prefix}/${String(nextTypeSerialNo).padStart(3, '0')}/${fySuffix}`;

                const createdRfq = await tx.rfq_register.create({
                    data: {
                        company_id,
                        created_by: user_id,
                        serial_no: nextGlobalSerialNo++,
                        quotation_no,
                        quotation_category,
                        type_serial_no: nextTypeSerialNo,
                        client_ref: body.client_ref,
                        rfq_type: body.rfq_type,
                        client_name: body.client_name,
                        consultancy: body.consultancy,
                        contact_person: body.contact_person,
                        mode_of_enquiry: body.mode_of_enquiry,
                        enq_date: body.enq_date ? new Date(body.enq_date) : null,
                        target_date: body.target_date ? new Date(body.target_date) : null,
                        actual_submission_date: body.actual_submission_date ? new Date(body.actual_submission_date) : null,
                        time_taken: body.time_taken,
                        mediator: body.mediator,
                        estimator: body.estimator,
                        shreno_status: body.shreno_status || "Quoted",
                        client_status: body.client_status || "Under Review",
                        remark: body.remark,
                        made_by: body.made_by,
                        po_no: body.po_no,
                        po_date: body.po_date ? new Date(body.po_date) : null,
                        po_value: body.po_value ? parseFloat(body.po_value) : null,
                        po_remark: body.po_remark,
                        items: (body.enq_description || body.equip_qty) ? {
                            create: [{
                                sr_no: 1,
                                enq_description: body.enq_description,
                                equip_qty: body.equip_qty ? parseInt(body.equip_qty) : null,
                                rev: body.rev,
                                total_value: body.total_value ? parseFloat(body.total_value) : null,
                            }]
                        } : undefined
                    }
                });

                results.push(createdRfq);
            }

            return results;
        });
    }

    async update(company_id, id, body) {
        const existing = await prisma.rfq_register.findFirst({
            where: { id, company_id },
        });

        if (!existing) throw new Error('RFQ record not found');

        const {
            client_ref,
            rfq_type,
            client_name,
            consultancy,
            contact_person,
            mode_of_enquiry,
            enq_date,
            target_date,
            actual_submission_date,
            time_taken,
            mediator,
            estimator,
            shreno_status,
            client_status,
            remark,
            made_by,
            po_no,
            po_date,
            po_value,
            po_remark,
            items = [],
        } = body;

        // Enforce system-side rules
        this._enforceStatusRules(body);
        body.time_taken = this._calculateTimeTaken(body.enq_date, body.actual_submission_date);

        const rfq = await prisma.$transaction(async (tx) => {
            // Update header
            await tx.rfq_register.update({
                where: { id },
                data: {
                    client_ref: client_ref || null,
                    rfq_type: rfq_type || null,
                    client_name: client_name || null,
                    consultancy: consultancy || null,
                    contact_person: contact_person || null,
                    mode_of_enquiry: mode_of_enquiry || null,
                    enq_date: enq_date ? new Date(enq_date) : null,
                    target_date: target_date ? new Date(target_date) : null,
                    actual_submission_date: actual_submission_date ? new Date(actual_submission_date) : null,
                    time_taken: time_taken || null,
                    mediator: mediator || null,
                    estimator: estimator || null,
                    shreno_status: shreno_status || 'Quoted',
                    client_status: client_status || 'Under Review',
                    remark: remark || null,
                    made_by: made_by || null,
                    po_no: po_no || null,
                    po_date: po_date ? new Date(po_date) : null,
                    po_value: po_value ? parseFloat(po_value) : null,
                    po_remark: po_remark || null,
                },
            });

            // Delete old items and re-create
            await tx.rfq_register_item.deleteMany({ where: { rfq_id: id } });

            if (items.length > 0) {
                await tx.rfq_register_item.createMany({
                    data: items.map((item, idx) => ({
                        rfq_id: id,
                        sr_no: item.sr_no !== undefined ? item.sr_no : idx + 1,
                        enq_description: item.enq_description || null,
                        equip_qty: item.equip_qty ? parseInt(item.equip_qty, 10) : null,
                        rev: item.rev || null,
                        total_value: item.total_value ? parseFloat(item.total_value) : null,
                    })),
                });
            }

            return tx.rfq_register.findUnique({
                where: { id },
                include: {
                    items: { orderBy: { sr_no: 'asc' } },
                },
            });
        });

        return rfq;
    }

    /**
     * Get a single RFQ record with items
     */
    async getById(company_id, id) {
        const rfq = await prisma.rfq_register.findFirst({
            where: { id, company_id },
            include: {
                items: { orderBy: { sr_no: 'asc' } },
                attachments: { orderBy: { uploaded_at: 'desc' } },
                creator: { select: { name: true, email: true } },
            },
        });

        if (!rfq) throw new Error('RFQ record not found');
        return rfq;
    }

    async getAttachmentsByRfqId(company_id, rfq_id) {
        const rfq = await prisma.rfq_register.findFirst({
            where: { id: rfq_id, company_id },
            select: { quotation_no: true }
        });

        if (!rfq) throw new Error('RFQ not found');

        const attachments = await prisma.rfq_attachment.findMany({
            where: { rfq_id },
            orderBy: { uploaded_at: 'desc' }
        });

        const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');

        return {
            quotation_no: rfq.quotation_no,
            attachments: attachments.map(file => ({
                id: file.id,
                file_name: file.file_name,
                file_size: file.file_size,
                file_mime_type: file.mime_type,
                uploaded_at: file.uploaded_at,
                file_url: file.file_url?.startsWith('http') ? file.file_url : `${backendUrl}/api/rfq/${rfq_id}/files/${path.basename(file.file_url)}`,
                file_path: file.file_path
            }))
        };
    }

    /**
     * Delete an RFQ record (items and attachments cascade-delete)
     */
    async deleteById(company_id, id) {
        const existing = await prisma.rfq_register.findFirst({
            where: { id, company_id },
            include: { attachments: true }
        });

        if (!existing) throw new Error('RFQ record not found');

        // Delete files from storage
        existing.attachments.forEach(att => {
            if (att.file_path) {
                const absolutePath = path.join(StorageUtils.ROOT_DIR, att.file_path);
                if (fs.existsSync(absolutePath)) {
                    try { fs.unlinkSync(absolutePath); } catch (e) { console.error(e); }
                }
            }
        });

        await prisma.rfq_register.delete({ where: { id } });
        return { deleted: true };
    }

    async addAttachments(rfq_id, files) {
        if (!files || files.length === 0) return [];

        const rfqDir = StorageUtils.getRfqDir(rfq_id);
        const attachmentData = [];

        for (const file of files) {
            const destinationPath = path.join(rfqDir, file.filename);
            
            // Move file from temp upload dir to RFQ subdir
            if (fs.existsSync(file.path)) {
                fs.renameSync(file.path, destinationPath);
            }

            attachmentData.push({
                rfq_id,
                file_name: file.originalname,
                file_url: `uploads/RFQ/${rfq_id}/${file.filename}`, 
                file_path: StorageUtils.getRelativePath(destinationPath),
                file_size: file.size,
                mime_type: file.mimetype,
            });
        }

        await prisma.rfq_attachment.createMany({
            data: attachmentData
        });

        return await prisma.rfq_attachment.findMany({
            where: { rfq_id },
            orderBy: { uploaded_at: 'desc' }
        });
    }

    /**
     * Delete a single attachment
     */
    async deleteAttachment(id) {
        const attachment = await prisma.rfq_attachment.findUnique({
            where: { id }
        });

        if (!attachment) throw new Error('Attachment not found');

        // Delete from filesystem
        if (attachment.file_path) {
            const absolutePath = path.join(StorageUtils.ROOT_DIR, attachment.file_path);
            if (fs.existsSync(absolutePath)) {
                try { fs.unlinkSync(absolutePath); } catch (e) { console.error(e); }
            }
        }

        await prisma.rfq_attachment.delete({
            where: { id }
        });

        return { deleted: true };
    }

    // ─── Lookup Management ───────────────────────────────────────────────────

    /**
     * Get users list (for mediator / estimator dropdowns)
     */
    async getUsers(company_id) {
        return await prisma.user.findMany({
            where: { company_id },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Get lookup values by type (rfq_type, mode_of_enquiry, remark)
     */
    async getLookups(company_id, type, params = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            sortBy = 'name',
            sortOrder = 'asc',
            columnFilters: columnFiltersRaw
        } = params;

        const columnFilters = typeof columnFiltersRaw === 'string' ? JSON.parse(columnFiltersRaw) : (columnFiltersRaw || {});
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { company_id, type };
        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        // Column Filters
        if (columnFilters.name && columnFilters.name !== 'all') {
            where.name = { in: Array.isArray(columnFilters.name) ? columnFilters.name : [columnFilters.name] };
        }

        const [total, data] = await prisma.$transaction([
            prisma.rfq_lookup.count({ where }),
            prisma.rfq_lookup.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
        ]);

        return {
            data,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / take)
            }
        };
    }

    async getLookupFilters(company_id, type) {
        const records = await prisma.rfq_lookup.findMany({
            where: { company_id, type },
            select: { name: true }
        });
        return { records };
    }

    /**
     * Create a new lookup entry
     */
    async createLookup(company_id, type, name) {
        if (!type || !name) throw new Error('type and name are required');

        return await prisma.rfq_lookup.create({
            data: { company_id, type, name },
        });
    }

    /**
     * Update a lookup entry
     */
    async updateLookup(company_id, id, name) {
        const existing = await prisma.rfq_lookup.findFirst({
            where: { id, company_id },
        });
        if (!existing) throw new Error('Lookup not found');

        return await prisma.rfq_lookup.update({
            where: { id },
            data: { name },
        });
    }

    /**
     * Delete a lookup entry
     */
    async deleteLookup(company_id, id) {
        const existing = await prisma.rfq_lookup.findFirst({
            where: { id, company_id },
        });
        if (!existing) throw new Error('Lookup not found');

        await prisma.rfq_lookup.delete({ where: { id } });
        return { deleted: true };
    }

    // ─── Estimator & Mediator Management ─────────────────────────────────────

    async getPersons(company_id, modelName, params = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            sortBy = 'name',
            sortOrder = 'asc',
            columnFilters: columnFiltersRaw
        } = params;

        const columnFilters = typeof columnFiltersRaw === 'string' ? JSON.parse(columnFiltersRaw) : (columnFiltersRaw || {});
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { company_id };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Column Filters
        if (columnFilters.name && columnFilters.name !== 'all') {
            where.name = { in: Array.isArray(columnFilters.name) ? columnFilters.name : [columnFilters.name] };
        }
        if (columnFilters.email && columnFilters.email !== 'all') {
            where.email = { in: Array.isArray(columnFilters.email) ? columnFilters.email : [columnFilters.email] };
        }

        const [total, data] = await prisma.$transaction([
            prisma[modelName].count({ where }),
            prisma[modelName].findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
        ]);

        return {
            data,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / take)
            }
        };
    }

    async getPersonFilters(company_id, modelName) {
        const records = await prisma[modelName].findMany({
            where: { company_id },
            select: { name: true, email: true }
        });
        return { records };
    }

    async createPerson(company_id, modelName, body) {
        const { name, email } = body;
        return await prisma[modelName].create({
            data: { company_id, name, email: email || null },
        });
    }

    async updatePerson(company_id, modelName, id, body) {
        const { name, email } = body;
        const existing = await prisma[modelName].findFirst({
            where: { id, company_id },
        });
        if (!existing) throw new Error(`${modelName} not found`);

        return await prisma[modelName].update({
            where: { id },
            data: { name, email: email || null },
        });
    }

    async deletePerson(company_id, modelName, id) {
        const existing = await prisma[modelName].findFirst({
            where: { id, company_id },
        });
        if (!existing) throw new Error(`${modelName} not found`);

        await prisma[modelName].delete({ where: { id } });
        return { deleted: true };
    }

    // ─── Dashboard Aggregation ───────────────────────────────────────────────

    /**
     * Get RFQ Dashboard Statistics
     */
    async getDashboardStats(company_id, quotation_category) {
        // Fetch RFQs filtered by company and optionally by category
        const where = { company_id };
        if (quotation_category) {
            where.quotation_category = quotation_category;
        }

        const rfqs = await prisma.rfq_register.findMany({
            where,
            include: { items: true },
        });

        // Initialize Shreno Status Totals
        const shrenoStats = {
            Cancel: 0,
            "Duplicate entry": 0,
            "Technical Submitted": 0,
            "Under Review": 0, // Maps to Pending or In Progress internally
            "Price Submitted": 0,
            "Regret / Not Attempted": 0,
            Hold: 0,
            Total: rfqs.length
        };

        // Initialize Client End Status Totals
        const clientStats = {
            "Regret / Not Attempted": 0,
            "Lost by Delivery": 0,
            "Lost by Price": 0, // Using Lost internally
            "Lost by Technical": 0,
            "Ongoing": 0,
            "Order Received": 0, // Using Won internally
            "Under Review": 0,
            "Cancel": 0,
            Total: rfqs.length
        };

        // Initialize Financial Totals
        let totalQuoted = 0;
        let orderReceivedValue = 0;

        // Populate counts
        for (const rfq of rfqs) {
            const shrenoStatus = rfq.shreno_status || 'Quoted';
            const clientStatus = rfq.client_status || 'Under Review';

            // Financials: Sum items
            const rfqValue = rfq.items.reduce((sum, item) => sum + (item.total_value || 0), 0);
            totalQuoted += rfqValue;

            if (clientStatus === 'Order Received') {
                orderReceivedValue += rfqValue;
            }

            // Map internal shreno_status to Shreno Stats Dashboard Columns
            // We map "Quoted" directly to "Price Submitted" as requested by the UI terminology
            const shrenoKey = shrenoStatus === "Quoted" ? "Price Submitted" : shrenoStatus;

            if (shrenoStats[shrenoKey] !== undefined) {
                shrenoStats[shrenoKey] += 1;
            } else {
                shrenoStats["Hold"] += 1; // Catch-all for shreno missing keys
            }

            // Map Client End Status
            if (clientStats[clientStatus] !== undefined) {
                clientStats[clientStatus] += 1;
            } else {
                clientStats["Ongoing"] += 1; // Catch-all
            }
        }

        const winPercentage = totalQuoted > 0 ? ((orderReceivedValue / totalQuoted) * 100).toFixed(2) : "0.00";

        return {
            shrenoStats,
            clientStats,
            financials: {
                totalQuoted,
                orderReceivedValue,
                winPercentage
            }
        };
    }

    _calculateTimeTaken(enq_date, submission_date) {
        if (!enq_date || !submission_date) return "";
        try {
            const start = new Date(enq_date);
            const end = new Date(submission_date);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return `${diffDays} Days`;
        } catch (e) {
            return "";
        }
    }

    _enforceStatusRules(body) {
        if (body.client_status !== 'Order Received') {
            body.po_no = null;
            body.po_date = null;
            body.po_value = null;
            body.po_remark = null;
        }
    }

    _processFilter(val) {
        if (!val) return null;
        if (Array.isArray(val)) return { in: val };
        if (typeof val === 'string' && (val.includes(',') || val.includes('|'))) {
            const splitChar = val.includes('|') ? '|' : ',';
            return { in: val.split(splitChar).map(v => v.trim()).filter(Boolean) };
        }
        return { contains: val, mode: 'insensitive' };
    }
}

module.exports = new RfqService();
