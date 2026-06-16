const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  source: String,
  destination: String,
  budget: Number,
  days: Number,
  interests: [String],
  groupSize: Number,
  transport: String,
  itinerary: String,
  estimatedCost: {
    hotel: Number,
    food: Number,
    transport: Number,
    tickets: Number,
    total: Number
  },
  safetyKit: {
    weather: String,
    documents: [String],
    clothing: [String],
    firstAid: [String],
    electronics: [String]
  }
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);