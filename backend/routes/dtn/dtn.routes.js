const express = require('express');
const router = express.Router();
const DtnController = require('../../controllers/dtn.controller');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js'); 

// Apply authentication to all DTN routes
router.use(authenticateUserOnly);

/**
 * @route GET /api/dtn/documents-by-jobs
 * @desc Get documents related to a set of job IDs
 * @access Private
 */
router.get('/documents-by-jobs', DtnController.getDocumentsByJobs);

module.exports = router;
