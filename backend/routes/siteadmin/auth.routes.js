const express = require('express');
const { login , me } = require('#api/siteadmin/auth.js');
const { authenticateSiteAdmin } = require('#api/middleware/siteadmin.middleware.js');

const router = express.Router();

// Public routes
router.post('/login', login);
router.get('/me', authenticateSiteAdmin, me);


module.exports = router;
