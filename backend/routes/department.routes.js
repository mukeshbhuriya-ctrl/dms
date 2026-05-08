const express = require('express');
const router = express.Router();
const departmentController = require('#controllers/department.controller.js');
const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');

// All routes require authentication and likely ADMIN role (or at least user role for reading)
// For management, restrict to ADMIN. For reading (in dropdown), restrict to authenticated users.

// Get departments (Open to all authenticated users for dropdowns)
router.get('/', authenticateUserOnly, departmentController.getDepartments);
router.get('/filters', authenticateUserOnly, departmentController.getDepartmentFilters);

// Create, Update, Delete (Restrict to ADMIN)
router.post('/', authenticateUser('ADMIN', { requireAll: false }), departmentController.createDepartment);
router.put('/:id', authenticateUser('ADMIN', { requireAll: false }), departmentController.updateDepartment);
router.delete('/:id', authenticateUser('ADMIN', { requireAll: false }), departmentController.deleteDepartment);
router.patch('/toggle-status/:id', authenticateUser('ADMIN', { requireAll: false }), departmentController.toggleDepartmentStatus);

module.exports = router;
