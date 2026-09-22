const express = require('express');
const userController = require('#controllers/user.controller.js');
const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');

const router = express.Router();

// Apply authentication middleware to all routes in this router
router.use(authenticateUserOnly);

// Public routes (access controlled by router-level middleware)
router.get('/get-users', (req, res) => userController.getUsers(req, res));
router.get('/get-user-filters', (req, res) => userController.getUserFilters(req, res));
router.get('/get-functional-tags', (req, res) => userController.getFunctionalTags(req, res));
const { createUser } = require('#api/users/user.js');

// ...

// Restrict User Creation to Admin only
router.post('/create-user', authenticateUser(['ADMIN']), createUser);
router.put('/update-user/:id', authenticateUser(['ADMIN']), (req, res) => userController.updateUser(req, res));
router.delete('/delete-user/:id', authenticateUser(['ADMIN']), (req, res) => userController.deleteUser(req, res));
router.patch('/toggle-status/:id', authenticateUser(['ADMIN']), (req, res) => userController.toggleUserStatus(req, res));
router.post('/reset-password/:id', authenticateUser(['ADMIN']), (req, res) => userController.adminResetPassword(req, res));
router.get('/get-roles', (req, res) => userController.getRoles(req, res));
router.post('/create-role', authenticateUser(['ADMIN']), (req, res) => userController.createRole(req, res));
router.put('/update-role/:id', authenticateUser(['ADMIN']), (req, res) => userController.updateRole(req, res));
router.delete('/delete-role/:id', authenticateUser(['ADMIN']), (req, res) => userController.deleteRole(req, res));
router.get('/by-role/:roleName', (req, res) => userController.getUsersByRole(req, res));

module.exports = router;
