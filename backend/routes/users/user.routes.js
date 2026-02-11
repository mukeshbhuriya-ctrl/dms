const express = require('express');
const userController = require('#controllers/user.controller.js');
const { authenticateUser } = require('#api/middleware/user.middleware.js');

const router = express.Router();

// Apply authentication middleware to all routes in this router
router.use(authenticateUser(['ADMIN', 'PRODUCTION_ENGINEER', 'QC_ENGINEER', 'NDT_ENGINEER']));

// Public routes (access controlled by router-level middleware)
router.get('/get-users', (req, res) => userController.getUsers(req, res));
const { createUser } = require('#api/users/user.js');

// ...

// Restrict User Creation to Admin only
router.post('/create-user', authenticateUser(['ADMIN']), createUser);
router.get('/get-roles', (req, res) => userController.getRoles(req, res));
router.get('/by-role/:roleName', (req, res) => userController.getUsersByRole(req, res));

module.exports = router;
