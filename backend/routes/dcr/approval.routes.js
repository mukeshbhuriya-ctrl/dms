const express = require('express');
const { authenticateUser } = require('#api/middleware/user.middleware.js');
const ApprovalController = require('../../controllers/approval.controller.js');
const DcrController = require('../../controllers/dcr.controller.js');

const router = express.Router();

// Apply authentication middleware to all routes in this router
router.use(authenticateUser(['ADMIN', 'DCR', 'DESIGN_ENGINEER','QC_ENGINEER']));

router.get('/get-dcr-design-engineer', ApprovalController.getDcrDesignEngineer);
router.get('/get-dcr-quality-engineer', ApprovalController.getDcrQualityEngineer);
router.get('/get-dcr-by-id/:id', DcrController.getDcrById);
router.post('/update-design-engineer-status', ApprovalController.updateDesignEngineerStatus);
router.post('/update-quality-engineer-status', ApprovalController.updateQualityEngineerStatus);


module.exports = router;
