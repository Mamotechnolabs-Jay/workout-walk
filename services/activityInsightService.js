const moment = require('moment');
const FreeWalkSession = require('../models/free-walk-session.model');
const WorkoutSession = require('../models/WorkoutSession.js');
const mongoose = require('mongoose');
const WorkoutProgress = require('../models/UserWorkoutProgress.js');

class ActivityInsightService {
       /**
    * Get the "Best Results" insights data
    * - Steps for the selected period (day/week/month/year)
    * - Best hour steps (for day view)
    * - Best hour steps (for week/month/year views as well)
    * - Hourly activity chart with steps, calories, distance, time for all period views
    * - Insight message about activity pattern
    * 
    * @param {String} userId - User ID
    * @param {String} period - 'day', 'week', 'month', or 'year'
    * @returns {Object} Best results data
    */
    async getBestResults(userId, period = 'day') {
        console.log(`Getting best results insights for userId: ${userId}, period: ${period}`);
    
        // Validate userId
        let userObjectId;
        try {
            userObjectId = new mongoose.Types.ObjectId(userId);
        } catch (error) {
            console.error(`Invalid userId format: ${userId}`);
            return { success: false, message: "Invalid user ID format" };
        }
    
        const now = moment();
    
        // Define date ranges based on period
        let startDate, endDate, dateFormat, groupBy;
    
        // Determine date range and display format based on period
        switch (period.toLowerCase()) {
            case 'week':
                startDate = moment().startOf('week');
                endDate = moment();
                dateFormat = 'ddd'; // Mon, Tue, etc.
                groupBy = 'day';
                break;
            case 'month':
                startDate = moment().startOf('month');
                endDate = moment();
                dateFormat = 'D'; // 1, 2, ..., 31
                groupBy = 'day';
                break;
            case 'year':
                startDate = moment().startOf('year');
                endDate = moment();
                dateFormat = 'MMM'; // Jan, Feb, etc.
                groupBy = 'month';
                break;
            case 'day':
            default:
                startDate = moment().startOf('day');
                endDate = moment();
                dateFormat = 'HH:mm'; // 00:00, 01:00, etc.
                groupBy = 'hour';
                break;
        }
    
        console.log(`Date range: ${startDate.format('YYYY-MM-DD HH:mm')} to ${endDate.format('YYYY-MM-DD HH:mm')}`);
    
        // Get activity sessions for the period
        const sessions = await this._getActivitySessions(userObjectId, startDate, endDate);
        console.log(`Found ${sessions.length} activity sessions for the period`);
    
        // Initialize results
        let totalSteps = 0;
        let totalCalories = 0;
        let totalDistance = 0;
        let totalTime = 0;
        let bestPeriodSteps = 0;
        let bestPeriodLabel = null;
    
        // Initialize hourly buckets for all period types
        const hourlyData = {};
        for (let i = 0; i < 24; i++) {
            const hourKey = i.toString().padStart(2, '0');
            hourlyData[hourKey] = {
                label: `${hourKey}:00`,
                steps: 0,
                calories: 0,
                distance: 0,
                time: 0
            };
        }
    
        // Process all sessions to aggregate metrics
        for (const session of sessions) {
            // Process steps
            let steps = 0;
            if (session.type === 'freeWalk') {
                if (session.actual && session.actual.steps) {
                    steps = parseInt(session.actual.steps, 10) || 0;
                } else if (session.targets && session.targets.steps) {
                    steps = parseInt(session.targets.steps, 10) || 0;
                }
            } else { // workout session
                steps = session.totalSteps || 0;
            }
            totalSteps += steps;
    
            // Process calories
            let calories = 0;
            if (session.type === 'freeWalk') {
                if (session.actual && session.actual.calories) {
                    calories = parseInt(session.actual.calories, 10) || 0;
                } else if (session.targets && session.targets.calories) {
                    calories = parseInt(session.targets.calories, 10) || 0;
                }
            } else {
                calories = session.caloriesBurned || 0;
            }
            totalCalories += calories;
    
            // Process distance
            let distance = 0;
            if (session.type === 'freeWalk') {
                if (session.actual && session.actual.distance) {
                    distance = parseFloat(session.actual.distance) * 1000 || 0; // Convert to meters
                } else if (session.targets && session.targets.distance) {
                    distance = parseFloat(session.targets.distance) * 1000 || 0; // Convert to meters
                }
            } else {
                distance = session.totalDistance || 0; // Assuming already in meters
            }
            totalDistance += distance;
    
            // Process time
            let duration = 0;
            if (session.duration) {
                duration = parseInt(session.duration, 10);
            } else {
                const startTime = moment(session.startTime);
                const endTime = session.endTime ? moment(session.endTime) : moment(session.startTime).add(30, 'minutes');
                duration = endTime.diff(startTime, 'minutes');
            }
            totalTime += duration;
    
            // Assign metrics to hour bucket based on session start time
            const hour = moment(session.startTime).hour();
            const hourKey = hour.toString().padStart(2, '0');
            
            hourlyData[hourKey].steps += steps;
            hourlyData[hourKey].calories += calories;
            hourlyData[hourKey].distance += distance;
            hourlyData[hourKey].time += duration;
    
            // Track best hour for steps
            if (hourlyData[hourKey].steps > bestPeriodSteps) {
                bestPeriodSteps = hourlyData[hourKey].steps;
                bestPeriodLabel = `${hourKey}:00`;
            }
        }
    
        // Calculate average steps per unit time
        let avgSteps = 0;
        let avgLabel = '';
        let insightMessage = '';
    
        // Format hourly chart data for the UI
        const chartData = Object.values(hourlyData).map(data => ({
            hour: data.label,
            steps: data.steps,
            calories: data.calories,
            distance: (data.distance / 1000).toFixed(2), // Convert to km
            time: data.time // In minutes
        }));
    
        // Format total distance (convert meters to km)
        const displayDistance = (totalDistance / 1000).toFixed(2);
        
        // Format time
        const displayTime = this._formatTime(totalTime);
    
        // Generate appropriate response based on period
        switch (period.toLowerCase()) {
            case 'day':
                // Calculate average steps per hour (assuming 16 active hours)
                const activeHours = 16;
                avgSteps = Math.round(totalSteps / activeHours);
                avgLabel = 'hour';
    
                // Generate insight message
                if (bestPeriodLabel) {
                    insightMessage = `You walked an average of ${avgSteps} steps per hour today. You are most active between ${bestPeriodLabel} and ${(parseInt(bestPeriodLabel.split(':')[0]) + 1) % 24}:00.`;
                } else {
                    insightMessage = `You walked an average of ${avgSteps} steps per hour today.`;
                }
    
                return {
                    success: true,
                    data: {
                        period: 'day',
                        today: {
                            steps: totalSteps,
                            calories: totalCalories,
                            distance: displayDistance,
                            time: displayTime
                        },
                        bestHour: {
                            hour: bestPeriodLabel,
                            steps: bestPeriodSteps
                        },
                        avgStepsPerHour: avgSteps,
                        hourlyChart: chartData,
                        insight: insightMessage
                    }
                };
    
            case 'week':
            case 'month':
                // Calculate average steps per day (for week/month)
                const days = period === 'week' ? 7 : moment().daysInMonth();
                avgSteps = Math.round(totalSteps / days);
                avgLabel = 'day';
    
                // Generate insight message
                if (bestPeriodLabel) {
                    insightMessage = `You walked an average of ${avgSteps} steps per day this ${period}. You are most active at ${bestPeriodLabel}.`;
                } else {
                    insightMessage = `You walked an average of ${avgSteps} steps per day this ${period}.`;
                }
    
                return {
                    success: true,
                    data: {
                        period: period,
                        total: {
                            steps: totalSteps,
                            calories: totalCalories,
                            distance: displayDistance,
                            time: displayTime
                        },
                        bestHour: {
                            hour: bestPeriodLabel,
                            steps: bestPeriodSteps
                        },
                        avgStepsPerDay: avgSteps,
                        hourlyChart: chartData,
                        insight: insightMessage
                    }
                };
    
            case 'year':
                // Calculate average steps per month
                avgSteps = Math.round(totalSteps / 12);
                avgLabel = 'month';
    
                // Generate insight message
                if (bestPeriodLabel) {
                    insightMessage = `You walked a total of ${totalSteps} steps this year. You are most active at ${bestPeriodLabel}.`;
                } else {
                    insightMessage = `You walked a total of ${totalSteps} steps this year.`;
                }
    
                return {
                    success: true,
                    data: {
                        period: 'year',
                        total: {
                            steps: totalSteps,
                            calories: totalCalories,
                            distance: displayDistance,
                            time: displayTime
                        },
                        bestHour: {
                            hour: bestPeriodLabel,
                            steps: bestPeriodSteps
                        },
                        avgStepsPerMonth: avgSteps,
                        hourlyChart: chartData,
                        insight: insightMessage
                    }
                };
        }
    }

