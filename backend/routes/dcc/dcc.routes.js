const express = require('express');
const { createCustomer, createCustomerLocation, createPo, createJob, getCustomers, getCustomerLocations, getPos, getJobs, updateCustomer, updateCustomerLocation, updatePo, updateJob } = require('#api/dcc/customer.js');
const { getDocumentType, createDocumentType, getDocumentMaster, createDocumentMaster } = require('#api/dcc/document.js');
const { getUsers } = require('#api/users/user.js');

const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const documentUpload = require('#utils/document-upload');

const router = express.Router();

const DccController = require('../../controllers/dcc.controller');

// Routes accessible to all authenticated users
router.get('/get-assigned-documents', authenticateUserOnly, DccController.getAllAssignedDocuments);
router.get('/upload-documents', authenticateUserOnly, DccController.getMyAssignedDocuments);
router.post('/upload-document-version', authenticateUserOnly, documentUpload.single('file'), DccController.uploadDocumentVersion);


// Apply authentication middleware to all routes in this router
router.use(authenticateUser(['DCC', 'ADMIN']));

router.get('/get-customers', DccController.getCustomers);
router.post('/create-customer', createCustomer);
router.put('/update-customer/:id', updateCustomer);

router.get('/get-customer-locations', DccController.getCustomerLocations);
router.post('/create-customer-location', createCustomerLocation);
router.put('/update-customer-location/:id', updateCustomerLocation);

router.get('/get-pos', DccController.getPos);
router.post('/create-po', documentUpload.single('po_document'), createPo);
router.put('/update-po/:id', documentUpload.single('po_document'), updatePo);

router.get('/get-jobs', DccController.getJobs);
router.post('/create-job', createJob);
router.put('/update-job/:id', updateJob);

router.get('/document', DccController.getDocuments);
router.post('/create-document-master', createDocumentMaster);
router.put('/update-document-master/:id', DccController.updateDocumentMaster);

router.get('/document-type', getDocumentType);
router.get('/get-users', getUsers);
router.post('/create-document-type', createDocumentType);
router.post('/assign-document', DccController.assignDocument);


// Document Workflow
router.get('/documents-approval', DccController.getDocumentsForApproval);
router.post('/review-document', DccController.reviewDocument);
router.get('/get-transmissions', DccController.getTransmissions);
router.get('/get-transmission-documents', DccController.getTransmissionDocuments);
router.post('/create-transmission', DccController.createTransmission);
router.post('/send-transmission-email', DccController.sendTransmissionEmail);
// Client Approval Status
router.post('/transmission/client-status', DccController.updateTransmissionClientStatus);

module.exports = router;
