const express = require('express');
const { createCompany } = require('#api/siteadmin/company.js');
const { authenticateSiteAdmin } = require('#api/middleware/siteadmin.middleware.js');
const { upload } = require('#utils/upload');

const router = express.Router();

// Protected routes (require site admin authentication)
// 'logo' is the field name expected from frontend FormData
router.post('/create-company', authenticateSiteAdmin, upload.single('logo'), createCompany);


module.exports = router;
