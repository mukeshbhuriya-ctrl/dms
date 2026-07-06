const express = require('express');
const router = express.Router();
const traceLogController = require('../../controllers/admin/traceLog.controller');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

// Protect this route - only authenticated users should see debug traces
router.use(authenticateUserOnly);

router.get('/', traceLogController.getTraces);

module.exports = router;
