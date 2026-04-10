const express = require('express');
const { authenticateUser } = require('#api/middleware/user.middleware.js');
const DcrController = require('../../controllers/dcr.controller');


const router = express.Router();


// Apply authentication middleware to all routes in this router
router.use(authenticateUser(['ADMIN', 'DCR', 'QC_ENGINEER', 'DESIGN_ENGINEER']));

router.get('/get-dcr', DcrController.getDcr);
router.get('/get-dcr-by-id/:id', DcrController.getDcrById);
router.post('/create-dcr', DcrController.createDcr);
router.get('/get-jobs', DcrController.getDcrNumber);
router.get('/get-assigned-drawings/:jobId', DcrController.getAssignedDrawings);
router.get('/download-pdf/:id', DcrController.downloadPdf);


module.exports = router;