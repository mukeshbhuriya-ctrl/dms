const prisma = require('#prisma');
class QapService {
    async findMany(filters, skip, take) {
        const where = {
            ...(filters.company_id && { company_id: filters.company_id }),
            ...(filters.status && { status: filters.status }),
            ...(filters.search && {
                OR: [
                    { document_no: { contains: filters.search, mode: "insensitive" } },
                    { msn: { contains: filters.search, mode: "insensitive" } },
                    { client: { contains: filters.search, mode: "insensitive" } },
                ],
            }),
        };

        const [qaps, total] = await Promise.all([
            prisma.qap.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: "desc" },
                include: {
                    job: {
                        select: {
                            job_number: true,
                            project_id: true,
                            equipement_name: true,
                            tag_number: true,
                            code: true,
                        }
                    }
                }
            }),
            prisma.qap.count({ where }),
        ]);

        return { qaps, total };
    }

    async findFirst(id) {
        return prisma.qap.findUnique({
            where: { id },
            include: {
                details: {
                    orderBy: {
                        sort_order: 'asc'
                    }
                }
            },
        });
    }

    async getNextDocumentNo(jobId) {
        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job) throw new Error("Job not found");

        const count = await prisma.qap.count({
            where: { job_id: jobId }
        });

        return `SHR/${job.job_number}/QAP/${count + 1}`;
    }

    async create(data) {
        const { items, ...qapData } = data;

        return prisma.$transaction(async (tx) => {
            const qap = await tx.qap.create({
                data: {
                    ...qapData,
                },
            });

            if (items && items.length > 0) {
                await tx.qap_detail.createMany({
                    data: items.map((item, index) => ({
                        ...item,
                        qap_id: qap.id,
                        sort_order: index,
                    })),
                });
            }

            return qap;
        });
    }

    async update(id, data) {
        const { items, ...qapData } = data;

        return prisma.$transaction(async (tx) => {
            const qap = await tx.qap.update({
                where: { id },
                data: {
                    ...qapData,
                },
            });

            if (items !== undefined) {
                // Delete existing items
                await tx.qap_detail.deleteMany({
                    where: { qap_id: id },
                });

                // Create new replacement items
                if (items.length > 0) {
                    await tx.qap_detail.createMany({
                        data: items.map((item, index) => ({
                            ...item,
                            qap_id: id,
                            sort_order: index,
                        })),
                    });
                }
            }

            return qap;
        });
    }
}

module.exports = new QapService();
