const userService = require('#services/user.service.js');
const Audit = require('#utils/audit.js');

class UserController {
    async getUsers(req, res) {
        try {
            const { page, limit, search, sortBy, sortOrder, columnFilters } = req.query;
            const result = await userService.getUsers({
                company_id: req.user.company_id,
                page,
                limit,
                search,
                sortBy,
                sortOrder,
                columnFilters: typeof columnFilters === 'string' ? JSON.parse(columnFilters) : columnFilters
            });

            res.status(200).json({
                success: true,
                message: 'Users fetched successfully',
                data: result.data,
                meta: result.meta,
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async getUserFilters(req, res) {
        try {
            const result = await userService.getUserFilters(req.user.company_id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createUser(req, res) {
        try {
            const { name, email, empid, password } = req.body;

            // Basic validation
            if (!name || !email || !empid || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields',
                });
            }

            await userService.createUser(req.body, req.user.company_id);

            res.status(201).json({
                success: true,
                message: 'User created successfully',
            });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create user',
            });
        }
    }

    async getRoles(req, res) {
        try {
            const roles = await userService.getRoles();
            res.status(200).json({
                success: true,
                data: roles,
            });
        } catch (error) {
            console.error('Get roles error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    async getUsersByRole(req, res) {
        try {
            const { roleName } = req.params;
            const users = await userService.getUsersByRole(roleName, req.user.company_id);
            res.status(200).json({
                success: true,
                data: users,
            });
        } catch (error) {
            console.error('Get users by role error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    async getFunctionalTags(req, res) {
        try {
            const { getAvailableTags } = require('../config/constants.js');
            res.status(200).json({
                success: true,
                data: getAvailableTags(),
            });
        } catch (error) {
            console.error('Get functional tags error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            console.log("Updating user:", id, updateData);

            const updatedUser = await userService.updateUser(id, updateData, req.user.company_id);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'User Management',
                description: `Updated user "${updatedUser.name}" (${updatedUser.empid})`,
                metadata: { target_user_id: id, email: updatedUser.email },
            });

            res.status(200).json({
                success: true,
                message: 'User updated successfully',
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update user',
            });
        }
    }

    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const deletedUser = await userService.deleteUser(id, req.user.company_id);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'deleted',
                module: 'User Management',
                description: `Deleted user "${deletedUser.name}" (${deletedUser.empid})`,
                metadata: { target_user_id: id },
            });

            res.status(200).json({
                success: true,
                message: 'User deleted successfully',
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to delete user',
            });
        }
    }

    async toggleUserStatus(req, res) {
        try {
            const { id } = req.params;
            const result = await userService.toggleUserStatus(id, req.user.company_id);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: result.is_active ? 'activated' : 'deactivated',
                module: 'User Management',
                description: `${result.is_active ? 'Activated' : 'Deactivated'} user "${result.name}" (${result.empid})`,
                metadata: { target_user_id: id, is_active: result.is_active },
            });

            res.status(200).json({
                success: true,
                message: `User ${result.is_active ? 'activated' : 'deactivated'} successfully`,
                data: result,
            });
        } catch (error) {
            console.error('Toggle user status error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to toggle user status',
            });
        }
    }

    async adminResetPassword(req, res) {
        try {
            const { id } = req.params;
            const result = await userService.adminResetPassword(id, req.user.company_id);

            Audit.insert({
                req,
                company_id: req.user.company_id,
                user_id: req.user.userid || req.user.id,
                action: 'updated',
                module: 'User Management',
                description: `Admin reset password for user "${result.name}" (${result.empid})`,
                metadata: { target_user_id: id },
            });

            res.status(200).json(result);
        } catch (error) {
            console.error('Admin reset password error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to reset user password',
            });
        }
    }
}

module.exports = new UserController();
