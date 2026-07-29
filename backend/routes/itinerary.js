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

Give a detailed day-wise itinerary with these sections:
## Day-wise Itinerary
### Day 1 (then Day 2, Day 3 etc)
- morning: activity
- afternoon: activity  
- evening: activity

## Budget Breakdown
- hotel, food, transport, tickets, total

## Top Hotels
5 budget hotels with price and area

## Top Restaurants
5 restaurants with specialty and price range

## Hidden Gems & Tips
## Safety Tips
## Local Guides & Helplines
- emergency: 112
- tourist helpline: 1364
- women helpline: 1091

Keep everything concise and practical for students.`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000
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

    const itinerary = response.data.choices[0].message.content;
    res.json({ itinerary });

  } catch (err) {
    console.error('Itinerary error: - itinerary.js:63', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to generate itinerary' });
  }
});

router.post('/ask', auth, async (req, res) => {
  try {
    const { question, tripDetails, itinerary } = req.body;

   const prompt = `You are an expert travel planner for students in India.
Plan a ${days}-day trip from ${source} to ${destination}.
Budget: Rs.${budget} for ${groupSize} people
Transport: ${transport}
Interests: ${interests.join(', ')}

Generate the itinerary in EXACTLY this order with these EXACT section headings:

## Day-wise Itinerary
Give a detailed day-by-day plan. For each day use ### Day 1, ### Day 2 etc.
Each day should have Morning, Afternoon, Evening activities in bullet points.

## Top Restaurants
Give EXACTLY 5 budget-friendly restaurants. Each on its own line:
- Name - Specialty - Price range per person

## Places to Visit
Give EXACTLY 5 must-visit places. Each on its own line:
- Place name - Why visit - Entry fee if any

## Top Hotels
Give EXACTLY 5 budget hotels. Each on its own line:
- Hotel name - Area - Price per night

## Budget Breakdown
Give itemized cost breakdown:
- Transport: Rs.X
- Hotel: Rs.X
- Food: Rs.X
- Entry tickets: Rs.X
- Miscellaneous: Rs.X
- Total: Rs.X

## Weather & Clothing
- Best time to visit
- Current season
- Pack: list of clothing items separated by commas

## Documents Needed
List 5 important documents as bullet points.

## Electronics to Carry
List 5 electronics as bullet points.

## Safety Tips
List 5 safety tips as bullet points.

## Local Guides & Helplines
- Emergency: 112
- Tourist helpline: 1364
- Women helpline: 1091
- Police: 100
- Local tourism office contact`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai-travel-planner-flax.vercel.app',
          'X-Title': 'AI Travel Planner'
        }
      }
    );

    const answer = response.data.choices[0].message.content;
    res.json({ answer });

  } catch (err) {
    console.error('Ask error: - itinerary.js:147', err.message);
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
    console.error('Weather error: - itinerary.js:170', err.message);
    res.status(500).json({ message: 'Could not fetch weather data' });
  }
});

module.exports = router;