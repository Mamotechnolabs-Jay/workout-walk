const streakService = require('../services/streakService');

class StreakController {
  /**
   * Get user's activity streaks and calendar data
   * @route GET /api/streaks
   */
  async getStreaks(req, res) {
    try {
      const userId = req.user.id;
      const month = req.query.month; // Optional parameter format: YYYY-MM
      
      const result = await streakService.getStreaks(userId, month);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error getting streaks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve streak data',
        error: error.message
      });
    }
  }
  
  /**
   * Get user's streak awards/achievements
   * @route GET /api/streaks/awards
   */
  async getStreakAwards(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await streakService.getStreakAwards(userId);
      
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
}

module.exports = new StreakController();