      /**
     * Get the "Trends" insights data
     * - This week/month/year's average steps/day
     * - Previous period's average steps/day
     * - Daily/monthly/yearly steps for the selected period
     * - Percentage change from previous period
     * 
     * @param {String} userId - User ID
     * @param {String} period - 'week', 'month', or 'year'
     * @returns {Object} Trends data
     */
    async getTrends(userId, period = 'week') {
        console.log(`Getting trends insights for userId: ${userId}, period: ${period}`);
    
        // Validate userId
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
    
            // If no activity found, use a default start date
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
    
        let startDate, endDate, prevStartDate, prevEndDate;
        let dateFormat, groupBy, numberOfDays, periodUnit;
    
        // Determine date range and display format based on period
        switch (period.toLowerCase()) {
            case 'month':
                // For month view, get data for the last 12 months
                numberOfDays = 12;
                startDate = moment().subtract(numberOfDays - 1, 'months').startOf('month');
                dateFormat = 'MMM'; // Jan, Feb, etc.
                groupBy = 'month';
                periodUnit = 'month';
    
                // Previous period is the 12 months before that
                prevStartDate = moment(startDate).subtract(numberOfDays, 'months');
                prevEndDate = moment(startDate).subtract(1, 'day').endOf('day');
                break;
            case 'year':
                // For year view, get data for the last 5 years
                numberOfDays = 5;
                startDate = moment().subtract(numberOfDays - 1, 'years').startOf('year');
                dateFormat = 'YYYY'; // 2021, 2022, etc.
                groupBy = 'year';
                periodUnit = 'year';
    
                // Previous period is the 5 years before that
                prevStartDate = moment(startDate).subtract(numberOfDays, 'years');
                prevEndDate = moment(startDate).subtract(1, 'day').endOf('day');
                break;
            case 'week':
            default:
                // For week view, always show the last 7 days
                numberOfDays = 7;
                startDate = moment().subtract(numberOfDays - 1, 'days').startOf('day');
                dateFormat = 'ddd'; // Mon, Tue, etc.
                groupBy = 'day';
                periodUnit = 'week';
    
                // Previous period is the week before that
                prevStartDate = moment(startDate).subtract(numberOfDays, 'days');
                prevEndDate = moment(startDate).subtract(1, 'day').endOf('day');
                break;
        }
    
        console.log(`Current period: ${startDate.format('YYYY-MM-DD')} to ${today.format('YYYY-MM-DD')}`);
        console.log(`Previous period: ${prevStartDate.format('YYYY-MM-DD')} to ${prevEndDate.format('YYYY-MM-DD')}`);
    
        // Get current period data
        const currentPeriodSessions = await this._getActivitySessions(userObjectId, startDate, today);
        console.log(`Found ${currentPeriodSessions.length} sessions for current period`);
    
        // Get previous period data
        const prevPeriodSessions = await this._getActivitySessions(userObjectId, prevStartDate, prevEndDate);
        console.log(`Found ${prevPeriodSessions.length} sessions for previous period`);
    
        // Get completed workouts for the period
        const workoutProgressRecords = await WorkoutProgress.find({
            userId: userObjectId,
            completed: true,
            completedAt: { $gte: startDate.toDate(), $lte: today.toDate() }
        });
    
        // Create a map of completed workout IDs
        const completedWorkoutIds = new Set();
        for (const progress of workoutProgressRecords) {
            if (progress.workoutId) {
                completedWorkoutIds.add(progress.workoutId.toString());
            }
        }
    
        // Initialize activity data structures for current period
        const activityData = {};
        const dateGroups = [];
        let currentDate = startDate.clone();
    
        // Create date buckets based on period
        if (groupBy === 'year') {
            // For year view, group by years (2021, 2022, etc.)
            while (currentDate.isSameOrBefore(today, 'year')) {
                const yearKey = currentDate.format('YYYY');
                activityData[yearKey] = {
                    date: yearKey,
                    steps: 0,
                    calories: 0,
                    distance: 0,
                    time: 0,
                    goalAchieved: false
                };
                dateGroups.push(yearKey);
                currentDate.add(1, 'year');
            }
        } else if (groupBy === 'month') {
            // For month view, group by months (Jan, Feb, etc.)
            while (currentDate.isSameOrBefore(today, 'month')) {
                const monthKey = currentDate.format('YYYY-MM');
                activityData[monthKey] = {
                    date: currentDate.format(dateFormat), // Jan, Feb, etc.
                    steps: 0,
                    calories: 0,
                    distance: 0,
                    time: 0,
                    goalAchieved: false
                };
                dateGroups.push(monthKey);
                currentDate.add(1, 'month');
            }
        } else {
            // For week view, use daily format (Sun, Mon, etc.)
            const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
            // Ensure we use the current week days
            for (let i = 0; i < 7; i++) {
                const date = moment().startOf('week').add(i, 'days');
                const dateKey = date.format('YYYY-MM-DD');
                const dayName = daysOfWeek[i];
    
                activityData[dateKey] = {
                    date: dayName,
                    steps: 0,
                    calories: 0,
                    distance: 0,
                    time: 0,
                    goalAchieved: false
                };
                dateGroups.push(dateKey);
            }
        }
    
        // Get user's daily step goal (default to 10,000)
        const dailyStepGoal = 10000;
    
        // Calculate periodic step goals
        const monthlyStepGoal = dailyStepGoal * 30;
        const yearlyStepGoal = dailyStepGoal * 365;
    
        // Process current period sessions
        for (const session of currentPeriodSessions) {
            try {
                // Debug session data
                console.log(`Processing session ${session._id}, startTime: ${moment(session.startTime).format('YYYY-MM-DD HH:mm')}, type: ${session.type}`);
                if (session.type === 'workout') {
                    console.log(`Workout details - steps: ${session.totalSteps}, calories: ${session.caloriesBurned}, distance: ${session.totalDistance}, duration: ${session.duration}`);
                }
    
                const sessionDate = moment(session.startTime);
                let dateKey;
    
                if (groupBy === 'year') {
                    dateKey = sessionDate.format('YYYY');
                } else if (groupBy === 'month') {
                    dateKey = sessionDate.format('YYYY-MM');
                } else {
                    dateKey = sessionDate.format('YYYY-MM-DD');
                }
    
                // Skip if we don't have this date in our date range
                if (!activityData[dateKey]) {
                    console.log(`Skipping session - date ${dateKey} not in range`);
                    continue;
                }
    
                // Process steps
                let steps = 0;
    
                if (session.type === 'freeWalk') {
                    if (session.actual && session.actual.steps) {
                        steps = parseInt(session.actual.steps, 10) || 0;
                    } else if (session.targets && session.targets.steps) {
                        steps = parseInt(session.targets.steps, 10) || 0;
                    }
                } else { // workout
                    steps = session.totalSteps || 0;
                }
    
                if (steps > 0) {
                    activityData[dateKey].steps += steps;
                    console.log(`Added ${steps} steps to ${dateKey}, total now: ${activityData[dateKey].steps}`);
                }
    
                // Process calories
                let calories = 0;
                if (session.type === 'freeWalk') {
                    if (session.actual && session.actual.calories) {
                        calories = parseInt(session.actual.calories, 10) || 0;
                    } else if (session.targets && session.targets.calories) {
                        calories = parseInt(session.targets.calories, 10) || 0;
                    }
                } else {
                    calories = session.caloriesBurned || 0;
                }
    
                activityData[dateKey].calories += calories;
                console.log(`Added ${calories} calories to ${dateKey}`);
    
                // Process distance
                let distance = 0;
                if (session.type === 'freeWalk') {
                    if (session.actual && session.actual.distance) {
                        distance = parseFloat(session.actual.distance) * 1000 || 0; // Convert to meters
                    } else if (session.targets && session.targets.distance) {
                        distance = parseFloat(session.targets.distance) * 1000 || 0; // Convert to meters
                    }
                } else {
                    distance = session.totalDistance || 0;
                }
    
                activityData[dateKey].distance += distance;
                console.log(`Added ${distance}m distance to ${dateKey}`);
    
                // Process time
                let duration = 0;
                if (session.duration) {
                    duration = parseInt(session.duration, 10);
                } else {
                    const startTime = moment(session.startTime);
                    const endTime = session.endTime ? moment(session.endTime) : moment(session.startTime).add(30, 'minutes');
                    duration = endTime.diff(startTime, 'minutes');
                }
    
                activityData[dateKey].time += duration;
                console.log(`Added ${duration} minutes to ${dateKey}`);
    
                // Check if goal achieved
                let goalForPeriod;
                if (groupBy === 'year') {
                    goalForPeriod = yearlyStepGoal;
                } else if (groupBy === 'month') {
                    goalForPeriod = monthlyStepGoal;
                } else {
                    goalForPeriod = dailyStepGoal;
                }
    
                // Mark as goal achieved if steps exceed goal or if this is a completed workout
                if (activityData[dateKey].steps >= goalForPeriod ||
                    (session.type === 'workout' && session.status === 'completed') ||
                    (session.type === 'workout' && completedWorkoutIds.has(session._id.toString())) ||
                    (session.type === 'freeWalk' && session.status === 'completed')) {
                    activityData[dateKey].goalAchieved = true;
                    console.log(`Goal achieved for ${dateKey}`);
                }
    
            } catch (error) {
                console.error(`Error processing session ${session._id}:`, error);
            }
        }
    
        // Calculate total steps and days with activity for current period
        let currentPeriodTotalSteps = 0;
        let daysWithActivity = 0;
        let goalsAchieved = 0;
        let totalCalories = 0;
        let totalDistance = 0;
        let totalTime = 0;
    
        Object.values(activityData).forEach(data => {
            if (data.steps > 0) {
                currentPeriodTotalSteps += data.steps;
                totalCalories += data.calories;
                totalDistance += data.distance;
                totalTime += data.time;
                daysWithActivity++;
            }
    
            if (data.goalAchieved) {
                goalsAchieved++;
            }
        });
    
        console.log(`Current period totals - steps: ${currentPeriodTotalSteps}, days with activity: ${daysWithActivity}, goals achieved: ${goalsAchieved}`);
    
        // Calculate current period average
        const currentPeriodAvg = daysWithActivity > 0 ?
            Math.round(currentPeriodTotalSteps / daysWithActivity) : 0;
    
        // Calculate previous period metrics
        let prevPeriodTotalSteps = 0;
        const activeDaysSet = new Set(); // Use a set to track unique active days
    
        for (const session of prevPeriodSessions) {
            try {
                const sessionDate = moment(session.startTime).format('YYYY-MM-DD');
                
                let steps = 0;
                if (session.type === 'freeWalk') {
                    if (session.actual && session.actual.steps) {
                        steps = parseInt(session.actual.steps, 10) || 0;
                    } else if (session.targets && session.targets.steps) {
                        steps = parseInt(session.targets.steps, 10) || 0;
                    }
                } else { // workout
                    steps = session.totalSteps || 0;
                }
    
                if (steps > 0) {
                    prevPeriodTotalSteps += steps;
                    activeDaysSet.add(sessionDate);
                    console.log(`Previous period - added ${steps} steps from ${sessionDate}`);
                }
            } catch (error) {
                console.error(`Error processing previous period session:`, error);
            }
        }
    
        const prevPeriodDaysWithActivity = activeDaysSet.size;
        console.log(`Previous period - total steps: ${prevPeriodTotalSteps}, days with activity: ${prevPeriodDaysWithActivity}`);
    
        const prevPeriodAvg = prevPeriodDaysWithActivity > 0 ?
            Math.round(prevPeriodTotalSteps / prevPeriodDaysWithActivity) : 0;
    
        // Calculate percentage change
        let percentChange = 0;
        if (prevPeriodAvg > 0) {
            percentChange = Math.round(((currentPeriodAvg - prevPeriodAvg) / prevPeriodAvg) * 100);
        } else if (currentPeriodAvg > 0) {
            percentChange = 100; // If previous period was 0, but this period has steps
        }
    
        console.log(`Current period avg: ${currentPeriodAvg}, previous period avg: ${prevPeriodAvg}, percent change: ${percentChange}%`);
    
        // Format chart data in the required order
        const chartData = dateGroups.map(key => {
            const data = activityData[key];
            return {
                day: data.date, // For any period type, use 'day' as the key
                steps: data.steps,
                calories: data.calories,
                distance: data.distance,
                time: data.time,
                goalAchieved: data.goalAchieved
            };
        });
    
        // Generate insight message
        const stepDifference = currentPeriodAvg - prevPeriodAvg;
        const insightMessage = stepDifference !== 0
            ? `You walked an average of ${currentPeriodAvg} steps per day this ${periodUnit}, which is ${Math.abs(stepDifference)} steps ${stepDifference > 0 ? 'higher' : 'lower'} than your average from last ${periodUnit}`
            : `You walked an average of ${currentPeriodAvg} steps per day this ${periodUnit}, which is the same as last ${periodUnit}`;
    
        // Determine label for the period
        let periodLabel;
        if (groupBy === 'year') {
            periodLabel = 'years';
        } else if (groupBy === 'month') {
            periodLabel = 'months';
        } else {
            periodLabel = 'days';
        }
    
        // Calculate average metrics
        const avgCalories = daysWithActivity > 0 ? Math.round(totalCalories / daysWithActivity) : 0;
        const avgDistance = daysWithActivity > 0 ? (totalDistance / daysWithActivity / 1000).toFixed(2) : "0.00";
        const avgTime = daysWithActivity > 0 ? Math.round(totalTime / daysWithActivity) : 0;
    
        // Format total distance for display
        const totalDistanceKm = (totalDistance / 1000).toFixed(2);
    
        return {
            success: true,
            data: {
                thisWeek: {
                    average: currentPeriodAvg,
                    unit: "steps/day"
                },
                lastWeek: {
                    average: prevPeriodAvg,
                    unit: "steps/day"
                },
                goalAchieved: {
                    count: `${goalsAchieved}/${numberOfDays} ${periodLabel}`,
                    percentage: percentChange >= 0 ? `+${percentChange}%` : `${percentChange}%`
                },
                percentageChange: percentChange,
                metrics: {
                    steps: {
                        total: currentPeriodTotalSteps,
                        average: currentPeriodAvg
                    },
                    calories: {
                        total: totalCalories,
                        average: avgCalories
                    },
                    distance: {
                        total: totalDistanceKm,
                        average: avgDistance,
                        unit: "km"
                    },
                    time: {
                        total: this._formatTime(totalTime),
                        average: this._formatTime(avgTime)
                    }
                },
                chartData: chartData,
                insight: insightMessage,
                period: period
            }
        };
    }

