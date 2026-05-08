const express = require('express');
const router = express.Router();

const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const AdminDashboardController = require('#controllers/adminDashboard.controller.js');

router.use(authenticateUserOnly);

router.get('/overview', AdminDashboardController.getOverview);
router.get('/alerts', AdminDashboardController.getAlerts);
router.get('/trends', AdminDashboardController.getTrends);

module.exports = router;
