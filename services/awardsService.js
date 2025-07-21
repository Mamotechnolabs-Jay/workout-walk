const moment = require('moment');
const mongoose = require('mongoose');
const FreeWalkSession = require('../models/free-walk-session.model');
const WorkoutSession = require('../models/WorkoutSession.js');
const WorkoutProgress = require('../models/UserWorkoutProgress.js');
const DailyWorkout = require('../models/DailyWorkoutModel');
const ChallengeProgress = require('../models/challengeProgression.model.js');

class AwardsService {
  /**
   * Get all streak awards for the user
   * Each category of streaks represents different achievements
   * 
   * @param {String} userId - User ID
   * @returns {Object} All streak awards
   */
  async getAllStreakAwards(userId) {
    console.log(`Getting all streak awards for userId: ${userId}`);

    // Validate userId
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (error) {
      console.error(`Invalid userId format: ${userId}`);
      return { success: false, message: "Invalid user ID format" };
    }

    // Get all streak types
    const generalStreaks = await this._getGeneralStreaks(userObjectId);
    const challengeStreaks = await this._getChallengeStreaks(userObjectId);
    const stepStreaks = await this._getStepStreaks(userObjectId);
    const workoutStreaks = await this._getWorkoutStreaks(userObjectId);

    return {
      success: true,
      data: {
        generalStreaks,
        challengeStreaks,
        stepStreaks,
        workoutStreaks
      }
    };
  }

