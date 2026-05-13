const express = require('express');
const router = express.Router();
const qapController = require('../../controllers/qap.controller');
const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');

router.use(authenticateUserOnly);

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

// Master Headings Management
router.get('/master-headings/list', qapController.listMasterHeadings);
router.post('/master-headings/create', qapController.createMasterHeading);
router.put('/master-headings/update/:id', qapController.updateMasterHeading);
router.delete('/master-headings/delete/:id', qapController.deleteMasterHeading);

module.exports = router;
