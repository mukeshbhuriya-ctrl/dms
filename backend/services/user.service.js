const prisma = require('#prisma');
const { hashPassword } = require('#utils/hashpassword');
const emailService = require('./email.service');

class UserService {
    /**
     * Get all users with pagination, filtering, and sorting
     */
    async getUsers({ company_id, page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc', columnFilters = {} }) {
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;
        const take = limitNum;

        // Build where clause — never show soft-deleted users
        const where = {
            company_id: company_id,
            is_deleted: false,
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { empid: { contains: search, mode: 'insensitive' } },
                { department: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        // Column Filters
        if (columnFilters.name && columnFilters.name !== 'all') {
            where.name = { in: Array.isArray(columnFilters.name) ? columnFilters.name : [columnFilters.name] };
        }
        if (columnFilters.email && columnFilters.email !== 'all') {
            where.email = { in: Array.isArray(columnFilters.email) ? columnFilters.email : [columnFilters.email] };
        }
        if (columnFilters.empid && columnFilters.empid !== 'all') {
            where.empid = { in: Array.isArray(columnFilters.empid) ? columnFilters.empid : [columnFilters.empid] };
        }
        if (columnFilters.department && columnFilters.department !== 'all') {
            where.department = { name: { in: Array.isArray(columnFilters.department) ? columnFilters.department : [columnFilters.department] } };
        }
        // is_active column filter — values arrive as strings "true" / "false"
        if (columnFilters.is_active && columnFilters.is_active !== 'all') {
            const vals = Array.isArray(columnFilters.is_active) ? columnFilters.is_active : [columnFilters.is_active];
            const wantsActive   = vals.includes('true');
            const wantsInactive = vals.includes('false');
            // Both selected = no filter; one selected = filter
            if (wantsActive && !wantsInactive)   where.is_active = true;
            if (wantsInactive && !wantsActive)   where.is_active = false;
        }

        // Get total count
        const total = await prisma.user.count({ where });

        // Get users
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                empid: true,
                mobile: true,
                department_id: true,
                department: {
                    select: { name: true }
                },
                designation: true,
                is_active: true,
                is_deleted: true,
                user_roles: {
                    include: { role: true },
                },
                createdAt: true,
            },
            orderBy: { [sortBy]: sortOrder },
            skip,
            take,
        });

        return {
            data: users,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        };
    }

    /**
     * Create a new user
     */
    async createUser(userData, company_id) {
        const { name, email, empid, password, mobile, role_ids, department, designation } = userData;        
        const trimmedName = name?.trim();
        const trimmedEmail = email?.trim().toLowerCase();
        const trimmedEmpid = empid?.trim();
        const trimmedDepartmentId = department?.trim();
        const trimmedDesignation = designation?.trim();
        const trimmedMobile = mobile?.trim();

        // Check existing
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { empid }],
            },
        });

        if (existingUser) {
            if (existingUser.email === email) throw new Error('Email already exists');
            if (existingUser.empid === empid) throw new Error('Employee ID already exists');
        }

        const hashedPassword = await hashPassword(password);

        // Validate department
        if (!trimmedDepartmentId) {
            throw new Error('Department is required');
        }

        // Create user with transaction to handle roles
        const result = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    name: trimmedName,
                    email: trimmedEmail,
                    empid: trimmedEmpid,
                    password: hashedPassword,
                    mobile: trimmedMobile,
                    department_id: trimmedDepartmentId,
                    designation: trimmedDesignation,
                    company_id,
                },
            });

            if (role_ids && role_ids.length > 0) {
                // Verify roles exist and belong to the company
                const validRoles = await tx.role.findMany({
                    where: {
                        id: { in: role_ids },
                        company_id,
                    },
                });

                if (validRoles.length !== role_ids.length) {
                    throw new Error('One or more invalid role IDs provided');
                }

                await tx.user_roles.createMany({
                    data: role_ids.map((roleId) => ({
                        user_id: newUser.id,
                        role_id: roleId,
                    })),
                });
            }

            return newUser;
        });

        // Send welcome email asynchronously (don't block the response)
        emailService.sendWelcomeEmail(result, password).catch((err) => {
            console.error("Failed to send welcome email to:", result.email, err);
        });

        return result;
    }

    /**
     * Get all roles
     */
    async getRoles() {
        return await prisma.role.findMany();
    }

    /**
     * Get users by role name
     */
    async getUsersByRole(roleName, company_id) {
        return await prisma.user.findMany({
            where: {
                company_id,
                is_deleted: false,
                is_active: true,
                user_roles: {
                    some: {
                        role: { name: roleName },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                empid: true,
            },
        });
    }
    /**
     * Update user details
     */
    async updateUser(id, updateData, company_id) {
        const { name, email, empid, password, mobile, role_ids, department, designation } = updateData;

        // Verify user exists and belongs to company
        const existingUser = await prisma.user.findFirst({
            where: { id, company_id },
        });

        if (!existingUser) {
            throw new Error('User not found');
        }

        // Check for unique constraints if email/empid changed
        if (email && email !== existingUser.email) {
            const emailExists = await prisma.user.findFirst({ where: { email } });
            if (emailExists) throw new Error('Email already exists');
        }
        if (empid && empid !== existingUser.empid) {
            const empidExists = await prisma.user.findFirst({ where: { empid } });
            if (empidExists) throw new Error('Employee ID already exists');
        }

        let hashedPassword = undefined;
        if (password && password.trim() !== '') {
            hashedPassword = await hashPassword(password);
        }

        return await prisma.$transaction(async (tx) => {
            // Update User
            const trimmedDepartmentId = department?.trim();
            if (!trimmedDepartmentId) {
                throw new Error('Department is required');
            }

            const updatedUser = await tx.user.update({
                where: { id },
                data: {
                    name,
                    email,
                    empid,
                    mobile,
                    department_id: trimmedDepartmentId,
                    designation,
                    ...(hashedPassword && { password: hashedPassword }),
                },
            });

            // Update Roles if provided
            if (role_ids) {
                // Remove existing roles
                await tx.user_roles.deleteMany({ where: { user_id: id } });

                // Add new roles
                if (role_ids.length > 0) {
                    await tx.user_roles.createMany({
                        data: role_ids.map((roleId) => ({
                            user_id: id,
                            role_id: roleId,
                        })),
                    });
                }
            }

            return updatedUser;
        });
    }

    /**
     * Soft delete user — sets is_deleted = true
     */
    async deleteUser(id, company_id) {
        const existingUser = await prisma.user.findFirst({
            where: { id, company_id, is_deleted: false },
        });

        if (!existingUser) {
            throw new Error('User not found');
        }

        return await prisma.user.update({
            where: { id },
            data: { is_deleted: true, is_active: false },
        });
    }

    /**
     * Toggle user active status
     */
    async toggleUserStatus(id, company_id) {
        const existingUser = await prisma.user.findFirst({
            where: { id, company_id, is_deleted: false },
        });

        if (!existingUser) {
            throw new Error('User not found');
        }

        return await prisma.user.update({
            where: { id },
            data: { is_active: !existingUser.is_active },
            select: { id: true, is_active: true },
        });
    }

    async getUserFilters(company_id) {
        const users = await prisma.user.findMany({
            where: { company_id, is_deleted: false },
            select: {
                name: true,
                email: true,
                empid: true,
                department: { select: { name: true } }
            }
        });

        const records = users.map(u => ({
            name: u.name,
            email: u.email,
            empid: u.empid,
            department: u.department?.name
        }));

        return { records };
    }
}

module.exports = new UserService();
