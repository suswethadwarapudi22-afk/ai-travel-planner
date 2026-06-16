import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TripPlanner from './pages/TripPlanner';
import Itinerary from './pages/Itinerary';
import ExpenseSplitter from './pages/ExpenseSplitter';
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plan" element={<TripPlanner />} />
          <Route path="/itinerary" element={<Itinerary />} />
          <Route path="/expenses" element={<ExpenseSplitter />} />  
        </Routes>
      </div>
    </Router>
  );
}

export default App;