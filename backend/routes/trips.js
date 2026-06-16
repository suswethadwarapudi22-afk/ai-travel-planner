const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Trip = require('../models/Trip');

// Get all trips for a user
router.get('/', auth, async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Save a trip
router.post('/', auth, async (req, res) => {
  try {
    const trip = new Trip({ user: req.user.id, ...req.body });
    await trip.save();
    res.json(trip);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a trip
router.delete('/:id', auth, async (req, res) => {
  try {
    await Trip.findByIdAndDelete(req.params.id);
    res.json({ message: 'Trip deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;