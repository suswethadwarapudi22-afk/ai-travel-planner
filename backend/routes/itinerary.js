const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');

// ─── Generate Itinerary ───────────────────────────────────────────────────────
router.post('/generate', auth, async (req, res) => {
  try {
    const { source, destination, budget, days, interests, groupSize, transport } = req.body;

   const prompt = `You are an expert travel planner for students in India.

Plan a ${days}-day trip from ${source} to ${destination}.
Budget: ₹${budget} for ${groupSize} people
Transport: ${transport}
Interests: ${interests.join(', ')}

CRITICAL FORMATTING RULES - FOLLOW EXACTLY:
- Start your response DIRECTLY with ## Day-wise Itinerary (NO title line before it)
- Use ONLY ## for main section headings
- Use ### Day 1, ### Day 2 etc for day subheadings
- Use simple - for bullet points
- NO asterisks (*) anywhere in the response
- NO bold text (**text**) anywhere
- NO introductory title or summary before the first ## heading
- Keep each bullet point to 1 line maximum

## Day-wise Itinerary
For EACH day use ### Day X subheading, then bullet points for morning/afternoon/evening

## Budget Breakdown
- hotel: ₹X
- food: ₹X
- transport: ₹X
- tickets: ₹X
- total: ₹X

## Top Hotels
(5 lines: name - price/night - area)

## Top Restaurants
(5 lines: name - specialty - price range)

## Hidden Gems & Tips
(short bullet tips)

## Safety Tips
(short bullet tips)

## Weather & Clothing
- weather: brief description
- pack: light cotton, hat, sunglasses, flip-flops, swimwear, light jacket

## Documents Needed
- Aadhaar card or passport
- student ID card
- train/bus tickets (printed or digital)
- driving license (if renting scooter)
- accommodation booking confirmation

## First Aid Kit
- paracetamol and basic pain relief
- antiseptic wipes and band-aids
- ORS sachets and antacids
- insect repellent
- motion sickness pills

## Electronics to Carry
- mobile phone and charger
- power bank (essential)
- earphones
- camera (optional)
- travel adapter if needed

## Local Guides & Helplines
- tourist helpline: 1364 (24x7, multilingual)
- emergency: 112
- police: 100
- women helpline: 1091
- book guides via: state tourism website or hotel reception

Keep everything concise. No long paragraphs. No asterisks. No bold text.`;
    // Auto-retry up to 3 times if Gemini fails
    const callGemini = async (attempt = 1) => {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          { contents: [{ parts: [{ text: prompt }] }] },
          { headers: { 'content-type': 'application/json' }, timeout: 30000 }
        );
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty response from Gemini');
        return text;
      } catch (err) {
        console.error(`Gemini attempt ${attempt} failed: - itinerary.js:95`, err.message);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          return callGemini(attempt + 1);
        }
        throw err;
      }
    };

    const itinerary = await callGemini();
    res.json({ itinerary });

  } catch (err) {
    console.error('GENERATE ERROR: - itinerary.js:108', err.message);
    res.status(500).json({ message: 'Failed to generate itinerary' });
  }
});

// ─── Ask AI Follow-up ─────────────────────────────────────────────────────────
router.post('/ask', auth, async (req, res) => {
  try {
    const { question, tripDetails, itinerary } = req.body;

    const prompt = `You are a helpful travel assistant for a student trip.
Trip: ${tripDetails.source} to ${tripDetails.destination}, ${tripDetails.days} days, budget ₹${tripDetails.budget}, ${tripDetails.groupSize} people, transport ${tripDetails.transport}.

Existing itinerary summary (for context, don't repeat it):
${itinerary.substring(0, 3000)}

User question: "${question}"

Answer in VERY short bullet points using "-" only, label: value format, no asterisks, no long paragraphs. If asked for more hotels/restaurants/places, give 5 NEW ones not already mentioned, format as: name - price/specialty - area.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'content-type': 'application/json' } }
    );

    const answer = response.data.candidates[0].content.parts[0].text;
    res.json({ answer });

  } catch (err) {
    console.error('ASK ERROR: - itinerary.js:138', JSON.stringify(err.response?.data, null, 2));
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
    res.json({
      city: data.city.name,
      country: data.city.country,
      forecasts,
    });
  } catch (err) {
    console.error('Weather error: - itinerary.js:166', err.message);
    res.status(500).json({ message: 'Could not fetch weather data' });
  }
});

module.exports = router;