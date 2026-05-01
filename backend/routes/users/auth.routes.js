const express = require('express');
const { login, me, logout, forgotPassword, verifyOtp, resetPassword } = require('#api/users/auth.js');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.get('/me', authenticateUserOnly, me);
router.post('/logout', logout);

module.exports = router;
