const prisma = require('#prisma');

class NcrService {
    /**
     * List NCRs with pagination and search (scoped to company)
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

        if (search) {
            where.OR = [
                { ncr_no: { contains: search, mode: 'insensitive' } },
                { client: { contains: search, mode: 'insensitive' } },
                { msn: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [total, data] = await prisma.$transaction([
            prisma.ncr.count({ where }),
            prisma.ncr.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    target_head_design: { select: { id: true, name: true } },
                    target_head_welding: { select: { id: true, name: true } },
                    target_head_quality: { select: { id: true, name: true } },
                    target_engineer: { select: { id: true, name: true } },
                    initiator: { select: { id: true, name: true } },
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
     * Get a single NCR by ID
     */
    async getById(company_id, id) {
        const ncr = await prisma.ncr.findFirst({
            where: { id, company_id },
            include: {
                initiator: { select: { id: true, name: true } },
                raised_at_user: { select: { id: true, name: true } },
                resolution_user: { select: { id: true, name: true } },
                target_engineer: { select: { id: true, name: true } },
                target_head_design: { select: { id: true, name: true } },
                target_head_welding: { select: { id: true, name: true } },
                target_head_quality: { select: { id: true, name: true } },
                corrective_action_verifier: { select: { id: true, name: true } },
                qce_verifier: { select: { id: true, name: true } },
                head_quality_verifier: { select: { id: true, name: true } },
                job: {
                    select: {
                        id: true, job_number: true, project_id: true,
                        tag_number: true, code: true, equipement_name: true,
                        customer: { select: { customer_name: true } },
                        po: { select: { po_number: true } },
                    }
                },
            },
        });

        if (!ncr) throw new Error('NCR not found');
        return ncr;
    }

