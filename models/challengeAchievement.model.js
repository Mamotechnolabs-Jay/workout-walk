const mongoose = require('mongoose');

// Challenge Achievement Model - for tracking completed challenges and rewards
const challengeAchievementSchema = new mongoose.Schema({
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
  completedOn: {
    type: Date,
    required: true,
    default: Date.now
  },
  rewardClaimed: {
    type: Boolean,
    default: false
  },
  rewardClaimedOn: Date,
  achievementBadge: {
    type: String,
    default: 'default_badge.png'
  },
  displayOnProfile: {
    type: Boolean,
    default: true
  }
});

// Create indexes
challengeAchievementSchema.index({ userId: 1 });
challengeAchievementSchema.index({ challenge: 1 });

module.exports = mongoose.model('ChallengeAchievement', challengeAchievementSchema);