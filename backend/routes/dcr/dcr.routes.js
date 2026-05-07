const express = require('express');
const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const DcrController = require('../../controllers/dcr.controller');


const router = express.Router();


// Apply authentication middleware to all routes in this router
// Public list of drawings for any authenticated user
router.get('/get-assigned-drawings/:jobId', authenticateUserOnly, DcrController.getAssignedDrawings);

// Restricted DCR operations
router.use(authenticateUser(['ADMIN', 'DCR', 'QC_ENGINEER', 'DESIGN_ENGINEER']));

router.get('/get-dcr', DcrController.getDcr);
router.get('/active-filters', DcrController.getActiveFilters);
router.get('/get-dcr-by-id/:id', DcrController.getDcrById);
router.post('/create-dcr', DcrController.createDcr);
router.get('/get-jobs', DcrController.getDcrNumber);
router.get('/download-pdf/:id', DcrController.downloadPdf);
router.delete('/:id', authenticateUser(['ADMIN']), DcrController.deleteDcr);
router.patch('/toggle-status/:id', authenticateUser(['ADMIN']), DcrController.toggleDcrStatus);


module.exports = router;