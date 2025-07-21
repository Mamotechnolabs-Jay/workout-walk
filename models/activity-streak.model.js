const mongoose = require('mongoose');

// Activity Streak Model - for tracking user consistency
const activityStreakSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  streakType: {
    type: String,
    enum: ['daily_steps', 'workout_completion', 'login_streak', 'goal_achievement'],
    required: true
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastActivityDate: {
    type: Date,
    default: null
  },
  streakStartDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Streak milestones
  milestones: [{
    days: Number,
    achievedAt: Date,
    rewarded: {
      type: Boolean,
      default: false
    }
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

// Create index for better performance
activityStreakSchema.index({ userId: 1, streakType: 1 });

// Pre-save middleware for activityStreak
activityStreakSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('ActivityStreak', activityStreakSchema);