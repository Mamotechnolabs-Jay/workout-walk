const express = require('express');
const router = express.Router();
const ChallengeController = require('../controllers/challengeController');
const { authmiddleware } = require('../middlewares/authMiddleware');

// Get all challenges with user enrollment status
router.get('/', authmiddleware, ChallengeController.getAllUserChallenges);

// Get user's achievements
router.get('/user/achievements', authmiddleware, ChallengeController.getUserAchievements);

// Get user's enrollment progress for all challenges
router.get('/user/enrollments/progress', authmiddleware, ChallengeController.getUserEnrollmentsProgress);

// Get specific challenge details
router.get('/:challengeId', authmiddleware, ChallengeController.getChallengeDetails);

// Get challenge daily progress data
router.get('/:challengeId/progress', authmiddleware, ChallengeController.getChallengeProgress);

// Enroll in a challenge
router.post('/:challengeId/enroll', authmiddleware, ChallengeController.enrollInChallenge);

// Claim challenge reward
router.post('/achievements/:achievementId/claim', authmiddleware, ChallengeController.claimChallengeReward);

module.exports = router;