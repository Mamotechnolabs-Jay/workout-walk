const freeWalkService = require('../services/freewalkService');

class FreeWalkController {
  /**
   * Start a new free walk session
   */
  async startSession(req, res) {
    try {
      const userId = req.user.id;
      const sessionData = req.body;
      
      const session = await freeWalkService.createSession(userId, sessionData);
      
      res.status(201).json({
        success: true,
        data: session
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Update free walk session progress
   */
  async updateProgress(req, res) {
    try {
      const { sessionId } = req.params;
      const progressData = req.body;
      
      const session = await freeWalkService.updateSessionProgress(sessionId, progressData);
      
      res.status(200).json({
        success: true,
        data: session
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Complete a free walk session
   */
  async completeSession(req, res) {
    try {
      const { sessionId } = req.params;
      const finalData = req.body;
      
      const session = await freeWalkService.completeSession(sessionId, finalData);
      
      res.status(200).json({
        success: true,
        data: session
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Pause a free walk session
   */
  async pauseSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      const session = await freeWalkService.pauseSession(sessionId);
      
      res.status(200).json({
        success: true,
        data: session
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Resume a paused free walk session
   */
  async resumeSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      const session = await freeWalkService.resumeSession(sessionId);
      
      res.status(200).json({
        success: true,
        data: session
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Cancel a free walk session
   */
  async cancelSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      const session = await freeWalkService.cancelSession(sessionId);
      
      res.status(200).json({
        success: true,
        data: session
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get a specific free walk session
   */
  async getSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      const session = await freeWalkService.getSession(sessionId);
      
      res.status(200).json({
        success: true,
        data: session
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get user's free walk history
   */
  async getFreeWalkHistory(req, res) {
    try {
      const userId = req.user.id;
      const { activityType, limit = 10, page = 1 } = req.query;
      
      const history = await freeWalkService.getUserFreeWalkHistory(userId, {
        activityType,
        limit: parseInt(limit),
        page: parseInt(page)
      });
      
      res.status(200).json({
        success: true,
        data: history.sessions,
        pagination: history.pagination
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get user's free walk statistics
   */
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      const { activityType } = req.query;
      
      const stats = await freeWalkService.getUserStats(userId, activityType);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new FreeWalkController();