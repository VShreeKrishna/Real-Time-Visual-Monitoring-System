const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  location: {
    type: String,
    required: true,
    default: 'Camera-1'
  },
  eventType: {
    type: String,
    required: true,
    enum: ['person_entered', 'person_exited', 'object_picked', 'object_placed', 'unusual_activity', 'multiple_people', 'loitering']
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  imageUrl: {
    type: String,
    required: false
  },
  boundingBoxes: [{
    object: {
      type: String,
      required: true
    },
    confidence: {
      type: Number,
      required: true
    },
    coordinates: {
      x: Number,
      y: Number,
      width: Number,
      height: Number
    }
  }],
  metadata: {
    objectsDetected: [String],
    personCount: {
      type: Number,
      default: 0
    },
    activityDuration: {
      type: Number, // in seconds
      default: 0
    },
    cameraId: {
      type: String,
      default: 'cam-001'
    }
  },
  processed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for better query performance
EventSchema.index({ timestamp: -1 });
EventSchema.index({ eventType: 1 });
EventSchema.index({ location: 1 });
EventSchema.index({ 'metadata.cameraId': 1 });

// Methods
EventSchema.methods.generateSummary = function() {
  return `${this.eventType.replace('_', ' ')} at ${this.location} on ${this.timestamp.toLocaleString()}`;
};

EventSchema.statics.getRecentEvents = function(hours = 24) {
  const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ timestamp: { $gte: hoursAgo } }).sort({ timestamp: -1 });
};

EventSchema.statics.getEventsByType = function(eventType) {
  return this.find({ eventType }).sort({ timestamp: -1 });
};

module.exports = mongoose.model('Event', EventSchema);