// backend/routes/images.js
const express = require('express');
const router = express.Router();

// GET /api/images/:eventId - Fetch event image
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    res.json({ 
      message: 'Image route working!', 
      eventId: eventId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/images - Store event image
router.post('/', async (req, res) => {
  try {
    console.log('Received image data');
    res.json({ message: 'Image uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;