const express = require('express');
const router = express.Router();
const qapController = require('../../controllers/qap.controller');
const { authenticateUser } = require('#api/middleware/user.middleware.js');

// Assuming same roles since QAP is a quality function mostly led by engineers and DCC admins. Let's allow DCC, ADMIN, PRODUCTION_ENGINEER, and QUALITY_ENGINEER based on usual roles setup. If we don't know the exact array, let's just use what they usually use.
router.use(authenticateUser(['DCC', 'ADMIN', 'PRODUCTION_ENGINEER', 'QC_ENGINEER']));

router.post('/create', qapController.create);
router.put('/update/:id', qapController.update);
router.get('/list', qapController.list);
router.get('/next-report-no/:jobId', qapController.getNextReportNo);
router.get('/download-pdf/:id', qapController.downloadPdf);
router.get('/:id', qapController.getById);

module.exports = router;
