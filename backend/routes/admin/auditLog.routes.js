const express = require('express');
const router = express.Router();

const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const AuditLogController = require('#controllers/auditLog.controller.js');

// All routes require authenticated user (ADMIN enforced at frontend level)
router.use(authenticateUserOnly);

router.get('/', AuditLogController.getLogs);
router.get('/filters', AuditLogController.getFilterOptions);
router.get('/export', AuditLogController.exportLogs);

module.exports = router;
