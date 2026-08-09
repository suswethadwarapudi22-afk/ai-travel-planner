import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveTrip, askItinerary, getWeather } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// ─── Clean AI response and extract only the actual content ────────────────────
function cleanAndParse(raw) {
  // Remove thinking/reasoning text that appears before first ## heading
  let text = raw;

  // Find the LAST occurrence of ## Day-wise Itinerary (the actual content)
  const match = text.match(/##\s*Day-wise Itinerary/i);
  if (match) {
    text = text.slice(match.index);
  }

  // Remove all bold/italic markers
  text = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1');

  // Split into sections by ## headings
  const parts = text.split(/\n(?=##\s)/).filter((s) => s.trim());

  return parts
    .map((section) => {
      const lines = section.trim().split('\n');
      const titleLine = lines[0];
      if (!titleLine.startsWith('##')) return null;
      const title = titleLine.replace(/^#{1,3}\s*/, '').trim();
      const content = lines.slice(1).join('\n').trim();
      return { title, content };
    })
    .filter(Boolean);
}

// ─── Find section by keywords ─────────────────────────────────────────────────
function getSec(sections, keywords) {
  return sections.find((s) =>
    keywords.some((kw) => s.title.toLowerCase().includes(kw.toLowerCase()))
  );
}

// ─── Parse budget numbers ─────────────────────────────────────────────────────
 function parseBudget(content) {
  const lines = content.split('\n');
  const data = [];
  let total = 0;

  lines.forEach((line) => {
    const cleaned = line.replace(/^[-*•]\s*/, '').trim();
    if (!cleaned || !cleaned.includes(':')) return;

    const colonIdx = cleaned.indexOf(':');
    const label = cleaned.slice(0, colonIdx).trim();
    const rest = cleaned.slice(colonIdx + 1).trim();

    // Extract number - handles Rs.20000, Rs 20000, ₹20000, 20000
    const numMatch = rest.replace(/Rs\.?/gi, '').replace(/₹/g, '').match(/[\d,]+/);
    if (!numMatch) return;

    const value = parseInt(numMatch[0].replace(/,/g, ''), 10);
    if (isNaN(value) || value <= 0) return;

    if (label.toLowerCase().includes('total')) {
      total = value;
    } else {
      data.push({ name: label, value });
    }
  });

  console.log('Budget data:', data, 'Total:', total);
  return { data, total };
}

// ─── Colored Section Card ─────────────────────────────────────────────────────
function SectionCard({ icon, title, headerColor, borderColor, bgColor, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-2xl border-2 ${borderColor} overflow-hidden shadow-sm mb-4`}>
      <button
        onClick={() => setOpen(!open)}
        className={`${headerColor} w-full px-5 py-3 flex items-center justify-between gap-3 text-left`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-white font-bold text-base">{title}</h3>
        </div>
        <span className="text-white text-xl">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className={`${bgColor} p-5`}>{children}</div>
      )}
    </div>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function MDContent({ content }) {
  const cleaned = content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1');
  return (
    <div className="prose prose-sm max-w-none text-gray-700 prose-headings:font-bold prose-h3:text-base prose-h3:text-gray-800 prose-h3:mt-3 prose-h3:mb-1 prose-li:my-1 prose-ul:my-2 prose-strong:text-gray-900 prose-p:my-1">
      <ReactMarkdown>{cleaned}</ReactMarkdown>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
/* eslint-disable no-unused-vars */
function Itinerary() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [asking, setAsking] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [packingList, setPackingList] = useState({
    Clothing: [], Documents: [], 'First Aid': [], Electronics: []
  });
  const [newItemText, setNewItemText] = useState({});

  const itinerary = state?.itinerary;
  const tripDetails = state?.tripDetails;
  const storageKey = `packing-v3-${tripDetails?.destination}-${tripDetails?.days}`;

  const normalizeCity = (city) => {
    const cityMap = {
      vizag: 'Visakhapatnam', visakhapatnam: 'Visakhapatnam',
      visakapatnam: 'Visakhapatnam', vskp: 'Visakhapatnam',
      hyd: 'Hyderabad', hyderabad: 'Hyderabad',
      blr: 'Bangalore', bangalore: 'Bangalore', bengaluru: 'Bangalore',
      mumbai: 'Mumbai', bombay: 'Mumbai',
      chennai: 'Chennai', madras: 'Chennai',
      kolkata: 'Kolkata', calcutta: 'Kolkata',
      delhi: 'Delhi', 'new delhi': 'Delhi',
      goa: 'Goa', pune: 'Pune', jaipur: 'Jaipur',
      shimla: 'Shimla', manali: 'Manali',
      kashmir: 'Srinagar', ooty: 'Udhagamandalam',
    };
    return cityMap[city?.toLowerCase().trim()] || city;
  };

  useEffect(() => {
    if (!tripDetails?.destination) return;
    setWeatherLoading(true);
    getWeather(normalizeCity(tripDetails.destination))
      .then((res) => setWeather(res.data))
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false));
    // load packing list
    const saved = localStorage.getItem(storageKey);
    if (saved) setPackingList(JSON.parse(saved));
    // eslint-disable-next-line
  }, []);

  if (!state) { navigate('/dashboard'); return null; }

  // Parse sections
  const sections = cleanAndParse(itinerary);

  // Match sections by keywords
  const daySection     = getSec(sections, ['day-wise', 'day wise', 'itinerary', 'trip plan', 'daily']);
  const hotelSection   = getSec(sections, ['hotel', 'stay', 'accommodation', 'hostel']);
  const foodSection    = getSec(sections, ['restaurant', 'food', 'dining', 'eat']);
  const budgetSection  = getSec(sections, ['budget', 'cost', 'expense', 'breakdown']);
  const hiddenSection  = getSec(sections, ['hidden', 'gem', 'tip', 'local tip', 'places to visit', 'sightseeing']);
  const safetySection  = getSec(sections, ['safety', 'safe', 'precaution']);
  const weatherSection = getSec(sections, ['weather', 'clothing', 'cloth', 'pack', 'wear']);
  const docsSection    = getSec(sections, ['document', 'id proof', 'documents needed']);
  const firstAidSection = getSec(sections, ['first aid', 'medical', 'medicine', 'health', 'aid kit']);
  const elecSection    = getSec(sections, ['electronic', 'gadget', 'device', 'charger', 'electronics']);
  const guidesSection  = getSec(sections, ['guide', 'helpline', 'emergency', 'contact', 'local guide']);
  const transportSection = getSec(sections, ['transport', 'travel detail', 'how to reach', 'getting there']);

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
      setChatHistory((prev) => [...prev, { question: q, answer: 'Sorry, try again.' }]);
    }
    setAsking(false);
  };

  const persistPacking = (list) => localStorage.setItem(storageKey, JSON.stringify(list));

  const toggleItem = (cat, id) => {
    setPackingList((prev) => {
      const updated = { ...prev, [cat]: prev[cat].map((i) => i.id === id ? { ...i, checked: !i.checked } : i) };
      persistPacking(updated);
      return updated;
    });
  };

  const deleteItem = (cat, id) => {
    setPackingList((prev) => {
      const updated = { ...prev, [cat]: prev[cat].filter((i) => i.id !== id) };
      persistPacking(updated);
      return updated;
    });
  };

  const addItem = (cat) => {
    const text = (newItemText[cat] || '').trim();
    if (!text) return;
    setPackingList((prev) => {
      const updated = { ...prev, [cat]: [...(prev[cat] || []), { id: `${cat}-${Date.now()}`, text, checked: false }] };
      persistPacking(updated);
      return updated;
    });
    setNewItemText((prev) => ({ ...prev, [cat]: '' }));
  };

  const allItems = Object.values(packingList).flat();
  const checkedCount = allItems.filter((i) => i.checked).length;

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto">

        {/* ── HEADER ── */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-5 mb-5 text-white shadow-lg">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold capitalize">
                {tripDetails.source} → {tripDetails.destination}
              </h1>
              <p className="text-blue-100 mt-1 text-sm">
                {tripDetails.days} days • {tripDetails.groupSize} people •
                ₹{Number(tripDetails.budget).toLocaleString()} • {tripDetails.transport}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
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

        {/* ── 1. DAY-WISE ITINERARY ── */}
        <SectionCard icon="📅" title="Day-wise Itinerary"
          headerColor="bg-blue-600" borderColor="border-blue-200" bgColor="bg-blue-50" defaultOpen={true}>
          {daySection
            ? <MDContent content={daySection.content} />
            : <MDContent content={itinerary} />}
        </SectionCard>

        {/* ── 2. ROUTE MAP ── */}
        <SectionCard icon="🗺️" title="Route & Navigation"
          headerColor="bg-gray-700" borderColor="border-gray-200" bgColor="bg-gray-50">
          <iframe title="route-map" width="100%" height="260"
            style={{ border: 0, borderRadius: '12px' }} loading="lazy" allowFullScreen
            src={`https://maps.google.com/maps?saddr=${encodeURIComponent(tripDetails.source)}&daddr=${encodeURIComponent(tripDetails.destination)}&output=embed`} />
          {transportSection && <div className="mt-4"><MDContent content={transportSection.content} /></div>}
        </SectionCard>

        {/* ── 3. FOOD & RESTAURANTS ── */}
        {foodSection && (
          <SectionCard icon="🍽️" title="Food & Restaurants"
            headerColor="bg-orange-500" borderColor="border-orange-200" bgColor="bg-orange-50">
            <MDContent content={foodSection.content} />
          </SectionCard>
        )}

        {/* ── 4. PLACES TO VISIT ── */}
        {hiddenSection && (
          <SectionCard icon="🏖️" title="Places to Visit & Hidden Gems"
            headerColor="bg-teal-600" borderColor="border-teal-200" bgColor="bg-teal-50">
            <MDContent content={hiddenSection.content} />
          </SectionCard>
        )}

        {/* ── 5. HOTELS ── */}
        {hotelSection && (
          <SectionCard icon="🏨" title="Hotels & Accommodation"
            headerColor="bg-purple-600" borderColor="border-purple-200" bgColor="bg-purple-50">
            <MDContent content={hotelSection.content} />
          </SectionCard>
        )}

        {/* ── 6. BUDGET BREAKDOWN ── */}
        {budgetSection && (
          <SectionCard icon="💰" title="Budget Breakdown"
            headerColor="bg-green-600" borderColor="border-green-200" bgColor="bg-green-50">
            {budgetData.length > 0 ? (
  <ResponsiveContainer width="100%" height={240}>
    <PieChart>
      <Pie
        data={budgetData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="45%"
        outerRadius={80}
        labelLine={false}
        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
      >
        {budgetData.map((_, idx) => (
          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(v, name) => [`Rs.${v}`, name]} />
      <Legend wrapperStyle={{ fontSize: '12px' }} />
    </PieChart>
  </ResponsiveContainer>
) : (
  <p className="text-sm text-gray-400 text-center py-4">Loading chart...</p>
)}
                
            <MDContent content={budgetSection.content} />
            {budgetTotal > 0 && (
              <div className={`mt-3 rounded-xl p-3 text-sm font-semibold text-center
                ${budgetTotal > userBudget ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {budgetTotal > userBudget
                  ? `⚠️ Estimated ₹${budgetTotal} exceeds budget by ₹${budgetTotal - userBudget}`
                  : `✅ Estimated ₹${budgetTotal} — ₹${userBudget - budgetTotal} left to spare!`}
              </div>
            )}
          </SectionCard>
        )}

        {/* ── 7. WEATHER ── */}
        <SectionCard icon="🌤️" title={`Weather Forecast — ${tripDetails.destination}`}
          headerColor="bg-yellow-500" borderColor="border-yellow-200" bgColor="bg-yellow-50">
          {weatherLoading && <p className="text-sm text-gray-500">Fetching weather...</p>}
          {!weatherLoading && !weather && <p className="text-sm text-red-400">Could not load weather data.</p>}
          {!weatherLoading && weather && (
            <div>
              <p className="text-sm text-gray-600 mb-3">{weather.city}, {weather.country} — Next 15 hours</p>
              <div className="grid grid-cols-5 gap-2">
                {weather.forecasts.map((f, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-2 text-center shadow-sm">
                    <p className="text-xs text-gray-500">
                      {new Date(f.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
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
          {weatherSection && <div className="mt-3"><MDContent content={weatherSection.content} /></div>}
        </SectionCard>

        {/* ── 8. CLOTHES & PACKING ── */}
        <SectionCard icon="👕" title="Clothes & Packing"
          headerColor="bg-pink-500" borderColor="border-pink-200" bgColor="bg-pink-50">
          {weatherSection && <MDContent content={weatherSection.content} />}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-bold text-gray-700">My Packing Checklist</p>
              <span className="text-xs text-gray-500">{checkedCount}/{allItems.length} packed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${allItems.length ? (checkedCount / allItems.length) * 100 : 0}%` }} />
            </div>
            {Object.entries(packingList).map(([cat, items]) => (
              <div key={cat} className="mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">{cat}</p>
                <div className="space-y-1 mb-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={item.checked} onChange={() => toggleItem(cat, item.id)}
                        className="w-4 h-4 accent-pink-500 flex-shrink-0" />
                      <span className={`text-sm flex-1 ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item.text}
                      </span>
                      <button onClick={() => deleteItem(cat, item.id)} className="text-gray-300 hover:text-red-500 text-sm">✕</button>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-xs text-gray-400 italic">No items yet</p>}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder={`Add ${cat.toLowerCase()} item...`}
                    value={newItemText[cat] || ''}
                    onChange={(e) => setNewItemText((p) => ({ ...p, [cat]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addItem(cat)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white" />
                  <button onClick={() => addItem(cat)}
                    className="bg-pink-100 text-pink-600 px-3 rounded-lg text-sm font-medium hover:bg-pink-200">+ Add</button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 9. DOCUMENTS ── */}
        {docsSection && (
          <SectionCard icon="📄" title="Documents Required"
            headerColor="bg-blue-500" borderColor="border-blue-200" bgColor="bg-blue-50">
            <MDContent content={docsSection.content} />
          </SectionCard>
        )}

        {/* ── 10. ELECTRONICS ── */}
        {elecSection && (
          <SectionCard icon="🔌" title="Electronics Checklist"
            headerColor="bg-indigo-600" borderColor="border-indigo-200" bgColor="bg-indigo-50">
            <MDContent content={elecSection.content} />
          </SectionCard>
        )}

        {/* ── 11. SAFETY ── */}
        {safetySection && (
          <SectionCard icon="🛡️" title="Safety Tips"
            headerColor="bg-red-600" borderColor="border-red-200" bgColor="bg-red-50">
            <MDContent content={safetySection.content} />
          </SectionCard>
        )}

        {/* ── 12. LOCAL GUIDES ── */}
        {guidesSection && (
          <SectionCard icon="📞" title="Local Guides & Helplines"
            headerColor="bg-teal-700" borderColor="border-teal-200" bgColor="bg-teal-50">
            <MDContent content={guidesSection.content} />
          </SectionCard>
        )}

        {/* ── ASK AI ── */}
        <SectionCard icon="💬" title="Ask AI — Get More Info"
          headerColor="bg-purple-600" borderColor="border-purple-200" bgColor="bg-purple-50">
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