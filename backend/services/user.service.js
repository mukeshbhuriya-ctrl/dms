const prisma = require('#prisma');
const { hashPassword } = require('#utils/hashpassword');

class UserService {
    /**
     * Get all users with pagination, filtering, and sorting
     */
    async getUsers({ company_id, page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' }) {
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;
        const take = limitNum;

        // Build where clause
        const where = {
            company_id: company_id,
            ...(search && {
                OR: [
                    { name: { contains: search } }, // Case-insensitive handled by Prisma/DB collation usually, or add mode: 'insensitive' if PG
                    { email: { contains: search } },
                    { empid: { contains: search } },
                    { department: { name: { contains: search } } },
                ],
            }),
        };

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
                    select: {
                        name: true
                    }
                },
                designation: true,
                user_roles: {
                    include: {
                        role: true,
                    },
                },
                createdAt: true,
            },
            orderBy: {
                [sortBy]: sortOrder,
            },
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
                user_roles: {
                    some: {
                        role: {
                            name: roleName,
                        },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                // Add other fields as needed
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
            const updatedUser = await tx.user.update({
                where: { id },
                data: {
                    name,
                    email,
                    empid,
                    mobile,
                    department_id: department,
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
     * Delete user
     */
    async deleteUser(id, company_id) {
        const existingUser = await prisma.user.findFirst({
            where: { id, company_id },
        });

        if (!existingUser) {
            throw new Error('User not found');
        }

        // Delete user (cascade removes roles usually, but explicit check implies we just delete user)
        // Prisma schema should handle cascade delete for UserRole if defined, otherwise we might need to delete roles first.
        // Assuming cascade or manual cleanup:
        await prisma.user_roles.deleteMany({ where: { user_id: id } });

        return await prisma.user.delete({
            where: { id },
        });
    }
}

module.exports = new UserService();
