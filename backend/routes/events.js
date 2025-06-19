// backend/routes/events.js
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Query = require('../models/Query');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/events');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const eventType = req.body.eventType || 'event';
    cb(null, `${eventType}_${timestamp}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });

// GET /api/events - Fetch all events with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = {};

    if (req.query.eventType) filter.eventType = req.query.eventType;
    if (req.query.location) filter.location = req.query.location;
    if (req.query.startDate && req.query.endDate) {
      filter.timestamp = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const events = await Event.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(filter);

    res.json({
      success: true,
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/events/recent
router.get('/recent', async (req, res) => {
  try {
    const { hours = 24, limit = 50 } = req.query;
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

    const events = await Event.find({ timestamp: { $gte: hoursAgo } })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, events, count: events.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/events/stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Aggregate event counts by type
    const stats = await Event.aggregate([
      { $match: { timestamp: { $gte: today } } },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' }
        }
      }
    ]);

    // Count total events today
    const totalEvents = await Event.countDocuments({ timestamp: { $gte: today } });

    // Calculate peopleDetected (sum of personCount in today's events)
    const peopleDetectedAgg = await Event.aggregate([
      { $match: { timestamp: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$metadata.personCount' } } }
    ]);
    const peopleDetected = peopleDetectedAgg[0]?.total || 0;

    // Count security alerts (unusual_activity, loitering, multiple_people)
    const securityAlerts = await Event.countDocuments({
      timestamp: { $gte: today },
      eventType: { $in: ['unusual_activity', 'loitering', 'multiple_people'] }
    });

    res.json({
      success: true,
      totalEvents,
      peopleDetected,
      securityAlerts,
      activeCameras: 1, // static for now
      eventsByType: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events - With image upload
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const eventData = {
      eventType: req.body.eventType,
      description: req.body.description,
      confidence: parseFloat(req.body.confidence),
      location: req.body.location || 'Camera-1',
      boundingBoxes: req.body.boundingBoxes ? JSON.parse(req.body.boundingBoxes) : [],
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
    };

    if (req.file) {
      eventData.imageUrl = `/uploads/events/${req.file.filename}`;
    }

    const event = new Event(eventData);
    await event.save();

    const io = req.app.get('io');
    io.emit('new-event', { event, message: 'New event detected' });

    res.status(201).json({ success: true, message: 'Event created', event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events/from-python
router.post('/from-python', async (req, res) => {
  try {
    const {
      timestamp,
      location,
      eventType,
      description,
      confidence,
      boundingBoxes,
      metadata,
      imageBase64
    } = req.body;

    let imageUrl = null;

    if (imageBase64) {
      const uploadsDir = path.join(__dirname, '../uploads/events');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `event_${Date.now()}_${eventType}.jpg`;
      const fullPath = path.join(uploadsDir, filename);
      fs.writeFileSync(fullPath, Buffer.from(imageBase64, 'base64'));
      imageUrl = `/uploads/events/${filename}`;
    }

    const event = new Event({
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      location,
      eventType,
      description,
      confidence,
      boundingBoxes: boundingBoxes || [],
      metadata: metadata || {},
      imageUrl
    });

    const savedEvent = await event.save();
    const io = req.app.get('io');
    io.emit('new-event', { event: savedEvent, message: 'AI Detection: ' + description });

    res.status(200).json({ success: true, message: 'Event received', eventId: savedEvent._id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/events/query - Natural language processing
router.get('/query', async (req, res) => {
  try {
    const { question } = req.query;
    if (!question) return res.status(400).json({ success: false, error: 'Query question is required' });

    const startTime = Date.now();
    const results = await processNaturalLanguageQuery(question);
    const responseTime = Date.now() - startTime;

    const query = new Query({
      query: question,
      results: results.map(r => r._id),
      responseTime,
      resultCount: results.length,
      queryType: determineQueryType(question)
    });
    await query.save();

    res.json({
      success: true,
      question,
      results,
      summary: generateQuerySummary(results, question),
      responseTime
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper - Process natural language query
async function processNaturalLanguageQuery(question) {
  const lower = question.toLowerCase();
  const filter = {};

  // Time-based queries
  if (lower.includes('today')) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filter.timestamp = { $gte: today };
  } else if (lower.includes('yesterday')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filter.timestamp = { $gte: yesterday, $lt: today };
  } else if (lower.includes('last hour')) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    filter.timestamp = { $gte: hourAgo };
  }

  // Support for 'last X minutes' queries
  const lastMinutesMatch = lower.match(/last (\d{1,3}) ?minutes?/);
  if (lastMinutesMatch) {
    const minutes = parseInt(lastMinutesMatch[1]);
    if (!isNaN(minutes) && minutes > 0) {
      const minAgo = new Date(Date.now() - minutes * 60 * 1000);
      filter.timestamp = { $gte: minAgo };
    }
  }

  // Time range (e.g., 'between 2pm and 3pm')
  const timeRangeMatch = lower.match(/between (\d{1,2})(am|pm)? and (\d{1,2})(am|pm)?/);
  if (timeRangeMatch) {
    const now = new Date();
    const startHour = parseInt(timeRangeMatch[1]);
    const startPeriod = timeRangeMatch[2] || '';
    const endHour = parseInt(timeRangeMatch[3]);
    const endPeriod = timeRangeMatch[4] || '';
    let start = new Date(now);
    let end = new Date(now);
    start.setHours(startPeriod === 'pm' && startHour < 12 ? startHour + 12 : startHour, 0, 0, 0);
    end.setHours(endPeriod === 'pm' && endHour < 12 ? endHour + 12 : endHour, 59, 59, 999);
    filter.timestamp = { $gte: start, $lte: end };
  }

  // Event type and activity-based queries (fuzzy)
  if (lower.includes('entered') || lower.includes('came in')) filter.eventType = 'person_entered';
  else if (lower.includes('exit') || lower.includes('left')) filter.eventType = 'person_exited';
  else if (lower.includes('picked')) filter.eventType = 'object_picked';
  else if (lower.includes('placed')) filter.eventType = 'object_placed';
  else if (lower.includes('suspicious') || lower.includes('unusual')) filter.eventType = 'unusual_activity';
  else if (lower.includes('loitering')) filter.eventType = 'loitering';
  else if (lower.includes('multiple people') || lower.includes('crowd')) filter.eventType = 'multiple_people';

  // Location-based queries (e.g., 'camera-2', 'in lobby')
  const locationMatch = lower.match(/camera-\d+/);
  if (locationMatch) {
    filter.location = new RegExp(locationMatch[0], 'i');
  } else if (lower.includes('lobby')) {
    filter.location = /lobby/i;
  }

  // Fuzzy search in description (e.g., 'John', 'bag', etc.)
  const descKeywords = lower.match(/with ([\w\s]+)/);
  if (descKeywords && descKeywords[1]) {
    filter.description = new RegExp(descKeywords[1].trim(), 'i');
  } else if (lower.includes('bag')) {
    filter.description = /bag/i;
  }

  // If query asks for a count
  if (lower.includes('how many') || lower.includes('count')) {
    const count = await Event.countDocuments(filter);
    return [{ _id: 'count', eventType: 'count', description: `Count: ${count}`, timestamp: new Date(), location: '', confidence: 1 }];
  }

  // Default: return up to 50 events matching filter, sorted by time
  return await Event.find(filter).sort({ timestamp: -1 }).limit(50);
}

// Helper - Determine query type
function determineQueryType(question) {
  const lower = question.toLowerCase();
  if (lower.includes('today') || lower.includes('yesterday') || lower.includes('hour')) return 'time_based';
  if (lower.includes('entered') || lower.includes('picked')) return 'activity_based';
  if (lower.includes('person') || lower.includes('object')) return 'object_based';
  return 'general';
}

// Helper - Generate query summary
function generateQuerySummary(results, question) {
  if (results.length === 0) return `No events found matching "${question}".`;
  const types = [...new Set(results.map(r => r.eventType))];
  const timeRange = results.length > 1 ?
    `from ${results[results.length - 1].timestamp.toLocaleString()} to ${results[0].timestamp.toLocaleString()}` :
    `at ${results[0].timestamp.toLocaleString()}`;
  return `Found ${results.length} event(s) (${types.join(', ')}) ${timeRange}.`;
}

module.exports = router;
