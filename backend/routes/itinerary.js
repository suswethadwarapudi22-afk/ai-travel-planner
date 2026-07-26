const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');

router.post('/generate', auth, async (req, res) => {
  try {
    const { source, destination, budget, days, interests, groupSize, transport } = req.body;

    const prompt = `You are an expert travel planner for students in India.
Plan a ${days}-day trip from ${source} to ${destination}.
Budget: ₹${budget} for ${groupSize} people
Transport: ${transport}
Interests: ${interests.join(', ')}

Give a detailed day-wise itinerary with:
## Day-wise Itinerary
### Day 1, Day 2... etc with morning/afternoon/evening activities

## Budget Breakdown
- hotel, food, transport, tickets, total

## Top Hotels
5 budget hotels with price and area

## Top Restaurants  
5 restaurants with specialty and price range

## Hidden Gems & Tips
## Safety Tips
## Weather & Clothing
## Documents Needed
## Local Guides & Helplines
- emergency: 112
- tourist helpline: 1364
- women helpline: 1091

Keep everything concise and practical for students.`;

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        timeout: 30000
      }
    );

    const itinerary = response.data.content[0].text;
    res.json({ itinerary });

  } catch (err) {
    console.error('Itinerary error: - itinerary.js:61', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to generate itinerary' });
  }
});

router.post('/ask', auth, async (req, res) => {
  try {
    const { question, tripDetails, itinerary } = req.body;

    const prompt = `You are a helpful travel assistant.
Trip: ${tripDetails.source} to ${tripDetails.destination}, ${tripDetails.days} days, budget ₹${tripDetails.budget}, ${tripDetails.groupSize} people.

Existing itinerary: ${itinerary.substring(0, 2000)}

User question: "${question}"

Answer briefly in bullet points.`;

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    const answer = response.data.content[0].text;
    res.json({ answer });

  } catch (err) {
    console.error('Ask error: - itinerary.js:99', err.message);
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
      time: item.dt_txt,
      temp: Math.round(item.main.temp),
      feels: Math.round(item.main.feels_like),
      humidity: item.main.humidity,
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      wind: item.wind.speed,
    }));
    res.json({ city: data.city.name, country: data.city.country, forecasts });
  } catch (err) {
    console.error('Weather error: - itinerary.js:122', err.message);
    res.status(500).json({ message: 'Could not fetch weather data' });
  }
});

module.exports = router;