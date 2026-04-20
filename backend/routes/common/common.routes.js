const express = require('express');
const router = express.Router();
const CommonController = require('../../controllers/common.controller');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

router.get('/customers', authenticateUserOnly, CommonController.getCustomers);
router.get('/locations', authenticateUserOnly, CommonController.getLocations);
router.get('/pos', authenticateUserOnly, CommonController.getPos);
router.get('/jobs/by-number/:number', authenticateUserOnly, CommonController.getJobByNumber);
router.get('/jobs', authenticateUserOnly, CommonController.getJobs);
router.get('/jobs/:id', authenticateUserOnly, CommonController.getJobDetails);
router.get('/qc-engineers', authenticateUserOnly, CommonController.getQcEngineers);

module.exports = router;
