const FreeWalkSession = require('../models/free-walk-session.model');
const { v4: uuidv4 } = require('uuid');

class FreeWalkService {
  /**
   * Create a new free walk session
   */
  async createSession(userId, sessionData) {
    try {
      const sessionId = uuidv4();
      
      // Base session data
      const sessionBase = {
        userId,
        sessionId,
        startTime: new Date(),
        activityType: sessionData.activityType || 'walking',
        goalType: sessionData.goalType || 'steps',
        locationTracking: {
          enabled: sessionData.enableLocationTracking || false,
          permissionGranted: sessionData.locationPermissionGranted || false
        }
      };
      
      // Initialize targets object with string values
      const targets = {};
      
      if (sessionData.targetSteps !== undefined) {
        targets.steps = String(sessionData.targetSteps);
      }
      
      if (sessionData.targetTime !== undefined) {
        targets.time = String(sessionData.targetTime);
      }
      
      if (sessionData.targetDistance !== undefined) {
        targets.distance = String(sessionData.targetDistance);
      }
      
      if (sessionData.targetCalories !== undefined) {
        targets.calories = String(sessionData.targetCalories);
      }
      
      // Record starting location if provided
      if (sessionData.location && 
          sessionData.location.latitude !== undefined && 
          sessionData.location.longitude !== undefined) {
        sessionBase.locationTracking.startLocation = {
          latitude: String(sessionData.location.latitude),
          longitude: String(sessionData.location.longitude),
          timestamp: new Date()
        };
        
        // Add first point to route as well
        sessionBase.locationTracking.route = [{
          latitude: String(sessionData.location.latitude),
          longitude: String(sessionData.location.longitude),
          timestamp: new Date()
        }];
      }
      
      const newSession = new FreeWalkSession({
        ...sessionBase,
        targets
      });
      
      await newSession.save();
      return newSession;
    } catch (error) {
      throw new Error(`Error creating free walk session: ${error.message}`);
    }
  }
  
  /**
   * Update a session with real-time data
   */
  async updateSessionProgress(sessionId, progressData) {
    try {
      const session = await FreeWalkSession.findOne({ sessionId });
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Add real-time data point
      const dataPoint = {
        timestamp: new Date()
      };
      
      // Only add the metrics that were actually provided, all as strings
      if (progressData.steps !== undefined) dataPoint.steps = String(progressData.steps);
      if (progressData.distance !== undefined) dataPoint.distance = String(progressData.distance);
      if (progressData.calories !== undefined) dataPoint.calories = String(progressData.calories);
      if (progressData.speed !== undefined) dataPoint.speed = String(progressData.speed);
      
      // Only add the data point if it has at least one metric
      if (Object.keys(dataPoint).length > 1) { // > 1 because timestamp is always there
        session.realTimeData.push(dataPoint);
      }
      
      // Update actual metrics as strings
      if (progressData.steps !== undefined) session.actual.steps = String(progressData.steps);
      if (progressData.distance !== undefined) session.actual.distance = String(progressData.distance);
      if (progressData.calories !== undefined) session.actual.calories = String(progressData.calories);
      
      // Create activityMetrics object if it doesn't exist
      if (!session.activityMetrics) {
        session.activityMetrics = {};
      }
      
      // Update activity-specific metrics as strings
      if (progressData.averageSpeed !== undefined) session.activityMetrics.averageSpeed = String(progressData.averageSpeed);
      if (progressData.maxSpeed !== undefined) session.activityMetrics.maxSpeed = String(progressData.maxSpeed);
      if (progressData.elevationGain !== undefined) session.activityMetrics.elevationGain = String(progressData.elevationGain);
      if (progressData.cadence !== undefined) session.activityMetrics.cadence = String(progressData.cadence);
      if (progressData.heartRate !== undefined) session.activityMetrics.heartRate = String(progressData.heartRate);
      
      // Add location data if provided
      if (progressData.location && 
          progressData.location.latitude !== undefined && 
          progressData.location.longitude !== undefined) {
        session.locationTracking.route.push({
          latitude: String(progressData.location.latitude),
          longitude: String(progressData.location.longitude),
          timestamp: new Date()
        });
      }
      
      await session.save();
      return session;
    } catch (error) {
      throw new Error(`Error updating session progress: ${error.message}`);
    }
  }
  
