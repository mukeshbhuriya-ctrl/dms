const prisma = require('#prisma');

class QcGroupController {
    // Create QC Group
    async createQcGroup(req, res) {
        try {
            const { name, user_ids } = req.body;
            const company_id = req.user.company_id;

            if (!name || name.trim() === "") {
                return res.status(400).json({ success: false, message: "QC Group name is required" });
            }

            // Check if group already exists for this company
            const existing = await prisma.qc_group.findUnique({
                where: {
                    company_id_name: {
                        company_id,
                        name: name.trim()
                    }
                }
            });

            if (existing) {
                return res.status(409).json({ success: false, message: "QC Group already exists" });
            }

            // Create group and its user associations transactionally
            const qcGroup = await prisma.$transaction(async (tx) => {
                const group = await tx.qc_group.create({
                    data: {
                        name: name.trim(),
                        company_id
                    }
                });

                if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
                    const userGroupData = user_ids.map(user_id => ({
                        user_id,
                        qc_group_id: group.id
                    }));
                    await tx.user_qc_group.createMany({
                        data: userGroupData
                    });
                }

                return group;
            });

            res.status(201).json({ success: true, data: qcGroup, message: "QC Group created successfully" });

        } catch (error) {
            console.error("Create QC Group error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    // Get All QC Groups
    async getQcGroups(req, res) {
        try {
            const company_id = req.user.company_id;
            const { 
                page = 1, 
                limit = 10, 
                search = '', 
                sortBy = 'name', 
                sortOrder = 'asc',
                columnFilters: columnFiltersRaw
            } = req.query;

            const columnFilters = typeof columnFiltersRaw === 'string' ? JSON.parse(columnFiltersRaw) : (columnFiltersRaw || {});

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const take = parseInt(limit);

            const where = { company_id };
            if (search) {
                where.name = { contains: search, mode: 'insensitive' };
            }

            // Column Filters
            if (columnFilters.name && columnFilters.name !== 'all') {
                where.name = { in: Array.isArray(columnFilters.name) ? columnFilters.name : [columnFilters.name] };
            }

            const [total, qcGroups] = await prisma.$transaction([
                prisma.qc_group.count({ where }),
                prisma.qc_group.findMany({
                    where,
                    skip,
                    take,
                    include: {
                        users: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        empid: true,
                                        user_roles: {
                                            include: {
                                                role: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { [sortBy]: sortOrder }
                })
            ]);

            res.status(200).json({ 
                success: true, 
                data: qcGroups,
                meta: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / take)
                }
            });

        } catch (error) {
            console.error("Get QC Groups error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    async getQCGroupFilters(req, res) {
        try {
            const company_id = req.user.company_id;
            const groups = await prisma.qc_group.findMany({
                where: { company_id },
                select: { name: true }
            });

            const records = groups.map(g => ({ name: g.name }));
            res.status(200).json({ success: true, data: { records } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Update QC Group
    async updateQcGroup(req, res) {
        try {
            const { id } = req.params;
            const { name, user_ids } = req.body;
            const company_id = req.user.company_id;

            if (!name || name.trim() === "") {
                return res.status(400).json({ success: false, message: "QC Group name is required" });
            }

            // Check if another group has same name
            const existing = await prisma.qc_group.findFirst({
                where: {
                    company_id,
                    name: name.trim(),
                    id: { not: id }
                }
            });

            if (existing) {
                return res.status(409).json({ success: false, message: "QC Group name already exists" });
            }

            const qcGroup = await prisma.$transaction(async (tx) => {
                const updatedGroup = await tx.qc_group.update({
                    where: { id },
                    data: { name: name.trim() }
                });

                // Replace user associations
                await tx.user_qc_group.deleteMany({
                    where: { qc_group_id: id }
                });

                if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
                    const userGroupData = user_ids.map(user_id => ({
                        user_id,
                        qc_group_id: id
                    }));
                    await tx.user_qc_group.createMany({
                        data: userGroupData
                    });
                }

                return updatedGroup;
            });

            res.status(200).json({ success: true, data: qcGroup, message: "QC Group updated successfully" });

        } catch (error) {
            if (error.code === 'P2025') {
                return res.status(404).json({ success: false, message: "QC Group not found" });
            }
            console.error("Update QC Group error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    // Delete QC Group
    async deleteQcGroup(req, res) {
        try {
            const { id } = req.params;

            await prisma.qc_group.delete({
                where: { id }
            });

            res.status(200).json({ success: true, message: "QC Group deleted successfully" });

        } catch (error) {
            if (error.code === 'P2025') {
                return res.status(404).json({ success: false, message: "QC Group not found" });
            }
            console.error("Delete QC Group error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
    // Get Groups for current user
    async getUserGroups(req, res) {
        try {
            const user_id = req.user.userid || req.user.id;
            
            const groups = await prisma.user_qc_group.findMany({
                where: { user_id },
                select: { qc_group_id: true }
            });

            res.status(200).json({ 
                success: true, 
                data: groups.map(g => g.qc_group_id) 
            });
        } catch (error) {
            console.error("Get User Groups error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
}

module.exports = new QcGroupController();
