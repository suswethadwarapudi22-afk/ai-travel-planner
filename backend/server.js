const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/itinerary', require('./routes/itinerary'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'AI Travel Planner API is running!' });
});

// Connect to MongoDB
console.log('All env vars: - server.js:23', {
  MONGO_URI: process.env.MONGO_URI ? 'EXISTS' : 'MISSING',
  PORT: process.env.PORT ? 'EXISTS' : 'MISSING',
  JWT_SECRET: process.env.JWT_SECRET ? 'EXISTS' : 'MISSING',
});

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI is not set! - server.js:31');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ MongoDB Connected! - server.js:37');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`✅ Server running on port ${process.env.PORT || 5000} - server.js:39`);
    });
  })
  .catch((err) => {
    console.log('❌ MongoDB connection error: - server.js:43', err);
  });