        /**
     * Get the "My Day" insights data
     * - Today's steps, calories, distance, time
     * - Average steps per day 
     * - Hourly activity chart for today
     * - Step change from yesterday
     * 
     * @param {String} userId - User ID
     * @returns {Object} My Day data
     */
    async getMyDay(userId) {
        console.log(`Getting my day insights for userId: ${userId}`);
    
        // Validate userId
        let userObjectId;
        try {
            userObjectId = new mongoose.Types.ObjectId(userId);
        } catch (error) {
            console.error(`Invalid userId format: ${userId}`);
            return { success: false, message: "Invalid user ID format" };
        }
    
        // Define the date ranges
        const today = moment().startOf('day');
        const tomorrow = moment(today).add(1, 'day');
        const yesterday = moment(today).subtract(1, 'day');
        const lastWeek = moment(today).subtract(7, 'days');
    
        // Get today's sessions
        const todaySessions = await this._getActivitySessions(userObjectId, today, tomorrow);
        console.log(`Found ${todaySessions.length} sessions for today`);
    
        // Get yesterday's sessions
        const yesterdaySessions = await this._getActivitySessions(userObjectId, yesterday, today);
        console.log(`Found ${yesterdaySessions.length} sessions for yesterday`);
    
        // Get past week sessions for average (excluding today)
        const pastWeekSessions = await this._getActivitySessions(userObjectId, lastWeek, today);
    
        // Initialize metrics for today
        let todaySteps = 0;
        let todayCalories = 0;
        let todayDistance = 0; // in meters
        let todayTime = 0; // in minutes
    
        // Initialize hourly metrics objects
        const hourlySteps = {};
        const hourlyCalories = {};
        const hourlyDistance = {};
        const hourlyTime = {};
        
        for (let i = 0; i < 24; i++) {
            hourlySteps[i] = 0;
            hourlyCalories[i] = 0;
            hourlyDistance[i] = 0;
            hourlyTime[i] = 0;
        }
    
        // Process today's sessions to calculate metrics
        for (const session of todaySessions) {
            // Process steps
            let steps = 0;
            if (session.type === 'freeWalk') {
                if (session.actual && session.actual.steps) {
                    steps = parseInt(session.actual.steps, 10) || 0;
                } else if (session.targets && session.targets.steps) {
                    steps = parseInt(session.targets.steps, 10) || 0;
                }
            } else { // workout session
                steps = session.totalSteps || 0;
            }
            todaySteps += steps;
    
            // Process calories
            let calories = 0;
            if (session.type === 'freeWalk') {
                if (session.actual && session.actual.calories) {
                    calories = parseInt(session.actual.calories, 10) || 0;
                } else if (session.targets && session.targets.calories) {
                    calories = parseInt(session.targets.calories, 10) || 0;
                }
            } else {
                calories = session.caloriesBurned || 0;
            }
            todayCalories += calories;
    
            // Process distance
            let distance = 0;
            if (session.type === 'freeWalk') {
                if (session.actual && session.actual.distance) {
                    distance = parseFloat(session.actual.distance) * 1000 || 0; // Convert to meters
                } else if (session.targets && session.targets.distance) {
                    distance = parseFloat(session.targets.distance) * 1000 || 0; // Convert to meters
                }
            } else {
                distance = session.totalDistance || 0; // Assuming already in meters
            }
            todayDistance += distance;
    
            // Process time
            let duration = 0;
            if (session.duration) {
                duration = parseInt(session.duration, 10);
            } else {
                const startTime = moment(session.startTime);
                const endTime = session.endTime ? moment(session.endTime) : moment(session.startTime).add(30, 'minutes');
                duration = endTime.diff(startTime, 'minutes');
            }
            todayTime += duration;
    
            // Distribute metrics across hours
            const startTime = moment(session.startTime);
            const endTime = session.endTime ? moment(session.endTime) : moment();
    
            console.log(`Processing session from ${startTime.format('HH:mm')} to ${endTime.format('HH:mm')}`);
    
            // If the session spans less than an hour, assign all metrics to the start hour
            if (startTime.format('YYYY-MM-DD HH') === endTime.format('YYYY-MM-DD HH')) {
                const hour = startTime.hour();
                hourlySteps[hour] += steps;
                hourlyCalories[hour] += calories;
                hourlyDistance[hour] += distance;
                hourlyTime[hour] += duration;
                console.log(`All metrics assigned to hour ${hour}:00`);
            } else {
                // Calculate duration in minutes
                const durationMinutes = endTime.diff(startTime, 'minutes');
    
                if (durationMinutes <= 0) {
                    // If invalid duration, just add to the start hour
                    const hour = startTime.hour();
                    hourlySteps[hour] += steps;
                    hourlyCalories[hour] += calories;
                    hourlyDistance[hour] += distance;
                    hourlyTime[hour] += duration;
                    console.log(`Invalid duration - all metrics assigned to hour ${hour}:00`);
                } else {
                    // Calculate metrics per minute
                    const stepsPerMinute = steps / durationMinutes;
                    const caloriesPerMinute = calories / durationMinutes;
                    const distancePerMinute = distance / durationMinutes;
                    const timePerMinute = duration / durationMinutes;
    
                    // Distribute metrics across hours
                    let currentTime = startTime.clone();
    
                    while (currentTime.isBefore(endTime)) {
                        const hour = currentTime.hour();
    
                        // Calculate how many minutes in this hour
                        let minutesInThisHour;
                        if (currentTime.format('YYYY-MM-DD HH') === endTime.format('YYYY-MM-DD HH')) {
                            // For the last hour, use only minutes until end time
                            minutesInThisHour = endTime.minutes() - currentTime.minutes();
                            if (minutesInThisHour <= 0) {
                                minutesInThisHour = endTime.diff(currentTime, 'minutes');
                            }
                        } else {
                            // For intermediate hours, use minutes until next hour
                            minutesInThisHour = 60 - currentTime.minutes();
                        }
    
                        // Assign metrics to this hour
                        const hourSteps = Math.round(stepsPerMinute * minutesInThisHour);
                        const hourCalories = Math.round(caloriesPerMinute * minutesInThisHour);
                        const hourDistance = distancePerMinute * minutesInThisHour;
                        const hourTime = Math.round(timePerMinute * minutesInThisHour);
    
                        hourlySteps[hour] += hourSteps;
                        hourlyCalories[hour] += hourCalories;
                        hourlyDistance[hour] += hourDistance;
                        hourlyTime[hour] += hourTime;
    
                        // Move to next hour
                        currentTime.add(minutesInThisHour, 'minutes');
                    }
                }
            }
        }
    
        // Format hourly data for the chart
        const hourlyChartData = [];
        for (let i = 0; i < 24; i++) {
            hourlyChartData.push({
                hour: `${i}:00`,
                steps: hourlySteps[i] || 0,
                calories: hourlyCalories[i] || 0,
                distance: (hourlyDistance[i] / 1000).toFixed(2) || "0.00", // Convert to km
                time: hourlyTime[i] || 0 // In minutes
            });
        }
    
        // Calculate yesterday's metrics
        const yesterdaySteps = this._calculateTotalSteps(yesterdaySessions);
    
        // Calculate average from past week
        const daysWithActivity = new Set();
        let pastWeekTotalSteps = 0;
    
        for (const session of pastWeekSessions) {
            const sessionDate = moment(session.startTime).format('YYYY-MM-DD');
            daysWithActivity.add(sessionDate);
    
            if (session.type === 'freeWalk') {
                pastWeekTotalSteps += parseInt(session.actual?.steps || session.targets?.steps || 0, 10);
            } else {
                pastWeekTotalSteps += session.totalSteps || 0;
            }
        }
    
        const avgDailySteps = daysWithActivity.size > 0
            ? Math.round(pastWeekTotalSteps / daysWithActivity.size)
            : 0;
    
        // Calculate step change from yesterday
        let stepChange = todaySteps - yesterdaySteps;
        let changeText = stepChange > 0 ? `+${stepChange}` : stepChange.toString();
    
        // If no steps yesterday but steps today, show total steps as change
        if (yesterdaySteps === 0 && todaySteps > 0) {
            changeText = `+${todaySteps}`;
        }
    
        // Format distance for display (convert meters to km)
        const displayDistance = (todayDistance / 1000).toFixed(2);
        
        // Format time for display
        const displayTime = this._formatTime(todayTime);
    
        return {
            success: true,
            data: {
                today: {
                    steps: todaySteps,
                    change: changeText,
                    calories: todayCalories,
                    distance: displayDistance, // in km
                    time: displayTime
                },
                average: {
                    steps: avgDailySteps,
                },
                hourlyChart: hourlyChartData,
                metrics: {
                    steps: todaySteps,
                    calories: todayCalories,
                    distance: displayDistance,
                    time: displayTime
                }
            }
        };
    }