  /**
   * Complete a free walk session
   */
  async completeSession(sessionId, finalData) {
    try {
      const session = await FreeWalkSession.findOne({ sessionId });
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Update final metrics as strings
      if (finalData.steps !== undefined) session.actual.steps = String(finalData.steps);
      if (finalData.distance !== undefined) session.actual.distance = String(finalData.distance);
      if (finalData.calories !== undefined) session.actual.calories = String(finalData.calories);
      
      // Create activityMetrics object if it doesn't exist
      if (!session.activityMetrics) {
        session.activityMetrics = {};
      }
      
      // Update activity-specific metrics if provided (as strings)
      if (finalData.averageSpeed !== undefined) session.activityMetrics.averageSpeed = String(finalData.averageSpeed);
      if (finalData.maxSpeed !== undefined) session.activityMetrics.maxSpeed = String(finalData.maxSpeed);
      if (finalData.elevationGain !== undefined) session.activityMetrics.elevationGain = String(finalData.elevationGain);
      
      // Calculate duration
      const endTime = new Date();
      session.endTime = endTime;
      session.status = 'completed';
      session.completedAt = endTime;
      
      // Duration in minutes (keep as number for internal calculations)
      const durationMs = endTime - session.startTime;
      session.duration = Math.round(durationMs / (1000 * 60));
      session.actual.duration = String(session.duration);
      
      // Store end location if provided
      if (finalData.location && 
          finalData.location.latitude !== undefined && 
          finalData.location.longitude !== undefined) {
        session.locationTracking.endLocation = {
          latitude: String(finalData.location.latitude),
          longitude: String(finalData.location.longitude),
          timestamp: endTime
        };
        
        // Also add to route
        session.locationTracking.route.push({
          latitude: String(finalData.location.latitude),
          longitude: String(finalData.location.longitude),
          timestamp: endTime
        });
      }
      // If no end location explicitly provided but we have route points
      else if (session.locationTracking.route && session.locationTracking.route.length > 0) {
        const lastPoint = session.locationTracking.route[session.locationTracking.route.length - 1];
        session.locationTracking.endLocation = {
          latitude: lastPoint.latitude,
          longitude: lastPoint.longitude,
          timestamp: endTime
        };
      }
      
      await session.save();
      return session;
    } catch (error) {
      throw new Error(`Error completing session: ${error.message}`);
    }
  }
  
  /**
   * Pause a session
   */
  async pauseSession(sessionId) {
    try {
      const session = await FreeWalkSession.findOneAndUpdate(
        { sessionId },
        { status: 'paused' },
        { new: true }
      );
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      return session;
    } catch (error) {
      throw new Error(`Error pausing session: ${error.message}`);
    }
  }
  
  /**
   * Resume a paused session
   */
  async resumeSession(sessionId) {
    try {
      const session = await FreeWalkSession.findOneAndUpdate(
        { sessionId },
        { status: 'active' },
        { new: true }
      );
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      return session;
    } catch (error) {
      throw new Error(`Error resuming session: ${error.message}`);
    }
  }
  
  /**
   * Cancel a session
   */
  async cancelSession(sessionId) {
    try {
      const session = await FreeWalkSession.findOneAndUpdate(
        { sessionId },
        { 
          status: 'cancelled',
          endTime: new Date(),
          completedAt: new Date()
        },
        { new: true }
      );
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      return session;
    } catch (error) {
      throw new Error(`Error cancelling session: ${error.message}`);
    }
  }
  
  /**
   * Get a specific session
   */
  async getSession(sessionId) {
    try {
      const session = await FreeWalkSession.findOne({ sessionId });
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      return session;
    } catch (error) {
      throw new Error(`Error retrieving session: ${error.message}`);
    }
  }
  
  /**
   * Get user's free walk history, optionally filtered by activity type
   */
  async getUserFreeWalkHistory(userId, options = {}) {
    try {
      const { activityType, limit = 10, page = 1 } = options;
      const skip = (page - 1) * limit;
      
      // Build query
      const query = { userId };
      if (activityType) {
        query.activityType = activityType;
      }
      
      const sessions = await FreeWalkSession.find(query)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await FreeWalkSession.countDocuments(query);
      
      return {
        sessions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error retrieving free walk history: ${error.message}`);
    }
  }
  
  /**
   * Get user's free walk statistics, optionally filtered by activity type
   */
  async getUserStats(userId, activityType = null) {
    try {
      // Build query for completed sessions
      const query = {
        userId,
        status: 'completed'
      };
      
      if (activityType) {
        query.activityType = activityType;
      }
      
      const completedSessions = await FreeWalkSession.find(query);
      
      // Calculate stats
      const totalSessions = completedSessions.length;
      
      if (totalSessions === 0) {
        return {
          totalSessions: "0",
          totalSteps: "0",
          totalDistance: "0",
          totalCalories: "0",
          totalDuration: "0",
          averageStepsPerSession: "0",
          averageDistancePerSession: "0",
          averageDurationPerSession: "0",
          activityType: activityType || 'all'
        };
      }
      
      // Convert from strings to numbers for calculations, then back to strings for response
      let totalSteps = 0;
      let totalDistance = 0;
      let totalCalories = 0;
      let totalDuration = 0;
      
      completedSessions.forEach(session => {
        totalSteps += parseInt(session.actual.steps || "0");
        totalDistance += parseFloat(session.actual.distance || "0");
        totalCalories += parseInt(session.actual.calories || "0");
        totalDuration += parseInt(session.actual.duration || "0");
      });
      
      return {
        totalSessions: String(totalSessions),
        totalSteps: String(totalSteps),
        totalDistance: String(totalDistance.toFixed(1)),
        totalCalories: String(totalCalories),
        totalDuration: String(totalDuration),
        averageStepsPerSession: String(Math.round(totalSteps / totalSessions)),
        averageDistancePerSession: String((totalDistance / totalSessions).toFixed(1)),
        averageDurationPerSession: String(Math.round(totalDuration / totalSessions)),
        activityType: activityType || 'all'
      };
    } catch (error) {
      throw new Error(`Error retrieving user stats: ${error.message}`);
    }
  }
}

module.exports = new FreeWalkService();