const express = require('express');
const router = express.Router();
const qapController = require('../../controllers/qap.controller');
const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');

router.use(authenticateUserOnly);

const { upload } = require('#utils/upload');

router.post('/create', upload.array('attachments', 10), qapController.create);
router.put('/update/:id', upload.array('attachments', 10), qapController.update);
router.get('/list', qapController.list);
router.get('/get-filters', qapController.getFilters);
router.get('/next-report-no/:jobId', qapController.getNextReportNo);
router.get('/download-pdf/:id', qapController.downloadPdf);
router.patch('/toggle-status/:id', authenticateUser(['ADMIN']), qapController.toggleStatus);
router.delete('/archive/:id', authenticateUser(['ADMIN']), qapController.archive);
router.get('/:id', qapController.getById);

// Master Headings Management
router.get('/master-headings/list', qapController.listMasterHeadings);
router.post('/master-headings/create', qapController.createMasterHeading);
router.put('/master-headings/update/:id', qapController.updateMasterHeading);
router.delete('/master-headings/delete/:id', qapController.deleteMasterHeading);

module.exports = router;
