import axios from 'axios';

const API = axios.create({ 
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api' 
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const generateItinerary = (data) => API.post('/itinerary/generate', data);
export const saveTrip = (data) => API.post('/trips', data);
export const getTrips = () => API.get('/trips');
export const deleteTrip = (id) => API.delete(`/trips/${id}`);
export const askItinerary = (data) => API.post('/itinerary/ask', data);
export const getWeather = (city) => API.get(`/itinerary/weather/${encodeURIComponent(city)}`);