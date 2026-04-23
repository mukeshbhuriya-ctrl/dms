const express = require('express');
const router = express.Router();
const Job360Controller = require('#controllers/job360.controller.js');
const { authenticateUser } = require('#api/middleware/user.middleware.js');

router.use(authenticateUser('ADMIN', { requireAll: false }));

router.get('/:jobId', Job360Controller.getSnapshot);

module.exports = router;
