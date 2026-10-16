const express = require('express');
const router = express.Router();

const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const userAnalyticsController = require('#controllers/user_analytics.controller.js');

// Require authentication
router.use(authenticateUserOnly);

// Analytics endpoints
router.get('/overview', (req, res) => userAnalyticsController.getOverview(req, res));
router.get('/trends', (req, res) => userAnalyticsController.getTrends(req, res));
router.get('/departments', (req, res) => userAnalyticsController.getDepartments(req, res));
router.get('/inactivity', (req, res) => userAnalyticsController.getInactivity(req, res));

// Detailed ledger records
router.get('/logins', (req, res) => userAnalyticsController.getLogins(req, res));
router.get('/productivity', (req, res) => userAnalyticsController.getProductivity(req, res));

// Exports
router.get('/export-logins', (req, res) => userAnalyticsController.exportLogins(req, res));
router.get('/export-inactivity', (req, res) => userAnalyticsController.exportInactivity(req, res));

module.exports = router;
