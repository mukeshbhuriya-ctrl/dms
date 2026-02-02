const express = require('express');
const { getjobInfo, createWeldJointPlan, getWeldJointPlans } = require('#api/wpj/weld-joint.js');
const { authenticateUser } = require('#api/middleware/user.middleware.js');

const router = express.Router();

// Apply authentication middleware to all routes in this router
// Allowing ADMIN and WELD_PLAN_ADMIN (if it exists)
router.use(authenticateUser(['ADMIN', 'WELD_PLAN_ADMIN']));

router.get('/get-job-info', getjobInfo);
router.post('/create-weld-joint-plan', createWeldJointPlan);
router.get('/get-weld-joint-plans', getWeldJointPlans);

module.exports = router;
