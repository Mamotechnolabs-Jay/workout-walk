const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const {authmiddleware} = require('../middlewares/authMiddleware');

// Get today's workout
router.get('/today', authmiddleware, workoutController.getTodaysWorkout);

// Get all workout categories
router.get('/categories', authmiddleware, workoutController.getWorkoutCategories);

// Get workout programs within a category
router.get('/category/:categoryId/programs', authmiddleware, workoutController.getWorkoutProgramsByCategory);

// Get workouts within a program
router.get('/program/:programId/workouts', authmiddleware, workoutController.getWorkoutsByProgram);

// Get specific workout by ID
router.get('/:id', authmiddleware, workoutController.getWorkoutById);

// Start a workout session
router.post('/session/start', authmiddleware, workoutController.startWorkoutSession);

// Complete a workout session
router.put('/session/:id/complete', authmiddleware, workoutController.completeWorkoutSession);

// Get today's progress bar data
router.get('/progress/today', authmiddleware, workoutController.getTodayProgressBarData);

module.exports = router;