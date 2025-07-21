const mongoose = require('mongoose');

const workoutScheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workout',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'missed', 'rescheduled'],
    default: 'scheduled'
  },
  targetSteps: {
    type: Number,
    default: 0
  },
  actualSteps: {
    type: Number,
    default: 0
  },
  completedSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutSession'
  },
  isPriority: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String
  },
  reminderTime: {
    type: Date
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

// Create index for faster lookup of user's schedule
workoutScheduleSchema.index({ userId: 1, date: 1 });

// Pre-save middleware to update timestamps
workoutScheduleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WorkoutSchedule', workoutScheduleSchema);