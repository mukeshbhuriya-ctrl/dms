const express = require('express');
const { getjobInfo, createWeldJointPlan, updateWeldJointPlan, getWeldJointPlanDetails, getAssignedWeldJoints, updateStageStatus, reviewStageStatus, bulkCreateWeldJointPlan } = require('#api/wpj/weld-joint.js');
const { getWeldJoints, getWeldJointPlans, generateStageReport, getWeldJointActiveFilters, getCumulativeData, getReportNo, getJointTrail } = require('../../controllers/weldJoint.controller.js');
const { authenticateUser } = require('#api/middleware/user.middleware.js');

const router = express.Router();

// Apply authentication middleware to all routes in this router
// Allowing ADMIN and WELD_PLAN_ADMIN (if it exists)
router.use(authenticateUser(['ADMIN', 'WELD_PLAN_ADMIN', 'PRODUCTION_ENGINEER', 'QC_ENGINEER', 'NDT_ENGINEER']));

router.get('/get-job-info', getjobInfo);
router.post('/create-weld-joint-plan', createWeldJointPlan);
router.post('/bulk-create', bulkCreateWeldJointPlan);
router.put('/update-weld-joint-plan/:id', updateWeldJointPlan);
router.get('/get-weld-joint-plans', getWeldJointPlans);
router.get('/get-weld-joint-plan/:id', getWeldJointPlanDetails);

router.get('/get-all-weld-joints', getWeldJoints);
router.get('/active-filters', getWeldJointActiveFilters);
router.get('/get-assigned-weld-joints', getAssignedWeldJoints);
router.post('/update-stage-status', updateStageStatus);
router.post('/review-stage', reviewStageStatus);
router.get('/cumulative-data/:jointId', getCumulativeData);
router.get('/report-no/:jointId', getReportNo);
router.get('/joint-trail/:jointId', getJointTrail);
router.get('/generate-report/:jointId/:stage', generateStageReport);

module.exports = router;
