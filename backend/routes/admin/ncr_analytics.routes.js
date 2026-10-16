const express = require('express');
const router = express.Router();

const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const ncrAnalyticsController = require('#controllers/ncr_analytics.controller.js');

// Require authentication
router.use(authenticateUserOnly);

// Month-Wise NCR Analytics endpoints
router.get('/overview', (req, res) => ncrAnalyticsController.getOverview(req, res));
router.get('/records', (req, res) => ncrAnalyticsController.getRecords(req, res));
router.get('/export', (req, res) => ncrAnalyticsController.exportNcr(req, res));

module.exports = router;
