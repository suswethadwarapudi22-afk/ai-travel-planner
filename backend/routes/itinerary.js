const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');

router.post('/generate', auth, async (req, res) => {
  try {
    const {
      source, destination, budget,
      days, interests, groupSize, transport
    } = req.body;

  const prompt = `You are an expert travel planner for students in India.

Plan a ${days}-day trip from ${source} to ${destination}.
Budget: ₹${budget} for ${groupSize} people
Transport: ${transport}
Interests: ${interests.join(', ')}

IMPORTANT FORMATTING RULES:
- Use VERY short, compact bullet points in "label: value" format
- NO long paragraphs or explanations
- Each bullet should be 1 line, maximum 10-12 words
- Use simple "-" for bullets, NOT asterisks
- Example format:
  - train: Visakhapatnam to Madgaon
  - journey time: 24-28 hrs
  - day 1 morning: arrive, check into hostel
  - day 1 afternoon: Vagator beach, lunch at shack (₹150)
  - hotel: Woke Hostel, Anjuna - ₹500/night

Structure the response with these sections (use simple headings with ##):

## Day-wise Itinerary
For EACH day, add a subheading "### Day X" (capital, e.g. ### Day 1), then list compact bullets for that day only (morning/afternoon/evening). Do not mix days together.

## Budget Breakdown
- hotel: ₹X
- food: ₹X
- transport: ₹X
- tickets: ₹X
- total: ₹X

## Top Hotels
(5 compact lines: name - price - area)

## Top Restaurants
(5 compact lines: name - specialty - price range)

## Hidden Gems & Tips
(short bullet tips)

## Safety Tips
(short bullet tips)

## Weather & Clothing
- weather: short description
- pack: list items briefly

## Documents Needed
(short bullet list)

## First Aid Kit
(short bullet list)

## Electronics to Carry
(short bullet list)

## Local Guides & Helplines
- national tourist helpline: 1364 (24x7, multilingual)
- emergency number: 112
- local police helpline: [give the actual state's number if known, else say "dial 100"]
- how to book verified guide: [1 line - e.g. via state tourism website/app or hotel reception]
- state tourism office: [name + general contact method if known]
- women helpline: 1091

Keep EVERYTHING extremely concise. No fluff, no long sentences. For Local Guides & Helplines, only use real, publicly known official numbers - do not invent names or personal phone numbers.`;
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
        console.error(`Gemini attempt ${attempt} failed: - itinerary.js:89`, err.message);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1500 * attempt)); // wait 1.5s, 3s
          return callGemini(attempt + 1);
        }
        throw err;
      }
    };

    const itinerary = await callGemini();
    res.json({ itinerary });
   
  } catch (err) {
    console.error('CLAUDE API ERROR: - itinerary.js:102', JSON.stringify(err.response?.data, null, 2));
    res.status(500).json({ message: 'Failed to generate itinerary' });
  }
});
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
    console.error('ASK ERROR: - itinerary.js:129', JSON.stringify(err.response?.data, null, 2));
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
    res.json({
      city: data.city.name,
      country: data.city.country,
      forecasts,
    });
  } catch (err) {
    console.error('Weather error: - itinerary.js:155', err.message);
    res.status(500).json({ message: 'Could not fetch weather data' });
  }
});
module.exports = router;