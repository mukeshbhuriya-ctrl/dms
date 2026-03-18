const express = require('express');
const router = express.Router();
const ExportController = require('../../controllers/export.controller');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

router.get('/summary', authenticateUserOnly, ExportController.getReportSummary);
router.get('/locations', authenticateUserOnly, ExportController.exportLocations);
router.get('/customers', authenticateUserOnly, ExportController.exportCustomers);
router.get('/jobs', authenticateUserOnly, ExportController.exportJobs);
router.get('/departments', authenticateUserOnly, ExportController.exportDepartments);
router.get('/users', authenticateUserOnly, ExportController.exportUsers);
router.get('/mhc', authenticateUserOnly, ExportController.exportMHC);
router.get('/qap', authenticateUserOnly, ExportController.exportQAP);
router.get('/hydro', authenticateUserOnly, ExportController.exportHydro);
router.get('/dish-end', authenticateUserOnly, ExportController.exportDishEnd);
router.get('/final-inspection', authenticateUserOnly, ExportController.exportFinalInspection);
router.get('/module/:moduleName', authenticateUserOnly, ExportController.exportModule);

module.exports = router;
