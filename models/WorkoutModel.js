const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['walk', 'run', 'cardio', 'strength'], 
    default: 'walk'
  },
  category: {
    type: String,
    enum: ['weight_loss', 'progression', 'challenge', 'free', 'beginner', 'intermediate', 'advanced'],
    required: true
  },
  // New program-related fields
  programId: {
    type: String,
    required: false
  },
  programName: {
    type: String,
    required: false
  },
  order: {
    type: Number,
    default: 0
  },
  estimatedCalories: {
    type: Number,
    min: 0
  },
  targetDistance: {
    type: Number, // in km
    min: 0
  },
  duration: {
    type: Number, // in minutes
    min: 0,
    required: true
  },
  targetPace: {
    type: Number, // seconds per km
  },
  includesWarmup: {
    type: Boolean,
    default: true
  },
  includesCooldown: {
    type: Boolean,
    default: true
  },
  image: {
    type: String, // URL to workout image
  },
  intensity: {
    type: String,
    enum: ['light', 'moderate', 'intense'],
    default: 'moderate'
  },
  recommendedFor: [{
    type: String,
    enum: ['weight_loss', 'beginners', 'intermediate', 'advanced', 'heart_health', 'stress_relief']
  }],
  isPublic: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model('Workout', workoutSchema);