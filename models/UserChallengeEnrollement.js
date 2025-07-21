const mongoose = require('mongoose');

// User Challenge Enrollment Model
const userChallengeEnrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  currentDay: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed', 'abandoned'],
    default: 'active'
  },
  dailyProgress: [{
    day: Number,
    date: Date,
    targetValue: Number,
    achievedValue: Number,
    isCompleted: Boolean,
    completedAt: Date
  }],
  totalProgress: {
    type: Number,
    default: 0
  },
  completionPercentage: {
    type: Number,
    default: 0
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// Create indexes
userChallengeEnrollmentSchema.index({ userId: 1, status: 1 });
userChallengeEnrollmentSchema.index({ userId: 1, challenge: 1 });

module.exports = mongoose.model('UserChallengeEnrollment', userChallengeEnrollmentSchema);