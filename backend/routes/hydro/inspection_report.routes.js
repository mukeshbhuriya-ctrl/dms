const express = require('express');
const router = express.Router();
const InspectionReportController = require('../../controllers/hydro/inspection_report.controller');
const FinalInspectionController = require('../../controllers/hydro/final_inspection.controller');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

// Dish End Inspection
router.get('/list', authenticateUserOnly, InspectionReportController.getList);
router.get('/:id', authenticateUserOnly, InspectionReportController.getById);
router.get('/next-report-no/:jobId', authenticateUserOnly, InspectionReportController.getNextReportNo);
router.post('/create', authenticateUserOnly, InspectionReportController.createReport);
router.put('/update/:id', authenticateUserOnly, InspectionReportController.updateReport);
router.put('/update-status/:id', authenticateUserOnly, InspectionReportController.updateStatus);

// Final Inspection
router.get('/final/list', authenticateUserOnly, FinalInspectionController.getList);
router.get('/final/:id', authenticateUserOnly, FinalInspectionController.getById);
router.get('/final/next-report-no/:jobId', authenticateUserOnly, FinalInspectionController.getNextReportNo);
router.post('/final/create', authenticateUserOnly, FinalInspectionController.createReport);
router.put('/final/update/:id', authenticateUserOnly, FinalInspectionController.updateReport);
router.put('/final/update-status/:id', authenticateUserOnly, FinalInspectionController.updateStatus);

module.exports = router;
