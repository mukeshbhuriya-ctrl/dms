const prisma = require('#prisma');
const Audit = require('#utils/audit.js');
const GROUP_TYPES = require('../config/group_types');

class EmployeeGroupController {
    // Create Employee Group
    async createGroup(req, res) {
        try {
            const { name, group_type, user_ids } = req.body;
            const company_id = req.user.company_id;

            if (!name || name.trim() === "") {
                return res.status(400).json({ success: false, message: "Group name is required" });
            }
            if (!group_type || group_type.trim() === "") {
                return res.status(400).json({ success: false, message: "Group type is required" });
            }

            // Check if group already exists for this company
            const existing = await prisma.employee_group.findFirst({
                where: {
                    company_id,
                    name: name.trim(),
                    group_type: group_type.trim()
                }
            });

            if (existing) {
                if (existing.is_deleted) {
                    // Restore and update mappings
                    await prisma.$transaction(async (tx) => {
                        await tx.employee_group.update({
                            where: { id: existing.id },
                            data: { is_deleted: false, is_active: true }
                        });
                        await tx.user_employee_group.deleteMany({ where: { employee_group_id: existing.id } });
                        if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
                            const userGroupData = user_ids.map(user_id => ({
                                user_id,
                                employee_group_id: existing.id
                            }));
                            await tx.user_employee_group.createMany({ data: userGroupData });
                        }
                    });

                    Audit.insert({
                        req,
                        company_id,
                        user_id: req.user.userid || req.user.id,
                        action: 'activated',
                        module: 'Group Management',
                        description: `Restored deleted Group "${existing.name}" (${group_type})`,
                        metadata: { target_group_id: existing.id },
                    });

                    return res.status(200).json({ success: true, message: "Group restored successfully" });
                }
                return res.status(409).json({ success: false, message: "Group with this name and type already exists" });
            }

            // Create group and its user associations transactionally
            const group = await prisma.$transaction(async (tx) => {
                const newGroup = await tx.employee_group.create({
                    data: {
                        name: name.trim(),
                        group_type: group_type.trim(),
                        company_id
                    }
                });

                if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
                    const userGroupData = user_ids.map(user_id => ({
                        user_id,
                        employee_group_id: newGroup.id
                    }));
                    await tx.user_employee_group.createMany({
                        data: userGroupData
                    });
                }

                return newGroup;
            });

            Audit.insert({
                req,
                company_id,
                user_id: req.user.userid || req.user.id,
                action: 'created',
                module: 'Group Management',
                description: `Created new Group "${group.name}" (${group_type})`,
                metadata: { target_group_id: group.id },
            });

