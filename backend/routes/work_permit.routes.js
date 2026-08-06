const express = require('express');
const router = express.Router();
const workPermitController = require('../controllers/work_permit.controller');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

router.use(authenticateUserOnly);

router.get('/', workPermitController.getAllPermits);
router.get('/:id', workPermitController.getPermitById);

router.post('/', workPermitController.initiatePermit);
router.put('/:id/stage-1', workPermitController.updateStage1);
router.post('/:id/electrical-review', workPermitController.submitElectricalReview);
router.post('/:id/acceptor-review', workPermitController.submitAcceptorReview);
router.post('/:id/approve', workPermitController.approvePermit);
router.post('/:id/safety-approve', workPermitController.safetyApprove);

module.exports = router;
