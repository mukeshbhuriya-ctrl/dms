const express = require('express');
const router = express.Router();

const { authenticateUser } = require('#api/middleware/user.middleware.js');
const MhcController = require('../../controllers/mhc.controller');

router.use(authenticateUser(['DCC', 'ADMIN', 'PRODUCTION_ENGINEER']));

router.get('/list', MhcController.list);
router.post('/create', MhcController.create);
router.get('/next-report-no/:job_id', MhcController.getNextReportNo);
router.get('/:id', MhcController.getById);

module.exports = router;
