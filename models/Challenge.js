const mongoose = require('mongoose');

// Challenge Model - for step-based and activity challenges
const challengeSchema = new mongoose.Schema({
  challengeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
 type: {
    type: String,
    enum: ['steps', 'distance', 'duration', 'streak', 'workout', 'unique_workouts', 'daily_steps', 'workout_streak', 'daily_duration', 'total_distance'],
    required: true
  },
  duration: {
    type: Number, // duration in days
    required: true
  },
  durationLabel: {
    type: String, // "3 day", "7 day", "28 day", "30 day"
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  targetValue: {
    type: Number, // e.g., 3000 steps for daily, 21000 for weekly
    required: true
  },
  targetLabel: {
    type: String, // "3,000 steps daily", "Walk 5km daily"
    required: true
  },
  reward: {
    type: String, // description of reward
    default: null
  },
  imageUrl: {
    type: String
  },
  backgroundColor: {
    type: String,
    default: '#FF6B47'
  },
  iconType: {
    type: String,
    enum: ['star', 'trophy', 'medal', 'badge'],
    default: 'star'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes
challengeSchema.index({ challengeId: 1, isActive: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);