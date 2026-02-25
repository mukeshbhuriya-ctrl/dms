const express = require('express');
const router = express.Router();
const InspectionReportController = require('../../controllers/hydro/inspection_report.controller');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

router.get('/list', authenticateUserOnly, InspectionReportController.getList);
router.get('/:id', authenticateUserOnly, InspectionReportController.getById);
router.get('/next-report-no/:jobId', authenticateUserOnly, InspectionReportController.getNextReportNo);
router.post('/create', authenticateUserOnly, InspectionReportController.createReport);
router.put('/update/:id', authenticateUserOnly, InspectionReportController.updateReport);

module.exports = router;
