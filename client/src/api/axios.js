import axios from 'axios';

const API = axios.create({
  // Use VITE_API_URL if provided, else fall back to localhost for dev
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Add token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
