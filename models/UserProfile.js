const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  gender: {
    type: String,
    default: null
  },
  fitnessGoals: [{
    type: String
  }],
  bodyType: {
    type: String,
    default: null
  },
  targetBodyType: {
    type: String,
    default: null
  },
  bodyPartsToToneUp: [{
    type: String
  }],
  weightHappiness: {
    type: String,
    default: null
  },
  displayName: {
    type: String,
    default: null
  },
  fitnessLevel: {
    type: String,
    default: null
  },
  energyBetweenMeals: {
    type: String,
    default: null
  },
  dailyWalkingTime: {
    type: String,
    default: null
  },
  stairClimbingCapacity: {
    type: String,
    default: null
  },
  focusAreas: [{
    type: String
  }],
  weightGainFactors: [{
    type: String
  }],
  dietaryVices: [{
    type: String
  }],
  stepGoal: {
    type: Number,
    default: 10000
  },
  waterConsumption: {
    type: String,
    default: null
  },
  sleepDuration: {
    type: String,
    default: null
  },
  age: {
    type: Number,
    min: 13,
    max: 120
  },
  currentWeight: {
    type: Number,
    min: 20
  },
  targetWeight: {
    type: Number,
    min: 20
  },
  height: {
    type: Number, // storing in cm for consistency
    min: 100,
    max: 250
  },
  weightUnit: {
    type: String,
    default: 'kg'
  },
  heightUnit: {
    type: String,
    default: 'cm'
  },
  bmi: {
    type: Number,
    min: 10,
    max: 50
  },
  bmiCategory: {
    type: String,
    default: null
  },
  lifestyle: {
    type: String,
    default: null
  },
  exerciseFrequency: {
    type: String,
    default: null
  },
  activityLevel: {
    type: String,
    default: null
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

// Update the updatedAt timestamp on save
userProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('UserProfile', userProfileSchema);