    /**
     * Get the next NCR number for a given job
     */
    async getNextNcrNo(company_id, job_id) {
        if (!job_id) throw new Error('job_id is required');

        const job = await prisma.job.findFirst({ where: { id: job_id, company_id } });
        if (!job) throw new Error('Job not found');

        const lastNcr = await prisma.ncr.findFirst({
            where: { company_id },
            orderBy: { createdAt: 'desc' },
            select: { ncr_no: true }
        });

        let nextSerial = 1;
        if (lastNcr && lastNcr.ncr_no) {
            const parts = lastNcr.ncr_no.split('/');
            const lastNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastNum)) nextSerial = lastNum + 1;
        }

        const padded = String(nextSerial).padStart(4, '0');
        const ncrNo = `NCR/${job.job_number}/${padded}`;

        return { next_ncr_no: ncrNo };
    }

    /**
     * Create a new NCR (Stage 1 submission)
     */
    async create(company_id, userId, body) {
        const {
            job_id,
            date,
            description_non_conformance,
            ncr_raised_at,
            ncr_raised_by,
            ncr_date,
        } = body;

        if (!job_id) throw new Error('job_id is required');

        const job = await prisma.job.findFirst({
            where: { id: job_id, company_id },
            include: {
                customer: { select: { customer_name: true } },
                po: { select: { po_number: true } },
            },
        });

        if (!job) throw new Error('Job not found');

        // Generate NCR number
        const { next_ncr_no } = await this.getNextNcrNo(company_id, job_id);

        const ncr = await prisma.ncr.create({
            data: {
                company_id,
                job_id,
                msn: job.job_number,
                ncr_no: next_ncr_no,
                date: date ? new Date(date) : new Date(),
                client: job.customer?.customer_name || null,
                po_no: job.po?.po_number || null,
                project_id: job.project_id || null,
                tag_no: job.tag_number || null,
                drg_no: body.drg_no || null,
                rev_no: body.rev_no || null,

                description_non_conformance: description_non_conformance || null,
                ncr_raised_at: ncr_raised_at || null,
                ncr_raised_by: ncr_raised_by || userId,
                ncr_date: ncr_date ? new Date(ncr_date) : new Date(),

                current_stage: 2,
                ncr_status: 'stage1_submitted',
                status: 'OPEN',
            },
        });

        return ncr;
    }

    /**
     * Update NCR for Stage 2 (Proposed Resolution + Assign Reviewers)
     */
    async updateStage2(company_id, id, body) {
        const ncr = await prisma.ncr.findFirst({ where: { id, company_id } });
        if (!ncr) throw new Error('NCR not found');

        const {
            proposed_resolution,
            resolution_by,
            resolution_date,
            target_engineer_id,
            target_head_design_id,
            target_head_welding_id,
            target_head_quality_id,
        } = body;

        return await prisma.ncr.update({
            where: { id },
            data: {
                proposed_resolution: proposed_resolution || null,
                resolution_by: resolution_by || null,
                resolution_date: resolution_date ? new Date(resolution_date) : null,
                target_engineer_id: target_engineer_id || null,
                target_head_design_id: target_head_design_id || null,
                target_head_welding_id: target_head_welding_id || null,
                target_head_quality_id: target_head_quality_id || null,
                current_stage: 3,
                ncr_status: 'stage2_submitted',
            },
        });
    }

    /**
     * Stage 3 Init - Engineer submits acceptance date + resolution approval
     */
    async updateStage3Init(company_id, id, body) {
        const ncr = await prisma.ncr.findFirst({ where: { id, company_id } });
        if (!ncr) throw new Error('NCR not found');

        const {
            resolution_approval,
            acceptance_date,
        } = body;

        return await prisma.ncr.update({
            where: { id },
            data: {
                resolution_approval: resolution_approval || null,
                acceptance_date: acceptance_date ? new Date(acceptance_date) : null,
                ncr_status: 'stage3_in_review',
                design_review_status: 'PENDING',
                welding_review_status: 'PENDING',
                quality_review_status: 'PENDING',
            },
        });
    }

    /**
     * Stage 3 Review - Head submits Approve/Reject for their section
     */
    async submitReview(company_id, id, userId, body) {
        const ncr = await prisma.ncr.findFirst({ where: { id, company_id } });
        if (!ncr) throw new Error('NCR not found');

        const { review_type, action, comments } = body;

        if (!['DESIGN', 'WELDING', 'QUALITY'].includes(review_type)) {
            throw new Error('Invalid review_type. Must be DESIGN, WELDING, or QUALITY');
        }
        if (!['APPROVE', 'REJECT', 'NA'].includes(action)) {
            throw new Error('Invalid action. Must be APPROVE, REJECT, or NA');
        }

        // Validate the user is the assigned head
        const headFieldMap = {
            DESIGN: 'target_head_design_id',
            WELDING: 'target_head_welding_id',
            QUALITY: 'target_head_quality_id',
        };

        if (ncr[headFieldMap[review_type]] !== userId) {
            throw new Error('You are not authorized to review this section');
        }

        const statusField = `${review_type.toLowerCase()}_review_status`;
        const commentsField = `head_${review_type.toLowerCase()}_comments`;

        const updateData = {
            [statusField]: action === 'APPROVE' ? 'APPROVED' : (action === 'REJECT' ? 'REJECTED' : 'NA'),
            [commentsField]: comments || null,
        };

        // After updating, check if all reviews are done
        const updatedNcr = await prisma.ncr.update({
            where: { id },
            data: updateData,
        });

        // Re-fetch to check all statuses
        const freshNcr = await prisma.ncr.findFirst({ where: { id } });

        const allStatuses = [
            freshNcr.design_review_status,
            freshNcr.welding_review_status,
            freshNcr.quality_review_status,
        ];

        const allDecided = allStatuses.every(s => s === 'APPROVED' || s === 'REJECTED' || s === 'NA');

        if (allDecided) {
            const anyRejected = allStatuses.some(s => s === 'REJECTED');
            const anyApproved = allStatuses.some(s => s === 'APPROVED');

            if (anyRejected) {
                await prisma.ncr.update({
                    where: { id },
                    data: {
                        current_stage: 5,
                        ncr_status: 'rejected',
                        status: 'CLOSED',
                    },
                });
            } else {
                await prisma.ncr.update({
                    where: { id },
                    data: {
                        current_stage: 4,
                        ncr_status: 'approved_resolution',
                    },
                });
            }
        }

        return await prisma.ncr.findFirst({ where: { id } });
    }

    /**
     * Stage 4 - Corrective Action Verification
     */
    async updateStage4(company_id, id, userId, body) {
        const ncr = await prisma.ncr.findFirst({ where: { id, company_id } });
        if (!ncr) throw new Error('NCR not found');

        const {
            corrective_action_comments,
            corrective_action_date,
            verified_by_qce_id,
        } = body;

        return await prisma.ncr.update({
            where: { id },
            data: {
                corrective_action_verified_by: userId,
                corrective_action_comments: corrective_action_comments || null,
                corrective_action_date: corrective_action_date ? new Date(corrective_action_date) : null,
                verified_by_qce_id: verified_by_qce_id || null,
                current_stage: 5,
                ncr_status: 'pending_disposition',
            },
        });
    }

    /**
     * Stage 5 - Disposition & Close
     */
    async updateStage5(company_id, id, body) {
        const ncr = await prisma.ncr.findFirst({ where: { id, company_id } });
        if (!ncr) throw new Error('NCR not found');

        const {
            disposition,
            verified_by_head_quality_id,
            disposition_date,
        } = body;

        return await prisma.ncr.update({
            where: { id },
            data: {
                disposition: disposition || null,
                verified_by_head_quality_id: verified_by_head_quality_id || null,
                disposition_date: disposition_date ? new Date(disposition_date) : null,
                current_stage: 5,
                ncr_status: 'closed',
                status: 'CLOSED',
            },
        });
    }

    /**
     * Get all users for dropdowns (scoped to company)
     */
    async getUsers(company_id) {
        return await prisma.user.findMany({
            where: { company_id },
            select: {
                id: true,
                name: true,
                email: true,
                empid: true,
                designation: true,
                user_roles: {
                    select: {
                        role: { select: { name: true } }
                    }
                }
            },
            orderBy: { name: 'asc' },
        });
    }
}

module.exports = new NcrService();
