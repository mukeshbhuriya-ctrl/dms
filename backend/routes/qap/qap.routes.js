const express = require("express");
const router = express.Router();
const { authenticateUser } = require('#api/middleware/user.middleware.js');
const QapController = require("../../controllers/qap/qap.controller");

router.use(authenticateUser(['DCC', 'ADMIN']));

// Get paginated list of QAPs
router.get("/list", QapController.getAll);

// Get single QAP by ID
router.get("/:id", QapController.getById);

// Get next document number for a job
router.get("/next-document-no/:jobId", QapController.getNextDocumentNo);

// Create a new QAP
router.post("/create", QapController.create);

// Update an existing QAP
router.put("/update/:id", QapController.update);

module.exports = router;
