const mongoose = require('mongoose');

const personalizedWorkoutPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  planName: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  fitnessGoalsFocused: [{
    type: String,
    enum: ['relieve_stress', 'improve_heart_health', 'get_outdoors', 'lose_weight', 'get_firm_and_toned']
  }],
  workouts: [{
    workoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workout',
      required: true
    },
    scheduledDay: {
      type: Number, // 0 = Sunday, 1 = Monday, etc.
      required: true 
    },
    weekNumber: {
      type: Number,
      required: true
    }
  }],
  progressiveOverload: {
    type: Boolean,
    default: true
  },
  targetStepsProgression: {
    startingSteps: {
      type: Number
    },
    weeklyIncrement: {
      type: Number
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

// Create index for faster lookup
personalizedWorkoutPlanSchema.index({ userId: 1 });

module.exports = mongoose.model('PersonalizedWorkoutPlan', personalizedWorkoutPlanSchema);