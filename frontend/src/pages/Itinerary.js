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
    const match = line.match(/[-*]\s*([\w\s/&]+?)[:\s]+[Rs.₹]*\s*([\d,]+)/);
    if (match) {
      const label = match[1].trim().toLowerCase();
      const value = parseInt(match[2].replace(/,/g, ''), 10);
      if (label.includes('total')) { total = value; }
      else if (!isNaN(value) && value > 0) { data.push({ name: match[1].trim(), value }); }
    }
  });
  return { data, total };
}

function SectionCard({ icon, title, headerColor, borderColor, bgColor, children }) {
  return (
    <div className={`rounded-2xl border-2 ${borderColor} ${bgColor} overflow-hidden shadow-md mb-5`}>
      <div className={`${headerColor} px-5 py-3 flex items-center gap-3`}>
        <span className="text-2xl">{icon}</span>
        <h3 className="text-white font-bold text-lg">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MDContent({ content }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-700 prose-headings:font-bold prose-h3:text-base prose-h3:text-gray-800 prose-h3:mt-3 prose-li:my-1 prose-ul:my-2 prose-strong:text-gray-900 prose-p:my-1 prose-table:w-full prose-th:bg-gray-100 prose-th:p-2 prose-th:text-left prose-td:p-2 prose-td:border prose-td:border-gray-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function getSec(sections, keywords) {
  return sections.find((s) =>
    keywords.some((kw) => s.title.toLowerCase().includes(kw.toLowerCase()))
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
      'vizag': 'Visakhapatnam', 'visakhapatnam': 'Visakhapatnam', 'vskp': 'Visakhapatnam',
      'hyd': 'Hyderabad', 'hyderabad': 'Hyderabad',
      'blr': 'Bangalore', 'bangalore': 'Bangalore', 'bengaluru': 'Bangalore',
      'mumbai': 'Mumbai', 'bombay': 'Mumbai',
      'chennai': 'Chennai', 'madras': 'Chennai',
      'kolkata': 'Kolkata', 'calcutta': 'Kolkata',
      'delhi': 'Delhi', 'new delhi': 'Delhi',
      'goa': 'Goa', 'pune': 'Pune', 'jaipur': 'Jaipur',
      'shimla': 'Shimla', 'manali': 'Manali',
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
  const daySection = getSec(sections, ['Day-wise', 'Itinerary', 'Day']);
  const foodSection = getSec(sections, ['Restaurant', 'Food', 'Dining']);
  const placesSection = getSec(sections, ['Places', 'Visit', 'Attraction', 'Sightseeing', 'Hidden']);
  const hotelSection = getSec(sections, ['Hotel', 'Stay', 'Accommodation']);
  const budgetSection = getSec(sections, ['Budget', 'Cost', 'Expense']);
  const weatherSection = getSec(sections, ['Weather', 'Clothing', 'Cloth', 'Pack']);
  const docsSection = getSec(sections, ['Document']);
  const electronicsSection = getSec(sections, ['Electronic', 'Gadget']);
  const safetySection = getSec(sections, ['Safety', 'Safe']);
  const guidesSection = getSec(sections, ['Guide', 'Helpline', 'Emergency', 'Contact']);

  const { data: budgetData, total: budgetTotal } = budgetSection
    ? parseBudget(budgetSection.content) : { data: [], total: 0 };
  const userBudget = Number(tripDetails?.budget || 0);

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

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-5 mb-5 text-white shadow-lg">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold">{tripDetails.source} → {tripDetails.destination}</h1>
              <p className="text-blue-100 mt-1 text-sm">
                {tripDetails.days} days • {tripDetails.groupSize} people • ₹{Number(tripDetails.budget).toLocaleString()} • {tripDetails.transport}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saved}
                className="bg-white text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 disabled:opacity-60">
                {saved ? '✓ Saved' : '💾 Save'}
              </button>
              <button onClick={() => navigate('/expenses', { state: { tripDetails } })}
                className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-600">
                💸 Split
              </button>
            </div>
          </div>
          <button onClick={() => navigate('/dashboard')} className="mt-3 text-blue-200 text-sm hover:text-white">
            ← Back to Dashboard
          </button>
        </div>

        {/* 1. TRIP PLAN */}
        {daySection && (
          <SectionCard icon="🗓️" title="Day-wise Trip Plan"
            headerColor="bg-blue-600" borderColor="border-blue-300" bgColor="bg-blue-50">
            <MDContent content={daySection.content} />
          </SectionCard>
        )}

        {/* 2. FOOD & RESTAURANTS */}
        {foodSection && (
          <SectionCard icon="🍽️" title="Food & Restaurants"
            headerColor="bg-orange-500" borderColor="border-orange-300" bgColor="bg-orange-50">
            <MDContent content={foodSection.content} />
          </SectionCard>
        )}

        {/* 3. PLACES TO VISIT */}
        {placesSection && (
          <SectionCard icon="🏖️" title="Places to Visit"
            headerColor="bg-teal-600" borderColor="border-teal-300" bgColor="bg-teal-50">
            <MDContent content={placesSection.content} />
          </SectionCard>
        )}

        {/* 4. HOTELS */}
        {hotelSection && (
          <SectionCard icon="🏨" title="Budget Hotels"
            headerColor="bg-purple-600" borderColor="border-purple-300" bgColor="bg-purple-50">
            <MDContent content={hotelSection.content} />
          </SectionCard>
        )}

        {/* 5. BUDGET */}
        {budgetSection && (
          <SectionCard icon="💰" title="Budget Breakdown"
            headerColor="bg-green-600" borderColor="border-green-300" bgColor="bg-green-50">
            {budgetData.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={budgetData} dataKey="value" nameKey="name" cx="50%" cy="45%"
                    outerRadius={85} labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {budgetData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${v}`} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <MDContent content={budgetSection.content} />
            {budgetTotal > 0 && (
              <div className={`mt-3 rounded-xl p-3 text-sm font-semibold text-center ${budgetTotal > userBudget ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {budgetTotal > userBudget
                  ? `⚠️ Estimated ₹${budgetTotal} exceeds budget by ₹${budgetTotal - userBudget}`
                  : `✅ Estimated ₹${budgetTotal} — ₹${userBudget - budgetTotal} left to spare!`}
              </div>
            )}
          </SectionCard>
        )}

        {/* 6. LIVE WEATHER */}
        <SectionCard icon="🌤️" title={`Live Weather — ${tripDetails.destination}`}
          headerColor="bg-yellow-500" borderColor="border-yellow-300" bgColor="bg-yellow-50">
          {weatherLoading && <p className="text-sm text-gray-500">Fetching weather...</p>}
          {!weatherLoading && !weather && <p className="text-sm text-red-400">Could not load weather.</p>}
          {!weatherLoading && weather && (
            <div>
              <p className="text-sm text-gray-600 mb-3">{weather.city}, {weather.country} — Next 15 hours</p>
              <div className="grid grid-cols-5 gap-2">
                {weather.forecasts.map((f, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-2 text-center shadow-sm">
                    <p className="text-xs text-gray-500">{new Date(f.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    <img src={`https://openweathermap.org/img/wn/${f.icon}.png`} alt={f.description} className="w-8 h-8 mx-auto" />
                    <p className="text-sm font-bold">{f.temp}°C</p>
                    <p className="text-xs text-gray-500 capitalize">{f.description}</p>
                    <p className="text-xs text-blue-500">💧{f.humidity}%</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-white rounded-lg p-3 text-sm text-yellow-800">
                💡 Feels like {weather.forecasts[0]?.feels}°C • Humidity {weather.forecasts[0]?.humidity}% • Wind {weather.forecasts[0]?.wind} m/s
              </div>
            </div>
          )}
          {weatherSection && <div className="mt-4"><MDContent content={weatherSection.content} /></div>}
        </SectionCard>

        {/* 7. CLOTHES & PACKING */}
        {weatherSection && (
          <SectionCard icon="👕" title="Clothes & Packing"
            headerColor="bg-pink-500" borderColor="border-pink-300" bgColor="bg-pink-50">
            <MDContent content={weatherSection.content} />
          </SectionCard>
        )}

        {/* 8. DOCUMENTS */}
        {docsSection && (
          <SectionCard icon="📄" title="Documents to Carry"
            headerColor="bg-blue-500" borderColor="border-blue-300" bgColor="bg-blue-50">
            <MDContent content={docsSection.content} />
          </SectionCard>
        )}

        {/* 9. ELECTRONICS */}
        {electronicsSection && (
          <SectionCard icon="🔌" title="Electronics to Carry"
            headerColor="bg-indigo-600" borderColor="border-indigo-300" bgColor="bg-indigo-50">
            <MDContent content={electronicsSection.content} />
          </SectionCard>
        )}

        {/* 10. SAFETY */}
        {safetySection && (
          <SectionCard icon="🛡️" title="Safety Tips"
            headerColor="bg-red-600" borderColor="border-red-300" bgColor="bg-red-50">
            <MDContent content={safetySection.content} />
          </SectionCard>
        )}

        {/* 11. GUIDES */}
        {guidesSection && (
          <SectionCard icon="📞" title="Local Guides & Helplines"
            headerColor="bg-teal-700" borderColor="border-teal-300" bgColor="bg-teal-50">
            <MDContent content={guidesSection.content} />
          </SectionCard>
        )}

        {/* MAP */}
        <SectionCard icon="🗺️" title="Route Map"
          headerColor="bg-gray-700" borderColor="border-gray-300" bgColor="bg-gray-50">
          <iframe title="route-map" width="100%" height="280"
            style={{ border: 0, borderRadius: '12px' }} loading="lazy" allowFullScreen
            src={`https://maps.google.com/maps?saddr=${encodeURIComponent(tripDetails.source)}&daddr=${encodeURIComponent(tripDetails.destination)}&output=embed`} />
        </SectionCard>

        {/* ASK AI */}
        <SectionCard icon="💬" title="Ask AI — Get More Info"
          headerColor="bg-purple-600" borderColor="border-purple-300" bgColor="bg-purple-50">
          <div className="flex gap-2 mb-3">
            <input type="text" placeholder="e.g. Give me 5 more budget hotels"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
              value={question} onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()} />
            <button onClick={handleAsk} disabled={asking}
              className="bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-60 text-sm">
              {asking ? '...' : 'Ask'}
            </button>
          </div>
          {chatHistory.map((item, i) => (
            <div key={i} className="border-t border-purple-200 pt-3 mt-3">
              <p className="text-sm font-semibold text-purple-700 mb-1">🙋 {item.question}</p>
              <MDContent content={item.answer} />
            </div>
          ))}
        </SectionCard>

      </div>
    </div>
  );
}

export default Itinerary;