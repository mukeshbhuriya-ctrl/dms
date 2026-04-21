const express = require('express');
const router = express.Router();
const DtnController = require('../../controllers/dtn.controller');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js'); 

// Apply authentication to all DTN routes
router.use(authenticateUserOnly);

/**
 * @route GET /api/dtn/documents-by-jobs
 */
router.get('/documents-by-jobs', DtnController.getDocumentsByJobs);
router.get('/next-ref', DtnController.getNextRef);
router.get('/master/summaries', DtnController.listMasterSummaries);
router.get('/master/job/:jobId', DtnController.getJobMasterDetails);
router.get('/master/download/:jobId', DtnController.downloadMasterPdf);
router.get('/download-note/:id', DtnController.downloadDtnNotePdf);

// Incorporate isolated Drawing Management routes
const dtnDrawingRoutes = require('./dtn_drawing.routes.js');
router.use('/', dtnDrawingRoutes);


/**
 * @route POST /api/dtn
 */
router.post('/', DtnController.create);

/**
 * @route PUT /api/dtn/:id
 */
router.put('/:id', DtnController.update);

/**
 * @route GET /api/dtn
 */
router.get('/', DtnController.list);

/**
 * @route GET /api/dtn/:id
 */
router.get('/:id', DtnController.getById);

module.exports = router;
