const express = require('express');
const router = express.Router();
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const { upload } = require('../../utils/upload');

// Controllers
const machineController = require('../../controllers/machine.controller');
const maintenanceMemoController = require('../../controllers/maintenance_memo.controller');
const pmScheduleController = require('../../controllers/preventive_maintenance.controller');

// All routes require authentication
router.use(authenticateUserOnly);


// ==========================================
// 1. MACHINE MASTER ROUTES
// ==========================================
router.get('/machines', machineController.getMachines);
router.post('/machines/bulk', machineController.bulkCreateMachines);
router.put('/machines/:id', machineController.updateMachine);
router.delete('/machines/:id', machineController.deleteMachine);
// router.post('/machines/import', upload.single('file'), machineController.importMachines);
// router.get('/machines/template', machineController.downloadMachineTemplate);

// ==========================================
// 2. PREVENTIVE MAINTENANCE ROUTES
// ==========================================
router.get('/pm-plans', pmScheduleController.getPlans);
router.get('/pm-plans/:id', pmScheduleController.getPlanById);
router.post('/pm-plans', pmScheduleController.savePlan);
router.post('/pm-plans/clone', pmScheduleController.clonePlan);
router.delete('/pm-plans/:id', pmScheduleController.archivePlan);
router.patch('/pm-plans/toggle-status/:id', pmScheduleController.togglePlanStatus);
router.patch('/pm-plans/:id/approve', pmScheduleController.approvePlan);
router.patch('/pm-plans/:id/reject', pmScheduleController.rejectPlan);



// ==========================================
// 2. MAINTENANCE MEMO ROUTES
// ==========================================
router.get('/memos/list', maintenanceMemoController.listMemos);
router.post('/memos/initiate', upload.array('files'), maintenanceMemoController.initiateMemo);
router.put('/memos/update/:id', upload.array('files'), maintenanceMemoController.updateMemo);
router.put('/memos/resolve/:id', maintenanceMemoController.resolveMemo);
router.put('/memos/verify/:id', maintenanceMemoController.verifyMemo);
router.get('/memos/:id', maintenanceMemoController.getMemoById);


// ==========================================
// 3. PREVENTIVE MAINTENANCE ROUTES (Future)
// ==========================================
// router.get('/preventive', pmScheduleController.getSchedules);
// router.post('/preventive', pmScheduleController.createSchedule);

// ==========================================
// 4. ATTACHMENTS & FILES
// ==========================================
router.get('/files/:filename', maintenanceMemoController.downloadAttachment);


module.exports = router;
