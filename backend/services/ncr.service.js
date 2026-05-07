const prisma = require('#prisma');
const EmailService = require('./email.service');

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

        const where = { 
            company_id,
            is_deleted: false 
        };

        if (search) {
            where.OR = [
                { ncr_no: { contains: search, mode: 'insensitive' } },
                { client: { contains: search, mode: 'insensitive' } },
                { msn: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (params.columnFilters) {
            try {
                const filters = typeof params.columnFilters === 'string' ? JSON.parse(params.columnFilters) : params.columnFilters;
                
                const handleMultiFilter = (field, value) => {
                    if (!value) return;
                    const values = Array.isArray(value) ? value : value.split(',').map(v => v.trim());
                    if (values.length > 0) where[field] = { in: values };
                };

                handleMultiFilter('client', filters.client);
                handleMultiFilter('po_no', filters.po_no);
                handleMultiFilter('msn', filters.msn);
                
                if (filters.is_active) {
                    const activeStatus = Array.isArray(filters.is_active) ? filters.is_active : filters.is_active.split(',').map(v => v.trim());
                    if (activeStatus.length === 1) {
                        where.is_active = activeStatus[0] === 'true';
                    }
                }
            } catch (e) {
                console.error("Error parsing columnFilters:", e);
            }
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
                initiator: { select: { id: true, name: true, empid: true } },
                raised_at_user: { select: { id: true, name: true, empid: true } },
                resolution_user: { select: { id: true, name: true, empid: true } },
                target_engineer: { select: { id: true, name: true, empid: true } },
                target_head_design: { select: { id: true, name: true, empid: true } },
                target_head_welding: { select: { id: true, name: true, empid: true } },
                target_head_quality: { select: { id: true, name: true, empid: true } },
                corrective_action_verifier: { select: { id: true, name: true, empid: true } },
                qce_verifier: { select: { id: true, name: true, empid: true } },
                head_quality_verifier: { select: { id: true, name: true, empid: true } },
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
        
        const nextPerformer = this._resolveNextPerformer(ncr);
        return { ...ncr, nextPerformer };
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
                attachments: body.attachments || null,

                current_stage: 2,
                ncr_status: 'stage1_submitted',
                status: 'OPEN',
            },
        });

        // Notify next user (ncr_raised_at)
        const nextUser = await this._notifyNextUser(ncr_raised_at, {
            ncrNo: ncr.ncr_no,
            jobNo: ncr.msn,
            status: ncr.ncr_status,
            stageLabel: 'Stage 1 (Creation)',
            submittedBy: (userId ? (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name : 'User') || 'User',
            nextAction: 'Submit Proposed Resolution (Stage 2)'
        });

        return { ...ncr, nextUser };
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

        const updatedNcr = await prisma.ncr.update({
            where: { id },
            data: {
                proposed_resolution: proposed_resolution || null,
                resolution_by: resolution_by || null,
                resolution_date: (resolution_date && resolution_date !== "") ? new Date(resolution_date) : null,
                target_engineer_id: target_engineer_id || null,
                target_head_design_id: target_head_design_id || null,
                target_head_welding_id: target_head_welding_id || null,
                target_head_quality_id: target_head_quality_id || null,
                current_stage: 3,
                ncr_status: 'stage2_submitted',
            },
        });

        // Notify Target Engineer
        const submittedByUser = resolution_by ? await prisma.user.findUnique({ where: { id: resolution_by }, select: { name: true } }) : null;
        const nextUser = await this._notifyNextUser(target_engineer_id, {
            ncrNo: updatedNcr.ncr_no,
            jobNo: updatedNcr.msn,
            status: updatedNcr.ncr_status,
            stageLabel: 'Stage 2 (Proposed Resolution)',
            submittedBy: submittedByUser?.name || 'User',
            nextAction: 'Accept Proposal (Stage 3)'
        });

        return { ...updatedNcr, nextUser };
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

        const updatedNcr = await prisma.ncr.update({
            where: { id },
            data: {
                resolution_approval: resolution_approval || null,
                acceptance_date: (acceptance_date && acceptance_date !== "") ? new Date(acceptance_date) : null,
                ncr_status: 'stage3_in_review',
                design_review_status: 'PENDING',
                welding_review_status: 'PENDING',
                quality_review_status: 'PENDING',
            },
        });

        // Notify 3 Heads
        const heads = [ncr.target_head_design_id, ncr.target_head_welding_id, ncr.target_head_quality_id];
        let nextUser = null;
        for (const headId of heads) {
            if (headId) {
                const submittedByUser = ncr.target_engineer_id ? await prisma.user.findUnique({ where: { id: ncr.target_engineer_id }, select: { name: true } }) : null;
                const user = await this._notifyNextUser(headId, {
                    ncrNo: updatedNcr.ncr_no,
                    jobNo: updatedNcr.msn,
                    status: updatedNcr.ncr_status,
                    stageLabel: 'Stage 3 (Acceptance)',
                    submittedBy: submittedByUser?.name || 'User',
                    nextAction: 'Review Resolution Plan'
                });
                if (!nextUser) nextUser = user; // Use first head as primary contact for flash msg
            }
        }

        return { ...updatedNcr, nextUser: { name: "Assigned Heads", empid: "MULTIPLE" } };
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
        let nextUser = null;

        if (allDecided) {
            const anyRejected = allStatuses.some(s => s === 'REJECTED');

            if (anyRejected) {
                const updatedNcr = await prisma.ncr.update({
                    where: { id },
                    data: {
                        current_stage: 5,
                        ncr_status: 'rejected',
                        status: 'CLOSED',
                    },
                });
                // Notify Initiator about rejection
                nextUser = await this._notifyNextUser(updatedNcr.ncr_raised_by, {
                    ncrNo: updatedNcr.ncr_no,
                    jobNo: updatedNcr.msn,
                    status: 'REJECTED & CLOSED',
                    stageLabel: 'Stage 3 Review',
                    submittedBy: 'Review Board',
                    description: 'One or more reviewers rejected the resolution proposal.',
                    nextAction: 'None - NCR Closed'
                });
            } else {
                const updatedNcr = await prisma.ncr.update({
                    where: { id },
                    data: {
                        current_stage: 4,
                        ncr_status: 'approved_resolution',
                    },
                });
                // Notify Stage 4 Verifier (usually QCE or Initiator)
                // We'll use the user assigned in verified_by_qce_id (often set or inherited)
                // For now, notify ncr_raised_by (Initiator) to carry out verification
                nextUser = await this._notifyNextUser(updatedNcr.ncr_raised_by, {
                    ncrNo: updatedNcr.ncr_no,
                    jobNo: updatedNcr.msn,
                    status: 'PROPOSAL APPROVED',
                    stageLabel: 'Stage 3 Review',
                    submittedBy: 'Review Board',
                    nextAction: 'Carry out Corrective Action Verification (Stage 4)'
                });
            }
        }

        const finalNcr = await prisma.ncr.findFirst({ where: { id } });
        return { ...finalNcr, nextUser };
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

        const updatedNcr = await prisma.ncr.update({
            where: { id },
            data: {
                corrective_action_verified_by: userId,
                corrective_action_comments: corrective_action_comments || null,
                corrective_action_date: (corrective_action_date && corrective_action_date !== "") ? new Date(corrective_action_date) : null,
                verified_by_qce_id: verified_by_qce_id || null,
                current_stage: 5,
                ncr_status: 'pending_disposition',
            },
        });

        // Notify Head Quality for final disposition
        const nextUser = await this._notifyNextUser(updatedNcr.verified_by_head_quality_id || updatedNcr.target_head_quality_id, {
            ncrNo: updatedNcr.ncr_no,
            jobNo: updatedNcr.msn,
            status: updatedNcr.ncr_status,
            stageLabel: 'Stage 4 (Verification)',
            submittedBy: (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name || 'User',
            nextAction: 'Provide Final Disposition & Close (Stage 5)'
        });

        return { ...updatedNcr, nextUser };
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

        const updatedNcr = await prisma.ncr.update({
            where: { id },
            data: {
                disposition: disposition || null,
                verified_by_head_quality_id: verified_by_head_quality_id || null,
                disposition_date: (disposition_date && disposition_date !== "") ? new Date(disposition_date) : null,
                current_stage: 5,
                ncr_status: 'closed',
                status: 'CLOSED',
            },
        });

        // Notify Initiator that NCR is CLOSED
        const nextUser = await this._notifyNextUser(updatedNcr.ncr_raised_by, {
            ncrNo: updatedNcr.ncr_no,
            jobNo: updatedNcr.msn,
            status: 'CLOSED',
            stageLabel: 'Stage 5 (Disposition)',
            submittedBy: (await prisma.user.findUnique({ where: { id: updatedNcr.verified_by_head_quality_id || '' }, select: { name: true } }))?.name || 'Quality Head',
            nextAction: 'None - Workflow Completed'
        });

        return { ...updatedNcr, nextUser: { name: "Completed", empid: "" } };
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

    /**
     * Internal helper to determine who performs the current stage
     */
    _resolveNextPerformer(ncr) {
        const { ncr_status, current_stage } = ncr;

        if (ncr_status === 'closed' || ncr_status === 'rejected') {
            return { name: "Completed", empid: "", label: "None" };
        }

        switch (current_stage) {
            case 1:
                return { 
                    name: ncr.initiator?.name || "Initiator", 
                    empid: ncr.initiator?.empid || "",
                    label: "Submit Description (Stage 1)"
                };
            case 2:
                return { 
                    name: ncr.raised_at_user?.name || "Assigned User", 
                    empid: ncr.raised_at_user?.empid || "",
                    label: "Submit Proposed Resolution (Stage 2)"
                };
            case 3:
                if (ncr_status === 'stage2_submitted') {
                    return { 
                        name: ncr.target_engineer?.name || "Assigned Engineer", 
                        empid: ncr.target_engineer?.empid || "",
                        label: "Accept Proposal (Stage 3)"
                    };
                } else if (ncr_status === 'stage3_in_review') {
                    if (ncr.design_review_status === 'PENDING') {
                        return { 
                            name: ncr.target_head_design?.name || "Design Head", 
                            empid: ncr.target_head_design?.empid || "PENDING",
                            label: "Design Review (Stage 3)"
                        };
                    }
                    if (ncr.welding_review_status === 'PENDING') {
                        return { 
                            name: ncr.target_head_welding?.name || "Welding Head", 
                            empid: ncr.target_head_welding?.empid || "PENDING",
                            label: "Welding Review (Stage 3)"
                        };
                    }
                    if (ncr.quality_review_status === 'PENDING') {
                        return { 
                            name: ncr.target_head_quality?.name || "Quality Head", 
                            empid: ncr.target_head_quality?.empid || "PENDING",
                            label: "Quality Review (Stage 3)"
                        };
                    }
                    return { name: "Department Heads", empid: "PENDING", label: "Review Resolution Plan (Stage 3)" };
                }
                break;
            case 4:
                return { 
                    name: ncr.initiator?.name || "Initiator", 
                    empid: ncr.initiator?.empid || "",
                    label: "Carry out Corrective Action Verification (Stage 4)"
                };
            case 5:
                const headQuality = ncr.head_quality_verifier || ncr.target_head_quality;
                return { 
                    name: headQuality?.name || "Head Quality", 
                    empid: headQuality?.empid || "",
                    label: "Provide Final Disposition & Close (Stage 5)"
                };
        }

        return { name: "Unknown", empid: "", label: "Stage " + current_stage };
    }

    /**
     * Internal helper to notify user and return their public info
     */
    async _notifyNextUser(userId, details) {
        if (!userId || userId === "") return null;
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, empid: true, email: true }
            });

            if (user && user.email) {
                // Async send
                EmailService.sendNcrNotification(user.email, {
                    ...details,
                    toName: user.name
                }).catch(e => console.error('NCR Email failed:', e));

                return { name: user.name, empid: user.empid };
            }
            return user ? { name: user.name, empid: user.empid } : null;
        } catch (error) {
            console.error('Notify error:', error);
            return null;
        }
    }

    /**
     * Get active filters metadata (Client, PO, MSN, Status)
     */
    async getActiveFilters(company_id) {
        const records = await prisma.ncr.findMany({
            where: { 
                company_id,
                is_deleted: false
            },
            select: {
                client: true,
                po_no: true,
                msn: true,
                is_active: true
            },
            distinct: ['client', 'po_no', 'msn', 'is_active']
        });

        return {
            records: records.map(r => ({
                client: r.client,
                po: r.po_no,
                msn: r.msn,
                is_active: r.is_active
            }))
        };
    }

    async toggleStatus(company_id, id) {
        const ncr = await prisma.ncr.findFirst({
            where: { id, company_id },
            select: { is_active: true }
        });
        if (!ncr) throw new Error('NCR not found');

        return await prisma.ncr.update({
            where: { id },
            data: { is_active: !ncr.is_active }
        });
    }

    async archive(company_id, id) {
        const ncr = await prisma.ncr.findFirst({ where: { id, company_id } });
        if (!ncr) throw new Error('NCR not found');

        return await prisma.ncr.update({
            where: { id },
            data: { is_deleted: true }
        });
    }
}

module.exports = new NcrService();
