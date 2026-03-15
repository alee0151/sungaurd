const express = require("express");
const router = express.Router();

const { getReminderData } = require("../controllers/reminderController");

router.get("/", getReminderData);

module.exports = router;