const mongoose = require('mongoose');

// User Activity Preferences Model - for personalized experience
const userActivityPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Goals and preferences
  dailyStepsGoal: {
    type: Number,
    default: 10000
  },
  weeklyStepsGoal: {
    type: Number,
    default: 70000
  },
  preferredActivities: [{
    type: String,
    enum: ['walking', 'running', 'cycling', 'swimming', 'yoga', 'strength', 'cardio', 'hiit']
  }],
  activityLevel: {
    type: String,
    enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    default: 'moderate'
  },
  // Notification preferences
  notifications: {
    stepGoalReminders: {
      type: Boolean,
      default: true
    },
    inactivityAlerts: {
      type: Boolean,
      default: true
    },
    achievementCelebrations: {
      type: Boolean,
      default: true
    },
    weeklyReports: {
      type: Boolean,
      default: true
    }
  },
  // Tracking preferences
  trackingSettings: {
    locationTracking: {
      type: Boolean,
      default: false
    },
    autoDetectWorkouts: {
      type: Boolean,
      default: true
    },
    heartRateMonitoring: {
      type: Boolean,
      default: false
    }
  },
  // Personal metrics
  personalMetrics: {
    height: Number, // in cm
    weight: Number, // in kg
    age: Number,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    fitnessLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    }
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

// Create index for better performance
userActivityPreferencesSchema.index({ userId: 1 });

// Pre-save middleware for userActivityPreferences
userActivityPreferencesSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('UserActivityPreferences', userActivityPreferencesSchema);