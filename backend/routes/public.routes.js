const express = require('express');
const PublicController = require('../controllers/public.controller');

const router = express.Router();

// Public routes (No authentication middleware)
router.get('/download/:id', PublicController.downloadZip);
router.post('/verify', express.urlencoded({ extended: true }), PublicController.verifyZipPassword);

module.exports = router;