    /**
     * Helper method to get activity sessions (both free walk and workouts)
     * @private
     */
    async _getActivitySessions(userId, startDate, endDate) {
        const sessions = [];

        try {
            // Get free walk sessions
            const freeWalkSessions = await FreeWalkSession.find({
                userId: userId,
                startTime: { $gte: startDate.toDate(), $lt: endDate.toDate() }
            });

            // Add type identifier
            for (const session of freeWalkSessions) {
                session.type = 'freeWalk';
                sessions.push(session);
            }

            // Get workout sessions
            const workoutSessions = await WorkoutSession.find({
                userId: userId,
                startTime: { $gte: startDate.toDate(), $lt: endDate.toDate() }
            });

            // Add type identifier
            for (const session of workoutSessions) {
                session.type = 'workout';
                sessions.push(session);
            }
        } catch (error) {
            console.error('Error fetching activity sessions:', error);
        }

        return sessions;
    }

    /**
     * Helper method to process daily steps from sessions
     * @private
     */
    _processDailySteps(sessions, startDate, endDate) {
        const dailySteps = {
            'Sun': { steps: 0, goalAchieved: false },
            'Mon': { steps: 0, goalAchieved: false },
            'Tue': { steps: 0, goalAchieved: false },
            'Wed': { steps: 0, goalAchieved: false },
            'Thu': { steps: 0, goalAchieved: false },
            'Fri': { steps: 0, goalAchieved: false },
            'Sat': { steps: 0, goalAchieved: false }
        };

        const dailyStepGoal = 10000; // Default daily step goal

        for (const session of sessions) {
            const sessionDate = moment(session.startTime);
            const dayOfWeek = sessionDate.format('ddd');

            let steps = 0;
            if (session.type === 'freeWalk') {
                if (session.actual && session.actual.steps) {
                    steps = parseInt(session.actual.steps, 10) || 0;
                } else if (session.targets && session.targets.steps) {
                    steps = parseInt(session.targets.steps, 10) || 0;
                }
            } else { // workout session
                steps = session.totalSteps || 0;
            }

            dailySteps[dayOfWeek].steps += steps;

            // Mark goal achieved if completed session or steps exceed goal
            if ((session.status === 'completed') || dailySteps[dayOfWeek].steps >= dailyStepGoal) {
                dailySteps[dayOfWeek].goalAchieved = true;
            }
        }

        return dailySteps;
    }

