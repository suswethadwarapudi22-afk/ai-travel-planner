import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateItinerary } from '../services/api';

const INTERESTS = ['Food', 'Nature', 'Adventure', 'History', 'Shopping', 'Beaches', 'Nightlife', 'Spiritual'];
const TRANSPORTS = ['Bus', 'Train', 'Flight', 'Own Vehicle', 'Mixed'];

function TripPlanner() {
  const [form, setForm] = useState({
    source: '',
    destination: '',
    budget: '',
    days: '',
    groupSize: '1',
    transport: 'Bus',
    interests: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const toggleInterest = (interest) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.interests.length === 0) {
      setError('Please select at least one interest');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await generateItinerary({
        ...form,
        budget: Number(form.budget),
        days: Number(form.days),
        groupSize: Number(form.groupSize)
      });
      navigate('/itinerary', {
        state: { itinerary: res.data.itinerary, tripDetails: form }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate itinerary. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-600 mb-4 font-medium"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Plan Your Trip ✈️</h2>
          <p className="text-gray-500 mb-6">Fill in your preferences and let AI do the magic</p>

          {error && (
            <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="text"
                  placeholder="e.g. Hyderabad"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="text"
                  placeholder="e.g. Goa"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget (₹)</label>
                <input
                  type="number"
                  placeholder="10000"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                <input
                  type="number"
                  placeholder="3"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.days}
                  onChange={(e) => setForm({ ...form, days: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Size</label>
                <input
                  type="number"
                  placeholder="2"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.groupSize}
                  onChange={(e) => setForm({ ...form, groupSize: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Transport</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.transport}
                onChange={(e) => setForm({ ...form, transport: e.target.value })}
              >
                {TRANSPORTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => (
                  <button
                    type="button"
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                      form.interests.includes(interest)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading ? '✨ Generating your itinerary... (this may take 30s)' : '✨ Generate AI Itinerary'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TripPlanner;