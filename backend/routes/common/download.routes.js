const express = require('express');
const documentController = require('../../controllers/document.controller');

const router = express.Router();

// General file download within /uploads directory
router.get('/:filename', documentController.downloadFile);

module.exports = router;
