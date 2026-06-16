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
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected! - server.js:25');
    app.listen(process.env.PORT, () => {
      console.log(`✅ Server running on port ${process.env.PORT} - server.js:27`);
    });
  })
  .catch((err) => {
    console.log('❌ MongoDB connection error: - server.js:31', err);
  });