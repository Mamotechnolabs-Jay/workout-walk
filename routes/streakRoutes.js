const express = require('express');
const router = express.Router();
const streakController = require('../controllers/streakController');
const {authmiddleware} = require('../middlewares/authMiddleware');

router.get('/',authmiddleware, streakController.getStreaks);

router.get('/awards', authmiddleware,streakController.getStreakAwards);

module.exports = router;