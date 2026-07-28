import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveTrip, askItinerary, getWeather } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function parseSections(text) {
  const parts = text.split(/\n(?=## )/).filter((s) => s.trim());
  return parts.map((section) => {
    const lines = section.trim().split('\n');
    const title = lines[0].replace(/^##\s*/, '').trim();
    const content = lines.slice(1).join('\n').trim();
    return { title, content };
  });
}

function parseBudget(content) {
  const lines = content.split('\n');
  const data = [];
  let total = 0;
  lines.forEach((line) => {
    const match = line.match(/[-*|]\s*([\w\s/&]+?)[\s|]*:?\s*[Rs.₹]*\s*([\d,]+)/);
    if (match) {
      const label = match[1].trim().toLowerCase();
      const value = parseInt(match[2].replace(/,/g, ''), 10);
      if (label.includes('total')) { total = value; }
      else if (!isNaN(value) && value > 0) { data.push({ name: match[1].trim(), value }); }
    }
  });
  return { data, total };
}

function getSectionByKeywords(sections, keywords) {
  return sections.find((s) =>
    keywords.some((kw) => s.title.toLowerCase().includes(kw.toLowerCase()))
  );
}

function Card({ icon, title, children, color = 'blue' }) {
  const colors = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    orange: 'border-orange-200 bg-orange-50',
    purple: 'border-purple-200 bg-purple-50',
    red: 'border-red-200 bg-red-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    teal: 'border-teal-200 bg-teal-50',
    pink: 'border-pink-200 bg-pink-50',
  };
  const headerColors = {
    blue: 'bg-blue-600', green: 'bg-green-600', orange: 'bg-orange-500',
    purple: 'bg-purple-600', red: 'bg-red-500', yellow: 'bg-yellow-500',
    teal: 'bg-teal-600', pink: 'bg-pink-500',
  };
  return (
    <div className={`rounded-2xl border-2 ${colors[color]} overflow-hidden shadow-sm mb-5`}>
      <div className={`${headerColors[color]} px-5 py-3 flex items-center gap-2`}>
        <span className="text-xl">{icon}</span>
        <h3 className="text-white font-bold text-base">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MarkdownContent({ content }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-headings:font-bold prose-h3:text-sm prose-h3:mt-3 prose-li:my-0.5 prose-ul:my-1 prose-strong:text-gray-900 prose-p:my-1 prose-table:text-sm prose-th:bg-gray-100 prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-gray-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function Itinerary() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [asking, setAsking] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const itinerary = state?.itinerary;
  const tripDetails = state?.tripDetails;

  const normalizeCity = (city) => {
    const cityMap = {
      'vizag': 'Visakhapatnam', 'visakhapatnam': 'Visakhapatnam',
      'hyd': 'Hyderabad', 'hyderabad': 'Hyderabad',
      'blr': 'Bangalore', 'bangalore': 'Bangalore', 'bengaluru': 'Bangalore',
      'mumbai': 'Mumbai', 'bombay': 'Mumbai',
      'chennai': 'Chennai', 'madras': 'Chennai',
      'kolkata': 'Kolkata', 'calcutta': 'Kolkata',
      'delhi': 'Delhi', 'new delhi': 'Delhi',
      'goa': 'Goa', 'pune': 'Pune', 'jaipur': 'Jaipur',
      'shimla': 'Shimla', 'manali': 'Manali', 'ooty': 'Udhagamandalam',
    };
    return cityMap[city.toLowerCase().trim()] || city;
  };

  useEffect(() => {
    if (!tripDetails?.destination) return;
    setWeatherLoading(true);
    getWeather(normalizeCity(tripDetails.destination))
      .then((res) => setWeather(res.data))
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false));
  }, []);

  if (!state) { navigate('/dashboard'); return null; }

  const sections = parseSections(itinerary);

  const handleSave = async () => {
    try { await saveTrip({ ...tripDetails, itinerary }); setSaved(true); }
    catch (err) { console.error(err); }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setAsking(true);
    const q = question;
    setQuestion('');
    try {
      const res = await askItinerary({ question: q, tripDetails, itinerary });
      setChatHistory((prev) => [...prev, { question: q, answer: res.data.answer }]);
    } catch (err) {
      setChatHistory((prev) => [...prev, { question: q, answer: 'Sorry, something went wrong.' }]);
    }
    setAsking(false);
  };

  const daySection = getSectionByKeywords(sections, ['Day-wise', 'Itinerary', 'Day']);
  const foodSection = getSectionByKeywords(sections, ['Restaurant', 'Food', 'Eat']);
  const placesSection = getSectionByKeywords(sections, ['Places', 'Attractions', 'Sightseeing', 'Hidden Gems', 'Gems']);
  const hotelSection = getSectionByKeywords(sections, ['Hotel', 'Stay', 'Accommodation']);
  const budgetSection = getSectionByKeywords(sections, ['Budget']);
  const safetySection = getSectionByKeywords(sections, ['Safety']);
  const weatherSection = getSectionByKeywords(sections, ['Weather', 'Clothing', 'Cloth']);
  const docsSection = getSectionByKeywords(sections, ['Document']);
  const electronicsSection = getSectionByKeywords(sections, ['Electronic']);
  const guidesSection = getSectionByKeywords(sections, ['Guide', 'Helpline', 'Emergency']);
  const firstAidSection = getSectionByKeywords(sections, ['First Aid', 'Medical']);

  const { data: budgetData, total: budgetTotal } = budgetSection
    ? parseBudget(budgetSection.content) : { data: [], total: 0 };
  const userBudget = Number(tripDetails?.budget || 0);

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-5 mb-5 text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm mb-1">✈️ Your Trip Plan</p>
              <h1 className="text-2xl font-bold">{tripDetails.source} → {tripDetails.destination}</h1>
              <p className="text-blue-100 mt-1 text-sm">
                {tripDetails.days} days • {tripDetails.groupSize} people • ₹{Number(tripDetails.budget).toLocaleString()} budget • {tripDetails.transport}
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saved}
              className="bg-white text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 disabled:opacity-60"
            >
              {saved ? '✓ Saved' : '💾 Save'}
            </button>
          </div>
          <button onClick={() => navigate('/dashboard')} className="mt-3 text-blue-200 text-sm hover:text-white">
            ← Back to Dashboard
          </button>
        </div>

        {/* 1. TRIP PLAN */}
        {daySection && (
          <Card icon="🗓️" title="Day-wise Trip Plan" color="blue">
            <MarkdownContent content={daySection.content} />
          </Card>
        )}

        {/* 2. FOOD & RESTAURANTS */}
        {foodSection && (
          <Card icon="🍽️" title="Food & Restaurants" color="orange">
            <MarkdownContent content={foodSection.content} />
          </Card>
        )}

        {/* 3. PLACES TO VISIT */}
        {placesSection && (
          <Card icon="🏖️" title="Places to Visit & Hidden Gems" color="teal">
            <MarkdownContent content={placesSection.content} />
          </Card>
        )}

        {/* 4. HOTELS */}
        {hotelSection && (
          <Card icon="🏨" title="Budget Hotels" color="purple">
            <MarkdownContent content={hotelSection.content} />
          </Card>
        )}

        {/* 5. BUDGET */}
        {budgetSection && (
          <Card icon="💰" title="Budget Breakdown" color="green">
            {budgetData.length > 0 && (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={budgetData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={85}
                    labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {budgetData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${v}`} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <MarkdownContent content={budgetSection.content} />
            {budgetTotal > 0 && (
              <div className={`mt-3 rounded-xl p-3 text-sm font-semibold text-center ${budgetTotal > userBudget ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {budgetTotal > userBudget
                  ? `⚠️ Estimated ₹${budgetTotal} exceeds budget by ₹${budgetTotal - userBudget}`
                  : `✅ Estimated ₹${budgetTotal} — ₹${userBudget - budgetTotal} left to spare!`}
              </div>
            )}
          </Card>
        )}

        {/* 6. WEATHER */}
        <Card icon="🌤️" title={`Live Weather — ${tripDetails.destination}`} color="yellow">
          {weatherLoading && <p className="text-sm text-gray-400">Fetching weather...</p>}
          {!weatherLoading && !weather && <p className="text-sm text-red-400">Could not load weather data.</p>}
          {!weatherLoading && weather && (
            <div>
              <p className="text-sm text-gray-500 mb-3">{weather.city}, {weather.country} — Next 15 hours</p>
              <div className="grid grid-cols-5 gap-2">
                {weather.forecasts.map((f, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-2 text-center shadow-sm">
                    <p className="text-xs text-gray-500">{new Date(f.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    <img src={`https://openweathermap.org/img/wn/${f.icon}.png`} alt={f.description} className="w-8 h-8 mx-auto" />
                    <p className="text-sm font-bold text-gray-800">{f.temp}°C</p>
                    <p className="text-xs text-gray-500 capitalize">{f.description}</p>
                    <p className="text-xs text-blue-500">💧{f.humidity}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {weatherSection && <div className="mt-4"><MarkdownContent content={weatherSection.content} /></div>}
        </Card>

        {/* 7. CLOTHES & PACKING */}
        {weatherSection && !weatherSection.content.includes('forecast') && (
          <Card icon="👕" title="What to Pack & Wear" color="pink">
            <MarkdownContent content={weatherSection.content} />
          </Card>
        )}

        {/* 8. DOCUMENTS */}
        {docsSection && (
          <Card icon="📄" title="Documents to Carry" color="blue">
            <MarkdownContent content={docsSection.content} />
          </Card>
        )}

        {/* 9. ELECTRONICS */}
        {electronicsSection && (
          <Card icon="🔌" title="Electronics to Carry" color="purple">
            <MarkdownContent content={electronicsSection.content} />
          </Card>
        )}

        {/* 10. FIRST AID */}
        {firstAidSection && (
          <Card icon="🩹" title="First Aid Kit" color="red">
            <MarkdownContent content={firstAidSection.content} />
          </Card>
        )}

        {/* 11. SAFETY */}
        {safetySection && (
          <Card icon="🛡️" title="Safety Tips" color="red">
            <MarkdownContent content={safetySection.content} />
          </Card>
        )}

        {/* 12. GUIDES & HELPLINES */}
        {guidesSection && (
          <Card icon="📞" title="Local Guides & Helplines" color="teal">
            <MarkdownContent content={guidesSection.content} />
          </Card>
        )}

        {/* MAP */}
        <Card icon="🗺️" title="Route Map" color="blue">
          <iframe
            title="route-map" width="100%" height="280"
            style={{ border: 0, borderRadius: '12px' }} loading="lazy" allowFullScreen
            src={`https://maps.google.com/maps?saddr=${encodeURIComponent(tripDetails.source)}&daddr=${encodeURIComponent(tripDetails.destination)}&output=embed`}
          />
        </Card>

        {/* ASK AI */}
        <Card icon="💬" title="Ask AI — Get More Info" color="purple">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="e.g. Give me 5 more budget hotels"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            />
            <button onClick={handleAsk} disabled={asking}
              className="bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-60 text-sm">
              {asking ? '...' : 'Ask'}
            </button>
          </div>
          {chatHistory.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {chatHistory.map((item, i) => (
                <div key={i} className="border-t border-gray-100 pt-3">
                  <p className="text-sm font-semibold text-purple-600 mb-1">🙋 {item.question}</p>
                  <MarkdownContent content={item.answer} />
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}

export default Itinerary;