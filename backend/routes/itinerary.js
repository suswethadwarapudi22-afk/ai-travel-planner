const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');

router.post('/generate', auth, async (req, res) => {
  try {
    const { source, destination, budget, days, interests, groupSize, transport } = req.body;
    const prompt = `You are an expert travel planner for students in India. Plan a ${days}-day trip from ${source} to ${destination}. Budget: Rs.${budget} for ${groupSize} people. Transport: ${transport}. Interests: ${interests.join(', ')}. Give detailed day-wise itinerary with ## Day-wise Itinerary, ## Budget Breakdown, ## Top Hotels, ## Top Restaurants, ## Hidden Gems, ## Safety Tips, ## Local Guides. Emergency: 112, Tourist helpline: 1364.`;

    const models = ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-pro'];
    let itinerary = null;
    for (const model of models) {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          { contents: [{ parts: [{ text: prompt }] }] },
          { headers: { 'content-type': 'application/json' }, timeout: 30000 }
        );
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) { itinerary = text; console.log(`Success: ${model} - itinerary.js:21`); break; }
      } catch (err) {
        console.error(`${model} failed: - itinerary.js:23`, err.response?.data?.error?.message || err.message);
      }
    }
    if (!itinerary) throw new Error('All models failed');
    res.json({ itinerary });
  } catch (err) {
    console.error('Error: - itinerary.js:29', err.message);
    res.status(500).json({ message: 'Failed to generate itinerary' });
  }
});

router.post('/ask', auth, async (req, res) => {
  try {
    const { question, tripDetails, itinerary } = req.body;
    const prompt = `Travel assistant for trip from ${tripDetails.source} to ${tripDetails.destination}. Context: ${itinerary.substring(0, 1000)}. Question: "${question}". Answer briefly.`;
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'content-type': 'application/json' } }
    );
    const answer = response.data.candidates[0].content.parts[0].text;
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get answer' });
  }
});

router.get('/weather/:city', auth, async (req, res) => {
  try {
    const city = req.params.city;
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)},IN&appid=${process.env.WEATHER_API_KEY}&units=metric&cnt=5`
    );
    const data = response.data;
    const forecasts = data.list.map((item) => ({
      time: item.dt_txt, temp: Math.round(item.main.temp),
      feels: Math.round(item.main.feels_like), humidity: item.main.humidity,
      description: item.weather[0].description, icon: item.weather[0].icon, wind: item.wind.speed,
    }));
    res.json({ city: data.city.name, country: data.city.country, forecasts });
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch weather data' });
  }
});

module.exports = router;