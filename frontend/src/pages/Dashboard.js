import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrips, deleteTrip } from '../services/api';

function Dashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await getTrips();
      setTrips(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this trip?')) {
      await deleteTrip(id);
      fetchTrips();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">✈️ TravelAI</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Hi, {user.name}!</span>
          <button
            onClick={handleLogout}
            className="text-red-500 hover:text-red-700 font-medium"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6">
        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <h2 className="text-3xl font-bold mb-2">Plan Your Next Adventure! 🌍</h2>
          <p className="mb-4 opacity-90">Get AI-powered itineraries tailored to your budget</p>
          <button
            onClick={() => navigate('/plan')}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            + Plan New Trip
          </button>
        </div>

        {/* Saved Trips */}
        <h3 className="text-xl font-bold text-gray-800 mb-4">Your Saved Trips</h3>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : trips.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm">
            No trips yet. Plan your first trip! 🎒
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {trips.map((trip) => (
              <div key={trip._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-lg">
                      {trip.source} → {trip.destination}
                    </h4>
                    <button
                      onClick={() => handleDelete(trip._id)}
                      className="text-white/70 hover:text-red-200 text-sm"
                      title="Delete trip"
                    >
                      🗑️
                    </button>
                  </div>
                  <p className="text-sm opacity-90 mt-1">
                    {new Date(trip.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="bg-gray-50 rounded-lg py-2">
                      <p className="text-xs text-gray-500">Days</p>
                      <p className="font-bold text-gray-800">{trip.days}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2">
                      <p className="text-xs text-gray-500">Group</p>
                      <p className="font-bold text-gray-800">{trip.groupSize}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2">
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className="font-bold text-gray-800">₹{trip.budget}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {trip.interests?.map((interest, i) => (
                      <span key={i} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                        {interest}
                      </span>
                    ))}
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                      🚌 {trip.transport}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate('/itinerary', { state: { itinerary: trip.itinerary, tripDetails: trip } })}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition text-sm"
                  >
                    📋 View Itinerary
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;