const WorkoutService = require('../services/workoutService');
const Workout = require('../models/WorkoutModel');
const WorkoutSession = require('../models/WorkoutSession');
const UserProfile = require('../models/UserProfile');
const WorkoutProgram = require('../models/WorkoutProgram');
const ChallengeService = require('../services/challengeService');

// GET today's workout for the home screen
exports.getTodaysWorkout = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get today's workout using the service
    const dailyWorkout = await WorkoutService.getTodaysWorkout(userId);
    
    if (!dailyWorkout || !dailyWorkout.workoutId) {
      return res.status(404).json({
        success: false,
        message: 'No workout scheduled for today'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        dailyWorkout,
        workout: dailyWorkout.workoutId,
        activeSession: dailyWorkout.activeSessionId,
        completedSession: dailyWorkout.completedSessionId,
        targetSteps: dailyWorkout.targetSteps,
        completed: dailyWorkout.completed
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s workout',
      error: error.message
    });
  }
};

// GET all workout categories
exports.getWorkoutCategories = async (req, res) => {
  try {
    // Get all workout categories from service
    const categories = await WorkoutService.fetchWorkoutCategories();
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout categories',
      error: error.message
    });
  }
};

// GET workout programs within a category
exports.getWorkoutProgramsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const userId = req.user._id;
    
    // Get programs within this category
    const programs = await WorkoutService.fetchWorkoutProgramsByCategory(categoryId);
    
    // Get progress for each program
    const programsWithProgress = await Promise.all(
      programs.map(async (program) => {
        const progress = await WorkoutService.getUserProgramProgress(userId, program.id);
        
        return {
          id: program.id,
          name: program.name,
          description: program.description,
          image: program.image,
          difficulty: program.difficulty,
          duration: program.duration,
          totalWorkouts: program.totalWorkouts,
          completedWorkouts: progress.completedWorkouts,
          progress: progress.progress
        };
      })
    );
    
    res.status(200).json({
      success: true,
      count: programsWithProgress.length,
      data: programsWithProgress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout programs',
      error: error.message
    });
  }
};

// GET individual workouts within a program 
exports.getWorkoutsByProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const userId = req.user._id;
    
    // Get program details
    const program = await WorkoutService.fetchWorkoutProgram(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Workout program not found'
      });
    }
    
    // Get workouts in this program with user progress
    const workouts = await WorkoutService.fetchWorkoutsByProgram(programId, userId);
    
    // Get overall program progress
    const progress = await WorkoutService.getUserProgramProgress(userId, programId);
    
    // Return program details and workouts
    res.status(200).json({
      success: true,
      data: {
        program: {
          id: program.id,
          name: program.name,
          description: program.description,
          image: program.image,
          difficulty: program.difficulty,
          duration: program.duration,
          totalWorkouts: progress.totalWorkouts,
          completedWorkouts: progress.completedWorkouts,
          progress: progress.progress
        },
        workouts: workouts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workouts',
      error: error.message
    });
  }
};

// GET specific workout details by ID
exports.getWorkoutById = async (req, res) => {
  try {
    const workout = await WorkoutService.getWorkoutDetails(req.params.id);
    
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: workout
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout',
      error: error.message
    });
  }
};

// POST - Start a workout session
exports.startWorkoutSession = async (req, res) => {
  try {
    const { workoutId } = req.body;
    const userId = req.user._id;
    
    // Find the workout
    const workout = await Workout.findById(workoutId);
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found'
      });
    }
    
    // Create a new workout session
    const session = new WorkoutSession({
      userId,
      workoutId,
      workoutName: workout.name,
      programId: workout.programId,
      programName: workout.programName,
      startTime: new Date(),
      status: 'in_progress'
    });
    
    await session.save();
    
    // Update the daily workout record if this is today's workout
    await WorkoutService.updateDailyWorkoutSessionStatus(userId, session._id, 'in_progress');
    
    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to start workout session',
      error: error.message
    });
  }
};

// PUT - Complete a workout session
exports.completeWorkoutSession = async (req, res) => {
  try {
    const sessionId = req.params.id;

    console.log(`Completing workout session with ID: ${sessionId}`);
    const userId = req.user._id;
    const { totalSteps, totalDistance, caloriesBurned } = req.body;
    
    // Find the session
    const session = await WorkoutSession.findOne({
      _id: sessionId,
      userId
    });
    
    console.log("Found session:", session);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Workout session not found'
      });
    }
    
    // Update session data
    session.endTime = new Date();
    session.status = 'completed';
    session.duration = Math.floor((session.endTime - session.startTime) / 1000);
    
    if (totalSteps) session.totalSteps = totalSteps;
    if (totalDistance) session.totalDistance = totalDistance;
    if (caloriesBurned) session.caloriesBurned = caloriesBurned;
    
    await session.save();
    
    // Update daily workout record and mark workout as completed
    await WorkoutService.updateDailyWorkoutSessionStatus(userId, session._id, 'completed');
    
    // If this workout is part of a program, mark it as completed in user's progress
    if (session.workoutId) {
      await WorkoutService.markWorkoutComplete(session.workoutId, userId);
    }
    
    // Check if user is enrolled in any challenges and update progress
    const workoutData = {
      steps: totalSteps,
      distance: totalDistance,
      duration: session.duration,
      workoutId: session.workoutId || session._id.toString()
    };
    
    await ChallengeService.updateWorkoutProgress(userId, workoutData);
    
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error completing workout session:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to complete workout session',
      error: error.message
    });
  }
};

// Function to be called when profile is updated
exports.regeneratePlanAfterProfileUpdate = async (userId) => {
  try {
    console.log(`Regenerating workout plan for user ${userId} after profile update`);
    
    // Generate a new personalized plan based on updated profile
    const newPlan = await WorkoutService.regenerateWorkoutsAfterProfileUpdate(userId);
    return newPlan;
  } catch (error) {
    console.error('Failed to regenerate workout plan after profile update:', error);
    throw error;
  }
};

exports.getTodayProgressBarData = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get progress bar data using the service
    const progressData = await WorkoutService.getTodayProgressBarData(userId);
    
    res.status(200).json({
      success: true,
      data: progressData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress bar data',
      error: error.message
    });
  }
};