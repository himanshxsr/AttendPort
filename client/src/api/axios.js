import axios from 'axios';

// Smart URL detection: if we're on localhost, use local API; otherwise, use production Render API.
// This prevents local .env.local settings from breaking the production build.
const isLocal = window.location.hostname === 'localhost';
const prodAPI = 'https://attendport-azwy.onrender.com/api';
const localAPI = 'http://localhost:5000/api';

const API = axios.create({
  baseURL: isLocal ? (import.meta.env.VITE_API_URL || localAPI) : prodAPI,
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
      // Only redirect to login if we are NOT already on the login page
      // This prevents flashing error messages during login attempts
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
