const express = require('express');
const router = express.Router();

const { authenticateUser } = require('#api/middleware/user.middleware.js');
const RfqController = require('../../controllers/rfq.controller');

router.use(authenticateUser(['ADMIN', 'MARKETING']));

// ─── RFQ Register CRUD ──────────────────────────────────────────────────────
router.get('/list', RfqController.list);
router.get('/dashboard', RfqController.getDashboardStats);
router.get('/next-quotation-no', RfqController.getNextQuotationNo);
router.post('/create', RfqController.create);
router.put('/update/:id', RfqController.update);
router.get('/users', RfqController.getUsers);
router.get('/lookups/:type', RfqController.getLookups);
router.post('/lookups', RfqController.createLookup);
router.put('/lookups/:id', RfqController.updateLookup);
router.delete('/lookups/:id', RfqController.deleteLookup);
// ─── Estimators ─────────────────────────────────────────────────────────────
router.get('/estimators', RfqController.getEstimators);
router.post('/estimators', RfqController.createEstimator);
router.put('/estimators/:id', RfqController.updateEstimator);
router.delete('/estimators/:id', RfqController.deleteEstimator);

// ─── Mediators ──────────────────────────────────────────────────────────────
router.get('/mediators', RfqController.getMediators);
router.post('/mediators', RfqController.createMediator);
router.put('/mediators/:id', RfqController.updateMediator);
router.delete('/mediators/:id', RfqController.deleteMediator);

// ─── Generic ID Routes (Must be last) ──────────────────────────────────────
router.get('/:id', RfqController.getById);
router.delete('/:id', RfqController.deleteById);

module.exports = router;
