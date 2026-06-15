const express = require("express");
const router = express.Router();
const instrumentController = require("../../controllers/instrument.controller");
const { authenticateUserOnly } = require('#api/middleware/user.middleware.js');

router.use(authenticateUserOnly);

router.get("/", instrumentController.getInstruments);
router.post("/bulk", instrumentController.bulkUploadInstruments);

module.exports = router;
