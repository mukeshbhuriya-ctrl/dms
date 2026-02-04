const express = require('express');
const { getUsers, createUser, getRoles, getUsersByRole } = require('#api/users/user.js');
const { authenticateUser } = require('#api/middleware/user.middleware.js');

const router = express.Router();

// Apply authentication middleware to all routes in this router
router.use(authenticateUser(['ADMIN', 'PRODUCTION_ENGINEER', 'QC_ENGINEER', 'NDT_ENGINEER']));

// Public routes
router.get('/get-users', getUsers);
router.post('/create-user', createUser);
router.get('/get-roles', getRoles);
router.get('/by-role/:roleName', getUsersByRole);

module.exports = router;
