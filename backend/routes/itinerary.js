const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');

router.post('/generate', auth, async (req, res) => {
  try {
    const { source, destination, budget, days, interests, groupSize, transport } = req.body;

    const prompt = `You are an expert travel planner for students in India.
Plan a ${days}-day trip from ${source} to ${destination}.
Budget: Rs.${budget} for ${groupSize} people
Transport: ${transport}
Interests: ${interests.join(', ')}

Generate the itinerary in EXACTLY this order with these EXACT section headings:

## Day-wise Itinerary
Give a detailed day-by-day plan. For each day use ### Day 1, ### Day 2 etc.
Each day should have Morning, Afternoon, Evening activities in bullet points.
Include food stops, travel tips and estimated costs per activity.

## Top Restaurants
Give EXACTLY 5 budget-friendly restaurants with this format:
- Restaurant Name - Specialty dish - Price range per person - Area/Location

## Places to Visit
Give EXACTLY 5 must-visit places with this format:
- Place Name - Why visit it - Entry fee - Best time to visit

## Top Hotels
Give EXACTLY 5 budget hotels with this format:
- Hotel Name - Area - Price per night - Why good for students

## Budget Breakdown
Give itemized cost breakdown in bullet points:
- Transport: Rs.X
- Hotel: Rs.X
- Food: Rs.X
- Entry tickets: Rs.X
- Miscellaneous: Rs.X
- Total: Rs.X

## Weather & Clothing
- Best time to visit: month/season
- Current weather: description
- Pack: item1, item2, item3, item4, item5

## Documents Needed
List exactly 5 important documents as bullet points.

## Electronics to Carry
List exactly 5 electronics as bullet points.

## Safety Tips
List exactly 5 safety tips as bullet points.

## Local Guides & Helplines
- Emergency: 112
- Tourist helpline: 1364
- Women helpline: 1091
- Police: 100
- Ambulance: 108
- State tourism: provide actual number if known`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai-travel-planner-flax.vercel.app',
          'X-Title': 'AI Travel Planner'
        },
        timeout: 60000
      }
    );

    const itinerary = response.data.choices[0].message.content;
    res.json({ itinerary });

  } catch (err) {
    console.error('Itinerary error: - itinerary.js:88', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to generate itinerary' });
  }
});

router.post('/ask', auth, async (req, res) => {
  try {
    const { question, tripDetails, itinerary } = req.body;

    const prompt = `You are a helpful travel assistant for a student trip.
Trip: ${tripDetails.source} to ${tripDetails.destination}
Duration: ${tripDetails.days} days
Budget: Rs.${tripDetails.budget} for ${tripDetails.groupSize} people
Transport: ${tripDetails.transport}

Existing itinerary summary: ${itinerary.substring(0, 1500)}

User question: "${question}"

Answer in bullet points. If asked for hotels/restaurants/places give exactly 5 new ones not already mentioned.
Format: - Name - details - price`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai-travel-planner-flax.vercel.app',
          'X-Title': 'AI Travel Planner'
        },
        timeout: 30000
      }
    );

    const answer = response.data.choices[0].message.content;
    res.json({ answer });

  } catch (err) {
    console.error('Ask error: - itinerary.js:132', err.message);
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
    console.error('Weather error: - itinerary.js:155', err.message);
    res.status(500).json({ message: 'Could not fetch weather data' });
  }
});

module.exports = router;