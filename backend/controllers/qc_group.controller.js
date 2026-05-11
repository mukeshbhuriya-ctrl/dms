const prisma = require('#prisma');
const Audit = require('#utils/audit.js');

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
            const existing = await prisma.qc_group.findFirst({
                where: {
                    company_id,
                    name: name.trim()
                }
            });

            if (existing) {
                if (existing.is_deleted) {
                    // Restore and update mappings
                    await prisma.$transaction(async (tx) => {
                        await tx.qc_group.update({
                            where: { id: existing.id },
                            data: { is_deleted: false, is_active: true }
                        });
                        await tx.user_qc_group.deleteMany({ where: { qc_group_id: existing.id } });
                        if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
                            const userGroupData = user_ids.map(user_id => ({
                                user_id,
                                qc_group_id: existing.id
                            }));
                            await tx.user_qc_group.createMany({ data: userGroupData });
                        }
                    });

                    Audit.insert({
                        req,
                        company_id,
                        user_id: req.user.userid || req.user.id,
                        action: 'activated',
                        module: 'QC Group Management',
                        description: `Restored deleted QC Group "${existing.name}"`,
                        metadata: { target_qc_group_id: existing.id },
                    });

                    return res.status(200).json({ success: true, message: "QC Group restored successfully" });
                }
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

            Audit.insert({
                req,
                company_id,
                user_id: req.user.userid || req.user.id,
                action: 'created',
                module: 'QC Group Management',
                description: `Created new QC Group "${qcGroup.name}"`,
                metadata: { target_qc_group_id: qcGroup.id },
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

            const where = { 
                company_id,
                is_deleted: false 
            };
            if (search) {
                where.name = { contains: search, mode: 'insensitive' };
            }

            // Column Filters
            if (columnFilters.name && columnFilters.name !== 'all') {
                where.name = { in: Array.isArray(columnFilters.name) ? columnFilters.name : [columnFilters.name] };
            }

            // is_active column filter
            if (columnFilters.is_active && columnFilters.is_active !== 'all') {
                const vals = Array.isArray(columnFilters.is_active) ? columnFilters.is_active : [columnFilters.is_active];
                const wantsActive   = vals.includes('true');
                const wantsInactive = vals.includes('false');
                if (wantsActive && !wantsInactive)   where.is_active = true;
                if (wantsInactive && !wantsActive)   where.is_active = false;
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
                where: { company_id, is_deleted: false },
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
                    data: { name: name.trim(), is_deleted: false }
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

            Audit.insert({
                req,
                company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'QC Group Management',
                description: `Updated QC Group name to "${qcGroup.name}"`,
                metadata: { target_qc_group_id: qcGroup.id },
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

    // Soft Delete QC Group
    async deleteQcGroup(req, res) {
        try {
            const { id } = req.params;

            const deletedGroup = await prisma.qc_group.update({
                where: { id },
                data: { is_deleted: true, is_active: false }
            });

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'deleted',
                module: 'QC Group Management',
                description: `Deleted QC Group "${deletedGroup.name}"`,
                metadata: { target_qc_group_id: deletedGroup.id },
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

    // Toggle QC Group Status
    async toggleQcGroupStatus(req, res) {
        try {
            const { id } = req.params;
            const existing = await prisma.qc_group.findUnique({ where: { id } });

            if (!existing) {
                return res.status(404).json({ success: false, message: "QC Group not found" });
            }

            const updated = await prisma.qc_group.update({
                where: { id },
                data: { is_active: !existing.is_active }
            });

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: updated.is_active ? 'activated' : 'deactivated',
                module: 'QC Group Management',
                description: `${updated.is_active ? 'Activated' : 'Deactivated'} QC Group "${updated.name}"`,
                metadata: { target_qc_group_id: updated.id, is_active: updated.is_active },
            });

            res.status(200).json({ 
                success: true, 
                data: updated,
                message: `QC Group ${updated.is_active ? 'activated' : 'deactivated'} successfully` 
            });

        } catch (error) {
            console.error("Toggle QC Group status error:", error);
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
