const prisma = require('#prisma');

class CommonService {
    /**
     * Get a standardized list of customers.
     */
    async getCustomers(company_id, search = '') {
        const where = { company_id };
        if (search) {
            where.customer_name = { contains: search, mode: 'insensitive' };
        }

        return await prisma.customer.findMany({
            where,
            select: { id: true, customer_name: true, customer_short_name: true },
            orderBy: { customer_name: 'asc' }
        });
    }

    /**
     * Get a standardized list of locations.
     */
    async getLocations(company_id, search = '', customer_id = null) {
        const where = { company_id };
        if (search) {
            where.location_name = { contains: search, mode: 'insensitive' };
        }
        if (customer_id) {
            where.customer_id = customer_id;
        }

        return await prisma.customer_location.findMany({
            where,
            select: { id: true, location_name: true, gst_number: true, customer_id: true },
            orderBy: { location_name: 'asc' }
        });
    }

    /**
     * Get a standardized list of Purchase Orders (POs)
     */
    async getPos(company_id, search = '') {
        const where = { company_id };
        if (search) {
            where.po_number = { contains: search, mode: 'insensitive' };
        }

        return await prisma.p_o.findMany({
            where,
            select: { id: true, po_number: true, project_id: true },
            orderBy: { po_number: 'asc' }
        });
    }

    /**
     * Get a standardized list of Jobs/MSNs
     */
    async getJobs(company_id, search = '') {
        const where = { company_id };
        if (search) {
            where.OR = [
                { job_number: { contains: search, mode: 'insensitive' } },
                { equipement_name: { contains: search, mode: 'insensitive' } }
            ];
        }

        return await prisma.job.findMany({
            where,
            select: {
                id: true,
                job_number: true,
                equipement_name: true,
                project_id: true,
                tag_number: true,
                code: true,
                customer: { select: { customer_name: true } },
                po: { select: { po_number: true } }
            },
            orderBy: { job_number: 'asc' }
        });
    }

    /**
     * Get details of a single Job/MSN
     */
    async getJobDetails(company_id, id) {
        return await prisma.job.findFirst({
            where: { id, company_id },
            select: {
                id: true,
                job_number: true,
                equipement_name: true,
                project_id: true,
                tag_number: true,
                code: true,
                customer: { select: { customer_name: true } },
                po: { select: { po_number: true } }
            }
        });
    }
}

module.exports = new CommonService();
