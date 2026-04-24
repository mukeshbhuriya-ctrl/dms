const express = require('express');
const router = express.Router();
const qcGroupController = require('#controllers/qc_group.controller.js');
const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');

// Get QC Groups (Open to all authenticated users for dropdowns and views)
router.get('/', authenticateUserOnly, qcGroupController.getQcGroups);
router.get('/filters', authenticateUserOnly, qcGroupController.getQCGroupFilters);
router.get('/my-groups', authenticateUserOnly, qcGroupController.getUserGroups);

// Create, Update, Delete (Restrict to ADMIN)
router.post('/', authenticateUser('ADMIN', { requireAll: false }), qcGroupController.createQcGroup);
router.put('/:id', authenticateUser('ADMIN', { requireAll: false }), qcGroupController.updateQcGroup);
router.delete('/:id', authenticateUser('ADMIN', { requireAll: false }), qcGroupController.deleteQcGroup);

module.exports = router;
