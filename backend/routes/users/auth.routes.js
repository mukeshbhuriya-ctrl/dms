const express = require('express');
const { login, me } = require('#api/users/auth.js');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

const router = express.Router();

// Public routes
router.post('/login', login);
router.get('/me', authenticateUserOnly, me);



module.exports = router;
