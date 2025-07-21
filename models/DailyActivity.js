const mongoose = require('mongoose');

// Daily Activity Tracking Model
const dailyActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  steps: {
    current: {
      type: Number,
      default: 0
    },
    goal: {
      type: Number,
      default: 10000
    }
  },
  distance: {
    type: Number, // in km
    default: 0
  },
  calories: {
    type: Number,
    default: 0
  },
  activeMinutes: {
    type: Number,
    default: 0
  },
  workoutSessions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutSession'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes
dailyActivitySchema.index({ userId: 1, date: -1 });
dailyActivitySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyActivity', dailyActivitySchema);