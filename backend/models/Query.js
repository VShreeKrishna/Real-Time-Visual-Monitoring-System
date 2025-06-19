const mongoose = require('mongoose');

const QuerySchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    maxlength: 200
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  results: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  responseTime: {
    type: Number, // in milliseconds
    required: true
  },
  resultCount: {
    type: Number,
    default: 0
  },
  queryType: {
    type: String,
    enum: ['time_based', 'activity_based', 'object_based', 'general'],
    default: 'general'
  },
  parameters: {
    startTime: Date,
    endTime: Date,
    eventTypes: [String],
    location: String
  }
}, {
  timestamps: true
});

QuerySchema.index({ timestamp: -1 });
QuerySchema.index({ queryType: 1 });

module.exports = mongoose.model('Query', QuerySchema);