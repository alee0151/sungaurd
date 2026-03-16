const express      = require('express');
const router       = express.Router();
const userCtrl     = require('../controllers/userController');
const requireAuth  = require('../middleware/auth');

// Public
router.post('/signup', userCtrl.signup);
router.post('/login',  userCtrl.login);

// Protected
router.get('/me',   requireAuth, userCtrl.getMe);
router.patch('/me', requireAuth, userCtrl.updateMe);

module.exports = router;
