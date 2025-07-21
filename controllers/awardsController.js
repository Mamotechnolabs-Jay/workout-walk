const awardsService = require('../services/awardsService');

class AwardsController {
  /**
   * Get all streak awards for the user
   * @route GET /api/awards/streaks
   */
  async getAllStreakAwards(req, res) {
    try {
      const userId = req.user.id;
      const result = await awardsService.getAllStreakAwards(userId);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error getting streak awards:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve streak awards',
        error: error.message
      });
    }
  }
  
  /**
   * Get general streak awards
   * @route GET /api/awards/streaks/general
   */
  async getGeneralStreaks(req, res) {
    try {
      const userId = req.user.id;
      const result = await awardsService.getStreakByType(userId, 'general');
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error getting general streak awards:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve general streak awards',
        error: error.message
      });
    }
  }
  
  /**
   * Get challenge streak awards
   * @route GET /api/awards/streaks/challenge
   */
  async getChallengeStreaks(req, res) {
    try {
      const userId = req.user.id;
      const result = await awardsService.getStreakByType(userId, 'challenge');
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error getting challenge streak awards:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve challenge streak awards',
        error: error.message
      });
    }
  }
  
  /**
   * Get step streak awards
   * @route GET /api/awards/streaks/step
   */
  async getStepStreaks(req, res) {
    try {
      const userId = req.user.id;
      const result = await awardsService.getStreakByType(userId, 'step');
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error getting step streak awards:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve step streak awards',
        error: error.message
      });
    }
  }
  
  /**
   * Get workout streak awards
   * @route GET /api/awards/streaks/workout
   */
  async getWorkoutStreaks(req, res) {
    try {
      const userId = req.user.id;
      const result = await awardsService.getStreakByType(userId, 'workout');
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error getting workout streak awards:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve workout streak awards',
        error: error.message
      });
    }
  }
}

module.exports = new AwardsController();