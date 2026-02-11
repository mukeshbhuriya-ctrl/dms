const userService = require('#services/user.service.js');

class UserController {
    async getUsers(req, res) {
        try {
            const { page, limit, search, sortBy, sortOrder } = req.query;
            const result = await userService.getUsers({
                company_id: req.user.company_id,
                page,
                limit,
                search,
                sortBy,
                sortOrder,
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
}

module.exports = new UserController();
