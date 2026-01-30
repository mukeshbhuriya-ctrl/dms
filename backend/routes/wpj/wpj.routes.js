const express = require('express');


const { authenticateUser } = require('#api/middleware/user.middleware.js');

const router = express.Router();

// Apply authentication middleware to all routes in this router
router.use(authenticateUser(['WELD_PLAN_ADMIN']));


router.get('/get-customers', getCustomers);


module.exports = router;