    /**
     * Helper method to calculate total steps from sessions
     * @private
     */
    _calculateTotalSteps(sessions) {
        let totalSteps = 0;

        for (const session of sessions) {
            if (session.type === 'freeWalk') {
                if (session.actual && session.actual.steps) {
                    totalSteps += parseInt(session.actual.steps, 10) || 0;
                } else if (session.targets && session.targets.steps) {
                    totalSteps += parseInt(session.targets.steps, 10) || 0;
                }
            } else { // workout session
                totalSteps += session.totalSteps || 0;
            }
        }

        return totalSteps;
    }

    /**
     * Helper method to calculate hourly steps distribution
     * @private
     */
    _calculateHourlySteps(sessions) {
        const hourlySteps = {};
        for (let i = 0; i < 24; i++) {
            hourlySteps[i] = 0;
        }

        for (const session of sessions) {
            let steps = 0;

            if (session.type === 'freeWalk') {
                if (session.actual && session.actual.steps) {
                    steps = parseInt(session.actual.steps, 10) || 0;
                } else if (session.targets && session.targets.steps) {
                    steps = parseInt(session.targets.steps, 10) || 0;
                }
            } else { // workout session
                steps = session.totalSteps || 0;
            }

            if (steps > 0) {
                const startTime = moment(session.startTime);
                const endTime = session.endTime ? moment(session.endTime) : moment();

                this._distributeStepsToHours(startTime, endTime, steps, hourlySteps);
            }
        }

        return hourlySteps;
    }

    /**
     * Helper method to format time in hours and minutes
     * @private
     */
    _formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;
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

module.exports = new ActivityInsightService();