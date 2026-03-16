const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const controller = require('../controllers/logsController');

// All routes require a valid JWT
router.use(auth);

router.get('/',        controller.getLogs);   // GET  /logs
router.post('/',       controller.addLog);    // POST /logs
router.delete('/',     controller.clearLogs); // DELETE /logs
router.get('/streak',  controller.getStreak); // GET  /logs/streak

module.exports = router;
