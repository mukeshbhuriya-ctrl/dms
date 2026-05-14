const express = require('express');
const router = express.Router();

const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const MhcController = require('../../controllers/mhc.controller');

router.use(authenticateUserOnly);

router.get('/list', MhcController.list);
router.post('/initiate', MhcController.initiate);
router.post('/offer/:id', MhcController.offer);
router.post('/finalize/:id', MhcController.finalize);
router.post('/save-review/:id', MhcController.saveReview);
router.post('/reject-item', MhcController.rejectItem);
router.post('/request-revision', MhcController.requestRevision);
router.post('/bulk-create', MhcController.bulkCreate);
router.put('/update/:id', MhcController.update);
router.get('/next-report-no/:job_id', MhcController.getNextReportNo);
router.get('/approved-items/:job_id', MhcController.getApprovedItemsByJob);
router.get('/approved-items-by-msn/:msn', MhcController.getApprovedItemsByMsn);
router.get('/get-filters', MhcController.getFilters);
router.get('/:id', MhcController.getById);

// Admin only actions
router.patch('/toggle-status/:id', authenticateUser(['ADMIN']), MhcController.toggleStatus);
router.delete('/:id', authenticateUser(['ADMIN']), MhcController.archive);

module.exports = router;
