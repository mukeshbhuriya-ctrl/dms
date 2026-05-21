const express = require('express');
const router = express.Router();
const ApprovalCenterController = require('#controllers/approvalCenter.controller.js');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

// Protect route: Must be authenticated
router.get('/requests', authenticateUserOnly, ApprovalCenterController.getAllRequests);

module.exports = router;
