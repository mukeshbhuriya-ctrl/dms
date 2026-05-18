const express = require('express');
const { createCustomer, createCustomerLocation, createPo, createJob, getCustomers, getCustomerLocations, getPos, getJobs, updateCustomer, updateCustomerLocation, updatePo, updateJob, updatePoCommunicationMatrix, getPoAttachments, getPoFilters, deleteCustomer, deleteCustomerLocation, deletePo, deleteJob } = require('#api/dcc/customer.js');
const { getDocumentType, createDocumentType, getDocumentMaster, createDocumentMaster } = require('#api/dcc/document.js');
const { getUsers } = require('#api/users/user.js');

const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const { upload } = require('#utils/upload');
const documentController = require('../../controllers/document.controller');

const router = express.Router();

const DccController = require('../../controllers/dcc.controller');

// Routes accessible to all authenticated users
router.get('/get-assigned-documents', authenticateUserOnly, DccController.getAllAssignedDocuments);
router.get('/upload-documents', authenticateUserOnly, DccController.getMyAssignedDocuments);
router.get('/user-dashboard-stats', authenticateUserOnly, DccController.getUserDashboardStats);
router.post('/upload-document-version', authenticateUserOnly, upload.single('file'), DccController.uploadDocumentVersion);
router.get('/document-trail/:id', authenticateUserOnly, DccController.getDocumentTrail);
router.get('/transmission-trail/:id', authenticateUserOnly, DccController.getTransmissionTrail);
router.get('/document-preview/:versionId', authenticateUserOnly, DccController.previewDocument);
router.get('/document-preview/:versionId/:filename', authenticateUserOnly, DccController.previewDocument);
router.get('/document/feedback', authenticateUserOnly, DccController.downloadFeedbackFile);
router.get('/get-active-filters', authenticateUserOnly, DccController.getActiveFilters);



// Apply authentication middleware to all routes in this router
router.use(authenticateUserOnly);

router.get('/get-active-filters', DccController.getActiveFilters);
router.get('/get-transmission-filters', DccController.getTransmissionFilters);
router.get('/get-customers', DccController.getCustomers);
router.get('/get-customer-filters', DccController.getCustomerFilters);
router.post('/create-customer', createCustomer);
router.put('/update-customer/:id', updateCustomer);
router.delete('/delete-customer/:id', authenticateUser(['ADMIN']), deleteCustomer);
router.patch('/customers/toggle-status/:id', authenticateUser(['ADMIN']), DccController.toggleCustomerStatus);

router.get('/get-customer-locations', DccController.getCustomerLocations);
router.get('/get-location-filters', DccController.getLocationFilters);
router.post('/create-customer-location', createCustomerLocation);
router.put('/update-customer-location/:id', updateCustomerLocation);
router.delete('/delete-customer-location/:id', authenticateUser(['ADMIN']), deleteCustomerLocation);
router.patch('/locations/toggle-status/:id', authenticateUser(['ADMIN']), DccController.toggleLocationStatus);

router.get('/get-pos', DccController.getPos);
router.get('/get-po-filters', DccController.getPoFilters);
router.post('/create-po', upload.single('po_document'), createPo);
router.put('/update-po/:id', upload.single('po_document'), updatePo);
router.delete('/delete-po/:id', authenticateUser(['ADMIN']), deletePo);
router.patch('/pos/toggle-status/:id', authenticateUser(['ADMIN']), DccController.togglePoStatus);
router.put('/update-po-communication-matrix/:id', updatePoCommunicationMatrix);
router.get('/get-po-attachments/:po_id', getPoAttachments);

// Document Versioning and Secure Access
router.get('/document/:documentId/download', authenticateUserOnly, documentController.downloadDocument);
router.get('/document/:documentId/versions', authenticateUserOnly, documentController.getVersionList);
router.get('/document/:documentId/versions/:versionNumber', authenticateUserOnly, documentController.getSpecificVersion);

router.get('/get-jobs', DccController.getJobs);
router.get('/get-manage-job-filters', DccController.getManageJobFilters);
router.post('/create-job', createJob);
router.put('/update-job/:id', updateJob);
router.delete('/delete-job/:id', authenticateUser(['ADMIN']), deleteJob);
router.patch('/jobs/toggle-status/:id', authenticateUser(['ADMIN']), DccController.toggleJobStatus);

router.get('/document', DccController.getDocuments);
router.post('/create-document-master', createDocumentMaster);
router.put('/update-document-master/:id', DccController.updateDocumentMaster);

router.get('/document-type', getDocumentType);
router.get('/get-users', getUsers);
router.post('/create-document-type', createDocumentType);
router.post('/assign-document', DccController.assignDocument);
router.post('/bulk-assign-documents', DccController.bulkAssignDocuments);


// Document Workflow
router.get('/documents-approval', DccController.getDocumentsForApproval);
router.get('/documents-transmission', DccController.getApprovedDocumentsForTransmission);
router.post('/review-document', DccController.reviewDocument);
router.get('/get-transmissions', DccController.getTransmissions);
router.get('/get-transmission-documents', DccController.getTransmissionDocuments);
router.post('/create-transmission', DccController.createTransmission);
router.post('/send-transmission-email', DccController.sendTransmissionEmail);
router.get('/download-transmittal-pdf/:id', DccController.downloadTransmittalPDF);
router.get('/preview-transmittal-pdf/:id', DccController.previewTransmittalPDF);

// Email Templates
router.get('/email-templates', DccController.getEmailTemplates);
router.post('/email-templates', DccController.createEmailTemplate);
router.put('/email-templates/:id', DccController.updateEmailTemplate);
router.delete('/email-templates/:id', DccController.deleteEmailTemplate);
// Client Approval Status
router.post('/transmission/client-status', upload.array('client_files', 20), DccController.updateTransmissionClientStatus);
router.post('/transmission/document/client-status', upload.single('client_file'), DccController.updateTransmissionDocumentClientStatus);
router.get('/transmission/:id/download-feedback', DccController.downloadTransmissionFeedback);

router.post('/document/:documentId/rollback', documentController.rollbackVersion);
router.put('/update-assigned-document/:id', authenticateUser(['DCC', 'ADMIN']), DccController.updateAssignedDocument);
router.delete('/delete-assigned-document/:id', authenticateUser(['ADMIN']), DccController.deleteAssignedDocument);
router.patch('/assigned-documents/toggle-status/:id', authenticateUser(['ADMIN']), DccController.toggleAssignedDocumentStatus);

module.exports = router;
