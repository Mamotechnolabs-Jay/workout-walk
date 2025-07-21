const mongoose = require('mongoose');

// User Insights Model - for generating personalized insights and analytics
const userInsightsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  insights: {
    // Activity insights
    averageSteps: {
      current: Number,
      previous: Number,
      change: Number,
      changePercentage: Number,
      trend: {
        type: String,
        enum: ['increasing', 'decreasing', 'stable']
      }
    },
    bestDay: {
      date: Date,
      steps: Number,
      dayOfWeek: String
    },
    totalWorkouts: {
      current: Number,
      previous: Number,
      change: Number
    },
    goalsAchieved: {
      current: Number,
      total: Number,
      achievementRate: Number
    },
    // Performance insights
    mostActiveDay: String,
    leastActiveDay: String,
    averageActiveMinutes: Number,
    totalDistance: Number,
    totalCalories: Number,
    // Trends
    weekOverWeekImprovement: Number,
    consistencyScore: Number, // 0-100 based on daily activity consistency
    // Recommendations
    recommendations: [{
      type: {
        type: String,
        enum: ['increase_steps', 'maintain_consistency', 'try_new_workout', 'rest_day', 'goal_adjustment']
      },
      message: String,
      priority: {
        type: String,
        enum: ['high', 'medium', 'low']
      }
    }]
  },
  // Motivational messages
  achievements: [{
    type: String,
    message: String,
    earnedAt: Date
  }],
  // Health metrics insights
  healthMetrics: {
    caloriesBurnTrend: String,
    paceImprovement: String,
    enduranceLevel: String
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

// Create indexes for better performance
userInsightsSchema.index({ userId: 1, date: -1, period: 1 });
userInsightsSchema.index({ userId: 1, period: 1, date: -1 });

// Pre-save middleware for userInsights to update timestamps
userInsightsSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('UserInsights', userInsightsSchema);