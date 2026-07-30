const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');

router.post('/generate', auth, async (req, res) => {
  try {
    const { source, destination, budget, days, interests, groupSize, transport } = req.body;

    const prompt = `You are a travel planner. Generate a trip plan with EXACTLY these section headings and NO other text before the first heading.

STRICT RULES:
- Start with ## Day-wise Itinerary immediately, no title before it
- Use ONLY these exact ## headings listed below
- Use ### Day 1, ### Day 2 for day subheadings inside Day-wise Itinerary
- Use ONLY - for bullets, never use * or **
- Never use bold text anywhere
- Keep each line short (under 12 words)

Trip details:
- From: ${source}
- To: ${destination}  
- Budget: ₹${budget} total for ${groupSize} people
- Days: ${days}
- Transport: ${transport}
- Interests: ${interests.join(', ')}

## Day-wise Itinerary

### Day 1
- morning: [activity]
- afternoon: [activity]
- evening: [activity]

### Day 2
- morning: [activity]
- afternoon: [activity]
- evening: [activity]

(continue for all ${days} days)

## Budget Breakdown
- hotel: ₹[amount]
- food: ₹[amount]
- transport: ₹[amount]
- tickets: ₹[amount]
- total: ₹[amount]

## Top Hotels
- [Hotel Name] - ₹[price]/night - [area]
- [Hotel Name] - ₹[price]/night - [area]
- [Hotel Name] - ₹[price]/night - [area]
- [Hotel Name] - ₹[price]/night - [area]
- [Hotel Name] - ₹[price]/night - [area]

## Top Restaurants
- [Restaurant Name] - [specialty] - ₹[price range]
- [Restaurant Name] - [specialty] - ₹[price range]
- [Restaurant Name] - [specialty] - ₹[price range]
- [Restaurant Name] - [specialty] - ₹[price range]
- [Restaurant Name] - [specialty] - ₹[price range]

## Hidden Gems & Tips
- [tip]
- [tip]
- [tip]
- [tip]
- [tip]

## Safety Tips
- [tip]
- [tip]
- [tip]
- [tip]

## Weather & Clothing
- weather: [brief description of weather at destination]
- pack: light cotton, sunglasses, hat, flip-flops, light jacket, swimwear

## Documents Needed
- Aadhaar card or government photo ID
- student ID card
- travel tickets (printed or digital)
- driving license (if renting scooter)
- hotel booking confirmation

## First Aid Kit
- paracetamol and basic pain relief
- antiseptic wipes and band-aids
- ORS sachets for dehydration
- insect repellent
- motion sickness pills

## Electronics to Carry
- mobile phone and charger
- power bank (essential for travel days)
- earphones or headphones
- camera (optional)
- universal travel adapter

## Local Guides & Helplines
- tourist helpline: 1364 (24x7)
- emergency: 112
- police: 100
- women helpline: 1091
- book guides via: state tourism website or hotel reception`;

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
    console.error('Itinerary error: - itinerary.js:130', err.response?.data || err.message);
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
    console.error('Ask error: - itinerary.js:174', err.message);
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
    console.error('Weather error: - itinerary.js:197', err.message);
    res.status(500).json({ message: 'Could not fetch weather data' });
  }
});

module.exports = router;