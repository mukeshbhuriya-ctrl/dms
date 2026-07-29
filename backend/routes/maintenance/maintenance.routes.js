const express = require('express');
const router = express.Router();
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const { upload } = require('../../utils/upload');

// Controllers
const machineController = require('../../controllers/machine.controller');
const maintenanceMemoController = require('../../controllers/maintenance_memo.controller');
// const pmScheduleController = require('../../controllers/maintenance_preventive.controller');

// All routes require authentication
router.use(authenticateUserOnly);


// ==========================================
// 1. MACHINE MASTER ROUTES
// ==========================================
router.get('/machines', machineController.getMachines);
router.post('/machines/bulk', machineController.bulkCreateMachines);
// router.get('/machines/template', machineController.downloadMachineTemplate);
// router.post('/machines/import', upload.single('file'), machineController.importMachines);
router.put('/machines/:id', machineController.updateMachine);
router.delete('/machines/:id', machineController.deleteMachine);


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
