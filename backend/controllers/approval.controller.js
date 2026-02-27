const prisma = require('#prisma');

function toTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function toPositiveInt(value, fallbackValue) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return fallbackValue;
    return parsed;
}

function getOverallStatus(designStatus, qualityStatus) {
    const d = toTrimmedString(designStatus).toLowerCase() || 'pending';
    const q = toTrimmedString(qualityStatus).toLowerCase() || 'pending';

    if (d === 'rejected' || q === 'rejected') return 'rejected';
    if (d === 'approved' && q === 'approved') return 'approved';
    return 'pending';
}

function getListSelect() {
    return {
        id: true,
        dcr_no: true,
        drg_no: true,
        inspect_by: true,
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
    };
}

function shapeListData(records) {
    return records.map((item) => ({
        id: item.id,
        dcr_no: item.dcr_no,
        drg_no: item.drg_no,
        inspect_by: item.inspect_by,
        dcr_status: item.dcr_status,
    }));
}

class ApprovalController {
    async getDcrDesignEngineer(req, res) {
        try {
            const company_id = req.user.company_id;
            const user_id = req.user.userid;
            const page = toPositiveInt(req.query.page, 1);
            const limit = Math.min(toPositiveInt(req.query.limit, 50), 200);
            const skip = (page - 1) * limit;

            const where = {
                company_id,
                design_engineer_id: user_id,
            };

            const [total, records] = await prisma.$transaction([
                prisma.dcr.count({ where }),
                prisma.dcr.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    select: getListSelect(),
                }),
            ]);

            return res.status(200).json({
                success: true,
                message: 'Design engineer DCR fetched successfully',
                data: shapeListData(records),
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error('Get DCR for design engineer error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async getDcrQualityEngineer(req, res) {
        try {
            const company_id = req.user.company_id;
            const user_id = req.user.userid;
            const page = toPositiveInt(req.query.page, 1);
            const limit = Math.min(toPositiveInt(req.query.limit, 50), 200);
            const skip = (page - 1) * limit;

            const where = {
                company_id,
                quality_engineer_id: user_id,
                dcr_status: {
                    some: {
                        design_engineer_status: {
                            equals: 'approved',
                            mode: 'insensitive',
                        },
                        status: {
                            equals: 'pending',
                            mode: 'insensitive',
                        },
                    },
                },
            };

            const [total, records] = await prisma.$transaction([
                prisma.dcr.count({ where }),
                prisma.dcr.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    select: getListSelect(),
                }),
            ]);

            return res.status(200).json({
                success: true,
                message: 'Quality engineer DCR fetched successfully',
                data: shapeListData(records),
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error('Get DCR for quality engineer error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async updateDesignEngineerStatus(req, res) {
        try {
            const company_id = req.user.company_id;
            const user_id = req.user.userid;
            const dcr_id = toTrimmedString(req.body.dcr_id);
            const design_engineer_status = toTrimmedString(req.body.design_engineer_status).toLowerCase();
            const design_engineer_remarks = toTrimmedString(req.body.design_engineer_remarks);

            if (!dcr_id || !design_engineer_status) {
                return res.status(400).json({
                    success: false,
                    message: 'dcr_id and design_engineer_status are required',
                });
            }

            if (!['pending', 'approved', 'rejected'].includes(design_engineer_status)) {
                return res.status(400).json({
                    success: false,
                    message: 'design_engineer_status must be one of: pending, approved, rejected',
                });
            }

            const dcr = await prisma.dcr.findFirst({
                where: {
                    id: dcr_id,
                    company_id,
                    design_engineer_id: user_id,
                },
                select: { id: true },
            });

            if (!dcr) {
                return res.status(404).json({
                    success: false,
                    message: 'DCR not found for this design engineer',
                });
            }

            const currentStatus = await prisma.dcr_status.findFirst({
                where: { dcr_id },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    quality_engineer_status: true,
                    status: true,
                },
            });

            if (!currentStatus) {
                return res.status(404).json({
                    success: false,
                    message: 'DCR status record not found',
                });
            }

            if (toTrimmedString(currentStatus.status).toLowerCase() === 'rejected') {
                return res.status(400).json({
                    success: false,
                    message: 'Flow already finished with rejection. Further updates are not allowed',
                });
            }

            const status = getOverallStatus(design_engineer_status, currentStatus.quality_engineer_status);

            const updatedStatus = await prisma.dcr_status.update({
                where: { id: currentStatus.id },
                data: {
                    design_engineer_status,
                    design_engineer_remarks,
                    status,
                },
                select: {
                    id: true,
                    design_engineer_status: true,
                    design_engineer_remarks: true,
                    quality_engineer_status: true,
                    quality_engineer_remarks: true,
                    status: true,
                },
            });

            return res.status(200).json({
                success: true,
                message: 'Design engineer status updated successfully',
                data: updatedStatus,
            });
        } catch (error) {
            console.error('Update design engineer status error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async updateQualityEngineerStatus(req, res) {
        try {
            const company_id = req.user.company_id;
            const user_id = req.user.userid;
            const dcr_id = toTrimmedString(req.body.dcr_id);
            const quality_engineer_status = toTrimmedString(req.body.quality_engineer_status).toLowerCase();
            const quality_engineer_remarks = toTrimmedString(req.body.quality_engineer_remarks);

            if (!dcr_id || !quality_engineer_status) {
                return res.status(400).json({
                    success: false,
                    message: 'dcr_id and quality_engineer_status are required',
                });
            }

            if (!['pending', 'approved', 'rejected'].includes(quality_engineer_status)) {
                return res.status(400).json({
                    success: false,
                    message: 'quality_engineer_status must be one of: pending, approved, rejected',
                });
            }

            const dcr = await prisma.dcr.findFirst({
                where: {
                    id: dcr_id,
                    company_id,
                    quality_engineer_id: user_id,
                },
                select: { id: true },
            });

            if (!dcr) {
                return res.status(404).json({
                    success: false,
                    message: 'DCR not found for this quality engineer',
                });
            }

            const currentStatus = await prisma.dcr_status.findFirst({
                where: { dcr_id },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    design_engineer_status: true,
                    status: true,
                },
            });

            if (!currentStatus) {
                return res.status(404).json({
                    success: false,
                    message: 'DCR status record not found',
                });
            }

            if (toTrimmedString(currentStatus.status).toLowerCase() === 'rejected') {
                return res.status(400).json({
                    success: false,
                    message: 'Flow already finished with rejection. Further updates are not allowed',
                });
            }

            if (toTrimmedString(currentStatus.design_engineer_status).toLowerCase() !== 'approved') {
                return res.status(400).json({
                    success: false,
                    message: 'Quality engineer can update only after design engineer approval',
                });
            }

            const status = getOverallStatus(currentStatus.design_engineer_status, quality_engineer_status);

            const updatedStatus = await prisma.dcr_status.update({
                where: { id: currentStatus.id },
                data: {
                    quality_engineer_status,
                    quality_engineer_remarks,
                    status,
                },
                select: {
                    id: true,
                    design_engineer_status: true,
                    design_engineer_remarks: true,
                    quality_engineer_status: true,
                    quality_engineer_remarks: true,
                    status: true,
                },
            });

            return res.status(200).json({
                success: true,
                message: 'Quality engineer status updated successfully',
                data: updatedStatus,
            });
        } catch (error) {
            console.error('Update quality engineer status error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }
}

module.exports = new ApprovalController();
