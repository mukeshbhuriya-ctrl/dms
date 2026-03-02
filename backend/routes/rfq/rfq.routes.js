const express = require('express');
const router = express.Router();

const { authenticateUser } = require('#api/middleware/user.middleware.js');
const RfqController = require('../../controllers/rfq.controller');

router.use(authenticateUser(['ADMIN', 'MARKETING']));

// ─── RFQ Register CRUD ──────────────────────────────────────────────────────
router.get('/list', RfqController.list);
router.get('/next-quotation-no', RfqController.getNextQuotationNo);
router.post('/create', RfqController.create);
router.put('/update/:id', RfqController.update);
router.get('/users', RfqController.getUsers);
router.get('/lookups/:type', RfqController.getLookups);
router.post('/lookups', RfqController.createLookup);
router.put('/lookups/:id', RfqController.updateLookup);
router.delete('/lookups/:id', RfqController.deleteLookup);
router.get('/:id', RfqController.getById);
router.delete('/:id', RfqController.deleteById);

module.exports = router;
