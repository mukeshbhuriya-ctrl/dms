const express = require('express');
const router = express.Router();
const tubeBundleInspectionController = require('../controllers/tube_bundle_inspection/tube_bundle_inspection.controller');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

// Protect all routes
router.use(authenticateUserOnly);

router.get('/get-filters', tubeBundleInspectionController.getFilters);
router.get('/list', tubeBundleInspectionController.list);
router.get('/:id', tubeBundleInspectionController.getById);
router.post('/create', tubeBundleInspectionController.create);
router.put('/update/:id', tubeBundleInspectionController.update);
router.put('/update-status/:id', tubeBundleInspectionController.update); // Map update-status to update
router.patch('/toggle-status/:id', tubeBundleInspectionController.toggleStatus);
router.delete('/archive/:id', tubeBundleInspectionController.delete);
router.get('/:id/download', tubeBundleInspectionController.downloadReport);

module.exports = router;
