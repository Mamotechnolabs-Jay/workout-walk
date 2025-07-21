const mongoose = require('mongoose');

const userWorkoutProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workout',
    required: true
  },
  programId: {
    type: String
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
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

// Ensure unique combination of userId and workoutId
userWorkoutProgressSchema.index({ userId: 1, workoutId: 1 }, { unique: true });

module.exports = mongoose.model('UserWorkoutProgress', userWorkoutProgressSchema);