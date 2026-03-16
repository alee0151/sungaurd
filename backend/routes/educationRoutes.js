const express = require('express');
const router  = express.Router();

const { getMelanomaCases } = require('../controllers/uvController');

// GET /education/melanoma-cases
router.get('/melanoma-cases', getMelanomaCases);

module.exports = router;
