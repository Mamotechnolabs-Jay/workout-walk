const ActivityService = require('../services/activityService');

class ActivityController {
  /**
   * Get activity statistics including summary and chart data
   * @route   GET /api/activity/statistics
   */
  async getActivityStatistics(req, res) {
    try {
      const userId = req.user._id;
      const { period = 'week' } = req.query;
      
      // Validate period parameter
      if (!['week', 'month', 'year'].includes(period.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid period parameter. Must be week, month, or year.'
        });
      }
      
      const activityStats = await ActivityService.getActivityStatistics(userId, period);
      
      res.status(200).json({
        success: true,
        data: activityStats
      });
    } catch (error) {
      console.error('Error getting activity statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve activity statistics',
        error: error.message
      });
    }
  }
}

module.exports = new ActivityController();