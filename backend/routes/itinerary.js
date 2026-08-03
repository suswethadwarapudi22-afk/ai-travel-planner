const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');

// ─── Generate Itinerary ───────────────────────────────────────────────────────
router.post('/generate', auth, async (req, res) => {
  try {
    const { source, destination, budget, days, interests, groupSize, transport } = req.body;

    const prompt = `Generate a travel itinerary. Output ONLY the sections below. No thinking. No explanation. No extra text. Start directly with ## Day-wise Itinerary.

Trip: ${source} to ${destination}, ${days} days, ₹${budget} for ${groupSize} people, ${transport}, interests: ${interests.join(', ')}

Output exactly these sections in this order:

## Day-wise Itinerary
### Day 1
- morning: [activity in destination]
- afternoon: [activity]
- evening: [activity]
### Day 2
- morning: [activity]
- afternoon: [activity]
- evening: [activity]
(repeat for all ${days} days)

## Budget Breakdown
- hotel: ₹[amount]
- food: ₹[amount]
- transport: ₹[amount]
- tickets: ₹[amount]
- total: ₹[amount]

## Top Hotels
- [name] - ₹[price]/night - [area]
- [name] - ₹[price]/night - [area]
- [name] - ₹[price]/night - [area]
- [name] - ₹[price]/night - [area]
- [name] - ₹[price]/night - [area]

## Top Restaurants
- [name] - [specialty] - ₹[price range]
- [name] - [specialty] - ₹[price range]
- [name] - [specialty] - ₹[price range]
- [name] - [specialty] - ₹[price range]
- [name] - [specialty] - ₹[price range]

## Hidden Gems & Tips
- [tip about destination]
- [tip]
- [tip]
- [tip]
- [tip]

## Safety Tips
- [safety tip]
- [tip]
- [tip]
- [tip]

## Weather & Clothing
- weather: [current weather description for ${destination}]
- pack: light cotton, sunglasses, hat, flip-flops, light jacket

## Documents Needed
- Aadhaar card or government photo ID
- student ID card
- travel tickets printed or digital
- driving license if renting scooter
- hotel booking confirmation

## First Aid Kit
- paracetamol and basic pain relief
- antiseptic wipes and band-aids
- ORS sachets for dehydration
- insect repellent
- motion sickness pills

## Electronics to Carry
- mobile phone and charger
- power bank essential for travel
- earphones or headphones
- camera optional
- universal travel adapter

## Local Guides & Helplines
- tourist helpline: 1364 available 24x7
- emergency number: 112
- police: 100
- women helpline: 1091
- book guides via state tourism website

Rules: No bold text. No asterisks. Use only - for bullets. Keep lines under 12 words. Output only the sections above.`;

    const callGemini = async (attempt = 1) => {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          { contents: [{ parts: [{ text: prompt }] }] },
          { headers: { 'content-type': 'application/json' }, timeout: 60000 }
        );
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response from Gemini');
        return text;
      } catch (err) {
        console.error(`Gemini attempt ${attempt} failed: - itinerary.js:107`, err.message);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          return callGemini(attempt + 1);
        }
        throw err;
      }
    };

    const itinerary = await callGemini();
    res.json({ itinerary });

  } catch (err) {
    console.error('GENERATE ERROR: - itinerary.js:120', err.message);
    res.status(500).json({ message: 'Failed to generate itinerary' });
  }
});

// ─── Ask AI Follow-up ─────────────────────────────────────────────────────────
router.post('/ask', auth, async (req, res) => {
  try {
    const { question, tripDetails, itinerary } = req.body;

    const prompt = `Travel assistant for ${tripDetails.source} to ${tripDetails.destination} trip.
Budget: ₹${tripDetails.budget}, ${tripDetails.days} days, ${tripDetails.groupSize} people.

User asks: "${question}"

Answer with short bullet points using - only. No bold text. No asterisks. If asked for hotels or restaurants give 5 new ones in format: name - price - area.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'content-type': 'application/json' }, timeout: 30000 }
    );

    const answer = response.data.candidates[0].content.parts[0].text;
    res.json({ answer });

  } catch (err) {
    console.error('ASK ERROR: - itinerary.js:147', err.message);
    res.status(500).json({ message: 'Failed to get answer' });
  }
});

// ─── Live Weather ─────────────────────────────────────────────────────────────
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
    console.error('Weather error: - itinerary.js:171', err.message);
    res.status(500).json({ message: 'Could not fetch weather data' });
  }
});

module.exports = router;