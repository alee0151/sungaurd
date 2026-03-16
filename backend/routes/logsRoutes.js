const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const controller = require('../controllers/logsController');

router.use(auth);

router.get('/',             controller.getLogs);      // GET    /logs
router.post('/',            controller.addLog);       // POST   /logs
router.delete('/',          controller.clearLogs);    // DELETE /logs
router.get('/streak',       controller.getStreak);    // GET    /logs/streak
router.patch('/close-window', controller.closeWindow); // PATCH  /logs/close-window

module.exports = router;