  /**
   * Get general activity streaks (days with any activity)
   * Supports rest days (2 per week)
   * 
   * @param {mongoose.Types.ObjectId} userObjectId - User ObjectId 
   * @returns {Object} General streaks data
   */
  async _getGeneralStreaks(userObjectId) {
    // Define streak milestones
    const streakMilestones = [
      { days: 1, name: "1-Day Streak", description: "Complete any activity for 1 day" },
      { days: 3, name: "3-Day Streak", description: "Complete any activity for 3 consecutive days" },
      { days: 7, name: "7-Day Streak", description: "Complete any activity for 7 consecutive days" },
      { days: 10, name: "10-Day Streak", description: "Complete any activity for 10 consecutive days" },
      { days: 14, name: "14-Day Streak", description: "Complete any activity for 14 consecutive days" },
      { days: 21, name: "21-Day Streak", description: "Complete any activity for 21 consecutive days" },
      { days: 28, name: "28-Day Streak", description: "Complete any activity for 28 consecutive days" }
    ];

    try {
      // Get the start date for lookback (1 year)
      const startDate = moment().subtract(1, 'year').startOf('day').toDate();
      const endDate = moment().endOf('day').toDate();

      // Find days with any activity
      const freeSessions = await FreeWalkSession.find({
        userId: userObjectId,
        startTime: { $gte: startDate, $lte: endDate }
      }).sort({ startTime: 1 });

      const workoutSessions = await WorkoutSession.find({
        userId: userObjectId,
        startTime: { $gte: startDate, $lte: endDate }
      }).sort({ startTime: 1 });

      // Track active days
      const activeDays = new Set();

      // Process free walk sessions
      for (const session of freeSessions) {
        const day = moment(session.startTime).format('YYYY-MM-DD');
        activeDays.add(day);
      }

      // Process workout sessions
      for (const session of workoutSessions) {
        const day = moment(session.startTime).format('YYYY-MM-DD');
        activeDays.add(day);
      }

      // Calculate current streak (consecutive days) with rest days
      let currentStreak = 0;
      let maxStreak = 0;
      let today = moment().startOf('day');
      let currentDate = today.clone();
      
      // Allow 2 rest days per week without breaking streak
      const maxRestDays = 2;
      const restDaysByWeek = new Map(); // Map of week number to count of rest days used
      const restDaysUsed = new Map(); // Map of date to rest day status
      
      // Check if today has activity first
      const todayStr = today.format('YYYY-MM-DD');
      const todayActive = activeDays.has(todayStr);
      
      // If today is active, we start counting from today
      if (todayActive) {
        currentStreak = 1;
        currentDate = today.clone().subtract(1, 'day');
      } else {
        // Today is not active, check if today can be a rest day if yesterday was active
        const yesterdayStr = today.clone().subtract(1, 'day').format('YYYY-MM-DD');
        const yesterdayActive = activeDays.has(yesterdayStr);
        
        if (yesterdayActive) {
          // Today could be a rest day, check if we have available rest days for this week
          const weekNum = today.week() + '-' + today.year();
          
          // Initialize rest days for this week if not already tracked
          if (!restDaysByWeek.has(weekNum)) {
            restDaysByWeek.set(weekNum, 0);
          }
          
          const restDaysUsedThisWeek = restDaysByWeek.get(weekNum);
          
          if (restDaysUsedThisWeek < maxRestDays) {
            // We can use a rest day for today
            restDaysByWeek.set(weekNum, restDaysUsedThisWeek + 1);
            restDaysUsed.set(todayStr, true);
            currentStreak = 1; // Start with today as a rest day
            
            // Start checking from yesterday since today is already counted as a rest day
            currentDate = today.clone().subtract(1, 'day');
          }
        }
      }
      
      // Check consecutive days going backward from the starting point
      while (true) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        const weekNum = currentDate.week() + '-' + currentDate.year();
        const isActive = activeDays.has(dateStr);
        
        // If this day has activity, add to streak
        if (isActive) {
          currentStreak++;+
          currentDate.subtract(1, 'day');
          continue;
        }
        
        // No activity on this day - check if we can use rest day
        // Only allow rest days once streak has started
        if (currentStreak > 0) {
          // Initialize rest days for this week if not already tracked
          if (!restDaysByWeek.has(weekNum)) {
            restDaysByWeek.set(weekNum, 0);
          }
          
          const restDaysUsedThisWeek = restDaysByWeek.get(weekNum);
          
          if (restDaysUsedThisWeek < maxRestDays) {
            // We can use a rest day
            restDaysByWeek.set(weekNum, restDaysUsedThisWeek + 1);
            restDaysUsed.set(dateStr, true);
            
            // Continue the streak
            currentStreak++;
            currentDate.subtract(1, 'day');
            continue;
          }
        }
        
        // If we reach here, streak is broken
        break;
      }

      maxStreak = Math.max(maxStreak, currentStreak);

      // Format milestone data
      const awards = streakMilestones.map(milestone => {
        const unlocked = currentStreak >= milestone.days;
        const progress = Math.min(100, Math.floor((currentStreak / milestone.days) * 100));
        
        return {
          days: milestone.days,
          name: milestone.name,
          description: milestone.description,
          unlocked: unlocked,
          progress: progress,
          locked: !unlocked
        };
      });

      return {
        currentStreak,
        maxStreak,
        awards
      };
    } catch (error) {
      console.error('Error calculating general streaks:', error);
      return {
        currentStreak: 0,
        maxStreak: 0,
        awards: []
      };
    }
  }

  /**
   * Get challenge streaks (consecutive days with completed challenges)
   * No rest days allowed for challenges - must complete every day
   * 
   * @param {mongoose.Types.ObjectId} userObjectId - User ObjectId
   * @returns {Object} Challenge streaks data
   */
  async _getChallengeStreaks(userObjectId) {
    // Define streak milestones
    const streakMilestones = [
      { days: 1, name: "1-Day Challenge Streak", description: "Complete a challenge for 1 day" },
      { days: 3, name: "3-Day Challenge Streak", description: "Complete challenges for 3 consecutive days" },
      { days: 7, name: "7-Day Challenge Streak", description: "Complete challenges for 7 consecutive days" },
      { days: 10, name: "10-Day Challenge Streak", description: "Complete challenges for 10 consecutive days" },
      { days: 14, name: "14-Day Challenge Streak", description: "Complete challenges for 14 consecutive days" },
      { days: 21, name: "21-Day Challenge Streak", description: "Complete challenges for 21 consecutive days" },
      { days: 28, name: "28-Day Challenge Streak", description: "Complete challenges for 28 consecutive days" }
    ];

    try {
      // Get the start date for lookback (1 year)
      const startDate = moment().subtract(1, 'year').startOf('day').toDate();
      const endDate = moment().endOf('day').toDate();

      // Find days with completed challenges
      const completedChallenges = await ChallengeProgress.find({
        userId: userObjectId,
        isCompleted: true,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });

      // Track days with completed challenges
      const challengeDays = new Set();
      for (const challenge of completedChallenges) {
        const day = moment(challenge.date).format('YYYY-MM-DD');
        challengeDays.add(day);
      }

      // Calculate current streak (consecutive days) - NO rest days allowed
      let currentStreak = 0;
      let maxStreak = 0;
      let today = moment().startOf('day');
      let currentDate = today.clone();
      
      // Check if today has a challenge completed
      const todayStr = today.format('YYYY-MM-DD');
      const todayActive = challengeDays.has(todayStr);
      
      // If today has a challenge, start counting from today
      if (todayActive) {
        currentStreak = 1;
        currentDate = today.clone().subtract(1, 'day');
        
        // Check consecutive days going backward from yesterday
        while (true) {
          const dateStr = currentDate.format('YYYY-MM-DD');
          if (challengeDays.has(dateStr)) {
            currentStreak++;
            currentDate.subtract(1, 'day');
          } else {
            break; // Streak broken, no rest days allowed
          }
        }
      } else {
        // Today has no challenge, so current streak is 0
        // Check previous streak for max streak calculation
        currentDate = today.clone().subtract(1, 'day');
        let previousStreak = 0;
        
        while (true) {
          const dateStr = currentDate.format('YYYY-MM-DD');
          if (challengeDays.has(dateStr)) {
            previousStreak++;
            currentDate.subtract(1, 'day');
          } else {
            break; // Streak ended
          }
        }
        
        maxStreak = Math.max(maxStreak, previousStreak);
      }

      maxStreak = Math.max(maxStreak, currentStreak);

      // Format milestone data
      const awards = streakMilestones.map(milestone => {
        const unlocked = currentStreak >= milestone.days;
        const progress = Math.min(100, Math.floor((currentStreak / milestone.days) * 100));
        
        return {
          days: milestone.days,
          name: milestone.name,
          description: milestone.description,
          unlocked: unlocked,
          progress: progress,
          locked: !unlocked
        };
      });

      return {
        currentStreak,
        maxStreak,
        awards
      };
    } catch (error) {
      console.error('Error calculating challenge streaks:', error);
      return {
        currentStreak: 0,
        maxStreak: 0,
        awards: []
      };
    }
  }

  /**
   * Get step goal streaks (consecutive days meeting step goals)
   * Supports rest days (2 per week)
   * 
   * @param {mongoose.Types.ObjectId} userObjectId - User ObjectId
   * @returns {Object} Step streaks data
   */
  async _getStepStreaks(userObjectId) {
    // Define streak milestones
    const streakMilestones = [
      { days: 1, name: "1-Day Step Streak", description: "Meet your step goal for 1 day" },
      { days: 3, name: "3-Day Step Streak", description: "Meet your step goal for 3 consecutive days" },
      { days: 7, name: "7-Day Step Streak", description: "Meet your step goal for 7 consecutive days" },
      { days: 10, name: "10-Day Step Streak", description: "Meet your step goal for 10 consecutive days" },
      { days: 14, name: "14-Day Step Streak", description: "Meet your step goal for 14 consecutive days" },
      { days: 21, name: "21-Day Step Streak", description: "Meet your step goal for 21 consecutive days" },
      { days: 28, name: "28-Day Step Streak", description: "Meet your step goal for 28 consecutive days" }
    ];

    try {
      // Get the start date for lookback (1 year)
      const startDate = moment().subtract(1, 'year').startOf('day').toDate();
      const endDate = moment().endOf('day').toDate();

      // Find daily workouts with completed step goals
      const dailyWorkouts = await DailyWorkout.find({
        userId: userObjectId,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });

      // Get all sessions to calculate actual steps
      const freeSessions = await FreeWalkSession.find({
        userId: userObjectId,
        startTime: { $gte: startDate, $lte: endDate }
      }).sort({ startTime: 1 });

      const workoutSessions = await WorkoutSession.find({
        userId: userObjectId,
        startTime: { $gte: startDate, $lte: endDate }
      }).sort({ startTime: 1 });

      // Track days with completed step goals
      const dailySteps = new Map(); // Map of date to total steps

      // Process free walk sessions
      for (const session of freeSessions) {
        const day = moment(session.startTime).format('YYYY-MM-DD');
        const steps = session.actual?.steps || session.targets?.steps || 0;
        
        if (!dailySteps.has(day)) {
          dailySteps.set(day, parseInt(steps));
        } else {
          dailySteps.set(day, dailySteps.get(day) + parseInt(steps));
        }
      }

      // Process workout sessions
      for (const session of workoutSessions) {
        const day = moment(session.startTime).format('YYYY-MM-DD');
        const steps = session.totalSteps || 0;
        
        if (!dailySteps.has(day)) {
          dailySteps.set(day, steps);
        } else {
          dailySteps.set(day, dailySteps.get(day) + steps);
        }
      }

      // Check which days met the step goal
      const stepGoalMet = new Set();
      for (const workout of dailyWorkouts) {
        const day = moment(workout.date).format('YYYY-MM-DD');
        
        // Check if completed flag is set or if actual steps exceeded target
        if (workout.completed) {
          stepGoalMet.add(day);
        } else {
          const actualSteps = dailySteps.get(day) || 0;
          if (actualSteps >= workout.targetSteps) {
            stepGoalMet.add(day);
          }
        }
      }

      // Calculate current streak (consecutive days) with rest days
      let currentStreak = 0;
      let maxStreak = 0;
      let today = moment().startOf('day');
      let currentDate = today.clone();
      
      // Allow 2 rest days per week without breaking streak
      const maxRestDays = 2;
      const restDaysByWeek = new Map(); // Map of week number to count of rest days used
      const restDaysUsed = new Map(); // Map of date to rest day status
      
      // Check if today met step goal
      const todayStr = today.format('YYYY-MM-DD');
      const todayActive = stepGoalMet.has(todayStr);
      
      // If today is active, we start counting from today
      if (todayActive) {
        currentStreak = 1;
        currentDate = today.clone().subtract(1, 'day');
      } else {
        // Today step goal not met, check if we can use a rest day
        const yesterdayStr = today.clone().subtract(1, 'day').format('YYYY-MM-DD');
        const yesterdayActive = stepGoalMet.has(yesterdayStr);
        
        if (yesterdayActive) {
          // Today could be a rest day if we have available rest days
          const weekNum = today.week() + '-' + today.year();
          
          // Initialize rest days for this week if not already tracked
          if (!restDaysByWeek.has(weekNum)) {
            restDaysByWeek.set(weekNum, 0);
          }
          
          const restDaysUsedThisWeek = restDaysByWeek.get(weekNum);
          
          if (restDaysUsedThisWeek < maxRestDays) {
            // We can use a rest day for today
            restDaysByWeek.set(weekNum, restDaysUsedThisWeek + 1);
            restDaysUsed.set(todayStr, true);
            currentStreak = 1; // Start with today as a rest day
            
            // Start checking from yesterday since today is counted as a rest day
            currentDate = today.clone().subtract(1, 'day');
          }
        }
      }
      
      // Check consecutive days going backward from the starting point
      while (true) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        const weekNum = currentDate.week() + '-' + currentDate.year();
        const isActive = stepGoalMet.has(dateStr);
        
        // If this day met step goal, add to streak
        if (isActive) {
          currentStreak++;
          currentDate.subtract(1, 'day');
          continue;
        }
        
        // Step goal not met on this day - check if we can use rest day
        // Only allow rest days once streak has started
        if (currentStreak > 0) {
          // Initialize rest days for this week if not already tracked
          if (!restDaysByWeek.has(weekNum)) {
            restDaysByWeek.set(weekNum, 0);
          }
          
          const restDaysUsedThisWeek = restDaysByWeek.get(weekNum);
          
          if (restDaysUsedThisWeek < maxRestDays) {
            // We can use a rest day
            restDaysByWeek.set(weekNum, restDaysUsedThisWeek + 1);
            restDaysUsed.set(dateStr, true);
            
            // Continue the streak
            currentStreak++;
            currentDate.subtract(1, 'day');
            continue;
          }
        }
        
        // If we reach here, streak is broken
        break;
      }

      maxStreak = Math.max(maxStreak, currentStreak);

      // Format milestone data
      const awards = streakMilestones.map(milestone => {
        const unlocked = currentStreak >= milestone.days;
        const progress = Math.min(100, Math.floor((currentStreak / milestone.days) * 100));
        
        return {
          days: milestone.days,
          name: milestone.name,
          description: milestone.description,
          unlocked: unlocked,
          progress: progress,
          locked: !unlocked
        };
      });

      return {
        currentStreak,
        maxStreak,
        awards
      };
    } catch (error) {
      console.error('Error calculating step streaks:', error);
      return {
        currentStreak: 0,
        maxStreak: 0,
        awards: []
      };
    }
  }

  /**
   * Get workout streaks (consecutive days with completed workouts)
   * Supports rest days (2 per week)
   * 
   * @param {mongoose.Types.ObjectId} userObjectId - User ObjectId
   * @returns {Object} Workout streaks data
   */
  async _getWorkoutStreaks(userObjectId) {
    // Define streak milestones
    const streakMilestones = [
      { days: 1, name: "1-Day Workout Streak", description: "Complete a workout for 1 day" },
      { days: 3, name: "3-Day Workout Streak", description: "Complete workouts for 3 consecutive days" },
      { days: 7, name: "7-Day Workout Streak", description: "Complete workouts for 7 consecutive days" },
      { days: 10, name: "10-Day Workout Streak", description: "Complete workouts for 10 consecutive days" },
      { days: 14, name: "14-Day Workout Streak", description: "Complete workouts for 14 consecutive days" },
      { days: 21, name: "21-Day Workout Streak", description: "Complete workouts for 21 consecutive days" },
      { days: 28, name: "28-Day Workout Streak", description: "Complete workouts for 28 consecutive days" }
    ];

    try {
      // Get the start date for lookback (1 year)
      const startDate = moment().subtract(1, 'year').startOf('day').toDate();
      const endDate = moment().endOf('day').toDate();

      // Find completed workout sessions
      const workoutSessions = await WorkoutSession.find({
        userId: userObjectId,
        status: 'completed',
        startTime: { $gte: startDate, $lte: endDate }
      }).sort({ startTime: 1 });

      // Track days with completed workouts
      const workoutDays = new Set();
      for (const session of workoutSessions) {
        const day = moment(session.startTime).format('YYYY-MM-DD');
        workoutDays.add(day);
      }

      // Calculate current streak (consecutive days) with rest days
      let currentStreak = 0;
      let maxStreak = 0;
      let today = moment().startOf('day');
      let currentDate = today.clone();
      
      // Allow 2 rest days per week without breaking streak
      const maxRestDays = 2;
      const restDaysByWeek = new Map(); // Map of week number to count of rest days used
      const restDaysUsed = new Map(); // Map of date to rest day status
      
      // Check if today has workout
      const todayStr = today.format('YYYY-MM-DD');
      const todayActive = workoutDays.has(todayStr);
      
      // If today has workout, start counting from today
      if (todayActive) {
        currentStreak = 1;
        currentDate = today.clone().subtract(1, 'day');
      } else {
        // Today has no workout, check if we can use a rest day
        const yesterdayStr = today.clone().subtract(1, 'day').format('YYYY-MM-DD');
        const yesterdayActive = workoutDays.has(yesterdayStr);
        
        if (yesterdayActive) {
          // Today could be a rest day if we have available rest days
          const weekNum = today.week() + '-' + today.year();
          
          // Initialize rest days for this week if not already tracked
          if (!restDaysByWeek.has(weekNum)) {
            restDaysByWeek.set(weekNum, 0);
          }
          
          const restDaysUsedThisWeek = restDaysByWeek.get(weekNum);
          
          if (restDaysUsedThisWeek < maxRestDays) {
            // We can use a rest day for today
            restDaysByWeek.set(weekNum, restDaysUsedThisWeek + 1);
            restDaysUsed.set(todayStr, true);
            currentStreak = 1; // Start with today as a rest day
            
            // Start checking from yesterday since today is counted as a rest day
            currentDate = today.clone().subtract(1, 'day');
          }
        }
      }
      
      // Check consecutive days going backward from the starting point
      while (true) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        const weekNum = currentDate.week() + '-' + currentDate.year();
        const isActive = workoutDays.has(dateStr);
        
        // If this day has completed workout, add to streak
        if (isActive) {
          currentStreak++;
          currentDate.subtract(1, 'day');
          continue;
        }
        
        // No workout on this day - check if we can use rest day
        // Only allow rest days once streak has started
        if (currentStreak > 0) {
          // Initialize rest days for this week if not already tracked
          if (!restDaysByWeek.has(weekNum)) {
            restDaysByWeek.set(weekNum, 0);
          }
          
          const restDaysUsedThisWeek = restDaysByWeek.get(weekNum);
          
          if (restDaysUsedThisWeek < maxRestDays) {
            // We can use a rest day
            restDaysByWeek.set(weekNum, restDaysUsedThisWeek + 1);
            restDaysUsed.set(dateStr, true);
            
            // Continue the streak
            currentStreak++;
            currentDate.subtract(1, 'day');
            continue;
          }
        }
        
        // If we reach here, streak is broken
        break;
      }

      maxStreak = Math.max(maxStreak, currentStreak);

      // Format milestone data
      const awards = streakMilestones.map(milestone => {
        const unlocked = currentStreak >= milestone.days;
        const progress = Math.min(100, Math.floor((currentStreak / milestone.days) * 100));
        
        return {
          days: milestone.days,
          name: milestone.name,
          description: milestone.description,
          unlocked: unlocked,
          progress: progress,
          locked: !unlocked
        };
      });

      return {
        currentStreak,
        maxStreak,
        awards
      };
    } catch (error) {
      console.error('Error calculating workout streaks:', error);
      return {
        currentStreak: 0,
        maxStreak: 0,
        awards: []
      };
    }
  }

  /**
   * Get specific streak type awards
   * 
   * @param {String} userId - User ID
   * @param {String} streakType - Type of streak (general, challenge, step, workout)
   * @returns {Object} Streak awards data for specific type
   */
  async getStreakByType(userId, streakType) {
    console.log(`Getting ${streakType} streak awards for userId: ${userId}`);

    // Validate userId
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (error) {
      console.error(`Invalid userId format: ${userId}`);
      return { success: false, message: "Invalid user ID format" };
    }

    let streakData;
    
    // Get streak data based on type
    switch (streakType) {
      case 'general':
        streakData = await this._getGeneralStreaks(userObjectId);
        break;
      case 'challenge':
        streakData = await this._getChallengeStreaks(userObjectId);
        break;
      case 'step':
        streakData = await this._getStepStreaks(userObjectId);
        break;
      case 'workout':
        streakData = await this._getWorkoutStreaks(userObjectId);
        break;
      default:
        return { 
          success: false, 
          message: "Invalid streak type. Valid types are: general, challenge, step, workout" 
        };
    }

    return {
      success: true,
      data: streakData
    };
  }
}

module.exports = new AwardsService();