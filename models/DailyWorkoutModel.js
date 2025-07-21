const mongoose = require('mongoose');

const dailyWorkoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  workoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workout',
    required: true
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutSchedule'
  },
  targetSteps: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutSession'
  },
  activeSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutSession'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for efficient lookups
dailyWorkoutSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyWorkout', dailyWorkoutSchema);