import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveTrip, askItinerary, getWeather } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function parseSections(text) {
  const parts = text.split(/\n(?=## )/).filter((s) => s.trim());
  return parts.map((section) => {
    const lines = section.trim().split('\n');
    const title = lines[0].replace(/^##\s*/, '').trim();
    const content = lines.slice(1).join('\n').trim();
    return { title, content };
  });
}

const SECTION_ICONS = {
  'Day-wise Itinerary': '🗺️',
  'Budget Breakdown': '💰',
  'Top Hotels': '🏨',
  'Top Restaurants': '🍽️',
  'Hidden Gems & Tips': '💎',
  'Safety Tips': '🛡️',
  'Weather & Clothing': '🌤️',
  'Documents Needed': '📄',
  'First Aid Kit': '🩹',
  'Electronics to Carry': '🔌',
  'Local Guides & Helplines': '📞',
};

function parseBudget(content) {
  const lines = content.split('\n');
  const data = [];
  let total = 0;
  lines.forEach((line) => {
    const match = line.match(/[-*]\s*([\w\s/&]+?):\s*₹?\s*([\d,]+)/);
    if (match) {
      const label = match[1].trim().toLowerCase();
      const value = parseInt(match[2].replace(/,/g, ''), 10);
      if (label === 'total') {
        total = value;
      } else if (!isNaN(value)) {
        data.push({ name: match[1].trim(), value });
      }
    }
  });
  return { data, total };
}

function parseListItems(content) {
  return content
    .split('\n')
    .filter((line) => line.trim().match(/^[-*]\s+/))
    .map((line) => {
      const clean = line.replace(/^[-*]\s+/, '').trim();
      const parts = clean.split(' - ');
      const name = parts[0].trim();
      const rest = parts.slice(1).join(' - ').trim();
      return { name, rest };
    });
}

function parseDayLines(content) {
  return content
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.match(/^#{1,3}\s+/)) {
        return { type: 'heading', text: trimmed.replace(/^#{1,3}\s+/, '') };
      }
      if (trimmed.match(/^[-*]\s+/)) {
        return { type: 'item', text: trimmed.replace(/^[-*]\s+/, '') };
      }
      return { type: 'item', text: trimmed };
    });
}

function getPackingItems(sections) {
  const result = { Clothing: [], Documents: [], 'First Aid': [], Electronics: [] };
  sections.forEach((section) => {
    if (section.title === 'Weather & Clothing') {
      const packLine = section.content.split('\n').find((l) => l.toLowerCase().includes('pack'));
      if (packLine) {
        const after = packLine.split(':').slice(1).join(':');
        result.Clothing = after.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else if (section.title === 'Documents Needed') {
      result.Documents = parseListItems(section.content).map((i) => i.name + (i.rest ? ' - ' + i.rest : ''));
    } else if (section.title === 'First Aid Kit') {
      result['First Aid'] = parseListItems(section.content).map((i) => i.name + (i.rest ? ' - ' + i.rest : ''));
    } else if (section.title === 'Electronics to Carry') {
      result.Electronics = parseListItems(section.content).map((i) => i.name + (i.rest ? ' - ' + i.rest : ''));
    }
  });
  return result;
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
/* eslint-disable no-unused-vars */
function Itinerary() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [asking, setAsking] = useState(false);
  const [packingList, setPackingList] = useState(null);
  const [newItemText, setNewItemText] = useState({});
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', paidBy: '' });
  const [weather, setWeather] = useState(null);               // 👈 ADD HERE
  const [weatherLoading, setWeatherLoading] = useState(false);

  const itinerary = state?.itinerary;
  const tripDetails = state?.tripDetails;
  const storageKey = `packing-v2-${tripDetails?.destination}-${tripDetails?.days}`;
  useEffect(() => {
    if (!tripDetails || !itinerary) return;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      setPackingList(JSON.parse(savedData));
    } else {
      const raw = getPackingItems(parseSections(itinerary));
      const initial = {};
      Object.entries(raw).forEach(([cat, items]) => {
        initial[cat] = items.map((text, idx) => ({ id: `${cat}-${idx}-${Date.now()}`, text, checked: false }));
      });
      setPackingList(initial);
    }
    // eslint-disable-next-line
  }, [storageKey]);

const normalizeCity = (city) => {
    const cityMap = {
      'vizag': 'Visakhapatnam',
      'vskp': 'Visakhapatnam',
      'visakapatnam': 'Visakhapatnam',
      'visakhapatnam': 'Visakhapatnam',
      'hyd': 'Hyderabad',
      'hyderabad': 'Hyderabad',
      'blr': 'Bangalore',
      'bangalore': 'Bangalore',
      'bengaluru': 'Bangalore',
      'mum': 'Mumbai',
      'mumbai': 'Mumbai',
      'bombay': 'Mumbai',
      'madras': 'Chennai',
      'chennai': 'Chennai',
      'calcutta': 'Kolkata',
      'kolkata': 'Kolkata',
      'del': 'Delhi',
      'delhi': 'Delhi',
      'new delhi': 'Delhi',
      'goa': 'Goa',
      'pune': 'Pune',
      'jaipur': 'Jaipur',
      'kashmir': 'Srinagar',
      'shimla': 'Shimla',
      'manali': 'Manali',
      'ooty': 'Udhagamandalam',
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
    // eslint-disable-next-line
  }, []);
  if (!state) {
    navigate('/dashboard');
    return null;
  }

  const persistList = (list) => {
    localStorage.setItem(storageKey, JSON.stringify(list));
  };

  const toggleItem = (category, id) => {
    setPackingList((prev) => {
      const updated = {
        ...prev,
        [category]: prev[category].map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
      };
      persistList(updated);
      return updated;
    });
  };

  const deleteItem = (category, id) => {
    setPackingList((prev) => {
      const updated = {
        ...prev,
        [category]: prev[category].filter((item) => item.id !== id),
      };
      persistList(updated);
      return updated;
    });
  };

  const addItem = (category) => {
    const text = (newItemText[category] || '').trim();
    if (!text) return;
    setPackingList((prev) => {
      const updated = {
        ...prev,
        [category]: [...(prev[category] || []), { id: `${category}-${Date.now()}`, text, checked: false }],
      };
      persistList(updated);
      return updated;
    });
    setNewItemText((prev) => ({ ...prev, [category]: '' }));
  };

  const handleSave = async () => {
    try {
      await saveTrip({ ...tripDetails, itinerary });
      setSaved(true);
    } catch (err) {
      console.error(err);
    }
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
      setChatHistory((prev) => [...prev, { question: q, answer: 'Sorry, something went wrong. Try again.' }]);
    }
    setAsking(false);
  };

  const toggleSection = (title) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const allPackingItems = packingList ? Object.values(packingList).flat() : [];
  const totalPackingItems = allPackingItems.length;
  const checkedCount = allPackingItems.filter((i) => i.checked).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
       <div className="flex justify-between items-center mb-4">
          <button onClick={() => navigate('/dashboard')} className="text-blue-600 font-medium">
            ← Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/expenses', { state: { tripDetails } })}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
          >
            💸 Split Expenses
          </button>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white mb-4">
          <h2 className="text-2xl font-bold">
            {tripDetails.source} → {tripDetails.destination}
          </h2>
          <p className="opacity-90">
            {tripDetails.days} days · ₹{tripDetails.budget} · {tripDetails.groupSize} people · {tripDetails.transport}
          </p>
        </div>
        {/* Weather Widget */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>🌦️</span> Live Weather — {tripDetails.destination}
          </h3>
          {weatherLoading && (
            <p className="text-sm text-gray-400">Fetching weather...</p>
          )}
          {!weatherLoading && !weather && (
            <p className="text-sm text-red-400">Could not load weather data.</p>
          )}
          {!weatherLoading && weather && (
            <div>
              <p className="text-sm text-gray-500 mb-3">{weather.city}, {weather.country} — Next 15 hours forecast</p>
              <div className="grid grid-cols-5 gap-2">
                {weather.forecasts.map((f, idx) => (
                  <div key={idx} className="bg-blue-50 rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">{new Date(f.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    <img
                      src={`https://openweathermap.org/img/wn/${f.icon}.png`}
                      alt={f.description}
                      className="w-8 h-8 mx-auto"
                    />
                    <p className="text-sm font-bold text-gray-800">{f.temp}°C</p>
                    <p className="text-xs text-gray-500 capitalize">{f.description}</p>
                    <p className="text-xs text-blue-500">💧{f.humidity}%</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800">
                💡 <span className="font-medium">Tip:</span> Feels like {weather.forecasts[0]?.feels}°C with {weather.forecasts[0]?.humidity}% humidity. Wind speed: {weather.forecasts[0]?.wind} m/s.
              </div>
            </div>
          )}
        </div>
        {/* Route Map */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>🗺️</span> Route Map
          </h3>
          <iframe
            title="route-map"
            width="100%"
            height="300"
            style={{ border: 0, borderRadius: '12px' }}
            loading="lazy"
            allowFullScreen
            src={`https://maps.google.com/maps?saddr=${encodeURIComponent(tripDetails.source)}&daddr=${encodeURIComponent(tripDetails.destination)}&output=embed`}
          ></iframe>
        </div>

        {/* Ask AI */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>💬</span> Ask AI - More Hotels, Places, Questions
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="e.g. Give me 5 more hotels"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            />
            <button
              onClick={handleAsk}
              disabled={asking}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-60"
            >
              {asking ? '...' : 'Ask'}
            </button>
          </div>
          {chatHistory.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {chatHistory.map((item, i) => (
                <div key={i} className="border-t border-gray-100 pt-3">
                  <p className="text-sm font-semibold text-blue-600 mb-1">🙋 {item.question}</p>
                  <div className="prose prose-sm max-w-none text-gray-700 prose-li:my-0.5 prose-strong:text-gray-900">
                    <ReactMarkdown>{item.answer}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI-Generated Itinerary */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Your AI-Generated Itinerary 🤖</h3>
            <button
              onClick={handleSave}
              disabled={saved}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
            >
              {saved ? '✓ Saved' : '💾 Save Trip'}
            </button>
          </div>

          <div className="space-y-3">
            {parseSections(itinerary).map((section, i) => {
              const isOpen = openSections[section.title];
              return (
                <div key={i} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 transition"
                  >
                    <span className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span>{SECTION_ICONS[section.title] || '📌'}</span>
                      {section.title}
                    </span>
                    <span className="text-gray-400 text-xl">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5">
                      {section.title === 'Budget Breakdown' && (() => {
                        const { data, total } = parseBudget(section.content);
                        const userBudget = Number(tripDetails.budget);
                        const overBudget = total > userBudget;
                        return (
                          <div className="mb-4">
                            <div className="flex flex-col items-center mb-3">
                              <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                  <Pie
                                    data={data}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="45%"
                                    outerRadius={85}
                                    labelLine={false}
                                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                  >
                                    {data.map((entry, idx) => (
                                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value, name) => [`₹${value}`, name]} />
                                  <Legend
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                    formatter={(value, entry) => `${value}: ₹${entry.payload.value}`}
                                    wrapperStyle={{ fontSize: '12px', lineHeight: '20px' }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className={`rounded-lg p-3 text-sm font-medium text-center ${overBudget ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {overBudget
                                ? `⚠️ Estimated total ₹${total} exceeds your budget of ₹${userBudget} by ₹${total - userBudget}`
                                : `✅ Estimated total ₹${total} fits within your budget of ₹${userBudget} (₹${userBudget - total} to spare)`}
                            </div>
                          </div>
                        );
                      })()}

                      {(section.title.includes('Top Hotels') || section.title.includes('Top Restaurants')) ? (
                        <div className="space-y-2">
                          {parseListItems(section.content).map((item, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-3 border border-gray-100">
                              <p className="font-semibold text-gray-900">{item.name}</p>
                              {item.rest && <p className="text-sm text-gray-500">{item.rest}</p>}
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(item.name + ' ' + tripDetails.destination)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 text-sm font-medium hover:underline inline-flex items-center gap-1 mt-1"
                              >
                                🔗 Photos, reviews & contact
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (section.title === 'Day-wise Itinerary' || section.title === 'Hidden Gems & Tips') ? (
                        <div className="space-y-1">
                          {parseDayLines(section.content).map((line, idx) =>
                            line.type === 'heading' ? (
                              <h4 key={idx} className="font-bold text-gray-900 uppercase text-sm mt-3 mb-1">
                                {line.text}
                              </h4>
                            ) : (
                              <div key={idx} className="flex items-start justify-between gap-2 py-0.5">
                                <span className="text-gray-700 text-sm">• {line.text}</span>
                                <a
                                  href={`https://www.google.com/search?q=${encodeURIComponent(line.text + ' ' + tripDetails.destination)}&tbm=isch`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 text-sm flex-shrink-0"
                                  title="View photos"
                                >
                                  📷
                                </a>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-headings:font-bold prose-h3:text-sm prose-h3:uppercase prose-h3:mt-3 prose-h3:mb-1 prose-li:my-0.5 prose-ul:my-1 prose-strong:text-gray-900 prose-p:my-1">
                          <ReactMarkdown>{section.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Packing Checklist - collapsible, editable */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4 mt-4">
          <button
            onClick={() => toggleSection('Packing Checklist')}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition"
          >
            <span className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>🎒</span> Packing Checklist
              <span className="text-sm text-gray-500 font-normal ml-1">({checkedCount}/{totalPackingItems} packed)</span>
            </span>
            <span className="text-gray-400 text-xl">{openSections['Packing Checklist'] ? '−' : '+'}</span>
          </button>
          {openSections['Packing Checklist'] && packingList && (
            <div className="px-5 pb-5">
              <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${totalPackingItems ? (checkedCount / totalPackingItems) * 100 : 0}%` }}
                ></div>
              </div>
              {Object.entries(packingList).map(([category, items]) => (
                <div key={category} className="mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">{category}</p>
                  <div className="space-y-1 mb-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleItem(category, item.id)}
                          className="w-4 h-4 accent-blue-600 flex-shrink-0"
                        />
                        <span className={`text-sm flex-1 ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {item.text}
                        </span>
                        <button
                          onClick={() => deleteItem(category, item.id)}
                          className="text-gray-300 hover:text-red-500 text-sm px-1"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No items - add one below</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Add ${category.toLowerCase()} item...`}
                      value={newItemText[category] || ''}
                      onChange={(e) => setNewItemText((prev) => ({ ...prev, [category]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addItem(category)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      onClick={() => addItem(category)}
                      className="bg-blue-100 text-blue-600 px-3 rounded-lg text-sm font-medium hover:bg-blue-200"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Itinerary;