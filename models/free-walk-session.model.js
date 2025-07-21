const mongoose = require('mongoose');

// Free Walk Session Model - for tracking various exercise activities
const freeWalkSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  // Session details
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  // Activity Type (walking, cycling, etc.)
  activityType: {
    type: String,
    default: 'walking'
  },
  // Goal Type (time, steps, distance, calories, goal-free)
  goalType: {
    type: String,
    default: 'steps'
  },
  // Target metrics (based on goal type) - All as strings
  targets: {
    time: String,     // "30"
    distance: String, // "5.0"
    calories: String, // "300"
    steps: String     // "10000"
  },
  // Actual metrics achieved - All as strings
  actual: {
    steps: {
      type: String,
      default: "0"
    },
    distance: {
      type: String,
      default: "0.0"
    },
    calories: {
      type: String,
      default: "0"
    },
    duration: {
      type: String,
      default: "0"
    }
  },
  // Location tracking
  locationTracking: {
    enabled: {
      type: Boolean,
      default: false
    },
    permissionGranted: {
      type: Boolean,
      default: false
    },
    startLocation: {
      latitude: String,
      longitude: String,
      timestamp: Date
    },
    endLocation: {
      latitude: String,
      longitude: String,
      timestamp: Date
    },
    route: [{
      latitude: String,
      longitude: String,
      timestamp: Date
    }]
  },
  // Real-time tracking data
  realTimeData: [{
    timestamp: Date,
    steps: String,
    distance: String,
    calories: String,
    speed: String // "5.2"
  }],
  // Activity-specific metrics (for cycling, etc.)
  activityMetrics: {
    // Flexible schema for additional metrics
    averageSpeed: String, // "12.5"
    maxSpeed: String,     // "15.3"
    elevationGain: String, // "125"
    cadence: String,      // "75"
    heartRate: String,    // "120"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// Create indexes for better performance
freeWalkSessionSchema.index({ userId: 1, startTime: -1 });
freeWalkSessionSchema.index({ sessionId: 1 });
freeWalkSessionSchema.index({ userId: 1, activityType: 1 });
freeWalkSessionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('FreeWalkSession', freeWalkSessionSchema);