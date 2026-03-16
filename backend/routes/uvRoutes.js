const express = require('express');
const router  = express.Router();

const { getRecommendation, getDailyHistory } = require('../controllers/uvController');

router.get('/recommendation', getRecommendation);
router.get('/daily-history',  getDailyHistory);  // GET /uv/daily-history?view=monthly|yearly&years=4

module.exports = router;
