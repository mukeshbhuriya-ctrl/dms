const express = require('express');
const router = express.Router();

const { authenticateUser } = require('#api/middleware/user.middleware.js');
const MhcController = require('../../controllers/mhc.controller');

router.use(authenticateUser(['DCC', 'ADMIN', 'PRODUCTION_ENGINEER', 'QC_ENGINEER']));

router.get('/list', MhcController.list);
router.post('/create', MhcController.create);
router.put('/update/:id', MhcController.update);
router.put('/update-status/:id', MhcController.updateStatus);
router.get('/next-report-no/:job_id', MhcController.getNextReportNo);
router.get('/approved-items/:job_id', MhcController.getApprovedItemsByJob);
router.get('/approved-items-by-msn/:msn', MhcController.getApprovedItemsByMsn);
router.get('/:id', MhcController.getById);

module.exports = router;
