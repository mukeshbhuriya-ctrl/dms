const express = require('express');
const { createCustomer, createCustomerLocation, createPo, createJob, getCustomers, getCustomerLocations, getPos, getJobs } = require('#api/dcc/customer.js');
const { getDocumentType, createDocumentType, getDocumentMaster, createDocumentMaster, assignDocument } = require('#api/dcc/document.js');
const { getUsers } = require('#api/users/user.js');

const { authenticateUser } = require('#api/middleware/user.middleware.js');
const documentUpload = require('#utils/document-upload');

const router = express.Router();

// Apply authentication middleware to all routes in this router
router.use(authenticateUser(['DCC']));



router.get('/get-customers', getCustomers);
router.get('/get-customer-locations', getCustomerLocations);
router.get('/get-pos', getPos);
router.get('/get-jobs', getJobs);

router.post('/create-customer', createCustomer);
router.post('/create-customer-location', createCustomerLocation);
router.post('/create-po', documentUpload.single('po_document'), createPo);
router.post('/create-job', createJob);

router.get('/document', getDocumentMaster);
router.get('/document-type', getDocumentType);
router.get('/get-users', getUsers);

router.post('/create-document-type', createDocumentType);
router.post('/create-document-master', createDocumentMaster);
router.post('/assign-document', assignDocument);

module.exports = router;
