const express = require('express');
const router = express.Router();
const maintenanceController = require('../../controllers/maintenance.controller');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

// All routes require authentication
router.use(authenticateUserOnly);

// Machine Master Routes
router.get('/machines', maintenanceController.getMachines);
router.post('/machines/bulk', maintenanceController.bulkCreateMachines);
router.put('/machines/:id', maintenanceController.updateMachine);
router.delete('/machines/:id', maintenanceController.deleteMachine);

module.exports = router;
