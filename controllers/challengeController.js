const ChallengeService = require('../services/challengeService');

class ChallengeController {
  // Get all challenges for a user with their enrollment status (main challenges screen)
  async getAllUserChallenges(req, res) {
    try {
      const userId = req.user.id;
      const userChallenges = await ChallengeService.getAllUserChallenges(userId);
      return res.json({ success: true, data: userChallenges });
    } catch (error) {
      console.error('Error fetching user challenges:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // Get details for a specific challenge (Show More screen)
  async getChallengeDetails(req, res) {
    try {
      const { challengeId } = req.params;
      const userId = req.user.id;
      const challengeDetails = await ChallengeService.getChallengeDetails(challengeId, userId);
      return res.json({ success: true, data: challengeDetails });
    } catch (error) {
      console.error('Error fetching challenge details:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // Enroll a user in a challenge (Join button)
  async enrollInChallenge(req, res) {
    try {
      const { challengeId } = req.params;
      const userId = req.user.id;
      const enrollment = await ChallengeService.enrollUserInChallenge(userId, challengeId);
      return res.json({ success: true, data: enrollment });
    } catch (error) {
      console.error('Error enrolling in challenge:', error);
      if (error.message === 'Already enrolled in this challenge') {
        return res.status(400).json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // Get detailed progress for a specific challenge
  async getChallengeProgress(req, res) {
    try {
      const { challengeId } = req.params;
      const userId = req.user.id;
      const progress = await ChallengeService.getChallengeProgress(userId, challengeId);
      return res.json({ success: true, data: progress });
    } catch (error) {
      console.error('Error fetching challenge progress:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // Get user's achievements
  async getUserAchievements(req, res) {
    try {
      const userId = req.user.id;
      const achievements = await ChallengeService.getUserAchievements(userId);
      return res.json({ success: true, data: achievements });
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // Claim a challenge reward
  async claimChallengeReward(req, res) {
    try {
      const userId = req.user.id;
      const { achievementId } = req.params;
      const claimedAchievement = await ChallengeService.claimChallengeReward(userId, achievementId);
      return res.json({ 
        success: true, 
        data: claimedAchievement,
        message: 'Reward claimed successfully!'
      });
    } catch (error) {
      console.error('Error claiming challenge reward:', error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }
  
  // Get all enrollments and their progress details for a user
  async getUserEnrollmentsProgress(req, res) {
    try {
      const userId = req.user.id;
      const enrollmentsProgress = await ChallengeService.getUserEnrollmentsProgress(userId);
      return res.json({ success: true, data: enrollmentsProgress });
    } catch (error) {
      console.error('Error fetching user enrollments progress:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ChallengeController();