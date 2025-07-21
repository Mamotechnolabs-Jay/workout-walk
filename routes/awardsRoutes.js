const express = require('express');
const router = express.Router();
const awardsController = require('../controllers/awardsController');
const {authmiddleware} = require('../middlewares/authMiddleware');

// Get all streak awards in a single request
router.get('/streaks', authmiddleware, awardsController.getAllStreakAwards);

// Individual endpoints for each streak type
router.get('/streaks/general', authmiddleware, awardsController.getGeneralStreaks);
router.get('/streaks/challenge', authmiddleware, awardsController.getChallengeStreaks);
router.get('/streaks/step', authmiddleware, awardsController.getStepStreaks);
router.get('/streaks/workout', authmiddleware, awardsController.getWorkoutStreaks);

module.exports = router;