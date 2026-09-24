const express = require('express');
const router = express.Router();
const { authenticateUser, authenticateUserOnly } = require('../../api/middleware/user.middleware.js');
const QualityProductionDashboardController = require('../../controllers/quality_production_dashboard.controller.js');

// Apply authentication middleware
router.use(authenticateUserOnly);

// Quality / Production Dashboard endpoints
router.get('/kpis', QualityProductionDashboardController.getKPIs);

module.exports = router;
