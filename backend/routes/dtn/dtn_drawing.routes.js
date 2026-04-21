const express = require('express');
const { 
  uploadDtnDrawingRevision, 
  getDtnDrawingHistory, 
  downloadDtnDrawingRevision 
} = require('../../controllers/dtn_drawing.controller');
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');
const { upload } = require('#utils/upload');

const router = express.Router();

// Upload a physical drawing file cleanly routed to the Document Master
router.post(
  '/drawing/:document_master_id/upload',
  authenticateUserOnly,
  upload.single('file'),
  uploadDtnDrawingRevision
);

// Get exhaustive history cleanly decoupled from Document Management proper
router.get(
  '/drawing/:document_master_id/history', 
  authenticateUserOnly, 
  getDtnDrawingHistory
);

// Safely securely download the internal revision
router.get(
  '/drawing/:document_master_id/download', 
  authenticateUserOnly, 
  downloadDtnDrawingRevision
);

module.exports = router;
