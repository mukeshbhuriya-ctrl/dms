const express = require('express');
const router = express.Router();

const { authenticateUser } = require('#api/middleware/user.middleware.js');
const { upload } = require('#utils/upload');
const NcrController = require('../../controllers/ncr.controller');

router.use(authenticateUser(['ADMIN', 'PRODUCTION_ENGINEER', 'QC_ENGINEER', 'DESIGN_ENGINEER', 'WELD_PLAN_ADMIN']));

// List & detail
router.get('/list', (req, res) => NcrController.list(req, res));
router.get('/active-filters', (req, res) => NcrController.getActiveFilters(req, res));
router.get('/users', (req, res) => NcrController.getUsers(req, res));
router.get('/next-ncr-no/:job_id', (req, res) => NcrController.getNextNcrNo(req, res));
router.get('/:id/download', (req, res) => NcrController.downloadPdf(req, res));
router.get('/:id', (req, res) => NcrController.getById(req, res));

// Stage submissions
router.post('/create', upload.array('attachments', 10), (req, res) => NcrController.create(req, res));
router.put('/:id/stage2', (req, res) => NcrController.updateStage2(req, res));
router.put('/:id/stage3/init', (req, res) => NcrController.updateStage3Init(req, res));
router.put('/:id/stage3/review', (req, res) => NcrController.submitReview(req, res));
router.put('/:id/stage4', (req, res) => NcrController.updateStage4(req, res));
router.put('/:id/stage5', (req, res) => NcrController.updateStage5(req, res));

// Admin only actions
router.patch('/toggle-status/:id', authenticateUser(['ADMIN']), (req, res) => NcrController.toggleStatus(req, res));
router.delete('/:id', authenticateUser(['ADMIN']), (req, res) => NcrController.archive(req, res));

module.exports = router;
