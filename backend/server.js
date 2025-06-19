const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/database');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/events', require('./routes/events'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/images', require('./routes/images'));

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Smart Surveillance System API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
  
  // Join room for real-time updates
  socket.on('join-monitoring', (cameraId) => {
    socket.join(`camera-${cameraId}`);
    console.log(`📹 Client joined monitoring for camera: ${cameraId}`);
  });
});

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO ready for real-time connections`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('❌ Unhandled Promise Rejection:', err.message);
  server.close(() => {
    process.exit(1);
  });
});