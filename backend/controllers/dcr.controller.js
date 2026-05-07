const prisma = require('#prisma');
const dcrPdfGenerator = require('../utils/dcrPdfGenerator');
const { getCompanyInfo } = require('../utils/companyInfo');

const ALLOWED_SORT_FIELDS = new Set([
    'createdAt',
    'updatedAt',
    'dcr_no',
    'drg_no',
    'equ_no',
    'inspect_by',
]);

function toTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function toPositiveInt(value, fallbackValue) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return fallbackValue;
    return parsed;
}

function extractDcrSerial(dcrNo) {
    if (typeof dcrNo !== 'string') return 0;
    const match = dcrNo.match(/\/DCR\/(\d+)$/i);
    if (!match) return 0;
    const serial = Number.parseInt(match[1], 10);
    return Number.isNaN(serial) ? 0 : serial;
}

class DcrController {
    async getDcrNumber(req, res) {
        try {
            const company_id = req.user.company_id;

            const jobs = await prisma.job.findMany({
                where: { company_id },
                select: {
                    id: true,
                    job_number: true,
                    tag_number: true,
                    project_id: true,
                    equipement_name: true,
                    code: true,
                    customer: {
                        select: {
                            customer_name: true,
                        },
                    },
                    dcr: {
                        select: {
                            dcr_no: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            const data = jobs.map((job) => {
                const maxSerial = (job.dcr || []).reduce((max, record) => {
                    const current = extractDcrSerial(record.dcr_no);
                    return current > max ? current : max;
                }, 0);

                const nextSerial = maxSerial + 1;
                const nextSerialPadded = String(nextSerial).padStart(4, '0');
                const next_dcr_no = `SHR/${job.job_number}/DCR/${nextSerialPadded}`;

                return {
                    ...job,
                    last_serial_no: maxSerial,
                    next_serial_no: nextSerial,
                    next_dcr_no,
                };
            });

            return res.status(200).json({
                success: true,
                message: 'DCR job information fetched successfully',
                data,
            });
        } catch (error) {
            console.error('Get DCR number error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async createDcr(req, res) {
        try {
            const company_id = req.user.company_id;
            const body = req.body || {};
            const job_id = toTrimmedString(body.job_id);
            const dcr_no = toTrimmedString(body.dcr_no);
            const drg_no = toTrimmedString(body.drg_no);
            const equ_no = toTrimmedString(body.equ_no);
            const inspect_by = toTrimmedString(body.inspect_by);
            const design_engineer_id = toTrimmedString(body.design_engineer_id);
            const quality_engineer_id = toTrimmedString(body.quality_engineer_id);

            const missingFields = [];
            if (!job_id) missingFields.push('job_id');
            if (!dcr_no) missingFields.push('dcr_no');
            if (!drg_no) missingFields.push('drg_no');
            if (!equ_no) missingFields.push('equ_no');
            if (!inspect_by) missingFields.push('inspect_by');
            if (!design_engineer_id) missingFields.push('design_engineer_id');
            if (!quality_engineer_id) missingFields.push('quality_engineer_id');

            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required field(s): ${missingFields.join(', ')}`,
                });
            }

            const existingDcr = await prisma.dcr.findFirst({
                where: {
                    company_id,
                    dcr_no,
                },
                select: { id: true },
            });

            if (existingDcr) {
                return res.status(409).json({
                    success: false,
                    message: 'DCR number already exists in your company',
                });
            }

            const [job, designEngineer, qualityEngineer] = await prisma.$transaction([
                prisma.job.findFirst({
                    where: { id: job_id, company_id },
                    select: { id: true, job_number: true },
                }),
                prisma.user.findFirst({
                    where: { id: design_engineer_id, company_id },
                    select: { id: true, name: true, email: true },
                }),
                prisma.user.findFirst({
                    where: { id: quality_engineer_id, company_id },
                    select: { id: true, name: true, email: true },
                }),
            ]);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found for this company',
                });
            }

            if (!designEngineer) {
                return res.status(404).json({
                    success: false,
                    message: 'Design engineer not found for this company',
                });
            }

            if (!qualityEngineer) {
                return res.status(404).json({
                    success: false,
                    message: 'Quality engineer not found for this company',
                });
            }

            const changeRequestsInput = body.change_requests ?? [];
            if (!Array.isArray(changeRequestsInput)) {
                return res.status(400).json({
                    success: false,
                    message: 'change_requests must be an array',
                });
            }

            const preparedChangeRequests = [];
            for (let i = 0; i < changeRequestsInput.length; i++) {
                const item = changeRequestsInput[i] || {};
                const item_part_no = toTrimmedString(item.item_part_no);
                const chnage_from = toTrimmedString(item.chnage_from || item.change_from);
                const chnage_to = toTrimmedString(item.chnage_to || item.change_to);
                const reason = toTrimmedString(item.reason);

                if (!item_part_no || !chnage_from || !chnage_to || !reason) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid change_requests entry at index ${i}. Required: item_part_no, chnage_from/change_from, chnage_to/change_to, reason`,
                    });
                }

                preparedChangeRequests.push({
                    company_id,
                    job_id,
                    item_part_no,
                    chnage_from,
                    chnage_to,
                    reason,
                });
            }

            const defaultDesignStatus = toTrimmedString(body.design_engineer_status) || 'pending';
            const defaultQualityStatus = toTrimmedString(body.quality_engineer_status) || 'pending';
            const defaultStatus = toTrimmedString(body.status) || 'pending';

            const createdDcr = await prisma.$transaction(async (tx) => {
                const dcr = await tx.dcr.create({
                    data: {
                        company_id,
                        job_id,
                        dcr_no,
                        drg_no,
                        equ_no,
                        inspect_by,
                        design_engineer_id,
                        quality_engineer_id,
                    },
                    select: { id: true },
                });

                if (preparedChangeRequests.length > 0) {
                    await tx.dcr_change_request.createMany({
                        data: preparedChangeRequests.map((item) => ({
                            ...item,
                            dcr_id: dcr.id,
                        })),
                    });
                }

                await tx.dcr_status.create({
                    data: {
                        dcr_id: dcr.id,
                        design_engineer_status: defaultDesignStatus,
                        design_engineer_remarks: '',
                        quality_engineer_status: defaultQualityStatus,
                        quality_engineer_remarks: '',
                        status: defaultStatus,
                    },
                });

                return tx.dcr.findUnique({
                    where: { id: dcr.id },
                    include: {
                        job: {
                            select: {
                                id: true,
                                job_number: true,
                                project_id: true,
                                equipement_name: true,
                                tag_number: true,
                                code: true,
                            },
                        },
                        design_engineer: {
                            select: { id: true, name: true, email: true, empid: true },
                        },
                        quality_engineer: {
                            select: { id: true, name: true, email: true, empid: true },
                        },
                        dcr_change_request: {
                            orderBy: { createdAt: 'desc' },
                        },
                        dcr_status: {
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                });
            });

            return res.status(201).json({
                success: true,
                message: 'DCR created successfully',
                data: createdDcr,
            });
        } catch (error) {
            console.error('Create DCR error:', error);

            if (error.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    message: 'Duplicate value found for unique field',
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async getDcr(req, res) {
        try {
            const company_id = req.user.company_id;
            const page = toPositiveInt(req.query.page, 1);
            const limit = Math.min(toPositiveInt(req.query.limit, 50), 200);
            const search = req.query.search || '';

            const where = { 
                company_id,
                is_deleted: false
            };

            if (search) {
                where.OR = [
                    { dcr_no: { contains: search, mode: 'insensitive' } },
                    { drg_no: { contains: search, mode: 'insensitive' } },
                    { inspect_by: { contains: search, mode: 'insensitive' } },
                ];
            }

            if (req.query.columnFilters) {
                try {
                    const filters = typeof req.query.columnFilters === 'string' ? JSON.parse(req.query.columnFilters) : req.query.columnFilters;
                    
                    if (filters.client) {
                        const clients = Array.isArray(filters.client) ? filters.client : filters.client.split(',').map(v => v.trim());
                        if (clients.length > 0) {
                            where.job = { ...where.job, customer: { customer_name: { in: clients } } };
                        }
                    }
                    if (filters.po_no) {
                        const pos = Array.isArray(filters.po_no) ? filters.po_no : filters.po_no.split(',').map(v => v.trim());
                        if (pos.length > 0) {
                            where.job = { ...where.job, po: { po_number: { in: pos } } };
                        }
                    }
                    if (filters.msn) {
                        const msns = Array.isArray(filters.msn) ? filters.msn : filters.msn.split(',').map(v => v.trim());
                        if (msns.length > 0) {
                            where.job = { ...where.job, job_number: { in: msns } };
                        }
                    }
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

            const skip = (page - 1) * limit;

            const [total, dcrList] = await prisma.$transaction([
                prisma.dcr.count({ where }),
                prisma.dcr.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        dcr_no: true,
                        drg_no: true,
                        inspect_by: true,
                        design_engineer_id: true,
                        quality_engineer_id: true,
                        job: {
                            select: {
                                job_number: true,
                                customer: { select: { customer_name: true } },
                                po: { select: { po_number: true } }
                            }
                        },
                        dcr_status: {
                            select: {
                                id: true,
                                design_engineer_status: true,
                                design_engineer_remarks: true,
                                quality_engineer_status: true,
                                quality_engineer_remarks: true,
                                status: true,
                            },
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                }),
            ]);

            const data = dcrList.map((item) => ({
                id: item.id,
                dcr_no: item.dcr_no,
                drg_no: item.drg_no,
                inspect_by: item.inspect_by,
                design_engineer_id: item.design_engineer_id,
                quality_engineer_id: item.quality_engineer_id,
                client: item.job?.customer?.customer_name || '-',
                po_no: item.job?.po?.po_number || '-',
                msn: item.job?.job_number || '-',
                dcr_status: item.dcr_status,
            }));

            return res.status(200).json({
                success: true,
                message: 'DCR basic info fetched successfully',
                data,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error('Get DCR error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async getDcrById(req, res) {
        try {
            const company_id = req.user.company_id;
            const id = toTrimmedString(req.params.id);

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'DCR id is required',
                });
            }

            const dcr = await prisma.dcr.findFirst({
                where: {
                    id,
                    company_id,
                },
                select: {
                    id: true,
                    dcr_no: true,
                    equ_no: true,
                    drg_no: true,
                    inspect_by: true,
                    job: {
                        select: {
                            job_number: true,
                        },
                    },
                    design_engineer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    quality_engineer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    dcr_change_request: {
                        select: {
                            id: true,
                            item_part_no: true,
                            chnage_from: true,
                            chnage_to: true,
                            reason: true,
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                    dcr_status: {
                        select: {
                            id: true,
                            design_engineer_status: true,
                            design_engineer_remarks: true,
                            quality_engineer_status: true,
                            quality_engineer_remarks: true,
                            status: true,
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });

            if (!dcr) {
                return res.status(404).json({
                    success: false,
                    message: 'DCR not found',
                });
            }

            return res.status(200).json({
                success: true,
                message: 'DCR details fetched successfully',
                data: {
                    id: dcr.id,
                    dcr_no: dcr.dcr_no,
                    equ_no: dcr.equ_no,
                    drg_no: dcr.drg_no,
                    inspect_by: dcr.inspect_by,
                    job_number: dcr.job?.job_number || null,
                    design_engineer: dcr.design_engineer,
                    quality_engineer: dcr.quality_engineer,
                    change_request: dcr.dcr_change_request,
                    dcr_status: dcr.dcr_status,
                },
            });
        } catch (error) {
            console.error('Get DCR by id error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async downloadPdf(req, res) {
        try {
            const company_id = req.user.company_id;
            const id = toTrimmedString(req.params.id);

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'DCR id is required',
                });
            }

            const dcr = await prisma.dcr.findFirst({
                where: {
                    id,
                    company_id,
                },
                include: {
                    job: {
                        select: {
                            job_number: true,
                            equipement_name: true,
                            tag_number: true,
                            code: true,
                        },
                    },
                    design_engineer: {
                        select: { id: true, name: true, email: true, empid: true },
                    },
                    quality_engineer: {
                        select: { id: true, name: true, email: true, empid: true },
                    },
                    dcr_change_request: {
                        orderBy: { createdAt: 'asc' },
                    },
                    dcr_status: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    },
                },
            });

            if (!dcr) {
                return res.status(404).json({
                    success: false,
                    message: 'DCR not found',
                });
            }

            const fileName = `DCR_${dcr.dcr_no.replace(/\//g, '_')}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            const companyInfo = await getCompanyInfo(company_id);
            dcrPdfGenerator.generatePDF(dcr, res, companyInfo);
        } catch (error) {
            console.error('Download DCR PDF error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async getAssignedDrawings(req, res) {
        try {
            const company_id = req.user.company_id;
            const job_id = req.params.jobId;

            if (!job_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Job id is required',
                });
            }

            const assignedDocs = await prisma.group_document.findMany({
                where: {
                    company_id,
                    group: {
                        job_group: {
                            some: {
                                job_id: job_id
                            }
                        }
                    }
                },
                select: {
                    id: true,
                    shreno_doc_no: true,
                    document: {
                        select: {
                            document_name: true
                        }
                    }
                }
            });

            // Ensure uniqueness by shreno_doc_no to prevent multiple selections in frontend
            const uniqueDocsMap = new Map();
            assignedDocs.forEach(doc => {
                if (doc.shreno_doc_no && !uniqueDocsMap.has(doc.shreno_doc_no)) {
                    uniqueDocsMap.set(doc.shreno_doc_no, {
                        id: doc.id,
                        shreno_doc_no: doc.shreno_doc_no,
                        document_name: doc.document?.document_name || ''
                    });
                }
            });

            const data = Array.from(uniqueDocsMap.values());

            return res.status(200).json({
                success: true,
                message: 'Assigned drawings fetched successfully',
                data,
            });
        } catch (error) {
            console.error('Get assigned drawings error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async getActiveFilters(req, res) {
        try {
            const company_id = req.user.company_id;

            const records = await prisma.dcr.findMany({
                where: { 
                    company_id,
                    is_deleted: false
                },
                select: {
                    is_active: true,
                    job: {
                        select: {
                            job_number: true,
                            customer: { select: { customer_name: true } },
                            po: { select: { po_number: true } }
                        }
                    }
                },
                distinct: ['job_id', 'is_active']
            });

            return res.status(200).json({
                success: true,
                data: {
                    records: records.map(r => ({
                        client: r.job?.customer?.customer_name,
                        po: r.job?.po?.po_number,
                        msn: r.job?.job_number,
                        is_active: r.is_active
                    }))
                }
            });
        } catch (error) {
            console.error('Get DCR active filters error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    async deleteDcr(req, res) {
        try {
            const company_id = req.user.company_id;
            const { id } = req.params;

            await prisma.dcr.update({
                where: { id, company_id },
                data: { is_deleted: true }
            });

            return res.status(200).json({
                success: true,
                message: 'DCR deleted successfully'
            });
        } catch (error) {
            console.error('Delete DCR error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    async toggleDcrStatus(req, res) {
        try {
            const company_id = req.user.company_id;
            const { id } = req.params;

            const dcr = await prisma.dcr.findUnique({
                where: { id, company_id },
                select: { is_active: true }
            });

            if (!dcr) {
                return res.status(404).json({
                    success: false,
                    message: 'DCR not found'
                });
            }

            await prisma.dcr.update({
                where: { id, company_id },
                data: { is_active: !dcr.is_active }
            });

            return res.status(200).json({
                success: true,
                message: `DCR ${!dcr.is_active ? 'activated' : 'deactivated'} successfully`
            });
        } catch (error) {
            console.error('Toggle DCR status error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = new DcrController();
