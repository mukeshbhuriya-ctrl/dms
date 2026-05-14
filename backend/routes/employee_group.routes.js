const express = require('express');
const router = express.Router();
const employeeGroupController = require('#controllers/employee_group.controller.js');
const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');

// Get Groups (Open to all authenticated users for dropdowns and views)
router.get('/', authenticateUserOnly, employeeGroupController.getGroups);
router.get('/filters', authenticateUserOnly, employeeGroupController.getGroupFilters);
router.get('/my-groups', authenticateUserOnly, employeeGroupController.getUserGroups);
router.get('/types', authenticateUserOnly, employeeGroupController.getGroupTypes);

// Create, Update, Delete (Restrict to ADMIN)
router.post('/', authenticateUser('ADMIN', { requireAll: false }), employeeGroupController.createGroup);
router.put('/:id', authenticateUser('ADMIN', { requireAll: false }), employeeGroupController.updateGroup);
router.delete('/:id', authenticateUser('ADMIN', { requireAll: false }), employeeGroupController.deleteGroup);
router.patch('/toggle-status/:id', authenticateUser('ADMIN', { requireAll: false }), employeeGroupController.toggleGroupStatus);

module.exports = router;
