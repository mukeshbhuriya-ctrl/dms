const prisma = require('#prisma');

class DepartmentController {
    // Create Department
    async createDepartment(req, res) {
        try {
            const { name } = req.body;
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
                        data: { is_deleted: false, is_active: true }
                    });
                    return res.status(200).json({ success: true, data: updated, message: "Department restored successfully" });
                }
                return res.status(409).json({ success: false, message: "Department already exists" });
            }

            const department = await prisma.department.create({
                data: {
                    name: name.trim(),
                    company_id
                }
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
                    orderBy: { [sortBy]: sortOrder }
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
            const { name } = req.body;
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

            const department = await prisma.department.update({
                where: { id },
                data: { name: name.trim(), is_deleted: false } // ensure not deleted if updating
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

            await prisma.department.update({
                where: { id },
                data: { is_deleted: true, is_active: false }
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
