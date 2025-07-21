const activityInsightService = require('../services/activityInsightService');

class ActivityInsightController {
  /**
   * Get best results insights
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBestResults(req, res) {
    try {
      const userId = req.user._id; // Assuming authentication middleware sets req.user
      const period = req.query.period || 'day'; // Get period from query params, default to day
      
      // Validate period parameter
      const allowedPeriods = ['day', 'week', 'month', 'year'];
      if (!allowedPeriods.includes(period.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid period parameter. Must be 'day', 'week', 'month', or 'year'."
        });
      }
      
      const result = await activityInsightService.getBestResults(userId, period);
      res.json(result);
    } catch (error) {
      console.error('Error in getBestResults controller:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch best results insights',
        error: error.message
      });
    }
  }

  /**
   * Get activity trends insights
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrends(req, res) {
    try {
      const userId = req.user._id; // Assuming authentication middleware sets req.user
      const period = req.query.period || 'week'; // Get period from query params, default to week
      
      // Validate period parameter
      const allowedPeriods = ['week', 'month', 'year'];
      if (!allowedPeriods.includes(period.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid period parameter. Must be 'week', 'month', or 'year'."
        });
      }
      
      const result = await activityInsightService.getTrends(userId, period);
      res.json(result);
    } catch (error) {
      console.error('Error in getTrends controller:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch activity trends',
        error: error.message
      });
    }
  }

  /**
   * Get my day insights
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMyDay(req, res) {
    try {
      const userId = req.user._id; // Assuming authentication middleware sets req.user
      const result = await activityInsightService.getMyDay(userId);
      res.json(result);
    } catch (error) {
      console.error('Error in getMyDay controller:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch my day insights',
        error: error.message
      });
    }
  }
}

module.exports = new ActivityInsightController();