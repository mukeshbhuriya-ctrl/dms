const express = require('express');
const { getjobInfo } = require('#api/wpj/weld-joint.js');
const { authenticateUser } = require('#api/middleware/user.middleware.js');

const router = express.Router();

// Apply authentication middleware to all routes in this router
// Allowing ADMIN and WELD_PLAN_ADMIN (if it exists)
router.use(authenticateUser(['ADMIN', 'WELD_PLAN_ADMIN']));

router.get('/get-job-info', getjobInfo);

module.exports = router;
