const express = require('express');
const router  = express.Router();

const { getRecommendation, getDailyHistory } = require('../controllers/uvController');

router.get('/recommendation',  getRecommendation);
router.get('/daily-history',   getDailyHistory);

module.exports = router;
