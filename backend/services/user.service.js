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
                functional_tags: true,
                is_active: true,
                is_deleted: true,
                user_roles: {
                    include: { role: true },
                },
                user_settings: true,
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
        const { name, email, empid, password, mobile, role_ids, department, designation, email_notifications, custom_policies } = userData;        
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
                    user_settings: {
                        create: {
                            email_notifications: email_notifications !== undefined ? email_notifications : true,
                        }
                    }
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
                        custom_policies: custom_policies || [],
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
    async getRoles(company_id) {
        if (!company_id) throw new Error("Company ID is required to fetch roles");
        return prisma.role.findMany({
            where: { company_id },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { user_roles: true }
                }
            }
        });
    }

    async createRole(data) {
        const { name, identifier, description, policies, company_id } = data;
        if (!company_id) throw new Error("Company ID is required to create a role");
        
        return prisma.role.create({
            data: {
                company_id,
                name,
                identifier: identifier || name.toUpperCase().replace(/\s+/g, '_'),
                description: description || null,
                policies: policies || [],
                is_system_role: false,
            }
        });
    }

    async updateRole(id, data, company_id) {
        const { name, identifier, description, policies } = data;
        const role = await prisma.role.findUnique({ where: { id } });
        if (!role) throw new Error('Role not found');
        if (role.company_id !== company_id) throw new Error('Unauthorized');
        
        if (role.is_system_role) {
            // Only policies can be updated for system roles, or maybe not at all?
            // Usually system roles can't be renamed, but their policies can be updated.
            return prisma.role.update({
                where: { id },
                data: { policies: policies || role.policies }
            });
        }
        return prisma.role.update({
            where: { id },
            data: {
                name,
                identifier,
                description,
                policies: policies || [],
            }
        });
    }

    async deleteRole(id, company_id) {
        const role = await prisma.role.findUnique({ where: { id } });
        if (!role) throw new Error('Role not found');
        if (role.company_id !== company_id) throw new Error('Unauthorized');
        if (role.is_system_role) throw new Error('Cannot delete system role');
        
        const usersCount = await prisma.user_roles.count({ where: { role_id: id } });
        if (usersCount > 0) throw new Error('Cannot delete role assigned to users');
        
        return prisma.role.delete({ where: { id } });
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
                functional_tags: true,
            },
        });
    }
    /**
     * Update user details
     */
    async updateUser(id, updateData, company_id) {
        const { name, email, empid, password, mobile, role_ids, department, designation, email_notifications, functional_tags, custom_policies } = updateData;

        // Verify user exists and belongs to company
        const existingUser = await prisma.user.findFirst({
            where: { id, company_id },
        });

        if (!existingUser) {
            throw new Error('User not found');
        }

        if (existingUser.is_primary_admin) {
            throw new Error('The primary company administrator cannot be modified');
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
                    ...(functional_tags && Array.isArray(functional_tags) && { functional_tags }),
                    ...(hashedPassword && { password: hashedPassword }),
                    user_settings: email_notifications !== undefined ? {
                        upsert: {
                            create: { 
                                email_notifications: email_notifications !== undefined ? email_notifications : true,
                            },
                            update: { 
                                ...(email_notifications !== undefined && { email_notifications }),
                            }
                        }
                    } : undefined
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
                            custom_policies: custom_policies || [],
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

        if (existingUser.is_primary_admin) {
            throw new Error('The primary company administrator cannot be deleted');
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

        if (existingUser.is_primary_admin) {
            throw new Error('The status of the primary company administrator cannot be toggled');
        }

        return await prisma.user.update({
            where: { id },
            data: { is_active: !existingUser.is_active },
            select: { id: true, is_active: true, name: true, empid: true },
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

    /**
     * Admin-initiated password reset
     * Generates a temp password and forces change on next login
     */
    async adminResetPassword(id, company_id) {
        const user = await prisma.user.findFirst({
            where: { id, company_id, is_deleted: false }
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.is_primary_admin) {
            throw new Error('The primary company administrator cannot be deleted');
        }

        if (!user.email) {
            throw new Error('User does not have a registered email address');
        }

        // Generate secure 10-char temp password
        const crypto = require('crypto');
        const tempPassword = crypto.randomBytes(5).toString('hex'); // 10 chars
        const hashedPassword = await hashPassword(tempPassword);

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                password: hashedPassword,
                must_change_password: true,
                otp: null,
                otpExpiry: null
            }
        });

        // Send email notification
        emailService.sendAdminResetEmail(updatedUser, tempPassword).catch(err => {
            console.error(`[UserService] Failed to send admin reset email to ${updatedUser.email}:`, err);
        });

        return { success: true, message: 'Password reset and email sent', name: updatedUser.name, empid: updatedUser.empid };
    }
}

module.exports = new UserService();
