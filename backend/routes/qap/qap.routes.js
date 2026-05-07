const express = require('express');
const router = express.Router();
const qapController = require('../../controllers/qap.controller');
const { authenticateUser } = require('#api/middleware/user.middleware.js');

router.use(authenticateUser(['ADMIN', 'QAP', 'DCC', 'PRODUCTION_ENGINEER', 'QC_ENGINEER']));

router.post('/create', qapController.create);
router.put('/update/:id', qapController.update);
router.get('/list', qapController.list);
router.get('/get-filters', qapController.getFilters);
router.get('/next-report-no/:jobId', qapController.getNextReportNo);
router.get('/download-pdf/:id', qapController.downloadPdf);
router.patch('/toggle-status/:id', (req, res, next) => {
    if (!req.user.role.includes('ADMIN')) return res.status(403).json({ success: false, message: 'Unauthorized' });
    next();
}, qapController.toggleStatus);
router.delete('/archive/:id', (req, res, next) => {
    if (!req.user.role.includes('ADMIN')) return res.status(403).json({ success: false, message: 'Unauthorized' });
    next();
}, qapController.archive);
router.get('/:id', qapController.getById);

module.exports = router;
