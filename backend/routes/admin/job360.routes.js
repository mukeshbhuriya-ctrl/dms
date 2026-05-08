const express = require('express');
const router = express.Router();
const Job360Controller = require('#controllers/job360.controller.js');
const { authenticateUser, authenticateUserOnly } = require('#api/middleware/user.middleware.js');

router.use(authenticateUserOnly);

router.get('/:jobId', Job360Controller.getSnapshot);

module.exports = router;
