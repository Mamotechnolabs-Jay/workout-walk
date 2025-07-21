const mongoose = require('mongoose');

// Challenge Progress Model - optimized for daily tracking
const challengeProgressSchema = new mongoose.Schema({
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
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserChallengeEnrollment',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  userSteps: {
    type: Number,
    default: 0
  },
  targetValue: {
    type: Number,
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for better query performance
challengeProgressSchema.index({ userId: 1, challenge: 1, date: 1 });
challengeProgressSchema.index({ userId: 1, enrollment: 1, date: 1 });
challengeProgressSchema.index({ enrollment: 1, isCompleted: 1 });

module.exports = mongoose.model('ChallengeProgress', challengeProgressSchema);