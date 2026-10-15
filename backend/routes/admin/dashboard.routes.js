const express = require('express');
const router = express.Router();

const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const AdminDashboardController = require('#controllers/adminDashboard.controller.js');

router.use(authenticateUserOnly);

router.get('/overview', AdminDashboardController.getOverview);
router.get('/alerts', AdminDashboardController.getAlerts);
router.get('/trends', AdminDashboardController.getTrends);

router.get('/dms/upload-analytics', AdminDashboardController.getDmsUploadAnalytics);
router.get('/dms/upload-records', AdminDashboardController.getDmsUploadRecords);
router.get('/dms/export-upload-records', AdminDashboardController.exportDmsUploadRecords);

module.exports = router;
