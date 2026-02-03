const express = require('express');
const { getjobInfo, createWeldJointPlan, getWeldJointPlans, getWeldJointPlanDetails, getWeldJoints } = require('#api/wpj/weld-joint.js');
const { authenticateUser } = require('#api/middleware/user.middleware.js');

const router = express.Router();

// Apply authentication middleware to all routes in this router
// Allowing ADMIN and WELD_PLAN_ADMIN (if it exists)
router.use(authenticateUser(['ADMIN', 'WELD_PLAN_ADMIN', 'WELD_PLAN_USER']));

router.get('/get-job-info', getjobInfo);
router.post('/create-weld-joint-plan', createWeldJointPlan);
router.get('/get-weld-joint-plans', getWeldJointPlans);
router.get('/get-weld-joint-plan/:id', getWeldJointPlanDetails);
router.get('/get-all-weld-joints', getWeldJoints);

module.exports = router;
