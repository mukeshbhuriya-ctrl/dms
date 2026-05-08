const express = require('express');
const router = express.Router();

const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const HydroTestController = require('../../controllers/hydro/hydro_test.controller');

router.use(authenticateUserOnly);

router.get('/list', HydroTestController.list);
router.get('/active-filters', HydroTestController.getActiveFilters);
router.post('/create', HydroTestController.create);
router.put('/update/:id', HydroTestController.update);
router.get('/next-report-no/:job_id', HydroTestController.getNextReportNo);
router.get('/:id', HydroTestController.getById);
router.get('/:id/download', HydroTestController.downloadPdf);
router.patch('/toggle-status/:id', authenticateUser(['ADMIN']), HydroTestController.toggleStatus);
router.delete('/archive/:id', authenticateUser(['ADMIN']), HydroTestController.archive);

module.exports = router;
