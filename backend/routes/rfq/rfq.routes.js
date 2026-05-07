const express = require('express');
const router = express.Router();

const { authenticateUser } = require('#api/middleware/user.middleware.js');
const RfqController = require('../../controllers/rfq.controller');
const { upload } = require('../../utils/upload');

router.use(authenticateUser(['ADMIN', 'MARKETING']));

// ─── RFQ Register CRUD ──────────────────────────────────────────────────────
router.get('/list', RfqController.list);
router.get('/dashboard', RfqController.getDashboardStats);
router.get('/next-quotation-no', RfqController.getNextQuotationNo);
router.post('/create', RfqController.create);
router.post('/bulk-create', RfqController.bulkCreate);
router.put('/update/:id', RfqController.update);
router.get('/users', RfqController.getUsers);
router.get('/lookups/:type', RfqController.getLookups);
router.get('/lookups/:type/filters', RfqController.getLookupFilters);
router.post('/lookups', RfqController.createLookup);
router.put('/lookups/:id', RfqController.updateLookup);
router.delete('/lookups/:id', RfqController.deleteLookup);
// ─── Estimators ─────────────────────────────────────────────────────────────
router.get('/estimators', RfqController.getEstimators);
router.get('/estimators/filters', RfqController.getEstimatorFilters);
router.post('/estimators', RfqController.createEstimator);
router.put('/estimators/:id', RfqController.updateEstimator);
router.delete('/estimators/:id', RfqController.deleteEstimator);

// ─── Mediators ──────────────────────────────────────────────────────────────
router.get('/mediators', RfqController.getMediators);
router.get('/mediators/filters', RfqController.getMediatorFilters);
router.post('/mediators', RfqController.createMediator);
router.put('/mediators/:id', RfqController.updateMediator);
router.delete('/mediators/:id', RfqController.deleteMediator);

// ─── Generic ID Routes (Must be last) ──────────────────────────────────────
router.get('/:id', RfqController.getById);
router.patch('/toggle-status/:id', (req, res, next) => {
    if (!req.user.role.includes('ADMIN')) return res.status(403).json({ success: false, message: 'Unauthorized' });
    next();
}, RfqController.toggleStatus);
router.delete('/archive/:id', (req, res, next) => {
    if (!req.user.role.includes('ADMIN')) return res.status(403).json({ success: false, message: 'Unauthorized' });
    next();
}, RfqController.archive);
router.delete('/:id', RfqController.deleteById);

// ─── Attachments ────────────────────────────────────────────────────────────
router.get('/:id/attachments', RfqController.getAttachments);
router.post('/:id/attachments', upload.array('files', 10), RfqController.uploadAttachments);
router.get('/:id/files/:filename', RfqController.downloadAttachment);
router.delete('/attachments/:attachmentId', RfqController.deleteAttachment);

module.exports = router;
