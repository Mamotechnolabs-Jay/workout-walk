const mongoose = require('mongoose');

const workoutSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workout'
  },
  workoutName: {
    type: String,
    required: true
  },
  // New program-related fields
  programId: {
    type: String
  },
  programName: {
    type: String
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'paused', 'cancelled'],
    default: 'in_progress'
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  totalDistance: {
    type: Number, // in meters
    default: 0
  },
  totalSteps: {
    type: Number,
    default: 0
  },
  caloriesBurned: {
    type: Number,
    default: 0
  },
  averagePace: {
    type: Number, // seconds per km
  },
  activityType: {
    type: String,
    enum: ['outdoor', 'treadmill'],
    default: 'outdoor'
  },
  route: {
    type: {
      type: String,
      enum: ['LineString'],
    },
    coordinates: {
      type: [[Number]], // Array of [longitude, latitude] points
    }
  },
  elevationGain: {
    type: Number, // in meters
    default: 0
  },
  heartRateData: [{
    timestamp: Date,
    value: Number // beats per minute
  }],
  weatherConditions: {
    temperature: Number, // in celsius
    humidity: Number, // percentage
    windSpeed: Number, // km/h
    conditions: String // sunny, cloudy, rainy, etc.
  },
  notes: {
    type: String
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

// Index for geospatial queries
workoutSessionSchema.index({ route: '2dsphere' });

module.exports = mongoose.model('WorkoutSession', workoutSessionSchema);