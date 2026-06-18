const express = require('express');
const router = express.Router();
const TubeSheetInspectionController = require('../../controllers/tube_sheet_inspection/tube_sheet_inspection.controller');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

// Protect all routes
router.use(authenticateUserOnly);

// Standard CRUD endpoints
router.get('/list', TubeSheetInspectionController.list);
router.get('/get-filters', TubeSheetInspectionController.getFilters);
router.get('/:id', TubeSheetInspectionController.getById);
router.post('/create', TubeSheetInspectionController.create);
router.put('/update/:id', TubeSheetInspectionController.update);
router.patch('/toggle-status/:id', TubeSheetInspectionController.toggleStatus);
router.delete('/archive/:id', TubeSheetInspectionController.delete);

// Export
router.get('/:id/download', TubeSheetInspectionController.downloadReport);

module.exports = router;
