const express = require('express');
const router = express.Router();

const { authenticateUser } = require('#api/middleware/user.middleware.js');
const NcrController = require('../../controllers/ncr.controller');

router.use(authenticateUser(['ADMIN', 'PRODUCTION_ENGINEER', 'QC_ENGINEER']));

// List & detail
router.get('/list', (req, res) => NcrController.list(req, res));
router.get('/users', (req, res) => NcrController.getUsers(req, res));
router.get('/next-ncr-no/:job_id', (req, res) => NcrController.getNextNcrNo(req, res));
router.get('/:id', (req, res) => NcrController.getById(req, res));

// Stage submissions
router.post('/create', (req, res) => NcrController.create(req, res));
router.put('/:id/stage2', (req, res) => NcrController.updateStage2(req, res));
router.put('/:id/stage3/init', (req, res) => NcrController.updateStage3Init(req, res));
router.put('/:id/stage3/review', (req, res) => NcrController.submitReview(req, res));
router.put('/:id/stage4', (req, res) => NcrController.updateStage4(req, res));
router.put('/:id/stage5', (req, res) => NcrController.updateStage5(req, res));

module.exports = router;
