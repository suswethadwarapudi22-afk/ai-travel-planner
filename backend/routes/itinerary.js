const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');

// ─── Generate Itinerary ───────────────────────────────────────────────────────
router.post('/generate', auth, async (req, res) => {
  try {
    const { source, destination, budget, days, interests, groupSize, transport } = req.body;

    const prompt = `Generate a travel itinerary. Start DIRECTLY with ## Day-wise Itinerary. No intro text. No thinking. No explanation before the first heading.

Trip: ${source} to ${destination}, ${days} days, Rs.${budget} for ${groupSize} people, ${transport}, interests: ${interests.join(', ')}

Use exactly these section headings in this order. Use - for bullets. No asterisks. No bold text. Short lines only.

## Day-wise Itinerary
### Day 1
- morning: activity
- afternoon: activity  
- evening: activity
### Day 2
- morning: activity
- afternoon: activity
- evening: activity
(add more days if needed)

## Budget Breakdown
- hotel: Rs.[amount]
- food: Rs.[amount]
- transport: Rs.[amount]
- tickets: Rs.[amount]
- total: Rs.[amount]

## Top Hotels
- Hotel Name - Rs.[price] per night - area name
- Hotel Name - Rs.[price] per night - area name
- Hotel Name - Rs.[price] per night - area name
- Hotel Name - Rs.[price] per night - area name
- Hotel Name - Rs.[price] per night - area name

## Top Restaurants
- Restaurant Name - food type - price range
- Restaurant Name - food type - price range
- Restaurant Name - food type - price range
- Restaurant Name - food type - price range
- Restaurant Name - food type - price range

## Hidden Gems and Tips
- tip about destination
- tip about destination
- tip about destination
- tip about destination
- tip about destination

## Safety Tips
- safety tip
- safety tip
- safety tip
- safety tip

## Weather and Clothing
- weather: description of weather at ${destination}
- pack: list clothing items here

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
- power bank essential
- earphones
- camera optional
- universal travel adapter

## Local Guides and Helplines
- tourist helpline: 1364 available 24 hours
- emergency number: 112
- police: 100
- women helpline: 1091
- book guides via state tourism website`;

    const callGemini = async (attempt = 1) => {
      try {
        const response = await axios({
          method: 'post',
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`,
          params: {
            key: process.env.GEMINI_API_KEY
          },
          data: {
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 4096
            }
          },
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000
        });

        const parts = response.data?.candidates?.[0]?.content?.parts || [];
        let text = parts
          .filter(p => p.text && !p.thought)
          .map(p => p.text)
          .join('\n');

        if (!text) throw new Error('Empty response from Gemini');

        // Remove any thinking text before first ## heading
        const firstHeading = text.search(/^##\s/m);
        if (firstHeading > 0) {
          text = text.slice(firstHeading);
        }

        return text;
      } catch (err) {
        console.error(`Gemini attempt ${attempt} failed: - itinerary.js:136`, err.message);
        if (err.response) {
          console.error('Response data: - itinerary.js:138', JSON.stringify(err.response.data));
        }
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
    console.error('GENERATE ERROR: - itinerary.js:152', err.message);
    res.status(500).json({ message: 'Failed to generate itinerary' });
  }
});

// ─── Ask AI Follow-up ─────────────────────────────────────────────────────────
router.post('/ask', auth, async (req, res) => {
  try {
    const { question, tripDetails, itinerary } = req.body;

    const prompt = `You are a travel assistant. Answer this question about a trip from ${tripDetails.source} to ${tripDetails.destination}.
Budget: Rs.${tripDetails.budget}, ${tripDetails.days} days, ${tripDetails.groupSize} people.

Question: ${question}

Answer with short bullet points using - only. No bold text. No asterisks. If asked for hotels or restaurants give 5 new ones in format: name - price - area.`;

    const response = await axios({
      method: 'post',
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent`,
      params: {
        key: process.env.GEMINI_API_KEY
      },
      data: {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024
        }
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const parts = response.data?.candidates?.[0]?.content?.parts || [];
    const answer = parts
      .filter(p => p.text && !p.thought)
      .map(p => p.text)
      .join('\n');

    res.json({ answer });

  } catch (err) {
    console.error('ASK ERROR: - itinerary.js:202', err.message);
    res.status(500).json({ message: 'Failed to get answer' });
  }
});

// ─── Live Weather ─────────────────────────────────────────────────────────────
router.get('/weather/:city', auth, async (req, res) => {
  try {
    const city = req.params.city;
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast`,
      {
        params: {
          q: `${city},IN`,
          appid: process.env.WEATHER_API_KEY,
          units: 'metric',
          cnt: 5
        },
        timeout: 10000
      }
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
    console.error('Weather error: - itinerary.js:235', err.message);
    res.status(500).json({ message: 'Could not fetch weather data' });
  }
});

module.exports = router;