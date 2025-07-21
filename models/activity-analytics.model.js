const mongoose = require('mongoose');

// Detailed Activity Analytics Model - for comprehensive statistics
const activityAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  // Hourly breakdown for "My Day" view
  hourlyData: [{
    hour: {
      type: Number,
      min: 0,
      max: 23
    },
    steps: {
      type: Number,
      default: 0
    },
    calories: {
      type: Number,
      default: 0
    },
    distance: {
      type: Number,
      default: 0
    },
    activeMinutes: {
      type: Number,
      default: 0
    }
  }],
  // Daily summary
  dailySummary: {
    totalSteps: {
      type: Number,
      default: 0
    },
    stepsGoal: {
      type: Number,
      default: 10000
    },
    goalAchieved: {
      type: Boolean,
      default: false
    },
    averageSteps: Number,
    peakActivityHour: Number,
    totalCalories: Number,
    totalDistance: Number,
    totalActiveMinutes: Number
  },
  // Activity patterns
  activityPatterns: {
    morningActivity: Number, // 6AM-12PM
    afternoonActivity: Number, // 12PM-6PM
    eveningActivity: Number, // 6PM-12AM
    nightActivity: Number, // 12AM-6AM
    mostActiveTimeRange: String,
    activityDistribution: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for better performance
activityAnalyticsSchema.index({ userId: 1, date: -1 });
activityAnalyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ActivityAnalytics', activityAnalyticsSchema);