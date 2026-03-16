const express = require('express');
const router  = express.Router();

const { getRecommendation, getHistoricalUV } = require('../controllers/uvController');

router.get('/recommendation', getRecommendation);
router.get('/historical',     getHistoricalUV);   // GET /uv/historical?lat=&lon=&years=

module.exports = router;
