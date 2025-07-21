const moment = require('moment');
const FreeWalkSession = require('../models/free-walk-session.model');
const WorkoutSession = require('../models/WorkoutSession.js');
const mongoose = require('mongoose');
const WorkoutProgress = require('../models/UserWorkoutProgress.js');

class ActivityService {
  /**
   * Get activity statistics including:
   * - Average steps
   * - Workouts count
   * - Best day
   * - Daily steps data for the chart
   * - Additional metrics: calories, distance, time
   *
   * @param {String} userId - User ID
   * @param {String} period - 'week', 'month', or 'year'
   * @returns {Object} Activity statistics
   */
  async getActivityStatistics(userId, period = 'week') {
    console.log(`Getting activity statistics for userId: ${userId}, period: ${period}`);
    
    // Ensure userId is a valid ObjectId
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (error) {
      console.error(`Invalid userId format: ${userId}`);
      return { success: false, message: "Invalid user ID format" };
    }

    const today = moment().endOf('day');
    
    // First, find the user's first activity to determine the start date for charts
    let firstActivityDate = null;
    
    try {
      // Find the earliest free walk session
      const earliestFreeWalk = await FreeWalkSession.findOne({ 
        userId: userObjectId 
      }).sort({ startTime: 1 }).limit(1);
      
      // Find the earliest workout session
      const earliestWorkout = await WorkoutSession.findOne({ 
        userId: userObjectId 
      }).sort({ startTime: 1 }).limit(1);
      
      // Find the earliest workout progress record
      const earliestProgress = await WorkoutProgress.findOne({ 
        userId: userObjectId,
        completed: true 
      }).sort({ completedAt: 1 }).limit(1);
      
      // Determine the earliest date among all activity types
      if (earliestFreeWalk && earliestFreeWalk.startTime) {
        firstActivityDate = moment(earliestFreeWalk.startTime);
      }
      
      if (earliestWorkout && earliestWorkout.startTime) {
        const workoutDate = moment(earliestWorkout.startTime);
        if (!firstActivityDate || workoutDate.isBefore(firstActivityDate)) {
          firstActivityDate = workoutDate;
        }
      }
      
      if (earliestProgress && earliestProgress.completedAt) {
        const progressDate = moment(earliestProgress.completedAt);
        if (!firstActivityDate || progressDate.isBefore(firstActivityDate)) {
          firstActivityDate = progressDate;
        }
      }
      
      console.log(`First activity date: ${firstActivityDate ? firstActivityDate.format('YYYY-MM-DD') : 'None found'}`);
      
      // If no activity found, use a default start date (1 week, month, or year ago)
      if (!firstActivityDate) {
        if (period.toLowerCase() === 'year') {
          firstActivityDate = moment().startOf('year');
        } else if (period.toLowerCase() === 'month') {
          firstActivityDate = moment().subtract(11, 'months').startOf('month');
        } else {
          firstActivityDate = moment().subtract(6, 'days').startOf('day');
        }
      }
    } catch (error) {
      console.error('Error determining first activity date:', error);
      // Set default start date if error
      if (period.toLowerCase() === 'year') {
        firstActivityDate = moment().startOf('year');
      } else if (period.toLowerCase() === 'month') {
        firstActivityDate = moment().subtract(11, 'months').startOf('month');
      } else {
        firstActivityDate = moment().subtract(6, 'days').startOf('day');
      }
    }
    
    let startDate;
    let dateFormat;
    let groupBy;
    let numberOfDays;
    
    // Determine date range and display format based on period
    switch (period.toLowerCase()) {
      case 'month':
        // For month view, start from first activity month
        const monthsSinceFirstActivity = moment().diff(firstActivityDate, 'months');
        numberOfDays = Math.min(12, monthsSinceFirstActivity + 1); // Show up to 12 months, but at least the current month
        
        // Always include the current month
        startDate = moment().subtract(numberOfDays - 1, 'months').startOf('month');
        dateFormat = 'MMM'; // Jan, Feb, etc.
        groupBy = 'month';
        break;
      case 'year':
        // For year view, start from first activity year
        const yearsSinceFirstActivity = moment().diff(firstActivityDate, 'years');
        numberOfDays = Math.min(5, yearsSinceFirstActivity + 1); // Show up to 5 years, but at least the current year
        
        // Always include the current year
        startDate = moment().subtract(numberOfDays - 1, 'years').startOf('year');
        dateFormat = 'YYYY'; // 2021, 2022, etc.
        groupBy = 'year';
        break;
      case 'week':
      default:
        // For week view, always show the last 7 days
        numberOfDays = 7;
        startDate = moment().subtract(numberOfDays - 1, 'days').startOf('day');
        dateFormat = 'ddd'; // Mon, Tue, etc.
        groupBy = 'day';
        break;
    }
    
    console.log(`Date range: ${startDate.format('YYYY-MM-DD')} to ${today.format('YYYY-MM-DD')}`);

    // Find all free walk sessions in the period, regardless of status
    let freeWalkSessions = [];
    try {
      freeWalkSessions = await FreeWalkSession.find({
        userId: userObjectId,
        startTime: { $gte: startDate.toDate(), $lte: today.toDate() }
      });
      console.log(`Found ${freeWalkSessions.length} free walk sessions`);
      
      // Debug the first session to see its structure
      if (freeWalkSessions.length > 0) {
        const sampleSession = freeWalkSessions[0];
        console.log('Sample free walk session:');
        console.log('ID:', sampleSession._id);
        console.log('Status:', sampleSession.status);
        console.log('Start time:', sampleSession.startTime);
        console.log('Actual steps:', sampleSession.actual ? sampleSession.actual.steps : undefined);
        console.log('Target steps:', sampleSession.targets ? sampleSession.targets.steps : undefined);
      }
    } catch (error) {
      console.error('Error fetching free walk sessions:', error);
    }

    // Find all workout sessions in the period, regardless of status
    let workoutSessions = [];
    try {
      workoutSessions = await WorkoutSession.find({
        userId: userObjectId,
        startTime: { $gte: startDate.toDate(), $lte: today.toDate() }
      });
      console.log(`Found ${workoutSessions.length} workout sessions`);
      
      // Debug the first workout session to see its structure
      if (workoutSessions.length > 0) {
        const sampleWorkout = workoutSessions[0];
        console.log('Sample workout session:');
        console.log('ID:', sampleWorkout._id);
        console.log('Status:', sampleWorkout.status);
        console.log('Start time:', sampleWorkout.startTime);
        console.log('Steps:', sampleWorkout.totalSteps);
        console.log('Distance:', sampleWorkout.totalDistance);
        console.log('Calories:', sampleWorkout.caloriesBurned);
      }
    } catch (error) {
      console.error('Error fetching workout sessions:', error);
    }

    // Fetch workout progress data to determine completed workouts
    let workoutProgressRecords = [];
    try {
      workoutProgressRecords = await WorkoutProgress.find({
        userId: userObjectId,
        completed: true,
        completedAt: { $gte: startDate.toDate(), $lte: today.toDate() }
      });
      console.log(`Found ${workoutProgressRecords.length} completed workout progress records`);
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

    // Total workouts count - only count completed workouts
    const completedWorkoutsCount = workoutProgressRecords.length;
    
    console.log(`Completed workouts: ${completedWorkoutsCount}`);

    // Initialize data structures
    const activityData = {};
    let totalSteps = 0;
    let totalCalories = 0;
    let totalDistance = 0; // in meters
    let totalTime = 0; // in minutes
    let bestDate = null;
    let bestSteps = 0;
    let daysWithActivity = 0;
    
    // Create date range based on period
    const dateGroups = [];
    let currentDate = startDate.clone();
    
    if (groupBy === 'year') {
      // For year view, group by years (2021, 2022, etc.)
      let yearCount = 0;
      while (currentDate.isSameOrBefore(today, 'year') && yearCount < numberOfDays) {
        const yearKey = currentDate.format('YYYY');
        activityData[yearKey] = {
          date: yearKey, // Show year (2021, 2022, etc.)
          steps: 0,
          calories: 0,
          distance: 0,
          time: 0,
          goalAchieved: false,
          rawDate: currentDate.clone()
        };
        dateGroups.push(yearKey);
        currentDate.add(1, 'year');
        yearCount++;
      }
    } else if (groupBy === 'month') {
      // For month view, group by months (Jan, Feb, etc.)
      let monthCount = 0;
      while (currentDate.isSameOrBefore(today, 'month') && monthCount < numberOfDays) {
        const monthKey = currentDate.format('YYYY-MM');
        activityData[monthKey] = {
          date: currentDate.format(dateFormat), // Show month name (Jan, Feb, etc.)
          steps: 0,
          calories: 0,
          distance: 0,
          time: 0,
          goalAchieved: false,
          rawDate: currentDate.clone()
        };
        dateGroups.push(monthKey);
        currentDate.add(1, 'month');
        monthCount++;
      }
    } else {
      // For week view, show daily data
      let dayCount = 0;
      while (currentDate.isSameOrBefore(today, 'day') && dayCount < numberOfDays) {
        const dateKey = currentDate.format('YYYY-MM-DD');
        activityData[dateKey] = {
          date: currentDate.format(dateFormat), // Show day name (Mon, Tue, etc.)
          steps: 0,
          calories: 0,
          distance: 0,
          time: 0,
          goalAchieved: false,
          rawDate: currentDate.clone()
        };
        dateGroups.push(dateKey);
        currentDate.add(1, 'day');
        dayCount++;
      }
    }

    // Get user's daily step goal (default to 10,000)
    const dailyStepGoal = 10000; // You should fetch this from user preferences
    
    // Calculate monthly and yearly step goals
    const monthlyStepGoal = dailyStepGoal * 30;
    const yearlyStepGoal = dailyStepGoal * 365;
    
    // Process free walk sessions
    for (const session of freeWalkSessions) {
      try {
        const sessionDate = moment(session.startTime);
        let dateKey;
        
        if (groupBy === 'year') {
          dateKey = sessionDate.format('YYYY');
        } else if (groupBy === 'month') {
          dateKey = sessionDate.format('YYYY-MM');
        } else {
          dateKey = sessionDate.format('YYYY-MM-DD');
        }
        
        // Skip if we don't have this date in our range
        if (!activityData[dateKey]) continue;
        
        // Add steps data - handle both string values and numeric values
        let steps = 0;
        if (session.actual && session.actual.steps) {
          steps = parseInt(session.actual.steps, 10) || 0;
        } else if (session.targets && session.targets.steps) {
          steps = parseInt(session.targets.steps, 10) || 0;
        }
        
        if (steps > 0) {
          console.log(`Adding ${steps} steps from free walk session ${session._id} on ${dateKey}`);
          activityData[dateKey].steps += steps;
          totalSteps += steps;
        }
        
        // Add calories data
        let calories = 0;
        if (session.actual && session.actual.calories) {
          calories = parseInt(session.actual.calories, 10) || 0;
        } else if (session.targets && session.targets.calories) {
          calories = parseInt(session.targets.calories, 10) || 0;
        }
        
        activityData[dateKey].calories += calories;
        totalCalories += calories;
        
        // Add distance data
        let distance = 0;
        if (session.actual && session.actual.distance) {
          // Handle distance that might be stored as a string with decimal like "3.2"
          distance = parseFloat(session.actual.distance) * 1000 || 0; // Convert km to meters
        } else if (session.targets && session.targets.distance) {
          distance = parseFloat(session.targets.distance) * 1000 || 0; // Convert km to meters
        }
        
        activityData[dateKey].distance += distance;
        totalDistance += distance;
        
        // Add time data (duration in minutes)
        let duration = 0;
        if (session.duration) {
          duration = parseInt(session.duration, 10);
        } else {
          const startTime = moment(session.startTime);
          const endTime = session.endTime ? moment(session.endTime) : moment(session.startTime).add(30, 'minutes');
          duration = endTime.diff(startTime, 'minutes');
        }
        
        activityData[dateKey].time += duration;
        totalTime += duration;
        
        // Set goal achieved if this is a completed session with status "completed"
        if (session.status === 'completed') {
          if (groupBy === 'year') {
            if (steps >= yearlyStepGoal) {
              activityData[dateKey].goalAchieved = true;
            }
          } else if (groupBy === 'month') {
            if (steps >= monthlyStepGoal) {
              activityData[dateKey].goalAchieved = true;
            }
          } else {
            if (steps >= dailyStepGoal) {
              activityData[dateKey].goalAchieved = true;
            }
          }
        }
        
        // Track best performance
        if (activityData[dateKey].steps > bestSteps) {
          bestSteps = activityData[dateKey].steps;
          bestDate = dateKey;
        }
      } catch (error) {
        console.error(`Error processing free walk session ${session._id}:`, error);
      }
    }

    // Process workout sessions and workout progress records
    for (const session of workoutSessions) {
      try {
        const sessionDate = moment(session.startTime);
        let dateKey;
        
        if (groupBy === 'year') {
          dateKey = sessionDate.format('YYYY');
        } else if (groupBy === 'month') {
          dateKey = sessionDate.format('YYYY-MM');
        } else {
          dateKey = sessionDate.format('YYYY-MM-DD');
        }
        
        // Skip if we don't have this date in our range
        if (!activityData[dateKey]) continue;
        
        // Check if this workout is completed - using workoutId if available, or session._id as fallback
        const workoutIdToCheck = session.workoutId ? session.workoutId.toString() : session._id.toString();
        const isCompleted = completedWorkoutIds.has(workoutIdToCheck);
        
        if (isCompleted) {
          console.log(`Workout ${workoutIdToCheck} is completed according to progress records`);
          // Mark as goal achieved if the workout is completed
          activityData[dateKey].goalAchieved = true;
        }
        
        // Add steps - WorkoutSession uses totalSteps field
        const steps = session.totalSteps || 0;
        if (steps > 0) {
          console.log(`Adding ${steps} steps from workout session ${session._id} on ${dateKey}`);
          activityData[dateKey].steps += steps;
          totalSteps += steps;
          
          // Update best performance if needed
          if (activityData[dateKey].steps > bestSteps) {
            bestSteps = activityData[dateKey].steps;
            bestDate = dateKey;
          }
        }
        
        // Add calories
        const calories = session.caloriesBurned || 0;
        activityData[dateKey].calories += calories;
        totalCalories += calories;
        
        // Add distance
        const distance = session.totalDistance || 0;
        activityData[dateKey].distance += distance;
        totalDistance += distance;
        
        // Add time data
        let duration = 0;
        if (session.duration) {
          duration = Math.floor(session.duration / 60); // Convert seconds to minutes if stored in seconds
        } else {
          const startTime = moment(session.startTime);
          const endTime = session.endTime ? moment(session.endTime) : moment();
          duration = endTime.diff(startTime, 'minutes');
        }
        
        activityData[dateKey].time += duration;
        totalTime += duration;
        
        // Also mark completed if session status is completed
        if (session.status === 'completed') {
          activityData[dateKey].goalAchieved = true;
        }
      } catch (error) {
        console.error(`Error processing workout session ${session._id}:`, error);
      }
    }

    // Handle workout progress records that might not have matching sessions
    for (const progress of workoutProgressRecords) {
      if (progress.completedAt) {
        try {
          const completionDate = moment(progress.completedAt);
          let dateKey;
          
          if (groupBy === 'year') {
            dateKey = completionDate.format('YYYY');
          } else if (groupBy === 'month') {
            dateKey = completionDate.format('YYYY-MM');
          } else {
            dateKey = completionDate.format('YYYY-MM-DD');
          }
          
          // Skip if we don't have this date in our range
          if (!activityData[dateKey]) continue;
          
          // Mark the day as achieved since a workout was completed
          activityData[dateKey].goalAchieved = true;
          
        } catch (error) {
          console.error(`Error processing workout progress record ${progress._id}:`, error);
        }
      }
    }

    // Count periods with activity and goal achievement
    let goalsAchieved = 0;
    
    for (const dateKey in activityData) {
      const data = activityData[dateKey];
      if (data.steps > 0) {
        daysWithActivity++;
        
        // If not already marked as achieved based on workout completion status,
        // check if period step goal was reached
        if (!data.goalAchieved) {
          // Check goal achievement based on period
          let goalForPeriod;
          if (groupBy === 'year') {
            goalForPeriod = yearlyStepGoal;
          } else if (groupBy === 'month') {
            goalForPeriod = monthlyStepGoal;
          } else {
            goalForPeriod = dailyStepGoal;
          }
          
          if (data.steps >= goalForPeriod) {
            data.goalAchieved = true;
          }
        }
        
        if (data.goalAchieved) {
          goalsAchieved++;
        }
        
        console.log(`Period with activity: ${dateKey}, steps: ${data.steps}, goalAchieved: ${data.goalAchieved}`);
      }
    }

    // Calculate averages (only for periods with activity)
    const avgSteps = daysWithActivity > 0 ? Math.round(totalSteps / daysWithActivity) : 0;
    const avgCalories = daysWithActivity > 0 ? Math.round(totalCalories / daysWithActivity) : 0;
    const avgDistance = daysWithActivity > 0 ? Math.round(totalDistance / daysWithActivity) : 0;
    const avgTime = daysWithActivity > 0 ? Math.round(totalTime / daysWithActivity) : 0;

    console.log(`Total stats - Steps: ${totalSteps}, Calories: ${totalCalories}, Distance: ${totalDistance}m, Time: ${totalTime}min`);
    console.log(`Periods with activity: ${daysWithActivity}`);
    console.log(`Goal achieved periods: ${goalsAchieved}`);
    console.log(`Average stats - Steps: ${avgSteps}, Calories: ${avgCalories}, Distance: ${avgDistance}m, Time: ${avgTime}min`);

    // Format chart data in order
    const chartData = dateGroups.map(key => ({
      date: activityData[key].date,
      steps: activityData[key].steps,
      calories: activityData[key].calories,
      distance: activityData[key].distance,
      time: activityData[key].time,
      goalAchieved: activityData[key].goalAchieved
    }));

    // Find best hour of the day (only for today)
    const todayKey = moment().format('YYYY-MM-DD');
    let bestHour = null;
    let bestHourSteps = 0;
    
    // Only calculate best hour if we're in week mode and today is in our period
    if (groupBy === 'day' && activityData[todayKey]) {
      // Get today's sessions
      const todayFreeWalkSessions = freeWalkSessions.filter(
        session => moment(session.startTime).format('YYYY-MM-DD') === todayKey
      );
      
      const todayWorkoutSessions = workoutSessions.filter(
        session => moment(session.startTime).format('YYYY-MM-DD') === todayKey
      );
      
      // Initialize hourly data
      const hourlySteps = {};
      for (let i = 0; i < 24; i++) {
        hourlySteps[i] = 0;
      }
      
      // Process today's free walk sessions
      for (const session of todayFreeWalkSessions) {
        let steps = 0;
        if (session.actual && session.actual.steps) {
          steps = parseInt(session.actual.steps, 10) || 0;
        } else if (session.targets && session.targets.steps) {
          steps = parseInt(session.targets.steps, 10) || 0;
        }
        
        if (steps > 0) {
          const startTime = moment(session.startTime);
          const endTime = session.endTime ? moment(session.endTime) : moment();
          
          this._distributeStepsToHours(startTime, endTime, steps, hourlySteps);
        }
      }
      
      // Process today's workout sessions
      for (const session of todayWorkoutSessions) {
        const steps = session.totalSteps || 0;
        
        if (steps > 0) {
          const startTime = moment(session.startTime);
          const endTime = session.endTime ? moment(session.endTime) : moment();
          
          this._distributeStepsToHours(startTime, endTime, steps, hourlySteps);
        }
      }
      
      // Find best hour
      for (const [hour, steps] of Object.entries(hourlySteps)) {
        if (steps > bestHourSteps) {
          bestHourSteps = steps;
          bestHour = parseInt(hour, 10);
        }
      }
    }

    // Calculate percentage increase/change
    let percentageChange = 0;
    
    if (period === 'week' && chartData.length > 1) {
      // For weekly view: compare with previous day
      const lastIndex = chartData.length - 1;
      const today = chartData[lastIndex].steps;
      const yesterday = chartData[lastIndex - 1].steps;
      
      if (yesterday > 0) {
        percentageChange = Math.round(((today - yesterday) / yesterday) * 100);
      } else if (today > 0) {
        percentageChange = 100; // If yesterday was 0, but today has steps
      }
    } else if (period === 'month' && chartData.length > 1) {
      // For monthly view: compare current month with previous month
      const lastIndex = chartData.length - 1;
      const currentMonth = chartData[lastIndex].steps;
      const prevMonth = chartData[lastIndex - 1].steps;
      
      if (prevMonth > 0) {
        percentageChange = Math.round(((currentMonth - prevMonth) / prevMonth) * 100);
      } else if (currentMonth > 0) {
        percentageChange = 100;
      }
    } else if (period === 'year' && chartData.length > 1) {
      // For yearly view: compare current year with previous year
      const lastIndex = chartData.length - 1;
      const currentYear = chartData[lastIndex].steps;
      const prevYear = chartData[lastIndex - 1].steps;
      
      if (prevYear > 0) {
        percentageChange = Math.round(((currentYear - prevYear) / prevYear) * 100);
      } else if (currentYear > 0) {
        percentageChange = 100;
      }
    }
    
    // Format best period for display
    const bestPeriodDisplay = bestDate ? {
      date: activityData[bestDate].date,
      steps: activityData[bestDate].steps
    } : { date: null, steps: 0 };

    // Calculate hourly average properly
    const totalActiveHours = daysWithActivity * 16; // Assume 16 active hours per day
    const avgPerHour = totalActiveHours > 0 ? Math.round(totalSteps / totalActiveHours) : 0;
    
    // Calculate most active hours
    const mostActiveHours = bestHour !== null ? `${bestHour}:00 and ${(bestHour + 1) % 24}:00` : "N/A";
    const hourlyAvgMessage = `You walked an average of ${avgPerHour} steps per hour. You are most active between ${mostActiveHours}.`;

    // Format distance in km
    const totalDistanceInKm = (totalDistance / 1000).toFixed(2);
    const avgDistanceInKm = (avgDistance / 1000).toFixed(2);
    
    // Format time in hours and minutes
    const formatTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;
    };
    
    const formattedTotalTime = formatTime(totalTime);
    const formattedAvgTime = formatTime(avgTime);

    // Determine appropriate period label
    let periodLabel;
    if (groupBy === 'year') {
      periodLabel = 'years';
    } else if (groupBy === 'month') {
      periodLabel = 'months';
    } else {
      periodLabel = 'days';
    }

    // Final response
    const response = {
      success: true,
      data: {
        summary: {
          avgSteps: avgSteps,
          workouts: completedWorkoutsCount,
          bestDay: bestSteps
        },
        goalAchieved: {
          count: `${goalsAchieved}/${numberOfDays} ${periodLabel}`,
          percentage: percentageChange >= 0 ? `+${percentageChange}%` : `${percentageChange}%`
        },
        metrics: {
          steps: {
            total: totalSteps,
            average: avgSteps
          },
          calories: {
            total: totalCalories,
            average: avgCalories
          },
          distance: {
            total: totalDistanceInKm,
            average: avgDistanceInKm,
            unit: "km"
          },
          time: {
            total: formattedTotalTime,
            average: formattedAvgTime
          }
        },
        bestHour: bestHour !== null ? {
          hour: `${bestHour}:00`,
          steps: bestHourSteps
        } : null,
        hourlyInsight: hourlyAvgMessage,
        stepGoal: groupBy === 'year' ? yearlyStepGoal : (groupBy === 'month' ? monthlyStepGoal : dailyStepGoal),
        chartData: chartData
      }
    };

    console.log('Completed activity statistics calculation');
    
    return response;
  }
  
  /**
   * Helper method to distribute steps across hours
   * @private
   */
  _distributeStepsToHours(startTime, endTime, totalSteps, hourlySteps) {
    const start = moment(startTime);
    const end = moment(endTime);
    
    // If session is less than an hour, put all steps in the start hour
    if (end.diff(start, 'hours') < 1) {
      const hour = start.hour();
      hourlySteps[hour] += totalSteps;
      return;
    }
    
    // Calculate session duration in minutes
    const durationMinutes = end.diff(start, 'minutes');
    if (durationMinutes <= 0) {
      console.warn(`Invalid duration: ${durationMinutes} minutes, using default hour distribution`);
      const hour = start.hour();
      hourlySteps[hour] += totalSteps;
      return;
    }
    
    const stepsPerMinute = totalSteps / durationMinutes;
    
    // Distribute steps across hours
    let currentTime = start.clone();
    while (currentTime.isBefore(end)) {
      const hour = currentTime.hour();
      const minutesInThisHour = Math.min(60 - currentTime.minute(), end.diff(currentTime, 'minutes'));
      
      hourlySteps[hour] += Math.round(stepsPerMinute * minutesInThisHour);
      currentTime.add(minutesInThisHour, 'minutes');
    }
  }
}

module.exports = new ActivityService();