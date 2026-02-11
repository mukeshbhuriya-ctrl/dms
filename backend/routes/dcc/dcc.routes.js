const express = require('express');
const { createCustomer, createCustomerLocation, createPo, createJob, getCustomers, getCustomerLocations, getPos, getJobs } = require('#api/dcc/customer.js');
const { getDocumentType, createDocumentType, getDocumentMaster, createDocumentMaster, assignDocument } = require('#api/dcc/document.js');
const { getUsers } = require('#api/users/user.js');

const { authenticateUser } = require('#api/middleware/user.middleware.js');
const documentUpload = require('#utils/document-upload');

const router = express.Router();

const DccController = require('../../controllers/dcc.controller');

// Apply authentication middleware to all routes in this router
router.use(authenticateUser(['DCC', 'ADMIN']));

router.get('/get-customers', DccController.getCustomers);
router.post('/create-customer', createCustomer);

router.get('/get-customer-locations', DccController.getCustomerLocations);
router.post('/create-customer-location', createCustomerLocation);

router.get('/get-pos', DccController.getPos);
router.post('/create-po', documentUpload.single('po_document'), createPo);

router.get('/get-jobs', DccController.getJobs);
router.post('/create-job', createJob);

router.get('/document', DccController.getDocuments);
router.post('/create-document-master', createDocumentMaster);

router.get('/document-type', getDocumentType);
router.get('/get-users', getUsers);
router.post('/create-document-type', createDocumentType);
router.post('/assign-document', assignDocument);

module.exports = router;