            res.status(201).json({ success: true, data: group, message: "Group created successfully" });

        } catch (error) {
            console.error("Create Group error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    // Get All Employee Groups
    async getGroups(req, res) {
        try {
            const company_id = req.user.company_id;
            const { 
                page = 1, 
                limit = 10, 
                search = '', 
                sortBy = 'name', 
                sortOrder = 'asc',
                group_type,
                columnFilters: columnFiltersRaw
            } = req.query;

            const columnFilters = typeof columnFiltersRaw === 'string' ? JSON.parse(columnFiltersRaw) : (columnFiltersRaw || {});

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const take = parseInt(limit);

            const where = { 
                company_id,
                is_deleted: false 
            };
            
            if (group_type) {
                where.group_type = group_type;
            }

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { group_type: { contains: search, mode: 'insensitive' } }
                ];
            }

            // Column Filters
            if (columnFilters.name && columnFilters.name !== 'all') {
                where.name = { in: Array.isArray(columnFilters.name) ? columnFilters.name : [columnFilters.name] };
            }

            if (columnFilters.group_type && columnFilters.group_type !== 'all') {
                where.group_type = { in: Array.isArray(columnFilters.group_type) ? columnFilters.group_type : [columnFilters.group_type] };
            }

            // is_active column filter
            if (columnFilters.is_active && columnFilters.is_active !== 'all') {
                const vals = Array.isArray(columnFilters.is_active) ? columnFilters.is_active : [columnFilters.is_active];
                const wantsActive   = vals.includes('true');
                const wantsInactive = vals.includes('false');
                if (wantsActive && !wantsInactive)   where.is_active = true;
                if (wantsInactive && !wantsActive)   where.is_active = false;
            }

            const [total, groups] = await prisma.$transaction([
                prisma.employee_group.count({ where }),
                prisma.employee_group.findMany({
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
                data: groups,
                meta: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / take)
                }
            });

        } catch (error) {
            console.error("Get Groups error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    async getGroupFilters(req, res) {
        try {
            const company_id = req.user.company_id;
            const groups = await prisma.employee_group.findMany({
                where: { company_id, is_deleted: false },
                select: { name: true, group_type: true }
            });

            const records = groups.map(g => ({ name: g.name, group_type: g.group_type }));
            res.status(200).json({ success: true, data: { records } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Get Group Types (Config)
    async getGroupTypes(req, res) {
        try {
            res.status(200).json({ success: true, data: GROUP_TYPES });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Update Group
    async updateGroup(req, res) {
        try {
            const { id } = req.params;
            const { name, group_type, user_ids } = req.body;
            const company_id = req.user.company_id;

            if (!name || name.trim() === "") {
                return res.status(400).json({ success: false, message: "Group name is required" });
            }

            // Check if another group has same name and type
            const existing = await prisma.employee_group.findFirst({
                where: {
                    company_id,
                    name: name.trim(),
                    group_type: group_type ? group_type.trim() : undefined,
                    id: { not: id }
                }
            });

            if (existing) {
                return res.status(409).json({ success: false, message: "Group with this name and type already exists" });
            }

            const group = await prisma.$transaction(async (tx) => {
                const updatedGroup = await tx.employee_group.update({
                    where: { id },
                    data: { 
                        name: name.trim(), 
                        group_type: group_type ? group_type.trim() : undefined,
                        is_deleted: false 
                    }
                });

                // Replace user associations
                await tx.user_employee_group.deleteMany({
                    where: { employee_group_id: id }
                });

                if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
                    const userGroupData = user_ids.map(user_id => ({
                        user_id,
                        employee_group_id: id
                    }));
                    await tx.user_employee_group.createMany({
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
                module: 'Group Management',
                description: `Updated Group "${group.name}"`,
                metadata: { target_group_id: group.id },
            });

            res.status(200).json({ success: true, data: group, message: "Group updated successfully" });

        } catch (error) {
            if (error.code === 'P2025') {
                return res.status(404).json({ success: false, message: "Group not found" });
            }
            console.error("Update Group error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    // Soft Delete Group
    async deleteGroup(req, res) {
        try {
            const { id } = req.params;

            const deletedGroup = await prisma.employee_group.update({
                where: { id },
                data: { is_deleted: true, is_active: false }
            });

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'deleted',
                module: 'Group Management',
                description: `Deleted Group "${deletedGroup.name}"`,
                metadata: { target_group_id: deletedGroup.id },
            });

            res.status(200).json({ success: true, message: "Group deleted successfully" });

        } catch (error) {
            if (error.code === 'P2025') {
                return res.status(404).json({ success: false, message: "Group not found" });
            }
            console.error("Delete Group error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    // Toggle Group Status
    async toggleGroupStatus(req, res) {
        try {
            const { id } = req.params;
            const existing = await prisma.employee_group.findUnique({ where: { id } });

            if (!existing) {
                return res.status(404).json({ success: false, message: "Group not found" });
            }

            const updated = await prisma.employee_group.update({
                where: { id },
                data: { is_active: !existing.is_active }
            });

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: updated.is_active ? 'activated' : 'deactivated',
                module: 'Group Management',
                description: `${updated.is_active ? 'Activated' : 'Deactivated'} Group "${updated.name}"`,
                metadata: { target_group_id: updated.id, is_active: updated.is_active },
            });

            res.status(200).json({ 
                success: true, 
                data: updated,
                message: `Group ${updated.is_active ? 'activated' : 'deactivated'} successfully` 
            });

        } catch (error) {
            console.error("Toggle Group status error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    // Get Groups for current user
    async getUserGroups(req, res) {
        try {
            const user_id = req.user.userid || req.user.id;
            
            const groups = await prisma.user_employee_group.findMany({
                where: { user_id },
                include: {
                    employee_group: true
                }
            });

            res.status(200).json({ 
                success: true, 
                data: groups.map(g => g.employee_group) 
            });
        } catch (error) {
            console.error("Get User Groups error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
}

module.exports = new EmployeeGroupController();
