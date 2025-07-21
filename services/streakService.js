const moment = require('moment');
const mongoose = require('mongoose');
const FreeWalkSession = require('../models/free-walk-session.model');
const WorkoutSession = require('../models/WorkoutSession.js');
const WorkoutProgress = require('../models/UserWorkoutProgress.js');

class StreakService {
  /**
   * Get the user's activity streaks
   * - Current streak
   * - Streak history
   * - Calendar view of activity days
   * - Rest days information
   * - Streaks milestone achievements (1-day, 3-day, 7-day, etc.)
   * 
  /**
   * Get the user's activity streaks with simplified data structure
   * 
   * @param {String} userId - User ID
   * @param {String} month - Month to display (format: 'YYYY-MM')
   * @returns {Object} Simplified streak data
   */
  async getStreaks(userId, month = moment().format('YYYY-MM')) {
    console.log(`Getting streaks for userId: ${userId}, month: ${month}`);
  
    // Validate userId
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (error) {
      console.error(`Invalid userId format: ${userId}`);
      return { success: false, message: "Invalid user ID format" };
    }
  
    // Parse month parameter
    let targetMonth;
    try {
      targetMonth = moment(month, 'YYYY-MM');
      if (!targetMonth.isValid()) {
        targetMonth = moment(); // Default to current month if invalid
      }
    } catch (error) {
      console.error(`Invalid month format: ${month}`);
      targetMonth = moment(); // Default to current month
    }
  
    // Get date ranges for queries
    const startOfMonth = targetMonth.clone().startOf('month');
    const endOfMonth = targetMonth.clone().endOf('month');
    console.log(`Month range: ${startOfMonth.format('YYYY-MM-DD')} to ${endOfMonth.format('YYYY-MM-DD')}`);
    
    // For streaks, we need to look at a wider date range (past year)
    const startDateForStreaks = moment().subtract(1, 'year').startOf('day');
    const endDateForStreaks = moment().endOf('day');
  
    // Get activity data from all sources
    // 1. Free Walk Sessions
    let freeWalkSessions = [];
    try {
      freeWalkSessions = await FreeWalkSession.find({
        userId: userObjectId,
        startTime: { $gte: startDateForStreaks.toDate(), $lte: endDateForStreaks.toDate() }
      }).sort({ startTime: 1 });
      console.log(`Found ${freeWalkSessions.length} free walk sessions for streak calculation`);
    } catch (error) {
      console.error('Error fetching free walk sessions:', error);
    }
  
    // 2. Workout Sessions
    let workoutSessions = [];
    try {
      workoutSessions = await WorkoutSession.find({
        userId: userObjectId,
        startTime: { $gte: startDateForStreaks.toDate(), $lte: endDateForStreaks.toDate() }
      }).sort({ startTime: 1 });
      console.log(`Found ${workoutSessions.length} workout sessions for streak calculation`);
    } catch (error) {
      console.error('Error fetching workout sessions:', error);
    }
  
    // 3. Completed Workout Progress Records
    let workoutProgressRecords = [];
    try {
      workoutProgressRecords = await WorkoutProgress.find({
        userId: userObjectId,
        completed: true,
        completedAt: { $gte: startDateForStreaks.toDate(), $lte: endDateForStreaks.toDate() }
      }).sort({ completedAt: 1 });
      console.log(`Found ${workoutProgressRecords.length} completed workout progress records for streak calculation`);
    } catch (error) {
      console.error('Error fetching workout progress records:', error);
    }
  
    // Create a map of completed workout IDs for faster lookup
    const completedWorkoutIds = new Set();
    for (const progress of workoutProgressRecords) {
      if (progress.workoutId) {
        completedWorkoutIds.add(progress.workoutId.toString());
      }
    }
    
    // Daily step goal (can be made configurable)
    const dailyStepGoal = 10000;
    
    // Process all activity data to determine active days
    const activeDays = new Map(); // Map of date strings to activity data
    
    // 1. Process free walk sessions
    for (const session of freeWalkSessions) {
      const sessionDate = moment(session.startTime).format('YYYY-MM-DD');
      
      // Calculate steps for this session
      let steps = 0;
      if (session.actual && session.actual.steps) {
        steps = parseInt(session.actual.steps, 10) || 0;
      } else if (session.targets && session.targets.steps) {
        steps = parseInt(session.targets.steps, 10) || 0;
      }
      
      // Mark day as active if there are steps or if session is completed
      if (steps > 0 || session.status === 'completed') {
        if (!activeDays.has(sessionDate)) {
          activeDays.set(sessionDate, { 
            steps: steps,
            goalMet: steps >= dailyStepGoal || session.status === 'completed',
            hasActivity: true
          });
        } else {
          // Update existing day with additional steps
          const dayData = activeDays.get(sessionDate);
          dayData.steps += steps;
          dayData.goalMet = dayData.goalMet || dayData.steps >= dailyStepGoal || session.status === 'completed';
          activeDays.set(sessionDate, dayData);
        }
      }
    }
    
    // 2. Process workout sessions
    for (const session of workoutSessions) {
      const sessionDate = moment(session.startTime).format('YYYY-MM-DD');
      
      // Calculate steps for this session
      const steps = session.totalSteps || 0;
      
      // Check if this workout is completed
      const workoutId = session.workoutId ? session.workoutId.toString() : session._id.toString();
      const isCompleted = completedWorkoutIds.has(workoutId) || session.status === 'completed';
      
      // Mark day as active
      if (!activeDays.has(sessionDate)) {
        activeDays.set(sessionDate, { 
          steps: steps,
          goalMet: steps >= dailyStepGoal || isCompleted,
          hasActivity: true
        });
      } else {
        // Update existing day with additional steps
        const dayData = activeDays.get(sessionDate);
        dayData.steps += steps;
        dayData.goalMet = dayData.goalMet || dayData.steps >= dailyStepGoal || isCompleted;
        activeDays.set(sessionDate, dayData);
      }
    }
    
    // 3. Process workout progress records (in case we missed any)
    for (const progress of workoutProgressRecords) {
      if (progress.completedAt) {
        const completionDate = moment(progress.completedAt).format('YYYY-MM-DD');
        
        if (!activeDays.has(completionDate)) {
          activeDays.set(completionDate, {
            steps: 0,
            goalMet: true, // If workout was completed, count as goal met
            hasActivity: true
          });
        } else {
          const dayData = activeDays.get(completionDate);
          dayData.goalMet = true; // Override with completed status
          activeDays.set(completionDate, dayData);
        }
      }
    }
    
    // Calculate current streak
    let currentStreak = 0;
    let today = moment().startOf('day');
    let currentDate = today.clone();
    const maxRestDays = 2; // Allow 2 rest days per week without breaking streak
    
    // We'll track rest days by calendar week
    const restDaysByWeek = new Map(); // Map of week number to count of rest days used
    const restDaysUsed = new Map(); // Map of date to rest day status
    
    // Check if today has activity first to determine if we need to start counting from today or yesterday
    const todayStr = today.format('YYYY-MM-DD');
    const todayActive = activeDays.has(todayStr) && activeDays.get(todayStr).goalMet;
    
    // If today is active, we start from today
    // Otherwise, check if today can be a rest day if yesterday was active
    if (!todayActive) {
      const yesterdayStr = today.clone().subtract(1, 'day').format('YYYY-MM-DD');
      const yesterdayActive = activeDays.has(yesterdayStr) && activeDays.get(yesterdayStr).goalMet;
      
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
    
    // Check consecutive days going backward from the starting point (today or yesterday)
    while (true) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const weekNum = currentDate.week() + '-' + currentDate.year();
      const isActive = activeDays.has(dateStr) && activeDays.get(dateStr).goalMet;
      
      // If this day has activity meeting the goal, add to streak
      if (isActive) {
        currentStreak++;
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
          console.log(`Using rest day on ${dateStr}, week ${weekNum}, rest days used: ${restDaysUsedThisWeek + 1}/${maxRestDays}`);
          
          // Mark this day as a rest day
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
  
    // Calculate calendar data for the month view - just the days, no weekday categories
    const calendarDays = [];
    let day = startOfMonth.clone();
    
    // Organize calendar days sequentially for the month
    while (day.isSameOrBefore(endOfMonth)) {
      const dateStr = day.format('YYYY-MM-DD');
      const dayOfMonth = day.date();
      
      const isActive = activeDays.has(dateStr) && activeDays.get(dateStr).goalMet;
      const isRestDay = restDaysUsed.has(dateStr);
      
      calendarDays.push({
        date: dateStr,
        day: dayOfMonth,
        isActive: isActive || isRestDay,
        isRestDay: isRestDay,
        steps: activeDays.has(dateStr) ? activeDays.get(dateStr).steps : 0
      });
      
      day.add(1, 'day');
    }
    
    // Calculate rest days remaining this week
    const currentWeek = moment().week() + '-' + moment().year();
    const restDaysUsedCurrentWeek = restDaysByWeek.get(currentWeek) || 0;
    const restDaysRemaining = maxRestDays - restDaysUsedCurrentWeek;
    
    // Return only the three required components with simplified structure
    return {
      success: true,
      data: {
        currentStreak: {
          days: currentStreak,
          message: currentStreak > 0 
            ? `You're on a ${currentStreak}-day streak!` 
            : "Complete your step plan for today to start a streak."
        },
        restDays: {
          used: restDaysUsedCurrentWeek,
          total: maxRestDays,
          remaining: restDaysRemaining,
          message: `YOUR REST DAYS: ${restDaysUsedCurrentWeek}/${maxRestDays}`,
          description: `You can have ${maxRestDays} rest days per calendar week without breaking your streak; they are applied automatically.`
        },
        calendar: {
          month: targetMonth.format('MMMM'),
          year: targetMonth.format('YYYY'),
          days: calendarDays
        }
      }
    };
  }

  /**
   * Get streak milestone achievements
   * 
   * @param {String} userId - User ID
   * @returns {Object} Streak achievements data
   */
  async getStreakAwards(userId) {
    // Validate userId
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (error) {
      console.error(`Invalid userId format: ${userId}`);
      return { success: false, message: "Invalid user ID format" };
    }
    
    // Get the streak data first (reusing existing logic)
    const streakData = await this.getStreaks(userId);
    
    if (!streakData.success) {
      return streakData;
    }
    
    const currentStreak = streakData.data.currentStreak.days;
    
    // Define all possible streak awards
    const allAwards = [
      { id: 1, days: 1, name: "1-Day Streak", description: "Complete your daily goal for 1 day", icon: "streak-1" },
      { id: 2, days: 3, name: "3-Day Streak", description: "Complete your daily goal for 3 consecutive days", icon: "streak-3" },
      { id: 3, days: 7, name: "7-Day Streak", description: "Complete your daily goal for 7 consecutive days", icon: "streak-7" },
      { id: 4, days: 10, name: "10-Day Streak", description: "Complete your daily goal for 10 consecutive days", icon: "streak-10" },
      { id: 5, days: 14, name: "14-Day Streak", description: "Complete your daily goal for 14 consecutive days", icon: "streak-14" },
      { id: 6, days: 21, name: "21-Day Streak", description: "Complete your daily goal for 21 consecutive days", icon: "streak-21" },
      { id: 7, days: 28, name: "28-Day Streak", description: "Complete your daily goal for 28 consecutive days", icon: "streak-28" },
      { id: 8, days: 30, name: "30-Day Streak", description: "Complete your daily goal for 30 consecutive days", icon: "streak-30" },
      { id: 9, days: 60, name: "60-Day Streak", description: "Complete your daily goal for 60 consecutive days", icon: "streak-60" },
      { id: 10, days: 90, name: "90-Day Streak", description: "Complete your daily goal for 90 consecutive days", icon: "streak-90" },
      { id: 11, days: 180, name: "180-Day Streak", description: "Complete your daily goal for 180 consecutive days", icon: "streak-180" },
      { id: 12, days: 365, name: "365-Day Streak", description: "Complete your daily goal for 365 consecutive days", icon: "streak-365" }
    ];
    
    // Mark which awards are unlocked based on current streak
    const awards = allAwards.map(award => ({
      ...award,
      unlocked: currentStreak >= award.days,
      progress: Math.min(100, Math.floor((currentStreak / award.days) * 100))
    }));
    
    return {
      success: true,
      data: {
        currentStreak: currentStreak,
        awards: awards
      }
    };
  }
}

module.exports = new StreakService();