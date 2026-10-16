const express = require('express');
const router = express.Router();

const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const dcrAnalyticsController = require('#controllers/dcr_analytics.controller.js');

// Require authentication
router.use(authenticateUserOnly);

// Month-Wise DCR Analytics endpoints
router.get('/overview', (req, res) => dcrAnalyticsController.getOverview(req, res));
router.get('/records', (req, res) => dcrAnalyticsController.getRecords(req, res));
router.get('/export', (req, res) => dcrAnalyticsController.exportDcr(req, res));

module.exports = router;
