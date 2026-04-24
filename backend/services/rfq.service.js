const prisma = require('#prisma');

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
                creator: { select: { name: true, email: true } },
            },
        });

        if (!rfq) throw new Error('RFQ record not found');
        return rfq;
    }

    /**
     * Delete an RFQ record (items cascade-delete)
     */
    async deleteById(company_id, id) {
        const existing = await prisma.rfq_register.findFirst({
            where: { id, company_id },
        });

        if (!existing) throw new Error('RFQ record not found');

        await prisma.rfq_register.delete({ where: { id } });
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
    async getLookups(company_id, type) {
        return await prisma.rfq_lookup.findMany({
            where: { company_id, type },
            select: { id: true, name: true, type: true },
            orderBy: { name: 'asc' },
        });
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

    async getPersons(company_id, modelName) {
        return await prisma[modelName].findMany({
            where: { company_id },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
        });
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
