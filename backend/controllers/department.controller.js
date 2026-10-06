const prisma = require('#prisma');
const Audit = require('#utils/audit.js');

class DepartmentController {
    // Create Department
    async createDepartment(req, res) {
        try {
            const { name, hod_ids = [] } = req.body;
            const company_id = req.user.company_id;

            if (!name || name.trim() === "") {
                return res.status(400).json({ success: false, message: "Department name is required" });
            }

            // Check if department already exists for this company (including soft deleted ones)
            const existing = await prisma.department.findFirst({
                where: {
                    company_id,
                    name: name.trim()
                }
            });

            if (existing) {
                if (existing.is_deleted) {
                    // Reactive and update
                    const updated = await prisma.department.update({
                        where: { id: existing.id },
                        data: { 
                            is_deleted: false, 
                            is_active: true,
                            department_hods: {
                                deleteMany: {}, // Clear old HODs
                                create: hod_ids.map(uid => ({ user_id: uid }))
                            }
                        },
                        include: { department_hods: { include: { user: true } } }
                    });

                    Audit.insert({
                        req,
                        company_id,
                        user_id: req.user.userid || req.user.id,
                        action: 'activated',
                        module: 'Department Management',
                        description: `Restored deleted department "${updated.name}"`,
                        metadata: { target_department_id: updated.id },
                    });
                    return res.status(200).json({ success: true, data: updated, message: "Department restored successfully" });
                }
                return res.status(409).json({ success: false, message: "Department already exists" });
            }

            const department = await prisma.department.create({
                data: {
                    name: name.trim(),
                    company_id,
                    department_hods: {
                        create: hod_ids.map(uid => ({ user_id: uid }))
                    }
                },
                include: { department_hods: { include: { user: true } } }
            });

            Audit.insert({
                req,
                company_id,
                user_id: req.user.userid || req.user.id,
                action: 'created',
                module: 'Department Management',
                description: `Created new department "${department.name}"`,
                metadata: { target_department_id: department.id },
            });

            res.status(201).json({ success: true, data: department, message: "Department created successfully" });

        } catch (error) {
            console.error("Create department error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    // Get All Departments
    async getDepartments(req, res) {
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

            const [total, departments] = await prisma.$transaction([
                prisma.department.count({ where }),
                prisma.department.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { [sortBy]: sortOrder },
                    include: {
                        department_hods: {
                            include: { user: { select: { id: true, name: true, empid: true } } }
                        }
                    }
                })
            ]);

            res.status(200).json({ 
                success: true, 
                data: departments,
                meta: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / take)
                }
            });

        } catch (error) {
            console.error("Get departments error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    async getDepartmentFilters(req, res) {
        try {
            const company_id = req.user.company_id;
            const departments = await prisma.department.findMany({
                where: { company_id, is_deleted: false },
                select: { name: true }
            });

            const records = departments.map(d => ({ name: d.name }));
            res.status(200).json({ success: true, data: { records } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Update Department
    async updateDepartment(req, res) {
        try {
            const { id } = req.params;
            const { name, hod_ids } = req.body;
            const company_id = req.user.company_id;

            if (!name || name.trim() === "") {
                return res.status(400).json({ success: false, message: "Department name is required" });
            }

            // Check if another department has same name
            const existing = await prisma.department.findFirst({
                where: {
                    company_id,
                    name: name.trim(),
                    id: { not: id }
                }
            });

            if (existing) {
                return res.status(409).json({ success: false, message: "Department name already exists" });
            }

            const updateData = { name: name.trim(), is_deleted: false };
            
            if (Array.isArray(hod_ids)) {
                updateData.department_hods = {
                    deleteMany: {},
                    create: hod_ids.map(uid => ({ user_id: uid }))
                };
            }

            const department = await prisma.department.update({
                where: { id },
                data: updateData,
                include: { department_hods: { include: { user: true } } }
            });

            Audit.insert({
                req,
                company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'Department Management',
                description: `Updated department name to "${department.name}"`,
                metadata: { target_department_id: department.id },
            });

            res.status(200).json({ success: true, data: department, message: "Department updated successfully" });

        } catch (error) {
            // Check if record not found
            if (error.code === 'P2025') {
                return res.status(404).json({ success: false, message: "Department not found" });
            }
            console.error("Update department error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    // Soft Delete Department
    async deleteDepartment(req, res) {
        try {
            const { id } = req.params;

            const department = await prisma.department.update({
                where: { id },
                data: { is_deleted: true, is_active: false }
            });

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'deleted',
                module: 'Department Management',
                description: `Deleted department "${department.name}"`,
                metadata: { target_department_id: department.id },
            });

            res.status(200).json({ success: true, message: "Department deleted successfully" });

        } catch (error) {
            if (error.code === 'P2025') {
                return res.status(404).json({ success: false, message: "Department not found" });
            }
            console.error("Delete department error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    // Toggle Department Status
    async toggleDepartmentStatus(req, res) {
        try {
            const { id } = req.params;
            const existing = await prisma.department.findUnique({ where: { id } });

            if (!existing) {
                return res.status(404).json({ success: false, message: "Department not found" });
            }

            const updated = await prisma.department.update({
                where: { id },
                data: { is_active: !existing.is_active }
            });

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: updated.is_active ? 'activated' : 'deactivated',
                module: 'Department Management',
                description: `${updated.is_active ? 'Activated' : 'Deactivated'} department "${updated.name}"`,
                metadata: { target_department_id: updated.id, is_active: updated.is_active },
            });

            res.status(200).json({ 
                success: true, 
                data: updated,
                message: `Department ${updated.is_active ? 'activated' : 'deactivated'} successfully` 
            });

        } catch (error) {
            console.error("Toggle department status error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
}

module.exports = new DepartmentController();
