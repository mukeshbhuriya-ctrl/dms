const express = require('express');
const { login, me, logout } = require('#api/users/auth.js');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

const router = express.Router();

// Public routes
router.post('/login', login);
router.get('/me', authenticateUserOnly, me);
router.post('/logout', logout);

module.exports = router;
